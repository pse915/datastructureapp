# Datastructuregram — 자료구조 학습 앱 (Instagram Redesign Full)

기존 `datastructureapp`의 학습/실습/게임/문제풀이 기능은 100% 유지하면서,
전체 UI를 **인스타그램 스타일(피드·스토리·카드·하단내비)** 로 재작성한 통합본입니다.

## 구조

```text
Browser
 └─ React (frontend/src → frontend/dist, 빌드 없이 Babel로 직접 서빙)
      └─ Streamlit Custom Component (declare_component path=frontend/dist)
           └─ app.py (세션/인증/라우팅)
                ├─ backend/sheets.py (학생명단/주차설정/포트폴리오/제출기록)
                ├─ backend/game_store.py (게임설정/게임기록, 주차 1-17)
                ├─ backend/ds_store.py ★NEW (DS진행도: 단원 8종 해결 상태)
                ├─ backend/week_admin.py / worksheet_admin.py (자료/학습지)
                └─ Google Sheets (+ 로컬 JSON 폴백)
```

## 기능 (유지 + 추가)

1. 자료구조 핵심 개념 + Python 코드 예시 — 8단원 피드 포스트 카드
   (`frontend/src/data/dsCurriculum.js`: array/linkedlist/stack/queue/tree/graph/sort/hash)
2. 인터랙티브 시각화/시뮬레이터 — `components/Visualizers.jsx`
   - 배열 삽입/삭제·인덱스 접근, 연결리스트 맨앞/맨뒤, 스택 Push/Pop, 큐 Enqueue/Dequeue,
     BST 삽입+전위/중위/후위, 그래프 BFS/DFS, 버블정렬 애니메이션, 해시 버킷+충돌체이닝
3. 주차별 미니게임 + 문제풀이 — 기존 Games 번들 그대로 (quiz/memory/embed, 교사 공개 스위치)
4. DS 미니퀴즈 — 각 단원 카드 하단 `QuizCard`, 정답 시 `ds_quiz_submit` → Sheets `DS진행도` 저장
5. 포트폴리오 제출/평가/CSV/학습지 — 기존 app.py 이벤트 100% 호환
6. 학습 진행도 저장 — `ds_store.py` (Sheets 우선, 실패 시 `data/ds_progress.json`)

## 실행

```bash
pip install -r requirements.txt
streamlit run app.py
# React 개발(선택): cd frontend && npm install && npm run dev
```

`frontend/dist`는 빌드 없이 바로 서빙됩니다 (Streamlit Cloud에서 Node 불필요).
`src`를 수정하면 `dist`의 대응 파일에도 동일 수정 후, `dist`를 함께 커밋하세요.
(`App.jsx`↔`src/App.jsx`, `components/*`↔`src/components/*`, `styles.css`↔`src/theme/ig-design-system.css`)

## Streamlit Secrets (`.streamlit/secrets.toml`, GitHub 업로드 금지)

```toml
SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
TEACHER_PASSWORD = "CHANGE_THIS_TO_A_LONG_PASSWORD"

[gcp_service_account]
type = "service_account"
project_id = "YOUR_PROJECT_ID"
...
```

## Sheets 시트

- 기존: `학생명단 | 주차설정 | 포트폴리오 | 제출기록 | 게임설정 | 게임기록`
- 신규: `DS진행도` = `기록ID | 학번 | 이름 | 단원 | 점수 | 만점 | 해결일시 | 상세JSON`
  (없으면 `ds_store`가 자동 생성. 권한 오류 시 `data/ds_progress.json` 폴백)

## 디자인

`INSTA_DESIGN_GUIDE.md` 참조 — 색상/레이아웃/타이포/버튼/반응형/다크모드 + 적용 방법.
