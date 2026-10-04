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

from backend.sheets import _with_backoff

SHEET = "학습지"
HEADERS = ["주차", "제목", "단원명", "안내문구", "공개여부", "문제JSON", "업데이트일시"]


def ensure_ws(sheets) -> Any:
    ws0 = next(iter(sheets.values()))
    book = ws0.spreadsheet
    try:
        ws = book.worksheet(SHEET)
    except Exception:
        ws = book.add_worksheet(title=SHEET, rows=100, cols=len(HEADERS))
    cur = _with_backoff(lambda: ws.row_values(1))
    if not cur:
        _with_backoff(lambda: ws.update("A1", [HEADERS]))
    return ws


def load_worksheet(sheets, week: int) -> dict[str, Any]:
    ws = ensure_ws(sheets)
    values = _with_backoff(lambda: ws.get_all_values())
    for r in values[1:]:
        if r and str(r[0]).strip() == str(week):
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
    return {"week": int(week), "title": "", "unit": "", "guide": "",
            "published": True, "questions": [], "updatedAt": ""}


def save_worksheet(sheets, data: dict[str, Any]) -> str:
    ws = ensure_ws(sheets)
    week = int(data["week"])
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    row = [
        str(week),
        str(data.get("title", "")),
        str(data.get("unit", "")),
        str(data.get("guide", "")),
        "Y" if data.get("published", True) else "N",
        json.dumps(data.get("questions", []), ensure_ascii=False),
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
