"""설정 게이트 검증: Secrets 누락 시 가이드 + 중단, 정상 시 통과 (stub 실행)."""
from __future__ import annotations

import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# 외부 패키지 스텁
gspread = types.ModuleType("gspread")
gex = types.ModuleType("gspread.exceptions")


class APIError(Exception):
    pass


gex.APIError = APIError
gspread.exceptions = gex
sys.modules["gspread"] = gspread
sys.modules["gspread.exceptions"] = gex
google = types.ModuleType("google")
oauth2 = types.ModuleType("google.oauth2")
sa = types.ModuleType("google.oauth2.service_account")


class Credentials:
    @staticmethod
    def from_service_account_info(info, scopes=None):
        return object()


sa.Credentials = Credentials
oauth2.service_account = sa
google.oauth2 = oauth2
sys.modules["google"] = google
sys.modules["google.oauth2"] = oauth2
sys.modules["google.oauth2.service_account"] = sa
sys.modules["pandas"] = types.ModuleType("pandas")


class StopSentinel(Exception):
    pass


class State(dict):
    def __getattr__(self, k):
        try:
            return self[k]
        except KeyError as exc:
            raise AttributeError(k) from exc

    def __setattr__(self, k, v):
        self[k] = v


class Secrets(dict):
    pass


def make_st(secrets: dict):
    calls = []
    st = types.ModuleType("streamlit")
    st.secrets = Secrets(secrets)
    st.session_state = State()
    st.set_page_config = lambda **k: None
    st.title = lambda *a, **k: calls.append(("title", a[0] if a else ""))
    st.error = lambda *a, **k: calls.append(("error", a[0] if a else ""))
    st.subheader = lambda *a, **k: calls.append(("subheader", a[0] if a else ""))
    st.write = lambda *a, **k: calls.append(("write", a[0] if a else ""))
    st.code = lambda *a, **k: calls.append(("code", ""))
    st.info = lambda *a, **k: calls.append(("info", a[0] if a else ""))

    def _stop():
        calls.append(("stop", ""))
        raise StopSentinel()

    st.stop = _stop
    st.rerun = lambda: None
    return st, calls


def run_app(secrets: dict):
    st, calls = make_st(secrets)
    comp = types.ModuleType("streamlit.components.v1")
    comp.declare_component = lambda name, **k: (lambda **kw: None)
    pkg = types.ModuleType("streamlit.components")
    sys.modules["streamlit"] = st
    sys.modules["streamlit.components"] = pkg
    sys.modules["streamlit.components.v1"] = comp
    for m in [m for m in list(sys.modules) if m in ("app", "__main__")]:
        pass
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    g = {"__name__": "app_under_test", "__file__": str(ROOT / "app.py")}
    try:
        exec(compile(src, "app.py", "exec"), g)
    except StopSentinel:
        return g, calls, True
    return g, calls, False


# Case A: Secrets 없음 → 가이드 + 중단
_, calls_a, stopped_a = run_app({})
assert stopped_a, "빈 Secrets에서는 st.stop()으로 중단해야 한다"
kinds_a = [k for k, _ in calls_a]
assert "error" in kinds_a and "code" in kinds_a, calls_a

# Case B: 필수 Secrets 있음 → 중단 없이 통과 (로그인 화면 단계까지)
full = {
    "SPREADSHEET_URL": "https://docs.google.com/spreadsheets/d/xxxx/edit",
    "TEACHER_PASSWORD": "pw",
    "gcp_service_account": {"type": "service_account"},
}
_, calls_b, stopped_b = run_app(full)
assert not stopped_b, "정상 Secrets에서는 중단하면 안 된다"
assert not any(k == "stop" for k, _ in calls_b), calls_b

# Case C: URL만 없고 서비스계정 있음 → 여전히 중단
_, _, stopped_c = run_app({"gcp_service_account": {"type": "service_account"}})
assert stopped_c, "SPREADSHEET_URL 없으면 중단해야 한다"

print("setup gate tests passed")
