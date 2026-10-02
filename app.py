from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

from backend.sheets import (
    STUDENT_SHEET,
    get_all_portfolio,
    get_student_portfolio,
    get_week_settings,
    find_student,
    prepare_sheets,
    save_portfolio_submission,
    update_grade_and_feedback,
)

st.set_page_config(
    page_title="기술·가정 포트폴리오",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="collapsed",
)

ROOT = Path(__file__).parent
BUILD_DIR = ROOT / "frontend" / "dist"
SPREADSHEET_URL = str(
    st.secrets.get(
        "SPREADSHEET_URL",
        "https://docs.google.com/spreadsheets/d/1rxM6EX8tR7XE6pW2y4QU72oS29WVGqUwac300U81-hs/edit",
    )
)

# React가 화면 전체를 담당하는 Streamlit Custom Component.
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


def reload_student() -> None:
    student = find_student(sheets(), st.session_state.student["학번"])
    if not student:
        raise RuntimeError("로그인한 학생 정보를 학생명단에서 다시 확인할 수 없습니다.")
    st.session_state.student = student
    st.session_state.student_portfolio = get_student_portfolio(
        sheets(), student["학번"]
    )
    st.session_state.weeks = get_week_settings(sheets())


def reload_teacher() -> None:
    s = sheets()
    st.session_state.students = s[STUDENT_SHEET].get_all_records()
    st.session_state.all_portfolio = get_all_portfolio(s)
    st.session_state.weeks = get_week_settings(s)


def set_flash(kind: str, text: str) -> None:
    st.session_state.flash = {"type": kind, "text": text}


def clear_flash_after_render() -> None:
    # React에 한 번 보여준 메시지는 다음 이벤트에서 새 메시지로 교체합니다.
    st.session_state.flash = None


def make_server_submission_id(student_id: str, week: int, client_id: str) -> str:
    """클라이언트 ID를 그대로 신뢰하지 않고 서버에서도 안정적인 저장 키를 만든다."""
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
                "평균점수": round(float(r["평균점수"]) if pd.notna(r["평균점수"]) else 0, 1),
            }
            for _, r in grouped.iterrows()
        ]
    else:
        class_stats = []

    return {
        "students": students,
        "totalStudents": total_students,
        "submittedStudents": int(submitted_students),
        "submissionRate": round((submitted_students / total_students * 100) if total_students else 0, 1),
        "averageScore": round(average_score, 1),
        "classStats": class_stats,
        "portfolio": portfolio,
    }


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
    }
    return payload


def process_event(event: Any) -> bool:
    """React의 이벤트를 정확히 한 번만 처리합니다.

    Streamlit rerun 뒤에도 component가 마지막 값을 다시 전달할 수 있으므로
    eventId를 세션에 기록하여 동일 이벤트의 재처리를 차단합니다.
    """
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
                    reload_student()
                    set_flash("success", f"{student.get('이름', '학생')}님, 로그인되었습니다.")

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
            week = next((w for w in st.session_state.weeks if int(w["주차"]) == week_no), None)
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
            if result["status"] == "saved":
                set_flash("success", f"{week_no}주차 포트폴리오가 저장되었습니다.")
            elif result["status"] == "duplicate":
                set_flash("info", "이미 처리된 제출입니다. 중복 저장하지 않았습니다.")
            else:
                set_flash("info", "같은 제출이 처리 중입니다. 잠시 후 결과를 확인해 주세요.")
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
                service_account(), SPREADSHEET_URL, sid, week_no, score, feedback, sheets=sheets()
            )
            reload_teacher()
            set_flash("success" if ok else "error", "점수와 피드백을 저장했습니다." if ok else "해당 포트폴리오 기록을 찾지 못했습니다.")

        elif action == "teacher_refresh":
            if st.session_state.role != "teacher":
                raise RuntimeError("교사 모드가 아닙니다.")
            reload_teacher()
            set_flash("success", "Google Sheets 데이터를 새로 불러왔습니다.")

        elif action == "logout":
            st.session_state.role = None
            st.session_state.student = None
            st.session_state.weeks = []
            st.session_state.student_portfolio = []
            st.session_state.all_portfolio = []
            st.session_state.students = []
            set_flash("success", "로그아웃되었습니다.")

        else:
            raise RuntimeError(f"알 수 없는 요청입니다: {action}")

    except Exception as exc:
        set_flash("error", str(exc))

    return True


# Component가 이전 값을 다시 전달하더라도 eventId가 같으면 한 번만 처리됩니다.
event = portfolio_component(args=build_payload(), key="technical_home_portfolio")
if process_event(event):
    st.rerun()

# 최종 화면은 React component 하나만 렌더링합니다. Streamlit의 st.title/st.tabs/
# st.dataframe/st.text_area 등은 사용하지 않으므로 화면 UI가 Streamlit CSS에 종속되지 않습니다.
