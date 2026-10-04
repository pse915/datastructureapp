# 인스타그램 테마 + 통합 정리 가이드

`GAMES_GUIDE.md`(기능/백엔드), `THEME_GUIDE.md`(네이버 테마),
`COMPONENT_FIX.md`(로딩장애 수정)와 함께 볼 것. 백엔드는 변경 없음.

## 1. 디렉토리 및 스타일 가이드 (Instagram)

```text
frontend/src/theme/insta.css    # ★ IG 토큰 + .ig-* 컴포넌트 + 셸 오버라이드 + 다크모드
frontend/dist/theme/insta.css   # 동일 복사본 (참조용)
frontend/src|dist/styles.css    #末尾에 insta.css append → 실제 적용
frontend/src|dist/games/
  GameModule.jsx                # ★ 인스타 마크업 게임 컴포넌트 (App.jsx 내장본과 동일)
  games.css                     # 레거시 게임 CSS (유지, 신규는 insta.css 사용)
frontend/dist/index.html        # 로컬 vendor + Pretendard/Inter 폰트 링크
```

토큰: 그라데이션 `linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)`,
배경 `#FAFAFA`, 카드 `#FFFFFF`/보더 `#DBDBDB`, 버튼 `#0095F6`+그라데이션,
텍스트 `#262626`/`#8E8E8E`, radius 12~16px, 폰트 Inter+시스템.

주요 클래스: `.ig-stories` > `.ig-story(.live 그라데이션 링/.on)` (주차 선택),
`.ig-card(.hover lift)` `.ig-post-head` `.ig-avatar(그라데이션 링)`
`.ig-actions` `.ig-icon-btn(.liked 하트)` `.ig-btn(.ig-btn-blue/.ig-btn-grad)`
`.ig-tabs` 아님 — 스토리가 탭 역할. `.ig-switch(그라데이션 토글)`
`.ig-table` `.ig-quiz-opt(.correct/.wrong)` `.ig-progress(그라데이션 바)`
`.ig-mem-grid/cards` `.ig-frame` `.ig-like-pop`(완료 하트 팝 `@keyframes igPop`)
다크모드: `@media (prefers-color-scheme: dark)` — `#121212`/`#1E1E1E`/`#262626`.

셸 오버라이드: `.ink-button`/`.brand-mark`/진행바 그라데이션,
내비 활성 핑크 틴트, 스토리 링·커버 그라데이션.

## 2. 백엔드 (`app.py`) — 변경 없음

`teacher_game_save/toggle`, `student_game_submit`, 역할별 `games` payload,
`backend/game_store.py` (Sheets `게임설정`/`게임기록` + `JsonFileGameStore`)는
`GAMES_GUIDE.md` 그대로. 본 패키지는 프론트 테마 교체 + 파일 정리のみ.

## 3. 컴포넌트 예시 (발췌)

스토리 주차 선택 (활성 주차만 그라데이션 링):

```jsx
<div className="ig-stories">
  {list.map((g) => (
    <button key={g.week}
      className={`ig-story live ${Number(week) === Number(g.week) ? 'on' : ''}`}
      onClick={() => setWeek(Number(g.week))}>
      <span className="ring"><div>W{g.week}</div></span>
      <small>{g.week}주차</small>
    </button>
  ))}
</div>
```

완료 모션 + 점수 전송:

```jsx
{last && <div className="ig-card">
  <div className="ig-like-pop"><IgIcon name="heartFill" size={38} /></div>
  <h3>{last.score} / {last.maxScore}점 저장 완료</h3>
</div>}
emit('student_game_submit', { week, gameType, score, maxScore, durationSec, detail, recordId: gmUid('game') });
```

전체 코드는 `games/GameModule.jsx` / `App.jsx` 내장 `Games 번들` 블록.

## 4. 최적화·정리 내역

- 타이머 정리: 퀴즈/메모리 `setTimeout`을 `useRef` 목록으로 모아 unmount 시 일괄 해제
- 메모리 덱 `useMemo` 고정 (리렌더에 셔플 안 됨), 기록 테이블 200행 cap
- 메시지 리스너(임베드 `postMessage`) cleanup 유지
- 파일 통합: 미사용 TS 미러 6개 삭제
  (`admin/types.ts·googleService.ts·WorksheetUploader.tsx` src/dist) —
  단일 소스 `.jsx`만 유지. `App.jsx` 내장본이 실행본, `games|admin/*.jsx`가 원본.

## 5. 빌드 및 연동

```bash
pip install -r requirements.txt
streamlit run app.py        # dist/ 직접 서빙, 빌드 불필요
cd frontend && npm install && npm run dev   # 선택 (src 기준)
```

검증됨: Babel 7.24.7 트랜스파일 4종 OK → 변환물(99,865 bytes) node 파싱 OK →
`app.py`·`backend/*.py` py_compile OK. 수정 후에도 같은 순서로 검증할 것
(방법: `COMPONENT_FIX.md`).
