# 전체 풀스택 검증 결과

검증 기준: 업로드된 datastructureapp-main.zip

## 확인 완료
- Python AST compile: app.py / backend/grading.py / backend/sheets.py PASS
- src/styles.css == dist/styles.css PASS
- React/Streamlit v1 통신 구조 점검
- Streamlit 1.64 + streamlit-component-lib 2.x 호환 방식 점검
- 학생 로그인 / 교사 로그인 event payload 이름과 app.py process_event() 비교
- 학생 제출 / 교사 평가 event payload 비교
- iframe height feedback loop 점검
- 반응형 CSS breakpoint 점검

## 핵심 발견
1. React 소스가 `withStreamlitConnection`으로 감싸져 있는데 App 내부에서도 별도의 render-message 상태 브리지를 중복 구현하고 있었습니다.
2. dist는 streamlit-component-lib를 직접 로드하지 않으므로 자체 handshake가 필요합니다. 이를 DOMContentLoaded 이후 componentReady로 통일했습니다.
3. 기존 dist는 수동 protocol 구현이므로 `dataType: "json"`은 맞는 수정입니다. 다만 이것만 고치는 것으로 전체 통신이 안정적으로 보장되지는 않습니다.
4. iframe 높이는 root 기준으로 제한하고 동일 높이는 재전송하지 않도록 수정했습니다.
5. Google Sheets fallback URL을 프로젝트에서 사용하던 URL로 맞췄습니다. Streamlit Secrets의 SPREADSHEET_URL이 있으면 Secrets가 우선합니다.
6. `default=None`을 명시하여 첫 component 호출과 실제 event value를 구분했습니다.
7. 제출 버튼이 매우 빠르게 두 번 눌리거나 재시도될 때 서로 다른 submissionId가 생성될 가능성이 있었습니다. 수정본은 한 제출 시도 동안 submissionId를 useRef로 유지하여 같은 이벤트가 재전송되도록 했습니다. 서버의 Google Sheets ledger는 그대로 유지됩니다.

## 수정 파일
- frontend/src/App.jsx
- frontend/src/main.jsx
- frontend/dist/App.jsx
- frontend/dist/index.html
- app.py
- backend/sheets.py

styles.css는 원본과 동일하여 변경하지 않았습니다.
