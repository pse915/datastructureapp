# 빌드 및 실행 가이드

## 0. 즉시 실행 (빌드 없이)

`frontend/build/index.html` 단일파일 폴백이 동봉되어 있어 바로 실행됩니다.

```bash
pip install -r requirements.txt
streamlit run app.py
```

## 1. React 개발 모드 (선택)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3001
```

새 터미널에서:

```bash
# Windows PowerShell
$env:DS_COMPONENT_RELEASE = "0"
$env:STREAMLIT_COMPONENT_DEV_URL = "http://localhost:3001"
streamlit run app.py
```

## 2. 프로덕션 빌드 (권장, Streamlit Cloud 포함)

```bash
cd frontend
npm install
npm run build      # → frontend/build/index.html + assets/ 재생성
```

`vite.config.js`가 `base: './'` + `outDir: 'build'`이므로 산출물을 그대로 커밋하면 됩니다.
`app.py`의 `BUILD_DIR`과 일치해야 합니다.

## 3. Streamlit Community Cloud 배포

1. 본 폴더 전체를 GitHub에 push (`frontend/build` 포함, `node_modules`·`secrets.toml` 제외)
2. Main file: `app.py`
3. Secrets에 `SPREADSHEET_URL`, `TEACHER_PASSWORD`, `[gcp_service_account]` 설정
4. Deploy — 환경변수 `STREAMLIT_COMPONENT_DEV_URL`을 설정하지 말 것

## 4. 동작 확인

- 학생 로그인(학번) → 단원 카드 → 실습 조작 → 퀴즈 정답 → Sheets `DS진행도` 1행
- 주차 게임 → 최고/시도 기록 저장 (`게임기록`)
- 나의 기록 → 포트폴리오 제출 → 교사 평가 → CSV 다운로드
- 우측 상단 ··· → 설정 모달 (테마 3종·서체·Undo/Redo·인쇄·HTML/app.py 다운로드)

## 5. 파일 대응표

| 역할 | 소스 (수정용) | 산출물 (서빙용) |
|---|---|---|
| 테마 | `frontend/src/theme/black-dashboard.css` | `frontend/build/index.html` 내 `<style>` (빌드 시 번들) |
| 레이아웃 | `frontend/src/App.jsx` | 동상 (빌드 시 번들) |
| 헤더/탭/카드/모달 | `frontend/src/components/{ui,TopHeader,SubTabs,UnitCards,SettingsModal}.jsx` | 동상 |
| 시각화/퀴즈 | `frontend/src/components/{Visualizers,QuizCard}.jsx` | 동상 |
| 단원 데이터 | `frontend/src/data/dsCurriculum.js` | 동상 |
| 통신 | `app.py` + `backend/ds_store.py` | — |
