# 데이터의 구조화 · React + Streamlit 포트폴리오 활동지

첨부된 A4 활동지를 기반으로 만든 인터랙티브 웹앱입니다.

## 포함 기능
- A4 활동지 레이아웃
- 단어 보관함
- 마우스/터치 기반 Drag & Drop
- 활동 1 목록 작성
- 활동 2 표 작성
- 활동 3 계층형 다이어그램
- 활동 4 구조화 기록 + 막대그래프
- Python 자동채점
- Google Sheets 저장
- 학생 결과/포트폴리오용 데이터 구조

## 1. React 빌드

```bash
cd frontend
npm install
npm run build
```

생성된 `frontend/dist`를 GitHub에 반드시 포함합니다. Streamlit Cloud에서는 Node/npm 빌드를 하지 않습니다.

## 2. Python 설치

```bash
pip install -r requirements.txt
```

## 3. Streamlit Secrets

Streamlit Cloud의 App settings → Secrets에 Google 서비스 계정 정보를 입력합니다.

```toml
[gcp_service_account]
type = "service_account"
project_id = "YOUR_PROJECT_ID"
private_key_id = "YOUR_PRIVATE_KEY_ID"
private_key = "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
client_email = "YOUR_SERVICE_ACCOUNT_EMAIL"
client_id = "YOUR_CLIENT_ID"
auth_uri = "https://accounts.google.com/o/oauth2/auth"
token_uri = "https://oauth2.googleapis.com/token"
auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
client_x509_cert_url = "YOUR_CLIENT_CERT_URL"
```

## 4. Google Sheets

서비스 계정의 `client_email`을 해당 스프레드시트에 편집자로 공유해야 합니다.

앱은 다음 시트를 자동으로 준비합니다.
- 학생정보
- 답안
- 결과
- 포트폴리오

## 5. 실행

```bash
streamlit run app.py
```

## 배포

GitHub repository를 Streamlit Community Cloud에 연결하고 `app.py`를 entrypoint로 지정합니다.
