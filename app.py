from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import io
import json

import pandas as pd
import plotly.express as px
import streamlit as st
import streamlit.components.v1 as components

from backend.sheets import (
    PORTFOLIO,
    STUDENT_SHEET,
    WEEK_SHEET,
    get_student_portfolio,
    get_week_settings,
    get_all_portfolio,
    prepare_sheets,
    find_student,
    save_portfolio_submission,
    update_grade_and_feedback,
)

st.set_page_config(page_title="기술·가정 포트폴리오", page_icon="📚", layout="wide", initial_sidebar_state="collapsed")

ROOT = Path(__file__).parent
BUILD_DIR = ROOT / "frontend" / "dist"
SPREADSHEET_URL = str(st.secrets.get("SPREADSHEET_URL", "https://docs.google.com/spreadsheets/d/1TM-90ev9Weibwqnq1xOhOQZCP78kNHANF_p4W2XZJMo/edit"))


def init_state():
    defaults = {
        "role": None,
        "student": None,
        "sheets": None,
        "student_rows": [],
        "week_rows": [],
        "portfolio_rows": [],
        "processed_submission_ids": set(),
        "last_action_message": "",
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


init_state()


def service_account():
    if "gcp_service_account" not in st.secrets:
        st.error("Streamlit Secrets에 [gcp_service_account]가 없습니다.")
        st.stop()
    return st.secrets["gcp_service_account"]


def sheets():
    if st.session_state.sheets is None:
        st.session_state.sheets = prepare_sheets(service_account(), SPREADSHEET_URL)
    return st.session_state.sheets


def reload_student():
    s = sheets()
    student = find_student(s, st.session_state.student["학번"])
    st.session_state.student = student
    st.session_state.portfolio_rows = get_student_portfolio(s, student["학번"])
    st.session_state.week_rows = get_week_settings(s)


def make_submission_id(student_id: str, week: int, content: str) -> str:
    # 한 번의 클릭 이벤트마다 고유 ID를 만들되, 재렌더링에서는 다시 만들지 않습니다.
    raw = f"{student_id}|{week}|{datetime.now(timezone.utc).isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def student_login():
    st.markdown("# 📚 기술·가정 포트폴리오")
    st.caption("1~17주차 학습 기록과 교사 피드백을 한 곳에서 관리합니다.")
    with st.form("student_login"):
        sid = st.text_input("학번", placeholder="예: 10101", max_chars=10)
        submitted = st.form_submit_button("학생 로그인", type="primary", use_container_width=True)
    if submitted:
        if not sid.strip().isdigit():
            st.error("학번은 숫자로 입력해 주세요.")
            return
        try:
            s = sheets()
            student = find_student(s, sid.strip())
            if not student:
                st.error("학생명단에서 해당 학번을 찾지 못했습니다. 학번이 A열에 없어도 기존 데이터 형식은 자동으로 확인하지만, 학번 자체가 명단에 있어야 합니다.")
                return
            st.session_state.role = "student"
            st.session_state.student = student
            st.session_state.portfolio_rows = get_student_portfolio(s, student["학번"])
            st.session_state.week_rows = get_week_settings(s)
            st.rerun()
        except Exception as exc:
            st.error(f"로그인 중 오류가 발생했습니다: {exc}")


def teacher_login():
    st.markdown("# 🧑‍🏫 교사 관리자")
    with st.form("teacher_login"):
        password = st.text_input("관리자 비밀번호", type="password")
        ok = st.form_submit_button("교사 모드", type="primary", use_container_width=True)
    if ok:
        expected = str(st.secrets.get("TEACHER_PASSWORD", ""))
        if expected and password == expected:
            st.session_state.role = "teacher"
            st.rerun()
        st.error("비밀번호가 올바르지 않습니다.")


def logout():
    for key in ("role", "student", "portfolio_rows", "week_rows"):
        st.session_state[key] = None if key in {"role", "student"} else []
    st.rerun()


def student_summary(df: pd.DataFrame):
    weeks = list(range(1, 18))
    submitted = {int(x["주차"]): x for _, x in df.iterrows()} if not df.empty else {}
    rows = []
    for w in weeks:
        x = submitted.get(w)
        rows.append({"주차": f"{w}주차", "제출": "제출완료" if x is not None else "미제출", "점수": x.get("점수", "") if x is not None else "", "피드백": x.get("피드백", "") if x is not None else ""})
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


def student_mode():
    student = st.session_state.student
    st.title(f"{student.get('이름','학생')}님의 포트폴리오")
    st.caption(f"{student.get('학년','')}학년 {student.get('반','')}반 · 학번 {student.get('학번','')}")
    if st.button("로그아웃", key="student_logout"):
        logout()

    tabs = st.tabs(["주차별 포트폴리오", "나의 성적·포트폴리오"])
    with tabs[0]:
        weeks = st.session_state.week_rows
        if not weeks:
            st.warning("'주차설정' 시트에 1~17주차 자료를 입력해 주세요.")
            return
        labels = [f"{w['주차']}주차" for w in weeks]
        selected = st.selectbox("주차", labels, key="student_week")
        week = weeks[labels.index(selected)]
        existing = next((r for r in st.session_state.portfolio_rows if str(r.get("주차")) == str(week["주차"])), None)
        st.subheader(week["학습목표"] or f"{week['주차']}주차 학습")
        st.info(week["활동지질문"] or "이번 주 활동 내용을 작성해 주세요.")
        content = st.text_area("나의 학습 기록", value=(existing or {}).get("제출내용", ""), height=260, key=f"content_{week['주차']}")
        if existing:
            st.caption(f"마지막 제출: {existing.get('수정일시') or existing.get('제출일시') or '-'}")
        if st.button("제출 / 수정", type="primary", use_container_width=True, key=f"submit_week_{week['주차']}"):
            submission_id = make_submission_id(student["학번"], int(week["주차"]), content)
            if submission_id in st.session_state.processed_submission_ids:
                st.info("이미 처리된 제출입니다.")
            else:
                try:
                    result = save_portfolio_submission(service_account(), SPREADSHEET_URL, student, week, content, submission_id, sheets=sheets())
                    st.session_state.processed_submission_ids.add(submission_id)
                    if result["status"] == "saved":
                        st.success("저장되었습니다.")
                    elif result["status"] == "duplicate":
                        st.info("이미 저장된 제출입니다. 중복 저장하지 않았습니다.")
                    else:
                        st.info("같은 제출이 이미 처리 중입니다.")
                    reload_student()
                except Exception as exc:
                    st.error(f"저장에 실패했습니다: {exc}")

    with tabs[1]:
        df = pd.DataFrame(st.session_state.portfolio_rows)
        if df.empty:
            st.info("아직 제출한 포트폴리오가 없습니다.")
            return
        df["점수수치"] = pd.to_numeric(df["점수"], errors="coerce")
        df["배점수치"] = pd.to_numeric(df["배점"], errors="coerce")
        total = int(df["점수수치"].fillna(0).sum())
        maximum = int(df["배점수치"].fillna(0).sum())
        c1, c2, c3 = st.columns(3)
        c1.metric("제출 주차", f"{df['주차'].nunique()} / 17")
        c2.metric("누적 점수", f"{total}점")
        c3.metric("총 배점", f"{maximum}점")
        student_summary(df)


def teacher_mode():
    st.title("교사 관리자 · 기술·가정 포트폴리오")
    if st.button("로그아웃", key="teacher_logout"):
        logout()
    try:
        s = sheets()
        portfolio = get_all_portfolio(s)
        students = []
        for r in s[STUDENT_SHEET].get_all_records():
            students.append(r)
        weeks = get_week_settings(s)
    except Exception as exc:
        st.error(f"Google Sheets를 읽지 못했습니다: {exc}")
        return

    tabs = st.tabs(["종합 현황", "학생 성적·피드백", "CSV 다운로드", "주차 설정 확인"])
    pdf = pd.DataFrame(portfolio)
    sdf = pd.DataFrame(students)
    if not pdf.empty:
        pdf["점수"] = pd.to_numeric(pdf["점수"], errors="coerce")
        pdf["배점"] = pd.to_numeric(pdf["배점"], errors="coerce")

    with tabs[0]:
        if pdf.empty:
            st.info("아직 포트폴리오 제출 데이터가 없습니다.")
        else:
            total_students = len(sdf)
            submitted_students = pdf["학번"].nunique()
            c1, c2, c3 = st.columns(3)
            c1.metric("등록 학생", total_students)
            c2.metric("제출 학생", submitted_students)
            c3.metric("제출률", f"{submitted_students / total_students * 100:.1f}%" if total_students else "0%")
            if not sdf.empty:
                merged = pdf.groupby(["학년", "반"], dropna=False).agg(제출건수=("학번", "size"), 평균점수=("점수", "mean")).reset_index()
                st.plotly_chart(px.bar(merged, x="반", y="제출건수", color="학년", barmode="group", title="반별 제출 건수"), use_container_width=True)
            st.dataframe(pdf, use_container_width=True, hide_index=True)

    with tabs[1]:
        if sdf.empty:
            st.warning("학생명단이 비어 있습니다.")
        else:
            sdf["표시"] = sdf.apply(lambda r: f"{r.get('학번','')} · {r.get('이름','')} · {r.get('학년','')}학년 {r.get('반','')}반", axis=1)
            chosen = st.selectbox("학생", sdf["표시"].tolist())
            selected_student = sdf.loc[sdf["표시"] == chosen].iloc[0].to_dict()
            weeks_available = sorted({int(r["주차"]) for r in portfolio if str(r.get("주차", "")).isdigit()})
            week_num = st.selectbox("주차", weeks_available or list(range(1, 18)))
            record = next((r for r in portfolio if str(r.get("학번")) == str(selected_student["학번"]) and str(r.get("주차")) == str(week_num)), None)
            if record:
                st.text_area("학생 포트폴리오", value=record.get("제출내용", ""), height=260, disabled=True)
                score_default = int(float(record.get("점수") or 0))
                score = st.number_input("점수", min_value=0, max_value=int(float(record.get("배점") or 100)), value=score_default, step=1)
                feedback = st.text_input("교사 피드백", value=record.get("피드백", ""))
                if st.button("점수·피드백 저장", type="primary"):
                    try:
                        ok = update_grade_and_feedback(service_account(), SPREADSHEET_URL, str(selected_student["학번"]), int(week_num), int(score), feedback, sheets=s)
                        st.success("저장되었습니다." if ok else "해당 주차 기록을 찾지 못했습니다.")
                    except Exception as exc:
                        st.error(f"저장 실패: {exc}")
            else:
                st.info("해당 학생의 해당 주차 제출 기록이 없습니다.")

    with tabs[2]:
        if pdf.empty:
            st.info("다운로드할 데이터가 없습니다.")
        else:
            summary = pdf.pivot_table(index=["학번", "이름", "학년", "반"], columns="주차", values="점수", aggfunc="max", fill_value="").reset_index()
            week_cols = [c for c in summary.columns if isinstance(c, (int, float))]
            summary["총점"] = summary[week_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1) if week_cols else 0
            csv = summary.to_csv(index=False, encoding="utf-8-sig").encode("utf-8-sig")
            st.download_button("전체 성적표 CSV 다운로드", data=csv, file_name="기술가정_포트폴리오_성적표.csv", mime="text/csv")
            st.dataframe(summary, use_container_width=True, hide_index=True)

    with tabs[3]:
        st.dataframe(pd.DataFrame(weeks), use_container_width=True, hide_index=True)


def login():
    st.markdown("# 기술·가정 1~17주차 포트폴리오")
    st.caption("학생은 학번으로, 교사는 관리자 비밀번호로 로그인합니다.")
    a, b = st.columns(2)
    with a:
        student_login()
    with b:
        teacher_login()


if st.session_state.role == "student":
    student_mode()
elif st.session_state.role == "teacher":
    teacher_mode()
else:
    login()
