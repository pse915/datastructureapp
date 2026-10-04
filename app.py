from __future__ import annotations

import base64
import hashlib
import json
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

st.set_page_config(
    page_title="DS Blackboard — 자료구조 학습 대시보드",
    page_icon="🧱",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# =====================================================================
# Streamlit Custom Component 선언 (로딩 오류 해결 핵심 블록)
# ---------------------------------------------------------------------
# 오류: "Your app is having trouble loading the app.X component ..."
# 원인 3종과 해결:
#  1) npm run build 미실행  → frontend/build/index.html 없음
#     → 아래 REQUIRED_FILES 검사에서 즉시 감지 + 해결 명령어 안내
#  2) path에 상대경로/잘못된 폴더(dist/raw-jsx) 지정
#     → _RELEASE=True일 때 app.py 기준 절대경로(ROOT/frontend/build) 사용
#  3) dev server URL 처리 미흡
#     → _RELEASE=False + STREAMLIT_COMPONENT_DEV_URL 환경변수로만 dev 접속
# 컴포넌트 이름은 URL 경로에 들어가므로 점(.) 없이 영문+언더스코어만 사용.
# =====================================================================
COMPONENT_NAME = "ds_black_dashboard"

_RELEASE = os.getenv("DS_COMPONENT_RELEASE", "1").strip() not in ("0", "false", "False")
_DEV_URL = os.getenv("STREAMLIT_COMPONENT_DEV_URL", "").strip()  # 예: http://localhost:3001

ROOT = Path(__file__).parent.absolute()
BUILD_DIR = ROOT / "frontend" / "build"  # vite build --outDir build 결과물 위치
REQUIRED_FILES = ("index.html",)  # 빌드 산출물 필수 파일 (JS/CSS는 index.html이 참조)

if not _RELEASE and _DEV_URL:
    # 로컬 React 개발 모드: 터미널1) cd frontend && npm run dev (3001 포트)
    ds_component = components.declare_component(COMPONENT_NAME, url=_DEV_URL)
else:
    missing = [f for f in REQUIRED_FILES if not (BUILD_DIR / f).exists()]
    if missing:
        raise RuntimeError(
            "React 컴포넌트 빌드 산출물이 없습니다: "
            + ", ".join(f"frontend/build/{f}" for f in missing)
            + " | 해결: cd frontend && npm install && npm run build"
            + " (vite.config.js의 outDir이 'build'인지 확인) 후 Streamlit 재실행."
        )
    ds_component = components.declare_component(COMPONENT_NAME, path=str(BUILD_DIR))


SPREADSHEET_URL = str(
    st.secrets.get(
        "SPREADSHEET_URL",
        "https://docs.google.com/spreadsheets/d/1rxM6EX8tR7XE6pW2y4QU72oS29WVGqUwac300U81-hs/edit",
    )
)
DRIVE_FOLDER_ID = str(st.secrets.get("DRIVE_FOLDER_ID", "")).strip()

DS_UNITS = ["array", "linkedlist", "stack", "queue", "tree", "graph", "sort", "hash"]


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
        "ds_solved": [],
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


init_state()


def service_account():
    if "gcp_service_account" not in st.secrets:
        raise RuntimeError("Streamlit Secrets에 [gcp_service_account]가 없습니다.")
    return st.secrets["gcp_service_account"]


def sheets():
    if st.session_state.sheets is None:
        st.session_state.sheets = prepare_sheets(service_account(), SPREADSHEET_URL)
    return st.session_state.sheets


def reload_student(student: dict[str, Any] | None = None) -> None:
    if student is None:
        student = find_student(sheets(), st.session_state.student["학번"])
    if not student:
        raise RuntimeError("로그인한 학생 정보를 학생명단에서 다시 확인할 수 없습니다.")
    st.session_state.student = student
    s = sheets()
    st.session_state.student_portfolio = get_student_portfolio(s, student["학번"])
    st.session_state.weeks = get_week_settings(s)
    # DS 해결 상태 복원 (Sheets 실패 시 빈 상태로 시작 — 저장은 ds_store 로컬 폴백)
    try:
        from backend.ds_store import load_student_solved

        st.session_state.ds_solved = load_student_solved(s, str(student["학번"]))
    except Exception:
        st.session_state.ds_solved = st.session_state.get("ds_solved", [])


def reload_teacher() -> None:
    s = sheets()
    st.session_state.students = s[STUDENT_SHEET].get_all_records()
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


def student_summary_rows() -> list[dict[str, Any]]:
    records = {
        int(str(row.get("주차"))): row
        for row in st.session_state.student_portfolio
        if str(row.get("주차", "")).isdigit()
    }
    rows = []
    for week in range(1, 18):
        row = records.get(week)
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
            }
        )
    return rows


def teacher_dashboard() -> dict[str, Any]:
    students = st.session_state.students
    portfolio = st.session_state.all_portfolio
    df = pd.DataFrame(portfolio)

    if df.empty:
        return {
            "students": students,
            "totalStudents": len(students),
            "submittedStudents": 0,
            "submissionRate": 0,
            "averageScore": 0,
            "classStats": [],
            "portfolio": [],
        }

    for col in ("점수", "배점"):
        df[col] = pd.to_numeric(df.get(col), errors="coerce")

    total_students = len(students)
    submitted_students = df["학번"].astype(str).nunique() if "학번" in df else 0
    average_score = float(df["점수"].dropna().mean()) if df["점수"].notna().any() else 0

    if "학년" in df.columns and "반" in df.columns:
        grouped = (
            df.groupby(["학년", "반"], dropna=False)
            .agg(제출건수=("학번", "size"), 평균점수=("점수", "mean"))
            .reset_index()
        )
        class_stats = [
            {
                "학년": str(r["학년"]),
                "반": str(r["반"]),
                "제출건수": int(r["제출건수"]),
                "평균점수": round(
                    float(r["평균점수"]) if pd.notna(r["평균점수"]) else 0, 1
                ),
            }
            for _, r in grouped.iterrows()
        ]
    else:
        class_stats = []

    return {
        "students": students,
        "totalStudents": total_students,
        "submittedStudents": int(submitted_students),
        "submissionRate": round(
            (submitted_students / total_students * 100) if total_students else 0, 1
        ),
        "averageScore": round(average_score, 1),
        "classStats": class_stats,
        "portfolio": portfolio,
    }


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


def build_ds_payload() -> dict[str, Any] | None:
    """DS 단원 해결 상태. 학생에게만 전달."""
    if st.session_state.role != "student" or not st.session_state.student:
        return None
    solved = [u for u in (st.session_state.get("ds_solved") or []) if u in DS_UNITS]
    return {"units": DS_UNITS, "solved": solved}


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
        "ds": build_ds_payload(),
    }
    try:
        json.dumps(payload, ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise RuntimeError(f"React component args가 JSON 직렬화되지 않습니다: {exc}") from exc
    return payload


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
    if event_id == st.session_state.last_event_id:
        return False

    st.session_state.last_event_id = event_id
    st.session_state.flash = None
    st.session_state.server_result = None

    try:
        if action == "student_login":
            sid = str(event.get("studentId", "")).strip()
            if not sid.isdigit():
                set_flash("error", "학번은 숫자로 입력해 주세요.")
            else:
                student = find_student(sheets(), sid)
                if not student:
                    set_flash("error", "학생명단에서 해당 학번을 찾지 못했습니다.")
                else:
                    st.session_state.role = "student"
                    st.session_state.student = student
                    reload_student(student)
                    set_flash(
                        "success",
                        f"{student.get('이름', '학생')}님, 로그인되었습니다.",
                    )

        elif action == "teacher_login":
            password = str(event.get("password", ""))
            expected = str(st.secrets.get("TEACHER_PASSWORD", ""))
            if expected and password == expected:
                st.session_state.role = "teacher"
                st.session_state.student = None
                reload_teacher()
                set_flash("success", "교사 관리자 모드로 로그인되었습니다.")
            else:
                set_flash("error", "교사용 비밀번호가 올바르지 않습니다.")

        elif action == "student_submit":
            if st.session_state.role != "student" or not st.session_state.student:
                raise RuntimeError("학생 로그인 상태가 아닙니다.")
            week_no = int(event.get("week", 0))
            week = next(
                (w for w in st.session_state.weeks if int(w["주차"]) == week_no),
                None,
            )
            if not week:
                raise RuntimeError("제출할 수 없는 주차입니다.")

            content = str(event.get("content", "")).strip()
            if not content:
                raise RuntimeError("포트폴리오 내용을 입력해 주세요.")

            client_id = str(event.get("submissionId", "")).strip()
            if not client_id:
                raise RuntimeError("제출 식별자가 없습니다. 다시 제출해 주세요.")
            server_id = make_server_submission_id(
                str(st.session_state.student["학번"]), week_no, client_id
            )
            result = save_portfolio_submission(
                service_account(),
                SPREADSHEET_URL,
                st.session_state.student,
                week,
                content,
                server_id,
                sheets=sheets(),
            )
            reload_student()

            if result.get("status") == "saved" and DRIVE_FOLDER_ID:
                try:
                    from backend.week_admin import save_student_text_to_drive

                    save_student_text_to_drive(
                        service_account(),
                        DRIVE_FOLDER_ID,
                        st.session_state.student,
                        week_no,
                        content,
                    )
                except Exception:
                    pass

            if result["status"] == "saved":
                set_flash("success", f"{week_no}주차 포트폴리오가 저장되었습니다.")
            elif result["status"] == "duplicate":
                set_flash("info", "이미 처리된 제출입니다. 중복 저장하지 않았습니다.")
            else:
                set_flash(
                    "info",
                    "같은 제출이 처리 중입니다. 잠시 후 결과를 확인해 주세요.",
                )
            st.session_state.server_result = {
                "submissionId": client_id,
                "status": result["status"],
                "savedAt": result.get("saved_at", ""),
            }

        elif action == "teacher_grade_save":
            if st.session_state.role != "teacher":
                raise RuntimeError("교사 모드가 아닙니다.")
            sid = str(event.get("studentId", "")).strip()
            week_no = int(event.get("week", 0))
            score = int(event.get("score", 0))
            feedback = str(event.get("feedback", ""))
            ok = update_grade_and_feedback(
                service_account(),
                SPREADSHEET_URL,
                sid,
                week_no,
                score,
                feedback,
                sheets=sheets(),
            )
            reload_teacher()
            set_flash(
                "success" if ok else "error",
                "점수와 피드백을 저장했습니다."
                if ok
                else "해당 포트폴리오 기록을 찾지 못했습니다.",
            )

        elif action == "teacher_week_save":
            if st.session_state.role != "teacher":
                raise RuntimeError("교사 모드가 아닙니다.")

            from backend.week_admin import (
                extract_text_from_upload,
                upload_bytes_to_drive,
                upsert_week_setting,
            )

            week_no = int(event.get("week", 0))
            goal = str(event.get("goal", "")).strip()
            prompt = str(event.get("prompt", "")).strip()
            score = int(event.get("score", 10) or 10)
            published = str(event.get("published", "Y")).strip() or "Y"
            file_name = str(event.get("fileName", "")).strip()
            file_b64 = str(event.get("fileBase64", "")).strip()
            mime = str(event.get("mimeType", "application/octet-stream")).strip()

            material_url = ""
            final_prompt = prompt

            if file_b64 and file_name:
                raw = base64.b64decode(file_b64)
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

            upsert_week_setting(
                sheets(),
                week_no,
                goal or f"{week_no}주차 학습",
                final_prompt or goal,
                score=score,
                published=published,
                material_url=material_url,
            )
            reload_teacher()
            set_flash("success", f"{week_no}주차 포트폴리오 설정이 저장되었습니다.")

        elif action == "teacher_worksheet_load":
            from backend.worksheet_admin import load_worksheet

            st.session_state.uploadResult = None
            st.session_state.worksheet = load_worksheet(
                sheets(), int(event.get("week", 1))
            )
            set_flash("success", f"{event.get('week', 1)}주차 학습지를 불러왔습니다.")

        elif action == "teacher_worksheet_save":
            from backend.worksheet_admin import save_worksheet

            ws = event.get("worksheet", {}) or {}
            saved_at = save_worksheet(sheets(), ws)
            ws["updatedAt"] = saved_at
            st.session_state.worksheet = ws
            set_flash("success", f"{ws.get('week')}주차 학습지가 Sheets에 저장됐습니다.")

        elif action == "teacher_worksheet_image":
            from backend.worksheet_admin import upload_image_to_drive

            raw = base64.b64decode(event.get("fileBase64", "") or "")
            res = upload_image_to_drive(
                service_account(),
                DRIVE_FOLDER_ID,
                f"W{event.get('week')}_{event.get('fileName', 'image.png')}",
                raw,
                event.get("mimeType", "image/png") or "image/png",
            )
            st.session_state.uploadResult = res
            set_flash("success", "이미지가 Drive에 업로드됐습니다.")

        elif action == "teacher_game_save":
            from backend.game_store import save_config

            if st.session_state.role != "teacher":
                raise RuntimeError("교사 모드가 아닙니다.")
            config = event.get("config", {}) or {}
            save_config(sheets(), config)
            set_flash("success", f"{config.get('week')}주차 게임이 저장됐습니다.")

        elif action == "teacher_game_toggle":
            from backend.game_store import set_enabled

            if st.session_state.role != "teacher":
                raise RuntimeError("교사 모드가 아닙니다.")
            set_enabled(sheets(), int(event.get("week", 0)),
                        bool(event.get("enabled", False)))
            state = "활성화" if event.get("enabled") else "비활성화"
            set_flash("success", f"{event.get('week')}주차 게임 {state}.")

        elif action == "student_game_submit":
            from backend.game_store import submit_record

            if st.session_state.role != "student" or not st.session_state.student:
                raise RuntimeError("학생 로그인 상태가 아닙니다.")
            result = submit_record(sheets(), st.session_state.student, event)
            st.session_state.server_result = {
                "recordId": str(event.get("recordId", "")),
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

        elif action == "ds_quiz_submit":
            from backend.ds_store import submit_ds_result

            if st.session_state.role != "student" or not st.session_state.student:
                raise RuntimeError("학생 로그인 상태가 아닙니다.")
            unit_id = str(event.get("unitId", "")).strip()
            if unit_id not in DS_UNITS:
                raise RuntimeError(f"알 수 없는 단원입니다: {unit_id}")
            result = submit_ds_result(sheets(), st.session_state.student, event)
            solved = st.session_state.get("ds_solved") or []
            if unit_id not in solved:
                st.session_state.ds_solved = [*solved, unit_id]
            st.session_state.server_result = {
                "recordId": str(event.get("recordId", "")),
                "status": "saved",
                "solvedUnit": unit_id,
                "score": result.get("score", 0),
                "savedAt": result.get("savedAt", ""),
            }
            set_flash("success", f"{unit_id} 단원 퀴즈 해결! 진행도가 저장됐습니다.")

        elif action == "teacher_refresh":
            if st.session_state.role != "teacher":
                raise RuntimeError("교사 모드가 아닙니다.")
            reload_teacher()
            set_flash("success", "Google Sheets 데이터를 새로 불러왔습니다.")

        elif action == "teacher_export_app":
            # 설정 모달의 "app.py 파일 다운로드": 서버 파일 원문을 그대로 전달
            # (iframe 안에서 서버 파일에 직접 접근할 수 없으므로 payload 경유)
            source = Path(__file__).read_text(encoding="utf-8")
            st.session_state.server_result = {
                "recordId": str(event.get("eventId", "")),
                "status": "exported",
                "appPy": source,
            }
            set_flash("success", "app.py 원문을 내려보냅니다.")

        elif action == "logout":
            st.session_state.role = None
            st.session_state.student = None
            st.session_state.weeks = []
            st.session_state.student_portfolio = []
            st.session_state.all_portfolio = []
            st.session_state.students = []
            st.session_state.worksheet = None
            st.session_state.uploadResult = None
            st.session_state.ds_solved = []
            set_flash("success", "로그아웃되었습니다.")

        else:
            raise RuntimeError(f"알 수 없는 요청입니다: {action}")

    except Exception as exc:
        set_flash("error", str(exc))

    return True


# 최초 로드 시 컴포넌트 값이 None이면 이벤트 처리 없이 대기한다.
# (None을 process_event에 넣으면 last_event_id 오염 없이 패스됨)
event = ds_component(
    **build_payload(),
    default=None,
    key="ds_black_dashboard",
)

if process_event(event):
    st.rerun()
