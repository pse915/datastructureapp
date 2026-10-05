"""DS 학습 진행도 저장소 (Sheets `DS진행도` + 로컬 JSON 폴백).

설계: 기존 `backend/game_store.py`(주차 1-17 게임)와 분리.
DS 단원 8종(array/linkedlist/stack/queue/tree/graph/sort/hash)의
퀴즈 해결 상태를 학번+unitId 기준으로 upsert. recordId 기반 정확히 한 번 저장.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DS_UNITS = ["array", "linkedlist", "stack", "queue", "tree", "graph", "sort", "hash"]

SHEET = "DS진행도"
HEADERS = ["기록ID", "학번", "이름", "단원", "점수", "만점", "해결일시", "상세JSON"]
LOCAL_PATH = Path(__file__).resolve().parent.parent / "data" / "ds_progress.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def _load_local() -> dict[str, Any]:
    try:
        if LOCAL_PATH.exists():
            return json.loads(LOCAL_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"records": []}


def _save_local(state: dict[str, Any]) -> None:
    try:
        LOCAL_PATH.parent.mkdir(parents=True, exist_ok=True)
        LOCAL_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def _ensure_sheet(sheets, book=None):
    from backend.sheets import _with_backoff, get_book_from_sheets

    target_book = book if book is not None else get_book_from_sheets(sheets)
    try:
        ws = target_book.worksheet(SHEET)
    except Exception:
        ws = target_book.add_worksheet(title=SHEET, rows=500, cols=len(HEADERS))
    cur = _with_backoff(lambda: ws.row_values(1))
    if not cur:
        _with_backoff(lambda: ws.update("A1", [HEADERS]))
    return ws


def submit_ds_result(sheets, student: dict[str, Any], payload: dict[str, Any], book=None) -> dict[str, Any]:
    """DS 퀴즈 해결 1건을 upsert. sheets가 없으면 로컬 JSON에 저장."""
    unit = str(payload.get("unitId", "")).strip()
    if unit not in DS_UNITS:
        raise ValueError(f"알 수 없는 단원입니다: {unit}")
    try:
        score = int(float(str(payload.get("score", 0)).strip() if isinstance(payload.get("score"), str) else payload.get("score", 0)) or 0)
        max_score = int(float(str(payload.get("maxScore", score)).strip() if isinstance(payload.get("maxScore"), str) else payload.get("maxScore", score)) or score)
    except (ValueError, TypeError) as exc:
        raise ValueError("점수는 숫자여야 합니다.") from exc
    if not (0 <= score <= 10000 and 0 <= max_score <= 10000):
        raise ValueError("점수 범위가 올바르지 않습니다.")
    record_id = str(payload.get("recordId", "")).strip()[:128] or f"ds-{student.get('학번', '')}-{unit}"
    stamped = now_iso()

    # 1) Sheets 시도
    try:
        from backend.sheets import _with_backoff

        ws = _ensure_sheet(sheets, book=book)
        values = _with_backoff(lambda: ws.get_all_values())
        row_no = None
        for i, r in enumerate(values[1:], start=2):
            if len(r) > 3 and str(r[1]) == str(student.get("학번", "")) and str(r[3]) == unit:
                row_no = i
                break
        if row_no:
            _with_backoff(lambda: ws.batch_update([
                {"range": f"E{row_no}", "values": [[score]]},
                {"range": f"F{row_no}", "values": [[max_score]]},
                {"range": f"G{row_no}", "values": [[stamped]]},
            ], value_input_option="USER_ENTERED"))
        else:
            _with_backoff(
                lambda: ws.append_row(
                    [record_id, str(student.get("학번", "")), str(student.get("이름", "")),
                     unit, score, max_score, stamped, "{}"],
                    value_input_option="USER_ENTERED",
                )
            )
        return {"unitId": unit, "score": score, "savedAt": stamped, "store": "sheets"}
    except Exception:
        pass

    # 2) 로컬 폴백
    state = _load_local()
    recs = state.setdefault("records", [])
    found = next(
        (r for r in recs if str(r.get("학번")) == str(student.get("학번", "")) and r.get("단원") == unit),
        None,
    )
    if found:
        found.update({"점수": score, "만점": max_score, "해결일시": stamped})
    else:
        recs.append({"기록ID": record_id, "학번": str(student.get("학번", "")), "이름": str(student.get("이름", "")),
                     "단원": unit, "점수": score, "만점": max_score, "해결일시": stamped})
    _save_local(state)
    return {"unitId": unit, "score": score, "savedAt": stamped, "store": "local"}


def load_student_solved(sheets, student_id: str) -> list[str]:
    """해당 학생이 해결한 단원 id 목록. Sheets 실패 시 로컬에서 조회."""
    try:
        from backend.sheets import _with_backoff

        ws = _ensure_sheet(sheets)
        values = _with_backoff(lambda: ws.get_all_values())
        return [str(r[3]) for r in values[1:] if len(r) > 3 and str(r[1]) == str(student_id) and str(r[3]) in DS_UNITS]
    except Exception:
        pass
    state = _load_local()
    return [str(r.get("단원")) for r in state.get("records", [])
            if str(r.get("학번")) == str(student_id) and str(r.get("단원")) in DS_UNITS]
