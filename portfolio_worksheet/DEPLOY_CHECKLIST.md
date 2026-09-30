# 배포 전 점검표

## 검증 완료
- [x] Python 전체 파일 `py_compile` 통과
- [x] 자동채점 샘플 20/20, 100% 통과
- [x] React source / Vite 구조 포함
- [x] Streamlit custom component용 `frontend/dist` 포함
- [x] Google Sheets 저장 코드 포함
- [x] `.streamlit/secrets.toml`은 Git에 올리지 않도록 `.gitignore` 처리

## 현재 환경에서 검증할 수 없었던 항목
- Streamlit 패키지가 실행 환경에 설치되어 있지 않아 실제 `streamlit run app.py` 런타임 테스트는 수행하지 못했습니다.
- npm registry 접근이 되지 않아 `npm install` 및 Vite production build를 이 환경에서 수행하지 못했습니다.
- 따라서 `frontend/dist`는 Streamlit Cloud가 Node/npm을 요구하지 않도록 만든 CDN 기반 실행 fallback입니다.

## 권장 운영 방식
1. 로컬 PC에서 `frontend/npm install` 후 `npm run build`.
2. 생성된 `frontend/dist`를 GitHub에 commit.
3. Streamlit Cloud에서 `app.py`를 배포.
4. Streamlit Secrets에 Google service account를 입력.
5. Google Sheets를 service account email에 편집자로 공유.
