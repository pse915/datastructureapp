# 주차별 미니게임 모듈 가이드 (Games)

`app.py` + React + Sheets 기반 기존 서비스에 통합된 주별 게임 시스템.
관리자(게임 등록/활성화/기록 조회) + 학생(주차별 게임 플레이/점수 저장).

## 1. 전체 디렉토리 구조

```text
datastructureapp-full/
├─ app.py                        # 탭 분기 + 게임 이벤트 3종 + 역할별 games payload
├─ backend/
│  ├─ sheets.py                  # 기존 (인증/주차/포트폴리오)
│  ├─ week_admin.py              # 기존 (Drive 업로드)
│  ├─ worksheet_admin.py         # 학습지 모듈 (유지)
│  └─ game_store.py             # ★ 게임 저장소 (Sheets + JSON 파일 백엔드)
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx                # ★ StudentGames/TeacherGames 번들 내장 + 게임 탭 배선
│  │  ├─ games/
│  │  │  ├─ GameModule.jsx      # ★ 모듈 원본 (App.jsx 내장본과 동일 코드)
│  │  │  └─ games.css           # ★ 게임 스타일 (.gm-*)
│  │  └─ admin/                 # 학습지 모듈 (유지)
│  └─ dist/                      # ★ 실배포 파일 (위와 동일 구조, Streamlit이 직접 서빙)
├─ data/games.json               # JSON 파일 백엔드용 (로컬 개발 시 자동 생성)
└─ gas/Code.gs                   # 학습지용 GAS (게임은 Sheets 직접 사용)
```

> `dist/`가 Babel standalone으로 그대로 서빙되므로 `npm run build` 없이도 배포 반영됨.
> `src/`는 `npm run dev`(vite) 로컬 개발용. 게임 수정 시 `games/GameModule.jsx`와
> `App.jsx` 내장 번들(주석 `Games 번들`)에 동일 반영할 것.

## 2. Streamlit 백엔드 구조 (`app.py` + `backend/game_store.py`)

탭 분기는 기존과 동일: `build_payload()`가 `role`에 따라 분기.
게임은 `games` 키로 추가 전달된다.

```python
# 교사: 전체 17주 설정 + 전체 기록 / 학생: 활성화된 주차만 + 내 기록
"games": build_game_payload()
```

이벤트 (전부 `eventId` 1회 처리 가드 통과 후 실행):

| action | 역할 | 처리 |
|---|---|---|
| `teacher_game_save` | 교사 | `save_config()` — 주차 설정 upsert |
| `teacher_game_toggle` | 교사 | `set_enabled()` — 활성화 스위치 즉시 반영 |
| `student_game_submit` | 학생 | `submit_record()` — 학번+주차 upsert (최고점수/시도횟수 누적, 비활성 주차 거부) |

Sheets 스키마 (시트 자동 생성):

- `게임설정`: `주차|활성화|게임유형|제목|설명|콘텐츠JSON|업데이트일시`
- `게임기록`: `기록ID|학번|이름|학년|반|주차|게임유형|점수|만점|최고점수|시도횟수|소요초|완료일시|상세JSON`

게임 유형별 `콘텐츠JSON`:

```jsonc
// quiz
{ "questions": [{ "q": "문제", "options": ["A","B","C","D"], "answer": 0 }] }
// memory
{ "pairs": [{ "a": "photosynthesis", "b": "광합성" }] }
// embed
{ "url": "https://외부게임", "html": "<html>…", "passScore": 100 }
```

저장 백엔드 교체: `game_store.py`의 함수 시그니처(`load_all_configs(sheets)` 등)만 유지하면
SQLite/Firebase 구현으로 교체 가능. 로컬 무인증 개발용 `JsonFileGameStore`
(`data/games.json`)가 이미 포함되어 있다.

## 3. React 컴포넌트 (`Streamlit.setComponentValue` 연동)

`frontend/src/games/GameModule.jsx` (동일 코드가 `src/dist App.jsx`에 내장):

- `QuizPlayer` — 4지선다 순차 출제, 정답 즉시 표시, 종료 시 `onFinish({score, maxScore, durationSec, detail})`
- `MemoryPlayer` — 카드 뒤집기 매칭, 전체 완성 시 `onFinish`
- `EmbedPlayer` — `iframe`(url 또는 srcDoc) + 외부 게임용 `postMessage` 수신
  + 수동 "완료 보고" 버튼
- `GamePlayer` — `config.type` 분기 래퍼 (신규 유형 추가는 여기 1줄)
- `StudentGames` — 활성 주차 탭 + 최고점수 뱃지 + 플레이. 종료 시 전송:

```jsx
emit('student_game_submit', {
  week, gameType: cfg.type, score, maxScore,
  durationSec, detail, recordId: gmUid('game'), //冪등성 식별자
});
```

- `TeacherGames` — 주차 선택, 활성화 스위치(`teacher_game_toggle` 즉시 전송),
  유형별 콘텐츠 에디터, `게임 저장`(`teacher_game_save`), 주차별 기록 테이블,
  학생과 동일한 `GamePlayer` 미리보기.

외부 HTML5 게임 연동 규격: 게임 측에서
`parent.postMessage({source:'external-game', score: 80, maxScore: 100}, '*')`
호출 시 점수가 자동 저장된다.

## 4. 설치 및 적용 가이드

```bash
# 1) 통째로 push (dist 포함 필수 — Streamlit Cloud는 Node 없이 dist만 로드)
# 2) Secrets: 기존과 동일 (SPREADSHEET_URL, TEACHER_PASSWORD, [gcp_service_account])
#    + 선택: DRIVE_FOLDER_ID (학습지 이미지용, 게임은 불필요)
# 3) 실행
pip install -r requirements.txt
streamlit run app.py
```

```bash
# 로컬 React 개발 (선택)
cd frontend
npm install          # streamlit-component-lib 등
npm run dev          # src/ 기준. 배포는 dist/가 직접 서빙되므로 빌드 불필요
```

```bash
# Sheets 없이 로컬 테스트 (선택)
python -c "from backend.game_store import JsonFileGameStore as S; s=S(); print(s.load_all_configs()[0])"
```

교사 테스트 순서: 교사 로그인 → `게임` 탭 → 1주차 `활성화` ON → 유형별 콘텐츠 입력 →
`게임 저장` → `미리보기` 플레이 → 학생 로그인 → `게임` 탭 → 플레이 → 교사 탭 기록 테이블 확인.

## 확장 포인트

- 신규 게임 유형: `GamePlayer` 분기 1줄 + `GAME_TYPE_LABEL` 1줄 + 에디터 섹션 1개.
- Firebase: `game_store.py` 함수명 그대로 클래스/함수 교체 (`load_all_configs` 등 7개).
- 학생 제출 검증 강화: `submit_record()`의 활성화 체크 외에 학번당 일일 시도 제한 등 추가 가능.
