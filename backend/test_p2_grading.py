"""P2 검증: 루브릭 일반화 + 1주차 회귀 + 스키마 마이그레이션 (mock)."""
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

from backend import grading as GR
from backend import sheets as S

# 1) 1주차 레거시 회귀: 구조화 답안 그대로 만점 경로
legacy_payload = {
    "answers": {"q1": "데이터", "q2": "기준", "q3": "정리", "q4": "통일된 모양",
                "r1": "쉽게 찾을", "r2": "관계", "r4": "효율적으로 관리", "listRule": "기준"},
    "activities": {
        "list": [{"item": "a", "person": "b"}, {"item": "c", "person": "d"}],
        "rows": [{"name": "n", "birthday": "b", "hobby": "h", "role": "r"},
                 {"name": "n", "birthday": "b", "hobby": "h", "role": "r"}],
        "tree": {"root": "r", "left": "l", "right": "x"},
        "note": "기록",
    },
}
r1 = GR.grade_submission(legacy_payload, None)
assert r1["graded"] is True and r1["score"] == 20 and r1["maxScore"] == 20, r1
# 오답 1개면 19점
p2 = dict(legacy_payload)
p2["answers"] = dict(legacy_payload["answers"])
p2["answers"]["q1"] = "오답"
r2 = GR.grade_submission(p2, None)
assert r2["score"] == 19, r2

# 2) 자유서술만 + 루브릭 없음 -> 스킵 (기존 흐름 보존, 점수 덮어쓰기 금지)
r3 = GR.grade_submission({"content": "오늘 열심히 배웠다"}, None)
assert r3.get("graded") is False and r3.get("skipped") is True, r3

# 3) 신규 루브릭: questions + keywords
rubric = {
    "questions": [
        {"key": "q1", "accepted": ["광합성", "photosynthesis"], "score": 2},
        {"key": "q2", "accepted": ["기공"], "score": 1},
    ],
    "keywords": [{"term": "엽록소", "score": 1}],
    "maxScore": 4,
}
ok_payload = {"answers": {"q1": "광합성", "q2": "기공"}, "content": "엽록소가 중요하다"}
r4 = GR.grade_submission(ok_payload, rubric)
assert r4["graded"] and r4["score"] == 4 and r4["maxScore"] == 4, r4
# 본문 포함 인정: 답안 비었어도 본문에 정답어가 있으면 인정
r5 = GR.grade_submission({"answers": {}, "content": "광합성은 엽록소에서 일어나고 기공으로 기체가 드나든다"}, rubric)
assert r5["score"] == 4, r5
# 오답 재제출 시 점수 갱신 확인 (낮아져야 함)
r6 = GR.grade_submission({"answers": {"q1": "호흡"}, "content": "모르겠다"}, rubric)
assert r6["score"] < r4["score"], (r6, r4)
# 깨진 루브릭 문자열은 None 취급
assert GR.parse_rubric("{broken") is None
assert GR.parse_rubric("") is None

# 4) 인정: 답안 대소문자/공백 무시
assert GR.is_correct("  광 합성 ", ["광합성"]) is True


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
        return list(self._values[n - 1]) if 1 <= n <= len(self._values) else []

    def update(self, rng, rows, value_input_option=None):
        self.update_calls.append((rng, rows))
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


# 5) 헤더 마이그레이션: 기존 5열 주차설정 + 자료링크 → 루브릭JSON 자동 추가
S._VALUES_CACHE.clear()
ws5 = FakeWS("주차설정", [["주차", "학습목표", "활동지질문", "배점", "공개여부", "자료링크"], ["1", "g", "q", "10", "Y", ""]])
hdr = S._ensure_header_tolerant(ws5, S.HEADERS[S.WEEK_SHEET], S.WEEK_OPTIONAL_COLS)
assert "루브릭JSON" in hdr, hdr
assert ws5.update_calls and ws5.update_calls[0][0] == "A1"
#未知 열이 있으면 건드리지 않는다
ws_unknown = FakeWS("주차설정", [["주차", "학습목표", "활동지질문", "배점", "공개여부", "내맘대로"]])
hdr2 = S._ensure_header_tolerant(ws_unknown, S.HEADERS[S.WEEK_SHEET], S.WEEK_OPTIONAL_COLS)
assert hdr2[-1] == "내맘대로" and not ws_unknown.update_calls
# 필수 prefix가 틀리면 에러
ws_bad = FakeWS("주차설정", [["week", "goal"]])
try:
    S._ensure_header_tolerant(ws_bad, S.HEADERS[S.WEEK_SHEET], S.WEEK_OPTIONAL_COLS)
    raise AssertionError("bad header should fail")
except RuntimeError:
    pass

# 6) save_auto_grade: 점수/피드백/상태/상세를 batch 1회로S._VALUES_CACHE.clear()
port = FakeWS("포트폴리오", [
    ["제출ID", "학번", "이름", "학년", "반", "주차", "학습목표", "활동지질문", "제출내용", "점수", "배점", "피드백", "제출일시", "수정일시", "채점상태", "자동상세"],
    ["s1", "1701", "홍", "1", "1", "2", "g", "q", "content", "", "10", "", "t", "t", "", ""],
])
book = types.SimpleNamespace()
sheets = {"포트폴리오": port, "__book__": book}
ok = S.save_auto_grade(sheets, "1701", 2, 7, "[자동채점 7/10] q1O", {"score": 7, "feedback": []})
assert ok is True
assert len(port.batch_calls) == 1 and len(port.batch_calls[0]) == 5, port.batch_calls
# 헤더에 선택열이 없어도 자동 추가 후 저장
S._VALUES_CACHE.clear()
port2 = FakeWS("포트폴리오", [
    ["제출ID", "학번", "이름", "학년", "반", "주차", "학습목표", "활동지질문", "제출내용", "점수", "배점", "피드백", "제출일시", "수정일시"],
    ["s1", "1701", "홍", "1", "1", "2", "g", "q", "content", "", "10", "", "t", "t"],
])
sheets2 = {"포트폴리오": port2, "__book__": book}
ok2 = S.save_auto_grade(sheets2, "1701", 2, 5, "summary", {"score": 5})
assert ok2 is True and "채점상태" in port2._values[0]

# 7) 오답 재제출 시 점수 갱신: 자동채점 후 다시 저장하면 새 점수로 덮어쓴다
S._VALUES_CACHE.clear()
ok3 = S.save_auto_grade(sheets2, "1701", 2, 9, "[자동채점 9/10]", {"score": 9, "feedback": []})
assert ok3 is True
hdr = port2._values[0]
score_idx = hdr.index("점수")
status_idx = hdr.index("채점상태")
assert str(port2._values[1][score_idx]) == "9", port2._values[1]
assert str(port2._values[1][status_idx]) == "자동채점"
# 교사확정이 상태를 바꾼다
ok4 = S.update_grade_and_feedback(None, "", "1701", 2, 6, "교사 피드백", sheets=sheets2)
assert ok4 is True
assert str(port2._values[1][status_idx]) == "교사확정", port2._values[1]
assert str(port2._values[1][score_idx]) == "6"

print("P2 backend tests passed")
