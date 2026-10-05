"""P1 검증: 필터/페이지네이션/일괄/CSV/감사로그 (mock, 외부 패키지 불필요)."""
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

from backend import sheets as S


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
        return list(self._values[n - 1]) if 1 <= n <= len(self._values) else []

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


# 500건 필터/페이지 성능 스모크
rows = []
for i in range(500):
    rows.append({
        "학번": f"{1700 + (i % 30)}", "이름": f"학생{i % 30}", "학년": "1",
        "반": str(1 + (i % 3)), "주차": str(1 + (i % 17)),
        "점수": "" if i % 5 == 0 else str(80 + (i % 20)),
        "배점": "100", "피드백": "", "제출일시": f"2026-01-{(i % 28) + 1:02d}",
        "제출내용": f"내용 {i}", "제출ID": f"s{i}",
    })
import time

t0 = time.monotonic()
paged = S.query_portfolio(rows, search="학생1", grade="1", klass="", week="", only_ungraded=False, page=1, page_size=50)
dt = time.monotonic() - t0
assert paged["pageSize"] == 50 and paged["page"] == 1, paged
assert dt < 2.0, f"filter too slow: {dt}"
# 미채점 필터
p2 = S.query_portfolio(rows, only_ungraded=True, page=1, page_size=50)
assert all(r["점수"] == "" for r in p2["rows"]), "ungraded filter failed"

# 반별 통계
students = [{"학번": str(1700 + i), "이름": f"학생{i}", "학년": "1", "반": str(1 + (i % 3))} for i in range(30)]
stats = S.build_class_stats(students, rows)
assert stats, "empty stats"
for st in stats:
    for k in ("학생수", "제출학생수", "제출건수", "제출률", "평균점수", "미제출자수", "미채점건수"):
        assert k in st, f"missing {k}"

# 일괄 30건 1회 batch
S._VALUES_CACHE.clear()
book = FakeBook()
port = FakeWS("포트폴리오", [
    ["제출ID", "학번", "이름", "학년", "반", "주차", "학습목표", "활동지질문", "제출내용", "점수", "배점", "피드백", "제출일시", "수정일시"],
] + [[f"s{i}", str(1700 + i), f"학생{i}", "1", "1", "1", "g", "q", "c", "", "10", "", "t", "t"] for i in range(30)], spreadsheet=book)
sheets = {"포트폴리오": port, "__book__": book}
items = [{"studentId": str(1700 + i), "week": 1, "score": 8 + (i % 3), "feedback": f"fb{i}"} for i in range(30)]
res = S.bulk_update_grades(None, "", items, sheets=sheets)
assert res["updated"] == 30, res
assert len(port.batch_calls) == 1, f"expected 1 batch, got {len(port.batch_calls)}"
assert len(port.batch_calls[0]) == 90, len(port.batch_calls[0])
# 31건 거부
try:
    S.bulk_update_grades(None, "", items + [{"studentId": "1799", "week": 1, "score": 5, "feedback": ""}], sheets=sheets)
    raise AssertionError("31 items should fail")
except ValueError:
    pass

# CSV: 헤더 + BOM은 프론트에서付与, 본문 개행 확인
csv = S.build_teacher_csv(rows[:5], students)
assert csv.splitlines()[0].startswith('"학번"'), csv.splitlines()[0]
assert csv.endswith("\n")

# 감사로그 best-effort (실패해도 예외 없음)
audit_ws = FakeWS("감사로그", [["조작일시", "역할", "액션", "대상", "상세"]], spreadsheet=book)
book.ws["감사로그"] = audit_ws
sheets2 = {"감사로그": audit_ws, "__book__": book}
S.append_audit_log(sheets2, "teacher", "teacher_bulk_grade", "30건", "test")
assert len(audit_ws.append_calls) == 1

print("P1 backend tests passed")
