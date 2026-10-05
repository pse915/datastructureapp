"""주차별 학습지(구조화 문제) Sheets CRUD.

시트: 학습지
헤더: 주차|제목|단원명|안내문구|공개여부|문제JSON|업데이트일시
기존 주차설정/포트폴리오 시트를 건드리지 않는다.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from backend.sheets import _with_backoff, get_book_from_sheets

SHEET = "학습지"
HEADERS = ["주차", "제목", "단원명", "안내문구", "공개여부", "문제JSON", "업데이트일시"]


def ensure_ws(sheets, book=None) -> Any:
    target_book = book if book is not None else get_book_from_sheets(sheets)
    try:
        ws = target_book.worksheet(SHEET)
    except Exception:
        ws = target_book.add_worksheet(title=SHEET, rows=100, cols=len(HEADERS))
    cur = _with_backoff(lambda: ws.row_values(1))
    if not cur:
        _with_backoff(lambda: ws.update("A1", [HEADERS]))
    return ws


def load_worksheet(sheets, week: int, book=None) -> dict[str, Any]:
    from backend.validation import validate_week

    week_no = validate_week(week)
    ws = ensure_ws(sheets, book=book)
    values = _with_backoff(lambda: ws.get_all_values())
    for r in values[1:]:
        if r and str(r[0]).strip() == str(week_no):
            raw = r[5] if len(r) > 5 else "[]"
            try:
                questions = json.loads(raw or "[]")
            except Exception:
                questions = []
            return {
                "week": int(r[0]),
                "title": r[1] if len(r) > 1 else "",
                "unit": r[2] if len(r) > 2 else "",
                "guide": r[3] if len(r) > 3 else "",
                "published": str(r[4] if len(r) > 4 else "Y").upper() not in {"N", "NO", "FALSE", "0"},
                "questions": questions,
                "updatedAt": r[6] if len(r) > 6 else "",
            }
    return {"week": int(week_no), "title": "", "unit": "", "guide": "",
            "published": True, "questions": [], "updatedAt": ""}


def save_worksheet(sheets, data: dict[str, Any], book=None) -> str:
    from backend.validation import validate_week

    ws = ensure_ws(sheets, book=book)
    week = validate_week(data.get("week", 0))
    title = str(data.get("title", ""))[:200]
    unit = str(data.get("unit", ""))[:200]
    guide = str(data.get("guide", ""))[:4000]
    questions = data.get("questions", [])
    if not isinstance(questions, list):
        raise ValueError("학습지 문제 형식이 올바르지 않습니다.")
    if len(questions) > 100:
        raise ValueError("문제는 최대 100개까지 가능합니다.")
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    try:
        questions_text = json.dumps(questions, ensure_ascii=False)
    except (TypeError, ValueError) as exc:
        raise ValueError("학습지 문제 JSON 직렬화에 실패했습니다.") from exc
    if len(questions_text) > 50000:
        raise ValueError("문제JSON이 너무 큽니다. 50000자 이하로 줄여주세요.")
    row = [
        str(week),
        title,
        unit,
        guide,
        "Y" if data.get("published", True) else "N",
        questions_text,
        now,
    ]
    values = _with_backoff(lambda: ws.get_all_values())
    target = None
    for i, r in enumerate(values[1:], start=2):
        if r and str(r[0]).strip() == str(week):
            target = i
            break
    if target:
        _with_backoff(lambda: ws.update(f"A{target}:G{target}", [row],
                                        value_input_option="USER_ENTERED"))
    else:
        _with_backoff(lambda: ws.append_row(row, value_input_option="USER_ENTERED"))
    return now


def upload_image_to_drive(service_account, folder_id: str, filename: str,
                           raw: bytes, mime: str = "image/png") -> dict[str, str]:
    """week_admin.upload_bytes_to_drive 래퍼. {fileId, viewUrl} 반환."""
    from backend.week_admin import upload_bytes_to_drive
    url = upload_bytes_to_drive(service_account, folder_id, filename, raw, mime_type=mime)
    m = re.search(r"/d/([^/]+)", url or "")
    return {"fileId": m.group(1) if m else "", "viewUrl": url}
