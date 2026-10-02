# 배포 전 체크리스트

- [ ] `frontend/dist/index.html`, `App.jsx`, `styles.css`가 GitHub에 포함되어 있는가
- [ ] `node_modules/`는 GitHub에 포함하지 않았는가
- [ ] `.streamlit/secrets.toml`은 GitHub에 포함하지 않았는가
- [ ] `SPREADSHEET_URL`이 올바른가
- [ ] `[gcp_service_account]`가 올바른가
- [ ] 서비스 계정 이메일을 Google Sheets에 편집자로 공유했는가
- [ ] `TEACHER_PASSWORD`를 설정했는가
- [ ] `학생명단` 헤더가 `학번, 이름, 학년, 반, 번호`인지 확인했는가
- [ ] `활성` 열을 사용하는 경우 로그인 허용 학생은 `Y`로 되어 있는가
- [ ] `주차설정`에 1~17주차가 있는가
- [ ] 학생 로그인 → 포트폴리오 제출 → 수정 흐름을 확인했는가
- [ ] 같은 제출을 다시 보내도 Google Sheets에 중복 행이 생기지 않는가
- [ ] 교사 로그인 → 학생 선택 → 점수/피드백 저장을 확인했는가
- [ ] CSV 다운로드를 확인했는가
