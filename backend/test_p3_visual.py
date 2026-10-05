"""P3 검증: 시각화 타입 + 로그 매핑 (mock, 외부 패키지 불필요)."""
from __future__ import annotations

import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

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

from backend import game_store as G


class FakeWS:
    def __init__(self, title, values, spreadsheet=None):
        self.title = title
        self._values = [list(r) for r in values]
        self.spreadsheet = spreadsheet
        self.batch_calls = []
        self.append_calls = []

    def get_all_values(self):
        return [list(r) for r in self._values]

    def row_values(self, n):
        if n == 1:
            return list(self._values[0]) if self._values else []
        return list(self._values[n - 1]) if 1 <= n <= len(self._values) else []

    def update(self, rng, rows, value_input_option=None):
        if rng == "A1":
            self._values[0] = list(rows[0])

    def batch_update(self, reqs, value_input_option=None):
        self.batch_calls.append(reqs)
        for req in reqs:
            rng = req["range"]
            col = "".join(c for c in rng if c.isalpha())
            row = int("".join(c for c in rng if c.isdigit()))
            idx = 0
            for ch in col:
                idx = idx * 26 + (ord(ch) - 64)
            while len(self._values) < row:
                self._values.append([])
            while len(self._values[row - 1]) < idx:
                self._values[row - 1].append("")
            self._values[row - 1][idx - 1] = req["values"][0][0]

    def append_row(self, row, value_input_option=None):
        self.append_calls.append(row)
        self._values.append(list(row))


class FakeBook:
    def __init__(self):
        self.ws = {}

    def worksheet(self, title):
        if title not in self.ws:
            raise Exception("no sheet")
        return self.ws[title]

    def add_worksheet(self, title, rows, cols):
        ws = FakeWS(title, [[]], spreadsheet=self)
        self.ws[title] = ws
        return ws


# 1) 시각화 5종이 정규화에서 유지된다 (기존 quiz 강제 변환 회귀 방지)
for vtype in G.VISUAL_TYPES:
    assert len(G.VISUAL_TYPES) == 5, G.VISUAL_TYPES
    cfg = G.normalize_config({"week": 3, "type": vtype, "title": "t", "content": {}})
    assert cfg["type"] == vtype, cfg
# 기존 3종도 그대로
for vtype in ("quiz", "memory", "embed"):
    assert G.normalize_config({"week": 1, "type": vtype})["type"] == vtype
# 알 수 없는 유형은 quiz로 폴백 (기존 동작 유지)
assert G.normalize_config({"week": 1, "type": "unknown"})["type"] == "quiz"

# 2) 시각화 콘텐츠 검증
ok = G.validate_visual_content({"initial": [1, 2, 3], "note": "hi"}, "visual:stack")
assert ok["initial"] == [1, 2, 3] and ok["note"] == "hi"
try:
    G.validate_visual_content({"initial": list(range(25))}, "visual:stack")
    raise AssertionError("25 items should fail")
except ValueError:
    pass
try:
    G.validate_visual_content({"initial": "nope"}, "visual:queue")
    raise AssertionError("non-list should fail")
except ValueError:
    pass
assert G.validate_visual_content({"initial": [], "algo": "weird"}, "visual:sort")["algo"] == "bubble"

# 3) student_visual_log 검증
clean = G.validate_visual_log_payload(
    {"week": 2, "visualType": "visual:tree", "completed": True, "durationSec": 45, "steps": 12, "recordId": "r1"})
assert clean == {"week": 2, "visualType": "visual:tree", "completed": True,
                 "durationSec": 45, "steps": 12, "recordId": "r1", "detail": {}}, clean
try:
    G.validate_visual_log_payload({"week": 2, "visualType": "quiz", "completed": True})
    raise AssertionError("non-visual should fail")
except ValueError:
    pass
try:
    G.validate_visual_log_payload({"week": 99, "visualType": "visual:sort", "completed": True})
    raise AssertionError("bad week should fail")
except ValueError:
    pass

# 4) log_visual_result: 완료여부→점수 매핑 + 시도 누적 + 비활성 거부
book = FakeBook()
cfg_ws = FakeWS("게임설정", [
    ["주차", "활성화", "게임유형", "제목", "설명", "콘텐츠JSON", "업데이트일시"],
    ["2", "Y", "visual:stack", "t", "d", "{}", "t"],
    ["3", "N", "visual:sort", "t", "d", "{}", "t"],
], spreadsheet=book)
rec_ws = FakeWS("게임기록", [
    ["기록ID", "학번", "이름", "학년", "반", "주차", "게임유형", "점수", "만점", "최고점수", "시도횟수", "소요초", "완료일시", "상세JSON"],
], spreadsheet=book)
book.ws["게임설정"] = cfg_ws
book.ws["게임기록"] = rec_ws
gsheets = {"더미": FakeWS("더미", [["h"]], spreadsheet=book), "__book__": book}
student = {"학번": "1701", "이름": "홍", "학년": "1", "반": "1"}

r1 = G.log_visual_result(gsheets, student, {"week": 2, "visualType": "visual:stack",
                                            "completed": True, "durationSec": 30, "steps": 5}, book=book)
assert r1["completed"] is True and r1["tries"] == 1 and r1["durationSec"] == 30, r1
# 기록 행: 점수 1/만점 1/최고 1 (최고점수 대신 완료 이력)
row = rec_ws._values[1]
assert row[7] == 1 and row[8] == 1 and row[9] == 1, row
# 재로그: 시도 누적, 완료 유지
r2 = G.log_visual_result(gsheets, student, {"week": 2, "visualType": "visual:stack",
                                            "completed": True, "durationSec": 20, "steps": 3}, book=book)
assert r2["tries"] == 2, r2
# 유형 불일치 거부
try:
    G.log_visual_result(gsheets, student, {"week": 2, "visualType": "visual:sort",
                                           "completed": True, "durationSec": 1}, book=book)
    raise AssertionError("type mismatch should fail")
except RuntimeError:
    pass
# 비활성 주차 거부
try:
    G.log_visual_result(gsheets, student, {"week": 3, "visualType": "visual:sort",
                                           "completed": True, "durationSec": 1}, book=book)
    raise AssertionError("disabled should fail")
except RuntimeError:
    pass
# 게임 주차에 실습 로그 거부
try:
    G.log_visual_result(gsheets, student, {"week": 5, "visualType": "visual:stack",
                                           "completed": True, "durationSec": 1}, book=book)
    raise AssertionError("non-visual week should fail")
except RuntimeError:
    pass

print("P3 backend tests passed")
