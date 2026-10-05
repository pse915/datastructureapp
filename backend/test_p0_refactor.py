"""P0 sheets/game 리팩토링 검증 (외부 패키지 없이 mock으로 실행)."""
from __future__ import annotations

import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# gspread / google.auth 스텁 (설치 없이 import 가능하게)
gspread = types.ModuleType("gspread")
gspread_exceptions = types.ModuleType("gspread.exceptions")


class APIError(Exception):
    pass


gspread_exceptions.APIError = APIError
gspread.exceptions = gspread_exceptions
sys.modules["gspread"] = gspread
sys.modules["gspread.exceptions"] = gspread_exceptions

google = types.ModuleType("google")
oauth2 = types.ModuleType("google.oauth2")
service_account = types.ModuleType("google.oauth2.service_account")


class Credentials:
    @staticmethod
    def from_service_account_info(info, scopes=None):
        return object()


service_account.Credentials = Credentials
oauth2.service_account = service_account
google.oauth2 = oauth2
sys.modules["google"] = google
sys.modules["google.oauth2"] = oauth2
sys.modules["google.oauth2.service_account"] = service_account

from backend import sheets as S
from backend import game_store as G


class FakeWS:
    def __init__(self, title, values, spreadsheet=None):
        self.title = title
        self._values = [list(r) for r in values]
        self.spreadsheet = spreadsheet
        self.batch_calls = []
        self.update_calls = []
        self.append_calls = []

    def get_all_values(self):
        return [list(r) for r in self._values]

    def row_values(self, n):
        if n == 1:
            return list(self._values[0]) if self._values else []
        return list(self._values[n - 1]) if 1 <= n <= len(self._values) else []

    def batch_update(self, reqs, value_input_option=None):
        self.batch_calls.append(reqs)
        for req in reqs:
            rng = req["range"]
            # "B3", "G3" 형태만 지원 (단일 셀)
            col = "".join(c for c in rng if c.isalpha())
            row = int("".join(c for c in rng if c.isdigit()))
            col_idx = ord(col) - 64
            while len(self._values) < row:
                self._values.append([])
            while len(self._values[row - 1]) < col_idx:
                self._values[row - 1].append("")
            self._values[row - 1][col_idx - 1] = req["values"][0][0]

    def update(self, rng, rows, value_input_option=None):
        self.update_calls.append((rng, rows))

    def append_row(self, row, value_input_option=None):
        self.append_calls.append(row)
        self._values.append(list(row))

    def find(self, text):
        for i, r in enumerate(self._values, start=1):
            if text in r:
                return types.SimpleNamespace(row=i)
        return None


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


# 1) _col_letter
assert S._col_letter(1) == "A", S._col_letter(1)
assert S._col_letter(27) == "AA", S._col_letter(27)
assert S._col_letter(28) == "AB"

# 2) get_book_from_sheets: 빈 dict는 명확한 에러
try:
    S.get_book_from_sheets({})
    raise AssertionError("empty sheets should fail")
except RuntimeError as e:
    assert "prepare_sheets" in str(e), e

# 3) get_book_from_sheets: __book__ 우선
book = FakeBook()
sheets = {"포트폴리오": FakeWS("포트폴리오", [["a"]], spreadsheet=book), "__book__": book}
assert S.get_book_from_sheets(sheets) is book

# 4) update_grade_and_feedback: batch 1회로 3컬럼 갱신
S._VALUES_CACHE.clear()
port_values = [
    ["제출ID", "학번", "이름", "학년", "반", "주차", "학습목표", "활동지질문", "제출내용", "점수", "배점", "피드백", "제출일시", "수정일시"],
    ["s1", "1701", "홍길동", "1", "1", "1", "g", "q", "content", "", "10", "", "t", "t"],
]
port_ws = FakeWS("포트폴리오", port_values, spreadsheet=book)
sheets2 = {"포트폴리오": port_ws, "__book__": book}
ok = S.update_grade_and_feedback(None, "", "1701", 1, 8, "잘했어요", sheets=sheets2)
assert ok is True, "grade save should succeed"
assert len(port_ws.batch_calls) == 1, f"expected 1 batch, got {len(port_ws.batch_calls)}"
assert len(port_ws.batch_calls[0]) == 3, port_ws.batch_calls[0]
# 배점 초과는 거부
try:
    S.update_grade_and_feedback(None, "", "1701", 1, 99, "x", sheets=sheets2)
    raise AssertionError("over-cap should fail")
except ValueError:
    pass

# 5) game submit: batch 1회 (7개 range)
S._VALUES_CACHE.clear()
rec_ws = FakeWS("게임기록", [
    ["기록ID", "학번", "이름", "학년", "반", "주차", "게임유형", "점수", "만점", "최고점수", "시도횟수", "소요초", "완료일시", "상세JSON"],
    ["g1", "1701", "홍", "1", "1", "1", "quiz", "60", "100", "60", "1", "30", "t", "{}"],
], spreadsheet=book)
cfg_ws = FakeWS("게임설정", [
    ["주차", "활성화", "게임유형", "제목", "설명", "콘텐츠JSON", "업데이트일시"],
    ["1", "Y", "quiz", "t", "d", "{}", "t"],
], spreadsheet=book)
book.ws["게임기록"] = rec_ws
book.ws["게임설정"] = cfg_ws
gsheets = {"x": FakeWS("x", [["h"]], spreadsheet=book), "__book__": book}
# load_config가 book.ws를 통해 읽도록 x 대신 실제 시트 dict 전달
gsheets = {"더미": FakeWS("더미", [["h"]], spreadsheet=book), "__book__": book}
res = G.submit_record(gsheets, {"학번": "1701", "이름": "홍", "학년": "1", "반": "1"},
                      {"week": 1, "score": 80, "maxScore": 100, "durationSec": 10, "detail": {}},
                      book=book)
assert res["score"] == 80 and res["best"] == 80, res
assert len(rec_ws.batch_calls) == 1 and len(rec_ws.batch_calls[0]) == 7, rec_ws.batch_calls

print("sheets/game refactor tests passed")
