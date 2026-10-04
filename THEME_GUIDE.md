# 네이버 테마 가이드 (Naver Design System Theme)

게임 모듈 + 앱 셸에 적용된 네이버 스타일 정의.
`GAMES_GUIDE.md`(기능/백엔드)와 함께 볼 것.

## 1. 디렉토리 및 스타일 가이드

```text
frontend/src/theme/naver.css      # ★ 토큰 + .nv-* 컴포넌트 + 셸 오버라이드 (원본)
frontend/dist/theme/naver.css     # 동일 복사본 (참조용)
frontend/src|dist/styles.css      #末尾에 naver.css 내용이 append되어 실제 적용됨
frontend/dist/index.html          # Pretendard 폰드 링크 (+ 로컬 vendor 스크립트 유지)
frontend/src|dist/games/
  GameModule.jsx                  # 네이버 클래스(.nv-*) 적용 게임 컴포넌트
  games.css                       # 구(.ws/.gm 기반) 게임 CSS — 유지, 신규는 naver.css 사용
```

디자인 토큰 (`:root`):

| 토큰 | 값 | 용도 |
|---|---|---|
| `--nv-green` | `#03C75A` | Primary/버튼/하이라이트 바/토글 ON |
| `--nv-green-dark` | `#02A94E` | 버튼 Hover |
| `--nv-green-tint` | `#E8F9EF` | 뱃지/선택행 배경 |
| `--nv-bg` | `#F4F6F8` | 전체 배경 |
| `--nv-surface` | `#FFFFFF` | 카드 |
| `--nv-border` | `#E4E8EB` | 얇은 보더 |
| `--nv-text` | `#1E1E23` | 메인 텍스트 |
| `--nv-sub` | `#8E8E93` | 서브 텍스트 |
| `--nv-radius` | `12px` | 카드 모서리 |

컴포넌트 클래스: `.nv-page` `.nv-page-head` `.nv-card` `.nv-badge`
`.nv-btn`(+`.nv-btn-primary`) `.nv-input` `.nv-select` `.nv-textarea`
`.nv-tabs` > `.nv-tab(.on)`(하단 그린 바) `.nv-switch`(토글)
`.nv-table` `.nv-quiz-opt(.correct/.wrong)` `.nv-progress`
`.nv-mem-grid` `.nv-mem-card(.face/.matched)` `.nv-frame` `.nv-empty`

전역 오버라이드(기존 셸 → 네이버 톤): 배경 `#F4F6F8`, Pretendard 폰트 스택,
`.ink-button`/`.brand-mark` 그린, 내비 활성 상태 그린 틴트,
진행 바·선택 링 그린. 기존 레이아웃/클래스명은 그대로라 기능 영향 없음.

## 2. 백엔드 (`app.py`) — 변경 없음

테마는 프론트 CSS + 게임 번들 마크업 교체のみ.
`teacher_game_save/toggle`, `student_game_submit`, `build_game_payload()`,
`backend/game_store.py`는 `GAMES_GUIDE.md` 그대로 (full 버전과 동일).

## 3. 컴포넌트 예시 (발췌)

네이버 탭 (선택 탭 하단 그린 바는 CSS `.nv-tab.on::after`):

```jsx
<div className="nv-tabs">
  {list.map((g) => (
    <button key={g.week}
      className={`nv-tab ${Number(week) === Number(g.week) ? 'on' : ''}`}
      onClick={() => setWeek(Number(g.week))}>
      <b>{g.week}주차</b><small>{GAME_TYPE_LABEL[g.type]}</small>
    </button>
  ))}
</div>
```

토글 스위치 (저장 없이 즉시 전송):

```jsx
<label className="nv-switch">
  <input type="checkbox" checked={enabled} onChange={(e) => {
    setEnabled(e.target.checked);
    emit('teacher_game_toggle', { week, enabled: e.target.checked });
  }} />
  <span className="nv-slider" />{enabled ? '활성화' : '비활성화'}
</label>
```

점수 전송 (학생):

```jsx
emit('student_game_submit', {
  week, gameType: cfg.type, score, maxScore, durationSec,
  detail, recordId: gmUid('game'),
});
```

전체 코드는 `games/GameModule.jsx` 및 `App.jsx` 내장 `Games 번들` 블록 참조.

## 4. 빌드 및 연동 가이드

```bash
pip install -r requirements.txt
streamlit run app.py          # dist/가 그대로 서빙 (빌드 불필요)
```

```bash
cd frontend && npm install && npm run dev   # src/ 기준 로컬 개발 (선택)
```

- 게임/테마 수정 후: `games/GameModule.jsx` ↔ `App.jsx` 내장 번들 동기화 →
  Babel 검증 후 `dist/` 커밋 (검증법은 `COMPONENT_FIX.md`).
- 폰트는 CDN progressive enhancement — 오프라인이면 시스템 폰트로 자동 폴백.
- 학습지(`admin/`) 모듈은 기존 스타일 유지. 네이버로 맞추려면
  `.ws-*` → `.nv-*` 클래스 치환이 다음 단계 (본 가이ンの 매핑표 참조).
