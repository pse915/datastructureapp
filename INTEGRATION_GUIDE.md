# 통합본 적용 가이드 (datastructureapp + WorksheetUploader)

원본: https://github.com/pse915/datastructureapp (main, 2026-10-04 기준)
통합 내용: 주차별 학습지 및 포트폴리오 문제 업로드/관리 페이지

## 바뀐 파일

| 파일 | 변경 |
|---|---|
| `app.py` | `worksheet`/`uploadResult` 세션 추가, `teacher_worksheet_load/save/image` 이벤트 3개, 교사 로그인 시 1주차 학습지 자동 로드, payload에 학습지 포함 |
| `backend/worksheet_admin.py` | 신규. `학습지` 시트 CRUD + Drive 이미지 업로드 |
| `frontend/src/App.jsx` | `WorksheetUploader` 번들 내장 + 교사 내비에 `학습지` 탭 |
| `frontend/dist/App.jsx` | 동일 (배포 실사용 파일. 기존 `주차` 등록 탭은 유지됨) |
| `frontend/src|dist/styles.css` | `.ws-*` 스타일 추가 (기존 TECH·HOME 토큰 재사용) |
| `frontend/src|dist/admin/` | 모듈 원본 (TS + JSX). `App.jsx` 내장본과 동일 기능 |
| `gas/Code.gs` | GAS Web App 프록시 (선택 방식, Streamlit 없이 쓸 때) |

## 배포 순서

1. Google 스프레드시트에 `학습지` 시트 생성, 첫 행 헤더:
   `주차|제목|단원명|안내문구|공개여부|문제JSON|업데이트일시`
2. 서비스계정(`client_email`)에 시트 편집자 공유 (기존 시트와 동일)
3. Streamlit Secrets에 `DRIVE_FOLDER_ID` 설정 + 해당 폴더를 서비스계정에 공유
4. 통째로 GitHub에 push (특히 `frontend/dist/` 포함 — Streamlit Cloud는 Node 없이 dist만 로드)
5. 교사 로그인 → `학습지` 탭 → 주차 선택 → 문제 4유형 생성 → 미리보기 → `Sheets에 저장`
6. 시트 `학습지` 행 + 새로고침 후 자동 바인딩 + 이미지 `viewUrl` 확인

## 문제 유형

- 퀴즈/선택형: 보기 + 정답 + 해설
- 빈칸 채우기: 지문 내 `[빈칸]`, 모범답안 복수
- 사다리/선잇기: 좌/우 항목 + 정답 매칭 JSON
- 사진 연상: Drive 업로드 이미지 + 힌트/답안

순서는 드래그앤드롭 또는 ▲▼ 버튼으로 변경.

## 로컬 개발

- vite: `frontend/` 에서 `npm install && npm run dev` (`src/` 사용)
- 배포물: `dist/` 가 그대로 Streamlit Custom Component로 서빙됨 (Babel standalone, 번들러 불필요)
- `src/admin/` 을 고쳤으면 `App.jsx` 내장 번들에도 동일 반영할 것 (주석에 명시)

##Secrets 예시

```toml
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/XXXX/edit"
TEACHER_PASSWORD = "긴_비밀번호"
DRIVE_FOLDER_ID = "드라이브_폴더_ID"

[gcp_service_account]
...
```
