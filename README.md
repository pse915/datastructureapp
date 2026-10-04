# DS Blackboard — 자료구조 학습 대시보드 (Pure Black)

스크린샷의 Dark Theme SaaS 대시보드를 전면 적용한 `datastructureapp` 리패키징입니다.
기존 학습/실습/게임/문제풀이·Sheets 저장 기능은 100% 유지됩니다.

## 구조

```text
Browser
 └─ React (frontend/src → npm run build → frontend/build/index.html)
      └─ Streamlit Custom Component (COMPONENT_NAME=ds_black_dashboard)
           └─ app.py (_RELEASE 절대경로 선언)
                ├─ backend/sheets.py (학생명단/주차설정/포트폴리오/제출기록)
                ├─ backend/game_store.py (게임설정/게임기록)
                ├─ backend/ds_store.py (DS진행도: 단원 8종)
                └─ Google Sheets (+ 로컬 JSON 폴백)
```

## 화면 구성 (스크린샷 매핑)

- 상단 헤더: 로고+연도 뱃지, 중앙 카테고리 탭(학습 업무/교무 행정),
  우측 관리자 pill·새로고침·불러오기·작업 저장·설정(···) — `components/TopHeader.jsx`
- 서브 탭: 8단원 + 미니게임 + 나의 기록 아이콘 버튼 — `components/SubTabs.jsx`
- 필터 바: 전체/미해결/해결됨 + 단원별/나의기록 + 검색 + 인쇄
- 범례: 개념/실습/퀴즈해결/게임기록 4종
- 카드 그리드 2x2: 단원 카드 안 5단계 타일(개념/코드/실습/퀴즈/게임) — `components/UnitCards.jsx`
- 상세 패널: 개념 설명 + Python 코드 + 인터랙티브 실습 + 미니퀴즈(`ds_quiz_submit` 저장)
- 설정 모달: 테마 3종(Pure Black/Apple Light/X.AI Obsidian)·서체·Undo/Redo·인쇄·HTML/app.py 다운로드 — `components/SettingsModal.jsx`

## 문서

- `COMPONENT_FIX.md` — 로딩 오류 원인→해결 대응표 + 올바른 선언부
- `BUILD_GUIDE.md` — 빌드/실행/배포 단계
