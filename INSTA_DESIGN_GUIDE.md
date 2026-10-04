# Instagram UI 테마 — 글로벌 스타일 가이드 + 적용 방법

단일 파일: `frontend/src/theme/ig-design-system.css` (원본)
배포 파일: `frontend/dist/styles.css` (원본 + 하단 DIST SUPPLEMENT)
Vite 개발은 원본을, Streamlit은 배포 파일을 로드합니다. 수정 후 양쪽 동기화.

## 1. Color Palette

| 용도 | 토큰 | 값 |
|---|---|---|
| Primary Accent (시그니처 그라데이션) | `--ig-grad` | `linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)` |
| Brand/Highlight | `--ig-pink` / `--ig-red` | `#E1306C` / `#FD1D1D` |
| 버튼 블루 | `--ig-blue` / `--ig-blue-dark` / `--ig-blue-tint` | `#0095F6` / `#0081D6` / `#E8F4FE` |
| Background | `--ig-bg` | `#FAFAFA` (눈이 편한 라이트 회색) |
| Card/Surface | `--ig-surface` | `#FFFFFF` |
| Border | `--ig-border` / `--ig-border-soft` | `#DBDBDB` / `#EFEFEF` |
| Text | `--ig-text` / `--ig-text-2` / `--ig-sub` | `#262626` / `#4a4a4a` / `#8E8E8E` |
| 상태 | `--ig-green(-tint)` / `--ig-red-tint` / `--ig-heart` | `#2BA84A`/`#E6F7ED` / `#FDECEC` / `#ED4956` |

## 2. Layout & Typography

- 폰트: `--ig-font` = Pretendard Variable → Pretendard → Inter → System UI → Noto Sans KR.
  `index.html`에서 Pretendard/Inter CDN을 먼저 로드 (점진적 향상, 오프라인은 시스템 폴백).
- 행간 1.65, 자간 -0.005em, 본문 15px / 카드 본문 14.5px / 힌트 12.5px.
- Feed 컨테이너: `width: min(100% - 24px, 680px)` 중앙 정렬 (요청 600–800px 범위 안).
  상단바 내부도 동일 680px. 모바일 퍼스트, 720px↓ 검색창 숨김, 420px↓ 스토리 축소.
- Header: sticky + blur, 그라데이션 로고(`background-clip:text`) + 탭 버튼 + 로그인 pill.
- Story Bar (단원 탭): `.ig-stories > .ig-story(.live 그라데이션 링 / .on 선택 링)` —
  배열/연결리스트/스택/큐/트리/그래프/정렬/해시 8링. 해결된 단원은 `★ 해결` 뱃지.
- Feed Card: `.ig-card` (radius 16px, border `#EFEFEF`, shadow-sm, hover 시 lift).
  구조 = post-head(아바타+핸들+•••) → post-body(뱃지+제목+설명+체크리스트+코드+실습랩+퀴즈)
  → actions(하트/댓글/공유/북마크) → likes → comments.
- Shape/Depth: radius 16/12/8px, `--ig-shadow(-sm)`.

## 3. Interaction & Buttons

- `.ig-btn` (기본) / `.ig-btn-blue` (#0095F6 CTA) / `.ig-btn-grad` (그라데이션 CTA) / `.ig-btn-sm`.
- 입력: `.ig-input/.ig-select/.ig-textarea` — focus 시 `#cc2366` 링.
- 피드 액션: `.ig-icon-btn(.liked 하트 #ED4956 / .saved 북마크 #0095F6)`, hover 1.15배.
- 퀴즈: `.ig-quiz-opt(.correct 그린틴트/.wrong 레드틴트)` + `.letter` 원형 뱃지 + `.ig-explain` 해설.
- 진행바: `.ig-progress > i` 그라데이션 바. 스토리/게임/포트폴리오에 동일 사용.
- 시각화: `.ig-lab` 점선 실습 영역, `.ig-node(.top 핑크/.front 블루)` 팝인 애니메이션,
  `.ig-bars/.ig-bar(.cmp 핑크/.done 그린)` 정렬 막대.
- 완료 모션: `.ig-like-pop` (그라데이션 원 + `igPop` 키프레임).
- 내비: 데스크톱 상단 탭 + 720px↓ 하단 플로팅 `.ig-bottomnav` (선택 탭 핑크 틴트).
- 다크모드: `@media (prefers-color-scheme: dark)` — `#121212/#1E1E1E/#262626` 자동 전환.

## 4. 파일 대응표 (요청 출력 1·2)

| 요청 | 파일 |
|---|---|
| 글로벌 스타일 가이드 | `src/theme/ig-design-system.css` (+ `dist/styles.css`) |
| Story 링 카테고리 탭 | `src/components/StoryBar.jsx` (`dist/components/StoryBar.jsx`) |
| 피드 포스트 카드 (설명+시각화+게임 래퍼) | `src/components/FeedCard.jsx` |
| 시각화/시뮬레이터 8종 | `src/components/Visualizers.jsx` (Array/Stack/Queue/LinkedList/Tree/Graph/Sort/Hash) |
| 입력 폼·Quiz 카드·결과 제출 | `src/components/QuizCard.jsx` (`onSolve → ds_quiz_submit`), 포트폴리오 `ig-textarea + ig-btn-grad` |
| DS 피드 조립 (스토리+카드+퀴즈+진행도) | `src/components/DsFeed.jsx` (`DsLearnFeed` 학생용 / `DsTeacherPreview` 교사용) |
| 메인 페이지 리팩토링 | `src/App.jsx` (Vite) ↔ `dist/App.jsx` + `shim.jsx` + `index.html` (Babel 무빌드) |
| Streamlit↔React 통신 | `app.py` (`build_payload`에 `ds` 추가, `ds_quiz_submit` 처리) + `backend/ds_store.py` |

## 5. Streamlit ↔ React 통신 (요청 출력 3)

```text
React emit(action, payload)            app.py process_event(event)
  student_login {studentId}         →  학생명단 조회 → role=student, ds_solved 복원
  teacher_login {password}          →  비밀번호 대조 → role=teacher
  student_submit {week, content,       submissionId(클라) → 서버해시 → Sheets upsert
    submissionId}                     (eventId 가드로 rerun 중복 차단)
  ds_quiz_submit {unitId, score,      ds_store.submit_ds_result → DS진행도 upsert
    maxScore, recordId}                → server_result.solvedUnit → React ★ 해결
  student_game_submit {week,           game_store.submit_record → 최고/시도 누적
    gameType, score, ...}
  teacher_game_save/toggle,           게임설정 저장/공개, 기록 조회
  teacher_worksheet_load/save,        학습지 CRUD (Sheets)
  teacher_grade_save, teacher_refresh, logout
```

payload(`build_payload`): `{role, student, weeks, portfolio, teacher, flash, result, worksheet, uploadResult, games, ds:{units, solved}}`
모두 JSON 직렬화 검증 후 `declare_component(path=frontend/dist)`로 전달.
`dist`는 `index.html`이 8개 babel 스크립트를 순서대로 로드:
`dsCurriculum → Visualizers → StoryBar → FeedCard → QuizCard → DsFeed → shim(Streamlit 브릿지) → App(마운트)`.

## 6. 디자인 적용 방법 (요청 출력 4)

1. 기존 색조/배치 전부 제거 — 이 패키지의 `styles.css` 1개가 전체를 지배합니다.
   낡은 `styles.css`에 덮어쓰지 말고 `dist/styles.css`를 그대로 사용하세요.
2. 새 단원 추가: `src/data/dsCurriculum.js`에 `{id,label,icon,handle,title,desc,points,code,quiz}` 1개 추가
   + `Visualizers.jsx`에 `XxxViz` + `VIZ_MAP` 1줄이면 스토리·피드·퀴즈에 자동 반영.
3. 새 게임/퀴즈: 교사 탭 → 게임 관리에서 저장 (Sheets `게임설정`), 학생 피드에 즉시 공개.
4. 검수: 교사 탭 → 단원 미리보기에서 학생 화면 그대로 확인.
5. 배포: `pip install -r requirements.txt` → `streamlit run app.py` (빌드 불필요).
   Streamlit Cloud는 `app.py` + `frontend/dist` + Secrets만 필요 (`node_modules` 제외).
6. 검증(로컬에 Python/Node가 있을 때):
   `python -m py_compile app.py backend/*.py` → `cd frontend && npm install && npm run dev`
   → 학생/교사 로그인 → DS 퀴즈 1개 해결 → Sheets `DS진행도` 1행 확인.
