# TECH · HOME — React 전체 UI 포트폴리오

기술·가정 1~17주차 학습 포트폴리오를 위한 **React UI + Streamlit 호스트/백엔드 + Google Sheets 데이터 계층** 프로젝트입니다.

## 구조

```text
Browser
  └─ React (frontend/src, frontend/dist)
       └─ Streamlit Custom Component
            └─ app.py
                 └─ backend/sheets.py
                      └─ Google Sheets
```

### 역할 분리

- **React**: 로그인 화면, 학생 홈, 1~17주차 포트폴리오, 제출/수정, 나의 기록, 교사 대시보드, 학생 평가, CSV 내보내기, 모든 시각 디자인
- **Streamlit**: 세션 상태, 이벤트 라우팅, 인증, 권한 검사, React Custom Component 호스트
- **backend/sheets.py**: Google Sheets 인증/조회/저장 및 `submissionId` 기반 정확히 한 번 저장
- **backend/grading.py**: 기존 채점 로직

Streamlit의 `st.title`, `st.tabs`, `st.text_area`, `st.dataframe` 등 화면 위젯은 사용하지 않습니다. 화면은 React가 렌더링합니다.

## UI 디자인

Instagram의 **피드·스토리·프로필·아카이브·모바일 하단 내비게이션** 같은 익숙한 UX 패턴을 교육 포트폴리오에 맞게 재해석했습니다. 특정 서비스의 로고, 상표, 화면을 그대로 복제하지 않고 독립적인 TECH · HOME 디자인 시스템으로 구성했습니다.

- Desktop: 좌측 rail navigation + 중앙 content canvas
- Mobile: 상단 compact bar + 하단 floating navigation
- 학생: 프로필 → 학기 진행률 → 최근 기록 → 주차별 journal → 아카이브
- 교사: 현황 → 반별 활동량 → 최근 학생 작업 → 평가/피드백 → CSV

## 1. 로컬 React 개발

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
npm run build
```

생성된 `frontend/dist`는 Streamlit Cloud에서 Node/npm 없이 바로 Custom Component로 로드할 수 있도록 프로젝트에 포함합니다.

## 2. Python 의존성

```bash
pip install -r requirements.txt
```

## 3. Streamlit Secrets

`.streamlit/secrets.toml`은 GitHub에 올리지 않습니다.

```toml
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
TEACHER_PASSWORD = "CHANGE_THIS_TO_A_LONG_PASSWORD"

[gcp_service_account]
type = "service_account"
project_id = "YOUR_PROJECT_ID"
private_key_id = "YOUR_PRIVATE_KEY_ID"
private_key = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
client_email = "YOUR_SERVICE_ACCOUNT_EMAIL"
client_id = "YOUR_CLIENT_ID"
auth_uri = "https://accounts.google.com/o/oauth2/auth"
token_uri = "https://oauth2.googleapis.com/token"
auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
client_x509_cert_url = "YOUR_CLIENT_CERT_URL"
```

서비스 계정의 `client_email`을 Google Sheets에 편집자로 공유합니다.

## 4. Google Sheets

최소 시트:

- `학생명단`: `학번 | 이름 | 학년 | 반 | 번호` (선택적으로 `활성` 추가 가능)
- `주차설정`: 1~17주차 학습목표/활동지질문/배점/공개여부
- `포트폴리오`: 제출ID/학번/이름/학년/반/주차/학습목표/활동지질문/제출내용/점수/배점/피드백/제출일시/수정일시
- `제출기록`: 정확히 한 번 저장을 위한 event/submission ledger

기존 프로젝트에서 사용하는 `학생정보`, `답안`, `결과` 시트가 있더라도 해당 저장 구조는 별도로 유지됩니다.

## 5. 정확히 한 번 저장

React가 제출할 때마다 고유 `submissionId`를 생성합니다.

```text
React submit
  ↓
submissionId
  ↓
Streamlit eventId guard
  ↓
server submission id
  ↓
제출기록: PROCESSING
  ↓
포트폴리오 upsert
  ↓
제출기록: COMPLETED
```

Streamlit rerun으로 동일 이벤트가 다시 전달되더라도 `eventId`와 제출 원장을 통해 중복 저장을 차단합니다.

학생이 같은 주차를 수정하는 경우에는 무한 append가 아니라 해당 `학번 + 주차` 기록을 업데이트합니다.

## 6. 실행

```bash
streamlit run app.py
```

## 7. Streamlit Community Cloud

1. GitHub에 전체 프로젝트를 push
2. Streamlit Community Cloud에서 repository 선택
3. Main file: `app.py`
4. App settings → Secrets에 Google Service Account와 `SPREADSHEET_URL`, `TEACHER_PASSWORD` 설정
5. Deploy

`frontend/dist`는 반드시 GitHub에 포함하세요. `node_modules`와 `secrets.toml`은 포함하지 않습니다.
