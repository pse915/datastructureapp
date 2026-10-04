# 컴포넌트 로딩 실패 수정 내역 (2026-10-04)

증상: `Your app is having trouble loading the app.technical_home_portfolio component.`

## 원인 1 (직접 원인): `App.jsx` 문법 오류 1건

`TeacherGames` 초기화 코드에 닫는 괄호 누락:

```js
// 수정 전 (Babel 파싱 실패 → 스크립트 전체 중단 → setComponentReady 미발송)
options: [...(q.options || ['', '', '', '')],
// 수정 후
options: [...(q.options || ['', '', '', ''])],
```

`text/babel` 스크립트는 파일 전체가 파싱되어야 실행되므로,
오류 1개가 컴포넌트 전체 로딩 실패로 나타났다.
`frontend/src/games/GameModule.jsx`, `dist/games/GameModule.jsx` 동일 수정.

## 원인 2 (잠재 원인): 독립 모듈 파일의 JSX 중괄호 오류

`frontend/src/admin/WorksheetUploader.jsx`:

```jsx
<!-- 수정 전: JSX 텍스트 안의 { } 는 표현식으로 파싱되어 오류 -->
<small>... (예: {"0":1})</small>
<!-- 수정 후 -->
<small>... (예: {'{"0":1}'})</small>
```

해당 파일은 `index.html`에서 로드하지 않으므로 이번 장애와 무관하나 함께 수정.

## 원인 3 (환경 요인 제거): CDN 의존 제거

`frontend/dist/index.html`이 `unpkg.com`에서 React/ReactDOM/Babel을
매번 내려받던 구조를 로컬 벤더링으로 교체:

- `frontend/dist/vendor/react.production.min.js` (18.3.1)
- `frontend/dist/vendor/react-dom.production.min.js` (18.3.1)
- `frontend/dist/vendor/babel.min.js` (7.24.7)

배포망 지연·차단 시에도 컴포넌트가 로드된다.
로드 실패 시 빈 화면 대신 원인을 보여주는 `#boot-error` 박스도 추가.

## 검증 (배포 전 수행됨)

- Babel 7.24.7로 `dist/src App.jsx`, `GameModule.jsx`, `WorksheetUploader.jsx`,
  `googleService.js` 전체 트랜스파일 → 전부 통과
- 변환 결과물(92,888 bytes)을 `node --check`로 파싱 검증 → 통과
- `app.py`, `backend/*.py` 전부를 `py_compile` → 통과

재발 방지: `App.jsx` 수정 후에는 위 검증(또는 `npm run dev`에서 확인) 후
`frontend/dist/`를 커밋할 것.
