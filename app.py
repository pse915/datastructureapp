from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

from backend.sheets import (
    STUDENT_SHEET,
    find_student,
    get_all_portfolio,
    get_student_portfolio,
    get_week_settings,
    prepare_sheets,
    save_portfolio_submission,
    update_grade_and_feedback,
)
from backend.validation import (
    MAX_CONTENT_LENGTH,
    MAX_FEEDBACK_LENGTH,
    require_role,
    validate_content,
    validate_feedback,
    validate_student_id,
    validate_submission_id,
    validate_week,
)

logger = logging.getLogger(__name__)

st.set_page_config(
    page_title="기술·가정 포트폴리오",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="collapsed",
)

ROOT = Path(__file__).parent
BUILD_DIR = ROOT / "frontend" / "dist"


def get_spreadsheet_url() -> str:
    """Streamlit Secrets에서 SPREADSHEET_URL을 읽는다.

    기존 하드코딩 fallback을 제거하고, 누락 시 배포 원인을 명시한다.
    """
    url = str(st.secrets.get("SPREADSHEET_URL", "")).strip()
    if not url:
        raise RuntimeError(
            "Streamlit Secrets에 SPREADSHEET_URL이 없습니다. "
            "App settings → Secrets에 SPREADSHEET_URL을 설정하세요."
        )
    return url


SPREADSHEET_URL = ""
try:
    SPREADSHEET_URL = get_spreadsheet_url()
except RuntimeError as exc:
    # Secrets 없이 import되는 로컬/테스트 환경을 위해 지연 평가한다.
    # 실제 Sheets 접근 시점에 다시 시도해 명확한 에러를 낸다.
    logger.warning("SPREADSHEET_URL 미설정: %s", exc)
DRIVE_FOLDER_ID = str(st.secrets.get("DRIVE_FOLDER_ID", "")).strip()

DEV_COMPONENT_URL = os.getenv("STREAMLIT_COMPONENT_DEV_URL", "").strip()
if DEV_COMPONENT_URL:
    portfolio_component = components.declare_component(
        "technical_home_portfolio",
        url=DEV_COMPONENT_URL,
    )
else:
    COMPONENT_INDEX = BUILD_DIR / "index.html"
    COMPONENT_APP = BUILD_DIR / "App.jsx"
    COMPONENT_STYLES = BUILD_DIR / "styles.css"
    COMPONENT_LIBS = [
        BUILD_DIR / "lib" / "constants.jsx",
        BUILD_DIR / "lib" / "validation.jsx",
        BUILD_DIR / "lib" / "wrongnote.jsx",
        BUILD_DIR / "visual" / "VisualModule.jsx",
        BUILD_DIR / "components" / "TeacherDirectory.jsx",
    ]
    if not all(p.exists() for p in (COMPONENT_INDEX, COMPONENT_APP, COMPONENT_STYLES)):
        missing = [
            str(p.relative_to(ROOT))
            for p in (COMPONENT_INDEX, COMPONENT_APP, COMPONENT_STYLES)
            if not p.exists()
        ]
        raise RuntimeError(
            f"React Custom Component 배포 파일이 없습니다: {', '.join(missing)}"
        )
    missing_libs = [str(p.relative_to(ROOT)) for p in COMPONENT_LIBS if not p.exists()]
    if missing_libs:
        raise RuntimeError(
            f"React 공용 모듈이 없습니다: {', '.join(missing_libs)}"
        )
    portfolio_component = components.declare_component(
        "technical_home_portfolio",
        path=str(BUILD_DIR),
    )


def init_state() -> None:
    defaults: dict[str, Any] = {
        "role": None,
        "student": None,
        "sheets": None,
        "weeks": [],
        "student_portfolio": [],
        "all_portfolio": [],
        "students": [],
        "last_event_id": None,
        "flash": None,
        "server_result": None,
        "worksheet": None,
        "uploadResult": None,
        "teacher_query": {"search": "", "grade": "", "klass": "", "week": "", "onlyUngraded": False, "page": 1},
        "csv_export": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value
    # 구버전 세션과의 호환 (키 누락 시 보정)
    if not isinstance(st.session_state.get("teacher_query"), dict):
        st.session_state.teacher_query = {"search": "", "grade": "", "klass": "", "week": "", "onlyUngraded": False, "page": 1}


init_state()


def service_account():
    if "gcp_service_account" not in st.secrets:
        raise RuntimeError("Streamlit Secrets에 [gcp_service_account]가 없습니다.")
    return st.secrets["gcp_service_account"]


def sheets():
    if st.session_state.sheets is None:
        url = SPREADSHEET_URL or get_spreadsheet_url()
        st.session_state.sheets = prepare_sheets(service_account(), url)
    return st.session_state.sheets


def _spreadsheet_url_or_raise() -> str:
    url = SPREADSHEET_URL or get_spreadsheet_url()
    if not url:
        raise RuntimeError("SPREADSHEET_URL이 설정되지 않았습니다.")
    return url


def reload_student(student: dict[str, Any] | None = None) -> None:
    if student is None:
        student = find_student(sheets(), st.session_state.student["학번"])
    if not student:
        raise RuntimeError("로그인한 학생 정보를 학생명단에서 다시 확인할 수 없습니다.")
    st.session_state.student = student
    s = sheets()
    st.session_state.student_portfolio = get_student_portfolio(s, student["학번"])
    st.session_state.weeks = get_week_settings(s)


def reload_teacher() -> None:
    from backend.sheets import read_records

    s = sheets()
    st.session_state.students = read_records(s[STUDENT_SHEET])
    st.session_state.all_portfolio = get_all_portfolio(s)
    st.session_state.weeks = get_week_settings(s)
    # 학습지 초깃값 (1주차) — 시트/권한 문제 시 교사 로그인을 막지 않도록 무시
    try:
        from backend.worksheet_admin import load_worksheet

        if not st.session_state.get("worksheet"):
            st.session_state.worksheet = load_worksheet(s, 1)
    except Exception:
        pass


def set_flash(kind: str, text: str) -> None:
    st.session_state.flash = {"type": kind, "text": text}


def make_server_submission_id(student_id: str, week: int, client_id: str) -> str:
    raw = f"{student_id}|{week}|{client_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def normalize_student_for_client(student: dict[str, Any] | None) -> dict[str, Any] | None:
    if not student:
        return None
    return {
        "학번": str(student.get("학번", "")),
        "이름": str(student.get("이름", "")),
        "학년": str(student.get("학년", "")),
        "반": str(student.get("반", "")),
        "번호": str(student.get("번호", "")),
    }


def _auto_detail_stats(row: dict[str, Any] | None) -> dict[str, Any]:
    """자동상세 JSON에서 오답 수/문항별 결과를 요약한다 (나의기록 복습필터용)."""
    if not row:
        return {"오답수": 0, "자동문항": []}
    raw = str(row.get("자동상세", "") or "").strip()
    if not raw:
        return {"오답수": 0, "자동문항": []}
    try:
        detail = json.loads(raw)
    except (ValueError, TypeError):
        return {"오답수": 0, "자동문항": []}
    fb = detail.get("feedback", []) if isinstance(detail, dict) else []
    items = []
    wrong = 0
    for f in fb:
        if not isinstance(f, dict):
            continue
        ok = bool(f.get("ok"))
        if not ok:
            wrong += 1
        items.append({"key": str(f.get("key", "")), "ok": ok, "text": str(f.get("text", ""))[:200]})
    return {"오답수": wrong, "자동문항": items[:50]}


def student_summary_rows() -> list[dict[str, Any]]:
    records = {
        int(str(row.get("주차"))): row
        for row in st.session_state.student_portfolio
        if str(row.get("주차", "")).isdigit()
    }
    rows = []
    for week in range(1, 18):
        row = records.get(week)
        stats = _auto_detail_stats(row)
        rows.append(
            {
                "주차": week,
                "제출": bool(row),
                "점수": row.get("점수", "") if row else "",
                "배점": row.get("배점", "") if row else "",
                "피드백": row.get("피드백", "") if row else "",
                "제출내용": row.get("제출내용", "") if row else "",
                "제출일시": row.get("제출일시", "") if row else "",
                "수정일시": row.get("수정일시", "") if row else "",
                "채점상태": row.get("채점상태", "") if row else "",
                "오답수": stats["오답수"],
                "자동문항": stats["자동문항"],
            }
        )
    return rows


def teacher_dashboard() -> dict[str, Any]:
    from backend.sheets import build_class_stats, query_portfolio

    students = st.session_state.students
    portfolio = st.session_state.all_portfolio
    q = st.session_state.get("teacher_query") or {}
    search = str(q.get("search", "") or "")[:100]
    grade = str(q.get("grade", "") or "")[:10]
    klass = str(q.get("klass", "") or "")[:10]
    week = str(q.get("week", "") or "")[:10]
    try:
        page = max(1, int(q.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
    only_ungraded = bool(q.get("onlyUngraded", False))

    df = pd.DataFrame(portfolio)

    if df.empty:
        class_stats: list[dict[str, Any]] = build_class_stats(students, portfolio)
        return {
            "students": students,
            "totalStudents": len(students),
            "submittedStudents": 0,
            "submissionRate": 0,
            "averageScore": 0,
            "ungradedCount": 0,
            "classStats": class_stats,
            "portfolio": [],
            "portfolioTotal": 0,
            "page": 1,
            "pageSize": 50,
            "totalPages": 1,
            "query": {"search": search, "grade": grade, "klass": klass, "week": week, "onlyUngraded": only_ungraded, "page": 1},
        }

    for col in ("점수", "배점"):
        df[col] = pd.to_numeric(df.get(col), errors="coerce")

    total_students = len(students)
    submitted_students = df["학번"].astype(str).nunique() if "학번" in df else 0
    average_score = float(df["점수"].dropna().mean()) if df["점수"].notna().any() else 0
    ungraded_count = int(df["점수"].isna().sum()) if "점수" in df else 0
    class_stats = build_class_stats(students, portfolio)
    paged = query_portfolio(
        portfolio,
        search=search, grade=grade, klass=klass, week=week,
        only_ungraded=only_ungraded, page=page, page_size=50,
    )

    return {
        "students": students,
        "totalStudents": total_students,
        "submittedStudents": int(submitted_students),
        "submissionRate": round(
            (submitted_students / total_students * 100) if total_students else 0, 1
        ),
        "averageScore": round(average_score, 1),
        "ungradedCount": ungraded_count,
        "classStats": class_stats,
        "portfolio": paged["rows"],
        "portfolioTotal": paged["total"],
        "page": paged["page"],
        "pageSize": paged["pageSize"],
        "totalPages": paged["totalPages"],
        "query": {"search": search, "grade": grade, "klass": klass, "week": week, "onlyUngraded": only_ungraded, "page": paged["page"]},
    }


def _error_code(prefix: str) -> str:
    import random
    import time as _time

    return f"{prefix}-{int(_time.time()) % 100000:05d}-{random.randint(100, 999)}"


def _report_error(action: str, exc: Exception, prefix: str = "E") -> str:
    code = _error_code(prefix)
    logger.error("action=%s code=%s error=%s", action, code, exc)
    st.session_state.server_result = {"status": "error", "code": code, "action": action}
    set_flash("error", f"[{code}] {exc}")
    return code


def build_game_payload() -> dict[str, Any] | None:
    """역할별 게임 payload. Sheets 오류 시 빈 상태 + 에러메시지로 폴백."""
    from backend.game_store import (
        load_all_configs,
        load_all_records,
        load_student_records,
    )

    role = st.session_state.role
    try:
        if role == "teacher":
            return {
                "configs": load_all_configs(sheets()),
                "records": load_all_records(sheets()),
            }
        if role == "student" and st.session_state.student:
            configs = [
                c for c in load_all_configs(sheets()) if c.get("enabled")
            ]
            records = load_student_records(
                sheets(), str(st.session_state.student["학번"])
            )
            return {"active": configs, "records": records}
    except Exception as exc:
        return {"configs": [], "records": [], "active": [], "error": str(exc)}
    return None


def build_payload() -> dict[str, Any]:
    role = st.session_state.role
    payload: dict[str, Any] = {
        "role": role,
        "student": normalize_student_for_client(st.session_state.student),
        "weeks": st.session_state.weeks,
        "portfolio": student_summary_rows() if role == "student" else [],
        "teacher": teacher_dashboard() if role == "teacher" else None,
        "flash": st.session_state.flash,
        "result": st.session_state.server_result,
        "worksheet": st.session_state.get("worksheet"),
        "uploadResult": st.session_state.get("uploadResult"),
        "games": build_game_payload(),
        "csvExport": st.session_state.get("csv_export"),
    }
    try:
        json.dumps(payload, ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise RuntimeError(f"React component args가 JSON 직렬화되지 않습니다: {exc}") from exc
    return payload


# ---------- P0: action별 핸들러 분리 + 입력 검증 ----------

def _require_student() -> dict[str, Any]:
    require_role(st.session_state.role, "student", "학생 로그인 상태가 아닙니다.")
    if not st.session_state.student:
        raise RuntimeError("학생 로그인 상태가 아닙니다.")
    return st.session_state.student


def _require_teacher() -> None:
    require_role(st.session_state.role, "teacher", "교사 모드가 아닙니다.")


def _find_week_or_raise(week_no: int) -> dict[str, Any]:
    week_no = validate_week(week_no)
    week = next((w for w in st.session_state.weeks if int(w["주차"]) == week_no), None)
    if not week:
        raise RuntimeError("제출할 수 없는 주차입니다.")
    return week


def handle_student_login(event: dict[str, Any]) -> None:
    try:
        sid = validate_student_id(event.get("studentId", ""))
    except ValueError:
        set_flash("error", "학번은 숫자로 입력해 주세요.")
        return
    student = find_student(sheets(), sid)
    if not student:
        set_flash("error", "학생명단에서 해당 학번을 찾지 못했습니다.")
        return
    st.session_state.role = "student"
    st.session_state.student = student
    reload_student(student)
    set_flash("success", f"{student.get('이름', '학생')}님, 로그인되었습니다.")


def handle_teacher_login(event: dict[str, Any]) -> None:
    password = str(event.get("password", ""))
    expected = str(st.secrets.get("TEACHER_PASSWORD", ""))
    if expected and password == expected:
        st.session_state.role = "teacher"
        st.session_state.student = None
        reload_teacher()
        set_flash("success", "교사 관리자 모드로 로그인되었습니다.")
    else:
        set_flash("error", "교사용 비밀번호가 올바르지 않습니다.")


def handle_student_submit(event: dict[str, Any]) -> None:
    from backend.grading import grade_submission, summarize_feedback

    student = _require_student()
    try:
        week_no = validate_week(event.get("week", 0))
    except ValueError as exc:
        raise RuntimeError(str(exc)) from exc
    week = _find_week_or_raise(week_no)
    content = validate_content(event.get("content", ""), MAX_CONTENT_LENGTH)
    client_id = validate_submission_id(event.get("submissionId", ""))
    answers = event.get("answers", {})
    activities = event.get("activities", {})
    if not isinstance(answers, dict):
        answers = {}
    if not isinstance(activities, dict):
        activities = {}
    # 구조화 답안은 개수/길이 제한으로 비정상 대입을 막는다.
    if len(answers) > 100:
        raise RuntimeError("답안 항목이 너무 많습니다.")
    answers = {str(k)[:64]: (str(v)[:2000] if isinstance(v, str) else v) for k, v in list(answers.items())[:100]}
    server_id = make_server_submission_id(str(student["학번"]), week_no, client_id)
    result = save_portfolio_submission(
        service_account(),
        _spreadsheet_url_or_raise(),
        student,
        week,
        content,
        server_id,
        sheets=sheets(),
    )

    auto_grade: dict[str, Any] | None = None
    if result.get("status") == "saved":
        try:
            rubric = week.get("루브릭") if isinstance(week, dict) else None
            if rubric is None and isinstance(week, dict):
                rubric = week.get("루브릭JSON", "")
            grading_payload: dict[str, Any] = {
                "answers": answers, "activities": activities,
                "content": content, "week": week_no,
            }
            graded = grade_submission(grading_payload, rubric)
            if graded.get("graded"):
                try:
                    week_cap = int(float(str(week.get("배점", "0") or 0)) or 0)
                except (ValueError, TypeError):
                    week_cap = 0
                score = int(graded.get("score", 0) or 0)
                rubric_max = int(graded.get("maxScore", 0) or 0)
                # 루브릭 만점과 주차 배점이 다르면 배점 기준으로 스케일한다.
                if week_cap > 0 and rubric_max > 0 and rubric_max != week_cap:
                    score = round(score / rubric_max * week_cap)
                score = max(0, min(score, week_cap if week_cap > 0 else score))
                summary = summarize_feedback({**graded, "score": score,
                                              "maxScore": week_cap if week_cap > 0 else rubric_max})
                detail = {**graded, "score": score,
                          "maxScore": week_cap if week_cap > 0 else rubric_max,
                          "week": week_no}
                from backend.sheets import save_auto_grade

                ok = save_auto_grade(
                    sheets(), str(student.get("학번", "")), week_no,
                    score, summary, detail, status="자동채점",
                )
                if ok:
                    auto_grade = detail
        except Exception as exc:
            # 자동채점은 best-effort: 실패해도 제출 자체는 유지한다.
            logger.warning("자동채점 실패(week=%s): %s", week_no, exc)
            auto_grade = None
    reload_student()

    if result.get("status") == "saved" and DRIVE_FOLDER_ID:
        try:
            from backend.week_admin import save_student_text_to_drive

            save_student_text_to_drive(
                service_account(),
                DRIVE_FOLDER_ID,
                student,
                week_no,
                content,
            )
        except Exception as exc:
            logger.warning("Drive 백업 실패: %s", exc)

    if result["status"] == "saved":
        if auto_grade is not None:
            set_flash("success", f"{week_no}주차 저장 + 자동채점 {auto_grade.get('score', 0)}/{auto_grade.get('maxScore', 0)}점")
        else:
            set_flash("success", f"{week_no}주차 포트폴리오가 저장되었습니다.")
    elif result["status"] == "duplicate":
        set_flash("info", "이미 처리된 제출입니다. 중복 저장하지 않았습니다.")
    else:
        set_flash("info", "같은 제출이 처리 중입니다. 잠시 후 결과를 확인해 주세요.")
    st.session_state.server_result = {
        "submissionId": client_id,
        "status": result["status"],
        "savedAt": result.get("saved_at", ""),
        "autoGrade": auto_grade,
    }


def handle_teacher_grade_save(event: dict[str, Any]) -> None:
    from backend.sheets import append_audit_log

    _require_teacher()
    sid = validate_student_id(event.get("studentId", ""))
    week_no = validate_week(event.get("week", 0))
    feedback = validate_feedback(event.get("feedback", ""), MAX_FEEDBACK_LENGTH)
    # 배점 상한은 저장된 포트폴리오 행 기준으로 backend에서 재검증한다.
    try:
        raw_score = int(float(str(event.get("score", 0)).strip() if isinstance(event.get("score"), str) else event.get("score", 0)))
    except (ValueError, TypeError) as exc:
        raise RuntimeError("점수는 숫자여야 합니다.") from exc
    ok = update_grade_and_feedback(
        service_account(),
        _spreadsheet_url_or_raise(),
        sid,
        week_no,
        raw_score,
        feedback,
        sheets=sheets(),
    )
    reload_teacher_preserve_query()
    try:
        append_audit_log(sheets(), "teacher", "teacher_grade_save", f"{sid}/{week_no}주", f"score={raw_score}")
    except Exception:
        pass
    set_flash(
        "success" if ok else "error",
        "점수와 피드백을 저장했습니다." if ok else "해당 포트폴리오 기록을 찾지 못했습니다.",
    )


def handle_teacher_week_save(event: dict[str, Any]) -> None:
    _require_teacher()
    from backend.week_admin import (
        extract_text_from_upload,
        upload_bytes_to_drive,
        upsert_week_setting,
    )

    week_no = validate_week(event.get("week", 0))
    goal = str(event.get("goal", "")).strip()[:500]
    prompt = str(event.get("prompt", "")).strip()[:4000]
    try:
        score = int(float(str(event.get("score", 10)).strip() if isinstance(event.get("score"), str) else event.get("score", 10)) or 10)
    except (ValueError, TypeError) as exc:
        raise RuntimeError("배점은 숫자여야 합니다.") from exc
    if not (0 <= score <= 1000):
        raise RuntimeError("배점은 0~1000 사이여야 합니다.")
    published = str(event.get("published", "Y")).strip().upper() or "Y"
    if published not in {"Y", "N"}:
        published = "Y"
    file_name = str(event.get("fileName", "")).strip()[:200]
    file_b64 = str(event.get("fileBase64", "")).strip()
    mime = str(event.get("mimeType", "application/octet-stream")).strip()[:120]
    if file_b64 and len(file_b64) > 12_000_000:
        raise RuntimeError("업로드 파일이 너무 큽니다. 9MB 이하로 올려주세요.")

    material_url = ""
    final_prompt = prompt

    if file_b64 and file_name:
        try:
            raw = base64.b64decode(file_b64, validate=True)
        except Exception as exc:
            raise RuntimeError("업로드 파일이 올바르지 않습니다.") from exc
        if len(raw) > 9_000_000:
            raise RuntimeError("업로드 파일이 너무 큽니다. 9MB 이하로 올려주세요.")
        if DRIVE_FOLDER_ID:
            material_url = upload_bytes_to_drive(
                service_account(),
                DRIVE_FOLDER_ID,
                f"week{week_no}_{file_name}",
                raw,
                mime_type=mime or "application/octet-stream",
            )

        class _MemFile:
            def __init__(self, name: str, data: bytes):
                self.name = name
                self._data = data

            def read(self):
                return self._data

        extracted = extract_text_from_upload(_MemFile(file_name, raw))
        if not final_prompt and extracted:
            final_prompt = extracted[:4000]

    if not goal and not final_prompt:
        raise RuntimeError("학습목표 또는 활동지 내용이 필요합니다.")

    rubric_raw = event.get("rubricJson", event.get("rubric", None))
    if rubric_raw is None:
        rubric_text = None  # 기존 루브릭 유지
    elif isinstance(rubric_raw, dict):
        import json as _json

        rubric_text = _json.dumps(rubric_raw, ensure_ascii=False)[:20000]
    else:
        rubric_text = str(rubric_raw or "").strip()[:20000]
        if rubric_text == "":
            rubric_text = ""  # 명시적 비움: 루브릭 삭제

    upsert_week_setting(
        sheets(),
        week_no,
        goal or f"{week_no}주차 학습",
        final_prompt or goal,
        score=score,
        published=published,
        material_url=material_url[:2000],
        rubric_json=rubric_text,
    )
    reload_teacher()
    set_flash("success", f"{week_no}주차 포트폴리오 설정이 저장되었습니다.")


def handle_teacher_worksheet_load(event: dict[str, Any]) -> None:
    _require_teacher()
    from backend.worksheet_admin import load_worksheet

    week_no = validate_week(event.get("week", 1))
    st.session_state.uploadResult = None
    st.session_state.worksheet = load_worksheet(sheets(), week_no)
    set_flash("success", f"{week_no}주차 학습지를 불러왔습니다.")


def handle_teacher_worksheet_save(event: dict[str, Any]) -> None:
    _require_teacher()
    from backend.worksheet_admin import save_worksheet

    ws = event.get("worksheet", {}) or {}
    if not isinstance(ws, dict):
        raise RuntimeError("학습지 형식이 올바르지 않습니다.")
    saved_at = save_worksheet(sheets(), ws)
    ws["updatedAt"] = saved_at
    st.session_state.worksheet = ws
    set_flash("success", f"{ws.get('week')}주차 학습지가 Sheets에 저장됐습니다.")


def handle_teacher_worksheet_image(event: dict[str, Any]) -> None:
    _require_teacher()
    from backend.worksheet_admin import upload_image_to_drive

    week_no = validate_week(event.get("week", 1))
    file_name = str(event.get("fileName", "image.png")).strip()[:200] or "image.png"
    mime = str(event.get("mimeType", "image/png") or "image/png").strip()[:120]
    if mime not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
        raise RuntimeError("지원 이미지 형식: png, jpeg, webp, gif")
    b64 = str(event.get("fileBase64", "") or "")
    if not b64:
        raise RuntimeError("업로드할 이미지가 없습니다.")
    if len(b64) > 12_000_000:
        raise RuntimeError("이미지가 너무 큽니다. 9MB 이하로 올려주세요.")
    try:
        raw = base64.b64decode(b64, validate=True)
    except Exception as exc:
        raise RuntimeError("이미지 파일이 올바르지 않습니다.") from exc
    if len(raw) > 9_000_000:
        raise RuntimeError("이미지가 너무 큽니다. 9MB 이하로 올려주세요.")
    if not DRIVE_FOLDER_ID:
        raise RuntimeError("DRIVE_FOLDER_ID가 설정되지 않아 업로드할 수 없습니다.")
    res = upload_image_to_drive(
        service_account(),
        DRIVE_FOLDER_ID,
        f"W{week_no}_{file_name}",
        raw,
        mime,
    )
    st.session_state.uploadResult = res
    set_flash("success", "이미지가 Drive에 업로드됐습니다.")


def handle_teacher_game_save(event: dict[str, Any]) -> None:
    _require_teacher()
    from backend.game_store import is_visual_type, save_config

    config = event.get("config", {}) or {}
    if not isinstance(config, dict):
        raise RuntimeError("게임 설정 형식이 올바르지 않습니다.")
    if is_visual_type(config.get("type", config.get("게임유형", ""))):
        raise RuntimeError("실습(시각화) 설정은 실습 관리에서 저장해 주세요.")
    save_config(sheets(), config)
    try:
        week_no = validate_week(config.get("week", config.get("주차", 0)))
    except ValueError:
        week_no = config.get("week")
    set_flash("success", f"{week_no}주차 게임이 저장됐습니다.")


def handle_teacher_game_toggle(event: dict[str, Any]) -> None:
    _require_teacher()
    from backend.game_store import set_enabled

    week_no = validate_week(event.get("week", 0))
    enabled = bool(event.get("enabled", False))
    set_enabled(sheets(), week_no, enabled)
    state = "활성화" if event.get("enabled") else "비활성화"
    set_flash("success", f"{week_no}주차 게임 {state}.")


def handle_student_game_submit(event: dict[str, Any]) -> None:
    from backend.game_store import submit_record

    student = _require_student()
    if not isinstance(event, dict):
        raise RuntimeError("게임 제출 형식이 올바르지 않습니다.")
    result = submit_record(sheets(), student, event)
    st.session_state.server_result = {
        "recordId": str(event.get("recordId", ""))[:128],
        "status": "saved",
        "score": result["score"],
        "best": result["best"],
        "savedAt": result["savedAt"],
    }
    set_flash(
        "success",
        f"{result['week']}주차 게임 저장! 점수 {result['score']}점 "
        f"(최고 {result['best']}점, {result['tries']}회차)",
    )


def handle_teacher_visual_save(event: dict[str, Any]) -> None:
    from backend.game_store import VISUAL_TYPES, save_config
    from backend.sheets import append_audit_log

    _require_teacher()
    config = event.get("config", {}) or {}
    if not isinstance(config, dict):
        raise RuntimeError("실습 설정 형식이 올바르지 않습니다.")
    vtype = str(config.get("type", config.get("게임유형", ""))).strip()
    if vtype not in VISUAL_TYPES:
        raise RuntimeError("알 수 없는 실습 유형입니다.")
    save_config(sheets(), config)
    try:
        week_no = validate_week(config.get("week", config.get("주차", 0)))
    except ValueError:
        week_no = config.get("week")
    try:
        append_audit_log(sheets(), "teacher", "teacher_visual_save", f"{week_no}주/{vtype}", "")
    except Exception:
        pass
    set_flash("success", f"{week_no}주차 실습({vtype})이 저장됐습니다.")


def handle_student_visual_log(event: dict[str, Any]) -> None:
    from backend.game_store import log_visual_result

    student = _require_student()
    if not isinstance(event, dict):
        raise RuntimeError("실습 기록 형식이 올바르지 않습니다.")
    result = log_visual_result(sheets(), student, event)
    st.session_state.server_result = {
        "recordId": str(event.get("recordId", ""))[:128],
        "status": "saved",
        "visualType": result["visualType"],
        "completed": result["completed"],
        "steps": result["steps"],
        "durationSec": result["durationSec"],
        "tries": result["tries"],
        "savedAt": result["savedAt"],
    }
    if result["completed"]:
        set_flash(
            "success",
            f"{result['week']}주차 실습 완료! {result['steps']}단계·{result['durationSec']}초 "
            f"({result['tries']}회차)",
        )
    else:
        set_flash("info", f"{result['week']}주차 실습 기록이 저장됐습니다. 완료 버튼으로 마무리해 보세요.")


def handle_teacher_refresh() -> None:
    from backend.sheets import append_audit_log

    _require_teacher()
    reload_teacher()
    try:
        append_audit_log(sheets(), "teacher", "teacher_refresh", "", "")
    except Exception:
        pass
    set_flash("success", "Google Sheets 데이터를 새로 불러왔습니다.")


def handle_teacher_search(event: dict[str, Any]) -> None:
    """교사 검색/필터/페이지 변경. Sheets 재조회 없이 메모리 필터라 즉시 반영."""
    _require_teacher()
    q = st.session_state.get("teacher_query") or {}
    if not isinstance(event, dict):
        raise RuntimeError("검색 형식이 올바르지 않습니다.")
    # query 키가 있으면 전체 교체, 없으면 부분 업데이트(페이지 이동 등)
    if "query" in event and isinstance(event.get("query"), dict):
        incoming = event.get("query") or {}
        q = {
            "search": str(incoming.get("search", "") or "")[:100],
            "grade": str(incoming.get("grade", "") or "")[:10],
            "klass": str(incoming.get("klass", "") or "")[:10],
            "week": str(incoming.get("week", "") or "")[:10],
            "onlyUngraded": bool(incoming.get("onlyUngraded", False)),
            "page": incoming.get("page", 1),
        }
    else:
        for key in ("search", "grade", "klass", "week"):
            if key in event:
                q[key] = str(event.get(key) or "")[:100 if key == "search" else 10]
        if "onlyUngraded" in event:
            q["onlyUngraded"] = bool(event.get("onlyUngraded"))
        if "page" in event:
            q["page"] = event.get("page", 1)
        # 필터가 바뀌면 1페이지로, 페이지 키만 오면 유지
        if any(k in event for k in ("search", "grade", "klass", "week", "onlyUngraded", "query")):
            if "page" not in event:
                q["page"] = 1
    try:
        q["page"] = max(1, int(q.get("page", 1)))
    except (ValueError, TypeError):
        q["page"] = 1
    st.session_state.teacher_query = q


def handle_teacher_bulk_grade(event: dict[str, Any]) -> None:
    from backend.sheets import append_audit_log, bulk_update_grades

    _require_teacher()
    items = event.get("items", [])
    if not isinstance(items, list) or not items:
        raise RuntimeError("일괄 평가 대상이 없습니다.")
    result = bulk_update_grades(
        service_account(), _spreadsheet_url_or_raise(), items, sheets=sheets()
    )
    # 쿼리 유지한 채 새로고침
    reload_teacher_preserve_query()
    try:
        append_audit_log(
            sheets(), "teacher", "teacher_bulk_grade",
            f"{result.get('updated', 0)}건",
            f"notFound={len(result.get('notFound', []))}",
        )
    except Exception:
        pass
    if result.get("notFound"):
        set_flash("success", f"{result['updated']}건 저장, {len(result['notFound'])}건은 기록을 찾지 못했습니다.")
    else:
        set_flash("success", f"{result['updated']}건 점수와 피드백을 저장했습니다.")
    st.session_state.server_result = {
        "status": "bulk_saved",
        "updated": result.get("updated", 0),
        "notFound": result.get("notFound", []),
        "savedAt": result.get("savedAt", ""),
    }


def handle_teacher_export_csv(event: dict[str, Any]) -> None:
    from backend.sheets import append_audit_log, build_teacher_csv, query_portfolio

    _require_teacher()
    q = st.session_state.get("teacher_query") or {}
    # 현재 필터 전체(페이지 무관)를 CSV로 내보낸다. 최대 5000건으로 제한.
    filtered = query_portfolio(
        st.session_state.all_portfolio,
        search=str(q.get("search", "") or ""),
        grade=str(q.get("grade", "") or ""),
        klass=str(q.get("klass", "") or ""),
        week=str(q.get("week", "") or ""),
        only_ungraded=bool(q.get("onlyUngraded", False)),
        page=1, page_size=100,
    )
    # 페이지 크기 상한(100) 때문에 전체가 필요하면 직접 필터 재구성
    from backend.sheets import match_teacher_query

    full = [
        r for r in st.session_state.all_portfolio
        if match_teacher_query(
            r, str(q.get("search", "") or ""), str(q.get("grade", "") or ""),
            str(q.get("klass", "") or ""), str(q.get("week", "") or ""),
            bool(q.get("onlyUngraded", False)),
        )
    ][:5000]
    csv_text = build_teacher_csv(full, st.session_state.students)
    st.session_state.csv_export = {
        "csv": csv_text,
        "count": len(full),
        "generatedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "filename": "포트폴리오_성적표.csv",
    }
    try:
        append_audit_log(sheets(), "teacher", "teacher_export_csv", f"{len(full)}건", "")
    except Exception:
        pass
    set_flash("success", f"CSV {len(full)}건을 준비했습니다. 다운로드 버튼을 눌러 저장하세요.")
    st.session_state.server_result = {"status": "csv_ready", "count": len(full)}


def reload_teacher_preserve_query() -> None:
    q = st.session_state.get("teacher_query")
    reload_teacher()
    if isinstance(q, dict):
        st.session_state.teacher_query = q


def handle_logout() -> None:
    st.session_state.role = None
    st.session_state.student = None
    st.session_state.weeks = []
    st.session_state.student_portfolio = []
    st.session_state.all_portfolio = []
    st.session_state.students = []
    st.session_state.worksheet = None
    st.session_state.uploadResult = None
    st.session_state.teacher_query = {"search": "", "grade": "", "klass": "", "week": "", "onlyUngraded": False, "page": 1}
    st.session_state.csv_export = None
    set_flash("success", "로그아웃되었습니다.")


_ACTION_HANDLERS = {
    "student_login": lambda event: handle_student_login(event),
    "teacher_login": lambda event: handle_teacher_login(event),
    "student_submit": lambda event: handle_student_submit(event),
    "teacher_grade_save": lambda event: handle_teacher_grade_save(event),
    "teacher_week_save": lambda event: handle_teacher_week_save(event),
    "teacher_worksheet_load": lambda event: handle_teacher_worksheet_load(event),
    "teacher_worksheet_save": lambda event: handle_teacher_worksheet_save(event),
    "teacher_worksheet_image": lambda event: handle_teacher_worksheet_image(event),
    "teacher_game_save": lambda event: handle_teacher_game_save(event),
    "teacher_game_toggle": lambda event: handle_teacher_game_toggle(event),
    "student_game_submit": lambda event: handle_student_game_submit(event),
    "teacher_visual_save": lambda event: handle_teacher_visual_save(event),
    "student_visual_log": lambda event: handle_student_visual_log(event),
    "teacher_refresh": lambda event: handle_teacher_refresh(),
    "teacher_search": lambda event: handle_teacher_search(event),
    "teacher_bulk_grade": lambda event: handle_teacher_bulk_grade(event),
    "teacher_export_csv": lambda event: handle_teacher_export_csv(event),
    "logout": lambda event: handle_logout(),
}


def process_event(event: Any) -> bool:
    if isinstance(event, str):
        try:
            event = json.loads(event)
        except Exception:
            return False

    if not isinstance(event, dict):
        return False

    event_id = str(event.get("eventId", "")).strip()
    action = str(event.get("action", "")).strip()
    if not event_id or not action:
        return False
    if len(event_id) > 128 or len(action) > 64:
        return False
    if event_id == st.session_state.last_event_id:
        return False

    st.session_state.last_event_id = event_id
    st.session_state.flash = None
    st.session_state.server_result = None

    try:
        handler = _ACTION_HANDLERS.get(action)
        if handler is None:
            raise RuntimeError(f"알 수 없는 요청입니다: {action}")
        handler(event)
    except Exception as exc:
        _report_error(action, exc, prefix="E-P1")

    return True


event = portfolio_component(
    **build_payload(),
    default=None,
    key="technical_home_portfolio",
)

if process_event(event):
    st.rerun()
