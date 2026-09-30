from pathlib import Path
import json
import hashlib
import streamlit as st
import streamlit.components.v1 as components
from backend.grading import grade_submission
from backend.sheets import prepare_sheets, save_submission

st.set_page_config(page_title='데이터의 구조화', page_icon='📋', layout='centered', initial_sidebar_state='collapsed')

ROOT = Path(__file__).parent
BUILD_DIR = ROOT / 'frontend' / 'dist'
SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1rxM6EX8tR7XE6pW2y4QU72oS29WVGqUwac300U81-hs/edit'

if not BUILD_DIR.exists():
    st.error('React build가 없습니다. frontend에서 npm run build 후 frontend/dist를 GitHub에 포함하세요.')
    st.stop()

@st.cache_resource
def get_component():
    return components.declare_component('portfolio_worksheet', path=str(BUILD_DIR))

if 'result' not in st.session_state:
    st.session_state.result = {'score':0,'maxScore':20,'percent':0,'graded':False,'answers':{},'feedback':[]}

component = get_component()
value = component(key='worksheet', result=st.session_state.result, default=None, height=1800)

if isinstance(value, dict):
    action = value.get('action')
    if action == 'submit':
        # V1 custom component는 st.rerun() 뒤에도 마지막 component value를
        # 다시 반환할 수 있습니다. 따라서 동일 제출을 세션에서 반드시 한 번만 처리합니다.
        submission_id = value.get('submissionId')
        if not submission_id:
            # 구버전 프런트엔드가 보낸 payload도 중복 처리되지 않도록 안정적인 fingerprint를 사용합니다.
            stable_payload = {
                'student': value.get('student') or {},
                'answers': value.get('answers') or {},
                'activities': value.get('activities') or {},
            }
            submission_id = hashlib.sha256(
                json.dumps(stable_payload, ensure_ascii=False, sort_keys=True, default=str).encode('utf-8')
            ).hexdigest()

        if st.session_state.get('last_processed_submission_id') == submission_id:
            # 이전 submit 결과가 rerun 과정에서 다시 전달된 경우 저장하지 않습니다.
            # 여기서 다시 st.rerun()하면 무한 루프가 생기므로 종료합니다.
            st.stop()

        st.session_state.last_processed_submission_id = submission_id
        result = grade_submission(value)
        st.session_state.result = result
        try:
            if 'gcp_service_account' not in st.secrets:
                st.warning('자동채점은 완료되었습니다. Google Sheets 저장을 하려면 Streamlit Secrets에 [gcp_service_account]를 설정하세요.')
            else:
                if 'sheets_context' not in st.session_state:
                    st.session_state.sheets_context = prepare_sheets(
                        st.secrets['gcp_service_account'], SPREADSHEET_URL
                    )
                saved_at = save_submission(
                    st.secrets['gcp_service_account'],
                    SPREADSHEET_URL,
                    value,
                    result,
                    sheets=st.session_state.sheets_context,
                )
                st.toast(f'Google Sheets 저장 완료 · {saved_at}')
        except Exception as exc:
            st.error(f'Google Sheets 저장에 실패했습니다: {exc}')
        st.rerun()
    elif action == 'progress':
        st.session_state.progress = value
