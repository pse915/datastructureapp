# Component 로딩 오류 해결 가이드

대상 오류:

```text
Your app is having trouble loading the app.datastructuregram component.
If this is an installed component that works locally, the app may be having
trouble accessing the component frontend assets...
```

## 원인 → 해결 대응표

| # | 원인 | 증상 | 해결 (본 패키지 반영) |
|---|---|---|---|
| 1 | `npm run build` 미실행. `frontend/build/index.html`이 없음 | 위 오류 + 앱 전체 중단 | `app.py`가 `REQUIRED_FILES` 검사로 부팅 즉시 감지하고 해결 명령어를 포함한 `RuntimeError` 출력. `frontend/build/index.html` 단일파일 폴백 동봉이라 바로 실행 가능 |
| 2 | `declare_component`에 상대경로·잘못된 폴더 지정 (예: `dist/` + 날것 `.jsx` 여러 개) | iframe 404, 빈 화면, 컴포넌트명과 무관하게 로드 실패 | `_RELEASE` 플래그 + `Path(__file__).parent.absolute()` 기준 절대경로 `frontend/build` 사용. 날것 JSX 다파일 구조 폐기 → 빌드 산출물(또는 단일 `index.html`)만 서빙 |
| 3 | dev server URL 처리 미흡 (배포 환경에서 `url=`로 선언) | Cloud에서 localhost 접속 시도 → 영원히 로딩 | 배포 기본 `_RELEASE=True`. dev는 `DS_COMPONENT_RELEASE=0` + `STREAMLIT_COMPONENT_DEV_URL=http://localhost:3001` 둘 다 있을 때만 `url=` 사용 |
| 4 | 컴포넌트 이름에 점(`.`) 포함 (예: `app.datastructuregram`) | 에셋 URL 경로 해석 실패 가능 | `COMPONENT_NAME = "ds_black_dashboard"` (영문+언더스코어만) |
| 5 | Vite `base: '/'` 절대경로 빌드 | 로컬은 되는데 Streamlit iframe에서 `/assets/...` 404 | `vite.config.js`에 `base: './'` 고정 |
| 6 | 첫 로드 `None` 값을 이벤트로 오인 처리 | 로그인 전 크래시/rerun 루프 | `process_event`가 `None`·문자열·무이벤트를 `False`로 패스. `default=None`, `key` 고정 |
| 7 | **컴포넌트 HTML이 CDN(unpkg 등)에서 React/Babel 로드** — 학교·기관망 프록시에서 차단 | 로컬은 되는데 **배포에서만** 위 오류 (메시지의 "proxy settings"가 바로 이것) | `frontend/build/vendor/`에 `react`·`react-dom`·`babel.min.js` **로컬 동봉**, `index.html`은 `./vendor/` 상대경로만 참조. 외부 차단과 무관하게 동작. 남는 원격 URL은 Pretendard 폰트 CSS 1개뿐이며 로드 실패해도 시스템 폰트로 렌더됨 |

## 재배포 절차 (수정 후)

```bash
git add frontend/build app.py
git commit -m "fix: bundle vendor locally, zero-CDN component"
git push
```

Streamlit Cloud → 앱 → **Reboot app** (캐시된 옛 에셋 제거). 시크릿 모드 강력 새로고침으로 확인.

## 올바른 선언부 (app.py 발췌)

```python
COMPONENT_NAME = "ds_black_dashboard"
_RELEASE = os.getenv("DS_COMPONENT_RELEASE", "1").strip() not in ("0", "false", "False")
_DEV_URL = os.getenv("STREAMLIT_COMPONENT_DEV_URL", "").strip()

ROOT = Path(__file__).parent.absolute()
BUILD_DIR = ROOT / "frontend" / "build"
REQUIRED_FILES = ("index.html",)

if not _RELEASE and _DEV_URL:
    ds_component = components.declare_component(COMPONENT_NAME, url=_DEV_URL)
else:
    missing = [f for f in REQUIRED_FILES if not (BUILD_DIR / f).exists()]
    if missing:
        raise RuntimeError(
            "React 컴포넌트 빌드 산출물이 없습니다: "
            + ", ".join(f"frontend/build/{f}" for f in missing)
            + " | 해결: cd frontend && npm install && npm run build"
            + " 후 Streamlit 재실행."
        )
    ds_component = components.declare_component(COMPONENT_NAME, path=str(BUILD_DIR))
```

## 체크리스트

- [ ] `frontend/build/index.html` 존재 (동봉 폴백 또는 `npm run build` 결과물)
- [ ] `vite.config.js`: `base: './'`, `outDir: 'build'`
- [ ] 배포 환경변수에 `STREAMLIT_COMPONENT_DEV_URL` 없음
- [ ] 컴포넌트명·`key`에 점(`.`) 없음
- [ ] 브라우저 캐시 강력 새로고침 후 재확인
