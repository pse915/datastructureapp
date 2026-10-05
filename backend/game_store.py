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

from backend.sheets import _with_backoff, get_book_from_sheets, invalidate_sheet_cache

CONFIG_SHEET = "게임설정"
RECORD_SHEET = "게임기록"

CONFIG_HEADERS = ["주차", "활성화", "게임유형", "제목", "설명", "콘텐츠JSON", "업데이트일시"]
RECORD_HEADERS = ["기록ID", "학번", "이름", "학년", "반", "주차", "게임유형",
                  "점수", "만점", "최고점수", "시도횟수", "소요초", "완료일시", "상세JSON"]

GAME_TYPES = ("quiz", "memory", "embed")

# 자료구조 시각화 랩 유형. 게임설정/게임기록 시트를 그대로 재사용한다.
# 기록 시 게임점수 대신 완료여부(1/0) + 소요초를 저장한다.
VISUAL_TYPES = (
    "visual:stack",
    "visual:queue",
    "visual:linkedlist",
    "visual:tree",
    "visual:sort",
)
ALL_GAME_TYPES = GAME_TYPES + VISUAL_TYPES

VISUAL_TYPE_LABEL = {
    "visual:stack": "스택 실습",
    "visual:queue": "큐 실습",
    "visual:linkedlist": "연결리스트 실습",
    "visual:tree": "이진트리 실습",
    "visual:sort": "정렬 실습",
}
LOCAL_PATH = Path(__file__).resolve().parent.parent / "data" / "games.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def default_config(week: int) -> dict[str, Any]:
    return {
        "week": int(week), "enabled": False, "type": "quiz",
        "title": f"{week}주차 미니게임", "desc": "",
        "content": {"questions": []}, "updatedAt": "",
    }


def is_visual_type(gtype: str) -> bool:
    return str(gtype or "") in VISUAL_TYPES


def default_visual_content(vtype: str) -> dict[str, Any]:
    if vtype == "visual:tree":
        return {"initial": [50, 30, 70, 20, 40], "note": ""}
    if vtype == "visual:sort":
        return {"initial": [38, 12, 51, 27, 64, 19], "note": ""}
    return {"initial": [10, 20, 30], "note": ""}


def normalize_config(raw: dict[str, Any]) -> dict[str, Any]:
    week = int(raw.get("week", raw.get("주차", 1)))
    gtype = str(raw.get("type", raw.get("게임유형", "quiz")))
    if gtype not in ALL_GAME_TYPES:
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

def _ensure(ws_title: str, headers: list[str], sheets, book=None) -> Any:
    target_book = book if book is not None else get_book_from_sheets(sheets)
    try:
        ws = target_book.worksheet(ws_title)
    except Exception:
        ws = target_book.add_worksheet(title=ws_title, rows=500, cols=len(headers))
    cur = _with_backoff(lambda: ws.row_values(1))
    if not cur:
        _with_backoff(lambda: ws.update("A1", [headers]))
    return ws


def load_all_configs(sheets, book=None) -> list[dict[str, Any]]:
    ws = _ensure(CONFIG_SHEET, CONFIG_HEADERS, sheets, book=book)
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


def load_config(sheets, week: int, book=None) -> dict[str, Any]:
    from backend.validation import validate_week

    week_no = validate_week(week)
    for c in load_all_configs(sheets, book=book):
        if c["week"] == week_no:
            return c
    return default_config(week_no)


def validate_visual_content(content: dict[str, Any], vtype: str) -> dict[str, Any]:
    """시각화 설정 콘텐츠 검증. initial(최대 20개, 각 20자) + note(2000자)."""
    if not isinstance(content, dict):
        raise ValueError("시각화 설정 형식이 올바르지 않습니다.")
    initial = content.get("initial", [])
    if not isinstance(initial, list):
        raise ValueError("초기값은 목록이어야 합니다.")
    if len(initial) > 20:
        raise ValueError("초기값은 최대 20개까지 가능합니다.")
    cleaned = []
    for v in initial:
        if isinstance(v, (int, float)):
            cleaned.append(int(v) if abs(v) < 10000 else 0)
        else:
            cleaned.append(str(v)[:20])
    note = str(content.get("note", "") or "")[:2000]
    out: dict[str, Any] = {"initial": cleaned, "note": note}
    if vtype == "visual:sort":
        algo = str(content.get("algo", "bubble") or "bubble")
        if algo not in {"bubble", "select", "insert"}:
            algo = "bubble"
        out["algo"] = algo
    return out


def save_config(sheets, config: dict[str, Any], book=None) -> str:
    cfg = normalize_config(config)
    if not (1 <= cfg["week"] <= 17):
        raise ValueError("주차는 1~17만 가능합니다.")
    if len(cfg["title"]) > 200:
        raise ValueError("게임 제목이 너무 깁니다. 최대 200자까지 가능합니다.")
    if len(cfg["desc"]) > 2000:
        raise ValueError("게임 설명이 너무 깁니다. 최대 2000자까지 가능합니다.")
    if is_visual_type(cfg["type"]):
        cfg["content"] = validate_visual_content(cfg["content"], cfg["type"])
    ws = _ensure(CONFIG_SHEET, CONFIG_HEADERS, sheets, book=book)
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
    try:
        invalidate_sheet_cache(CONFIG_SHEET, sheets)
    except Exception:
        pass
    return updated


def set_enabled(sheets, week: int, enabled: bool, book=None) -> str:
    from backend.validation import validate_week

    week_no = validate_week(week)
    cfg = load_config(sheets, week_no, book=book)
    cfg["enabled"] = bool(enabled)
    return save_config(sheets, cfg, book=book)


def _find_record_row(ws, sid: str, week: int) -> int | None:
    values = _with_backoff(lambda: ws.get_all_values())
    if len(values) < 2:
        return None
    for i, r in enumerate(values[1:], start=2):
        if len(r) > 5 and str(r[1]).strip() == str(sid).strip() \
                and str(r[5]).strip() == str(week):
            return i
    return None


def submit_record(sheets, student: dict[str, Any], payload: dict[str, Any], book=None) -> dict[str, Any]:
    """학생 게임 결과 upsert. 같은 학번+주차는 최고점수 갱신 + 시도횟수 누적."""
    from backend.validation import validate_week

    week = validate_week(payload.get("week", 0))
    cfg = load_config(sheets, week, book=book)
    if not cfg["enabled"]:
        raise RuntimeError("현재 비활성화된 주차의 게임입니다.")
    try:
        score = int(float(str(payload.get("score", 0)).strip() if isinstance(payload.get("score"), str) else payload.get("score", 0)))
    except (ValueError, TypeError) as exc:
        raise ValueError("게임 점수는 숫자여야 합니다.") from exc
    if not (0 <= score <= 10000):
        raise ValueError("게임 점수는 0~10000 사이여야 합니다.")
    try:
        max_score = int(float(str(payload.get("maxScore", score)).strip() if isinstance(payload.get("maxScore"), str) else payload.get("maxScore", score)) or score)
    except (ValueError, TypeError):
        max_score = score
    try:
        duration = int(float(str(payload.get("durationSec", 0)).strip() if isinstance(payload.get("durationSec"), str) else payload.get("durationSec", 0)) or 0)
    except (ValueError, TypeError):
        duration = 0
    if duration < 0 or duration > 86400:
        raise ValueError("소요 시간이 올바르지 않습니다.")
    try:
        detail = json.dumps(payload.get("detail", {}), ensure_ascii=False)[:8000]
    except Exception:
        detail = "{}"

    ws = _ensure(RECORD_SHEET, RECORD_HEADERS, sheets, book=book)
    sid = str(student.get("학번", "")).strip()
    if not sid:
        raise ValueError("학번이 필요합니다.")
    row_no = _find_record_row(ws, sid, week)
    stamped = now_iso()
    if row_no:
        cur = _with_backoff(lambda: ws.row_values(row_no))
        try:
            prev_best = int(float(cur[9] or 0)) if len(cur) > 9 and str(cur[9]).strip() else 0
        except ValueError:
            prev_best = 0
        try:
            prev_tries = int(float(cur[10] or 0)) if len(cur) > 10 and str(cur[10]).strip() else 0
        except ValueError:
            prev_tries = 0
        best = max(prev_best, score)
        tries = prev_tries + 1
        # 기존 update_cell 7회를 batch_update 1회로 합친다.
        _with_backoff(lambda: ws.batch_update([
            {"range": f"H{row_no}", "values": [[score]]},
            {"range": f"I{row_no}", "values": [[max_score]]},
            {"range": f"J{row_no}", "values": [[best]]},
            {"range": f"K{row_no}", "values": [[tries]]},
            {"range": f"L{row_no}", "values": [[duration]]},
            {"range": f"M{row_no}", "values": [[stamped]]},
            {"range": f"N{row_no}", "values": [[detail]]},
        ], value_input_option="USER_ENTERED"))
    else:
        record_id = str(payload.get("recordId", "")).strip()[:128] or f"g{sid}w{week}-{stamped}"
        _with_backoff(lambda: ws.append_row(
            [record_id, sid, student.get("이름", ""), student.get("학년", ""),
             student.get("반", ""), week, cfg["type"], score, max_score,
             score, 1, duration, stamped, detail],
            value_input_option="USER_ENTERED"))
        best, tries = score, 1
    try:
        invalidate_sheet_cache(RECORD_SHEET, sheets)
    except Exception:
        pass
    return {"week": week, "score": score, "best": best, "tries": tries, "savedAt": stamped}


def validate_visual_log_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """student_visual_log 이벤트 검증. 완료여부 + 소요초 + 단계수 중심."""
    if not isinstance(payload, dict):
        raise ValueError("실습 기록 형식이 올바르지 않습니다.")
    from backend.validation import validate_week

    week = validate_week(payload.get("week", 0))
    vtype = str(payload.get("visualType", payload.get("gameType", ""))).strip()
    if vtype not in VISUAL_TYPES:
        raise ValueError("알 수 없는 실습 유형입니다.")
    completed = payload.get("completed", False)
    if isinstance(completed, str):
        completed = completed.strip().lower() not in {"", "n", "no", "false", "0"}
    completed = bool(completed)
    try:
        duration = int(float(str(payload.get("durationSec", 0)).strip()
                               if isinstance(payload.get("durationSec"), str)
                               else payload.get("durationSec", 0)) or 0)
    except (ValueError, TypeError):
        duration = 0
    if duration < 0 or duration > 86400:
        raise ValueError("소요 시간이 올바르지 않습니다.")
    try:
        steps = int(float(str(payload.get("steps", 0)).strip()
                            if isinstance(payload.get("steps"), str)
                            else payload.get("steps", 0)) or 0)
    except (ValueError, TypeError):
        steps = 0
    if steps < 0 or steps > 100000:
        raise ValueError("단계 수가 올바르지 않습니다.")
    record_id = str(payload.get("recordId", "")).strip()[:128]
    return {"week": week, "visualType": vtype, "completed": completed,
            "durationSec": duration, "steps": steps, "recordId": record_id,
            "detail": payload.get("detail", {}) if isinstance(payload.get("detail"), dict) else {}}


def log_visual_result(
    sheets,
    student: dict[str, Any],
    payload: dict[str, Any],
    book=None,
) -> dict[str, Any]:
    """시각화 실습 로그를 게임기록 시트에 저장한다.

    점수 대신 완료여부(1/0) + 소요초를 기록한다. 최고점수는 완료 이력(1)이 된다.
    """
    from backend.validation import validate_week

    if not isinstance(payload, dict):
        raise ValueError("실습 기록 형식이 올바르지 않습니다.")
    week = validate_week(payload.get("week", 0))
    cfg = load_config(sheets, week, book=book)
    if not cfg["enabled"]:
        raise RuntimeError("현재 비활성화된 주차의 실습입니다.")
    if not is_visual_type(cfg["type"]):
        raise RuntimeError("해당 주차에 설정된 실습 모듈이 없습니다.")
    vtype = str(payload.get("visualType", payload.get("gameType", cfg["type"]))).strip()
    if vtype != cfg["type"]:
        raise RuntimeError("실습 유형이 주차 설정과 다릅니다.")
    cleaned = validate_visual_log_payload({**payload, "visualType": vtype, "week": week})
    res = submit_record(
        sheets, student,
        {"week": week, "score": 1 if cleaned["completed"] else 0, "maxScore": 1,
         "durationSec": cleaned["durationSec"],
         "detail": {"visualType": vtype, "completed": cleaned["completed"],
                    "steps": cleaned["steps"], **cleaned["detail"]},
         "recordId": cleaned["recordId"]},
        book=book,
    )
    return {"week": week, "visualType": vtype, "completed": cleaned["completed"],
            "steps": cleaned["steps"], "durationSec": cleaned["durationSec"],
            "tries": res["tries"], "savedAt": res["savedAt"]}


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
