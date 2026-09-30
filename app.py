from pathlib import Path
import hashlib
import json

import streamlit as st
import streamlit.components.v1 as components

from backend.grading import grade_submission
from backend.sheets import prepare_sheets, save_submission

st.set_page_config(
    page_title='데이터의 구조화',
    page_icon='📋',
    layout='centered',
    initial_sidebar_state='collapsed',
)

ROOT = Path(__file__).parent
BUILD_DIR = ROOT / 'frontend' / 'dist'
SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1rxM6EX8tR7XE6pW2y4QU72oS29WVGqUwac300U81-hs/edit'

if not BUILD_DIR.exists():
    st.error('React build가 없습니다. frontend/dist를 GitHub에 포함하세요.')
    st.stop()


@st.cache_resource
def get_component():
    return components.declare_component('portfolio_worksheet', path=str(BUILD_DIR))


if 'result' not in st.session_state:
    st.session_state.result = {
        'score': 0,
        'maxScore': 20,
        'percent': 0,
        'graded': False,
        'answers': {},
        'feedback': [],
    }
if 'processed_submission_ids' not in st.session_state:
    st.session_state.processed_submission_ids = set()
if 'sheets_context' not in st.session_state:
    st.session_state.sheets_context = None


component = get_component()
value = component(
    key='worksheet',
    result=st.session_state.result,
    default=None,
    height=1800,
)

if isinstance(value, dict):
    action = value.get('action')

    if action == 'submit':
        submission_id = str(value.get('submissionId') or '').strip()
        if not submission_id:
            stable_payload = {
                'student': value.get('student') or {},
                'answers': value.get('answers') or {},
                'activities': value.get('activities') or {},
            }
            submission_id = hashlib.sha256(
                json.dumps(
                    stable_payload,
                    ensure_ascii=False,
                    sort_keys=True,
                    default=str,
                ).encode('utf-8')
            ).hexdigest()

        # 1차 방어: 현재 Streamlit 세션에서 동일 이벤트를 다시 처리하지 않습니다.
        if submission_id in st.session_state.processed_submission_ids:
            st.stop()

        # 자동채점은 이벤트당 정확히 한 번만 수행합니다.
        result = grade_submission(value)
        result['submissionId'] = submission_id
        st.session_state.result = result

        if 'gcp_service_account' not in st.secrets:
            st.warning(
                '자동채점은 완료되었습니다. Google Sheets 저장을 하려면 '
                'Streamlit Secrets에 [gcp_service_account]를 설정하세요.'
            )
            st.session_state.processed_submission_ids.add(submission_id)
            st.stop()

        try:
            if st.session_state.sheets_context is None:
                st.session_state.sheets_context = prepare_sheets(
                    st.secrets['gcp_service_account'],
                    SPREADSHEET_URL,
                )

            save_result = save_submission(
                st.secrets['gcp_service_account'],
                SPREADSHEET_URL,
                value,
                result,
                submission_id=submission_id,
                sheets=st.session_state.sheets_context,
            )

            # Sheets 원장에서 duplicate/processing까지 확인한 뒤 세션에도 기록합니다.
            st.session_state.processed_submission_ids.add(submission_id)

            if save_result['status'] == 'saved':
                st.toast(f"Google Sheets 저장 완료 · {save_result['saved_at']}")
            elif save_result['status'] == 'duplicate':
                st.info('이미 저장된 제출입니다. 중복 저장하지 않았습니다.')
            else:
                st.info('같은 제출이 이미 처리 중입니다. 중복 저장하지 않았습니다.')
        except Exception as exc:
            st.error(f'Google Sheets 저장에 실패했습니다: {exc}')
            # 실패한 submissionId는 세션 processed set에 넣지 않습니다.
            # 단, Sheets 원장이 PROCESSING이면 다음 동일 이벤트도 중복 append하지 않습니다.
            st.stop()

        # 저장 처리가 끝난 뒤 결과를 React에 전달하려면 한 번의 rerun이 필요합니다.
        # 단, 동일 submissionId는 위의 processed_submission_ids에서 즉시 stop되므로
        # 이 rerun이 Google Sheets 저장을 다시 실행시키지는 않습니다.
        st.rerun()

    elif action == 'progress':
        # 임시 저장은 Google Sheets 제출 저장과 완전히 분리합니다.
        st.session_state.progress = value
