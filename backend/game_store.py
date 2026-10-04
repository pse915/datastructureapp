"""주차별 미니게임 저장소.

설계: 저장 백엔드를 함수 시그니처 뒤에 숨겨 JSON/SQLite/Firebase로 교체 가능.
기본값은 Google Sheets (기존 sheets.py/week_admin.py와 동일 인증 재사용).
로컬 개발·테스트용으로 data/games.json 파일 백엔드도 제공한다.

시트:
  게임설정: 주차|활성화|게임유형|제목|설명|콘텐츠JSON|업데이트일시
  게임기록: 기록ID|학번|이름|학년|반|주차|게임유형|점수|만점|최고점수|시도횟수|소요초|완료일시|상세JSON
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.sheets import _with_backoff

CONFIG_SHEET = "게임설정"
RECORD_SHEET = "게임기록"

CONFIG_HEADERS = ["주차", "활성화", "게임유형", "제목", "설명", "콘텐츠JSON", "업데이트일시"]
RECORD_HEADERS = ["기록ID", "학번", "이름", "학년", "반", "주차", "게임유형",
                  "점수", "만점", "최고점수", "시도횟수", "소요초", "완료일시", "상세JSON"]

GAME_TYPES = ("quiz", "memory", "embed")
LOCAL_PATH = Path(__file__).resolve().parent.parent / "data" / "games.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def default_config(week: int) -> dict[str, Any]:
    return {
        "week": int(week), "enabled": False, "type": "quiz",
        "title": f"{week}주차 미니게임", "desc": "",
        "content": {"questions": []}, "updatedAt": "",
    }


def normalize_config(raw: dict[str, Any]) -> dict[str, Any]:
    week = int(raw.get("week", raw.get("주차", 1)))
    gtype = str(raw.get("type", raw.get("게임유형", "quiz")))
    if gtype not in GAME_TYPES:
        gtype = "quiz"
    content = raw.get("content", {})
    if isinstance(content, str):
        try:
            content = json.loads(content or "{}")
        except Exception:
            content = {}
    if not isinstance(content, dict):
        content = {}
    enabled = raw.get("enabled", raw.get("활성화", "N"))
    if isinstance(enabled, str):
        enabled = enabled.upper() not in {"N", "NO", "FALSE", "0", ""}
    return {
        "week": week, "enabled": bool(enabled), "type": gtype,
        "title": str(raw.get("title", raw.get("제목", f"{week}주차 미니게임"))),
        "desc": str(raw.get("desc", raw.get("설명", ""))),
        "content": content,
        "updatedAt": str(raw.get("updatedAt", raw.get("업데이트일시", ""))),
    }


# ---------------- Sheets 백엔드 ----------------

def _ensure(ws_title: str, headers: list[str], sheets) -> Any:
    ws0 = next(iter(sheets.values()))
    book = ws0.spreadsheet
    try:
        ws = book.worksheet(ws_title)
    except Exception:
        ws = book.add_worksheet(title=ws_title, rows=500, cols=len(headers))
    cur = _with_backoff(lambda: ws.row_values(1))
    if not cur:
        _with_backoff(lambda: ws.update("A1", [headers]))
    return ws


def load_all_configs(sheets) -> list[dict[str, Any]]:
    ws = _ensure(CONFIG_SHEET, CONFIG_HEADERS, sheets)
    values = _with_backoff(lambda: ws.get_all_values())
    found: dict[int, dict[str, Any]] = {}
    for r in values[1:]:
        if not r or not str(r[0]).strip().isdigit():
            continue
        try:
            content = json.loads(r[5] if len(r) > 5 else "{}")
        except Exception:
            content = {}
        found[int(r[0])] = normalize_config({
            "week": int(r[0]), "enabled": r[1] if len(r) > 1 else "N",
            "type": r[2] if len(r) > 2 else "quiz",
            "title": r[3] if len(r) > 3 else "",
            "desc": r[4] if len(r) > 4 else "",
            "content": content, "updatedAt": r[6] if len(r) > 6 else "",
        })
    return [found.get(w) or default_config(w) for w in range(1, 18)]


def load_config(sheets, week: int) -> dict[str, Any]:
    for c in load_all_configs(sheets):
        if c["week"] == int(week):
            return c
    return default_config(week)


def save_config(sheets, config: dict[str, Any]) -> str:
    cfg = normalize_config(config)
    if not (1 <= cfg["week"] <= 17):
        raise ValueError("주차는 1~17만 가능합니다.")
    ws = _ensure(CONFIG_SHEET, CONFIG_HEADERS, sheets)
    updated = now_iso()
    row = [str(cfg["week"]), "Y" if cfg["enabled"] else "N", cfg["type"],
           cfg["title"], cfg["desc"],
           json.dumps(cfg["content"], ensure_ascii=False), updated]
    values = _with_backoff(lambda: ws.get_all_values())
    target = next((i for i, r in enumerate(values[1:], start=2)
                   if r and str(r[0]).strip() == str(cfg["week"])), None)
    if target:
        _with_backoff(lambda: ws.update(f"A{target}:G{target}", [row],
                                        value_input_option="USER_ENTERED"))
    else:
        _with_backoff(lambda: ws.append_row(row, value_input_option="USER_ENTERED"))
    return updated


def set_enabled(sheets, week: int, enabled: bool) -> str:
    cfg = load_config(sheets, week)
    cfg["enabled"] = bool(enabled)
    return save_config(sheets, cfg)


def _find_record_row(ws, sid: str, week: int) -> int | None:
    values = _with_backoff(lambda: ws.get_all_values())
    if len(values) < 2:
        return None
    for i, r in enumerate(values[1:], start=2):
        if len(r) > 5 and str(r[1]).strip() == str(sid).strip() \
                and str(r[5]).strip() == str(week):
            return i
    return None


def submit_record(sheets, student: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """학생 게임 결과 upsert. 같은 학번+주차는 최고점수 갱신 + 시도횟수 누적."""
    week = int(payload.get("week", 0))
    if not (1 <= week <= 17):
        raise ValueError("올바른 주차가 아닙니다.")
    cfg = load_config(sheets, week)
    if not cfg["enabled"]:
        raise RuntimeError("현재 비활성화된 주차의 게임입니다.")
    score = int(payload.get("score", 0))
    max_score = int(payload.get("maxScore", score) or score)
    duration = int(payload.get("durationSec", 0) or 0)
    try:
        detail = json.dumps(payload.get("detail", {}), ensure_ascii=False)
    except Exception:
        detail = "{}"

    ws = _ensure(RECORD_SHEET, RECORD_HEADERS, sheets)
    sid = str(student.get("학번", ""))
    row_no = _find_record_row(ws, sid, week)
    stamped = now_iso()
    if row_no:
        cur = _with_backoff(lambda: ws.row_values(row_no))
        best = max(int(float(cur[9] or 0)) if len(cur) > 9 and cur[9] else 0, score)
        tries = (int(float(cur[10] or 0)) if len(cur) > 10 and cur[10] else 0) + 1
        col = lambda name: RECORD_HEADERS.index(name) + 1  # noqa: E731
        _with_backoff(lambda: ws.update_cell(row_no, col("점수"), score))
        _with_backoff(lambda: ws.update_cell(row_no, col("만점"), max_score))
        _with_backoff(lambda: ws.update_cell(row_no, col("최고점수"), best))
        _with_backoff(lambda: ws.update_cell(row_no, col("시도횟수"), tries))
        _with_backoff(lambda: ws.update_cell(row_no, col("소요초"), duration))
        _with_backoff(lambda: ws.update_cell(row_no, col("완료일시"), stamped))
        _with_backoff(lambda: ws.update_cell(row_no, col("상세JSON"), detail))
    else:
        record_id = str(payload.get("recordId", "")).strip() or f"g{sid}w{week}-{stamped}"
        _with_backoff(lambda: ws.append_row(
            [record_id, sid, student.get("이름", ""), student.get("학년", ""),
             student.get("반", ""), week, cfg["type"], score, max_score,
             score, 1, duration, stamped, detail],
            value_input_option="USER_ENTERED"))
        best, tries = score, 1
    return {"week": week, "score": score, "best": best, "tries": tries, "savedAt": stamped}


def _record_to_dict(r: list[str]) -> dict[str, Any]:
    p = (lambda i: r[i] if len(r) > i else "")
    return {"기록ID": p(0), "학번": p(1), "이름": p(2), "학년": p(3), "반": p(4),
            "주차": p(5), "게임유형": p(6), "점수": p(7), "만점": p(8),
            "최고점수": p(9), "시도횟수": p(10), "소요초": p(11),
            "완료일시": p(12), "상세JSON": p(13)}


def load_all_records(sheets) -> list[dict[str, Any]]:
    ws = _ensure(RECORD_SHEET, RECORD_HEADERS, sheets)
    return [_record_to_dict(r) for r in _with_backoff(lambda: ws.get_all_values())[1:] if r]


def load_student_records(sheets, student_id: str) -> list[dict[str, Any]]:
    sid = str(student_id).strip()
    return [r for r in load_all_records(sheets) if str(r.get("학번", "")).strip() == sid]


# ---------------- JSON 파일 백엔드 (로컬 개발/테스트용) ----------------

def _read_local() -> dict[str, Any]:
    if LOCAL_PATH.exists():
        try:
            return json.loads(LOCAL_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"configs": {}, "records": []}


def _write_local(state: dict[str, Any]) -> None:
    LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


class JsonFileGameStore:
    """Sheets 없이 로컬 data/games.json에 저장. 함수명은 Sheets 백엔드와 1:1 대응."""

    def __init__(self, path: str | Path = LOCAL_PATH):
        self.path = Path(path)

    def _load(self) -> dict[str, Any]:
        if self.path.exists():
            try:
                return json.loads(self.path.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {"configs": {}, "records": []}

    def _save(self, state: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

    def load_all_configs(self) -> list[dict[str, Any]]:
        cfgs = self._load().get("configs", {})
        return [normalize_config(cfgs.get(str(w), default_config(w))) for w in range(1, 18)]

    def save_config(self, config: dict[str, Any]) -> str:
        cfg = normalize_config(config)
        state = self._load()
        cfg["updatedAt"] = now_iso()
        state.setdefault("configs", {})[str(cfg["week"])] = cfg
        self._save(state)
        return cfg["updatedAt"]

    def submit_record(self, student: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        state = self._load()
        recs = state.setdefault("records", [])
        week = int(payload.get("week", 0))
        sid = str(student.get("학번", ""))
        found = next((r for r in recs
                      if str(r.get("학번")) == sid and int(r.get("주차", 0)) == week), None)
        score = int(payload.get("score", 0))
        stamped = now_iso()
        if found:
            found["최고점수"] = max(int(found.get("최고점수", 0)), score)
            found["시도횟수"] = int(found.get("시도횟수", 0)) + 1
            found.update({"점수": score, "소요초": int(payload.get("durationSec", 0) or 0),
                          "완료일시": stamped})
            best, tries = found["최고점수"], found["시도횟수"]
        else:
            recs.append({"기록ID": str(payload.get("recordId", f"g{sid}w{week}")),
                         "학번": sid, "이름": student.get("이름", ""), "주차": week,
                         "게임유형": payload.get("gameType", ""), "점수": score,
                         "만점": int(payload.get("maxScore", score) or score),
                         "최고점수": score, "시도횟수": 1,
                         "소요초": int(payload.get("durationSec", 0) or 0),
                         "완료일시": stamped})
            best, tries = score, 1
        self._save(state)
        return {"week": week, "score": score, "best": best, "tries": tries, "savedAt": stamped}
