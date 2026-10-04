from __future__ import annotations

from datetime import datetime, timezone
import random
import time
from typing import Any

import gspread
from google.oauth2.service_account import Credentials
from gspread.exceptions import APIError

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
MAX_RETRIES = 5

LEDGER = "제출기록"
STUDENT_SHEET = "학생명단"
WEEK_SHEET = "주차설정"
PORTFOLIO = "포트폴리오"

HEADERS = {
    LEDGER: ["submissionId", "상태", "제출시각", "학번", "이름", "주차", "처리시각"],
    STUDENT_SHEET: ["학번", "이름", "학년", "반", "번호"],
    WEEK_SHEET: ["주차", "학습목표", "활동지질문", "배점", "공개여부"],
    PORTFOLIO: [
        "제출ID", "학번", "이름", "학년", "반", "주차", "학습목표",
        "활동지질문", "제출내용", "점수", "배점", "피드백", "제출일시", "수정일시"
    ],
}


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "429" in text or "quota exceeded" in text or "rate limit" in text


def _with_backoff(fn):
    last_exc = None
    for attempt in range(MAX_RETRIES):
        try:
            return fn()
        except APIError as exc:
            last_exc = exc
            if not _is_quota_error(exc) or attempt == MAX_RETRIES - 1:
                raise
            time.sleep(min(32.0, 2**attempt) + random.uniform(0, 0.7))
    raise last_exc


def get_client(secret_section):
    credentials = Credentials.from_service_account_info(dict(secret_section), scopes=SCOPES)
    return gspread.authorize(credentials)


def get_book(client, spreadsheet_url: str):
    return _with_backoff(lambda: client.open_by_url(spreadsheet_url))


def _ensure_header(ws, expected: list[str]):
    current = _with_backoff(lambda: ws.row_values(1))
    if not current:
        _with_backoff(lambda: ws.update("A1", [expected]))
        return
    if current == expected:
        return
    raise RuntimeError(f"'{ws.title}' 헤더가 예상과 다릅니다. 현재={current}, 예상={expected}")


def _ensure_student_header(ws):
    """학생명단은 기존 5열 구조와 확장 6열(활성) 구조를 모두 허용한다.

    로그인 자체가 이 헤더 검사 때문에 막히지 않도록 기존 5열 시트를 그대로 지원한다.
    """
    current = _with_backoff(lambda: ws.row_values(1))
    required = HEADERS[STUDENT_SHEET]
    if not current:
        _with_backoff(lambda: ws.update("A1", [required]))
        return

    # 기존 사용 중인 5열 구조: 학번/이름/학년/반/번호
    if current[:5] == required and len(current) == 5:
        return

    # 활성 열이 추가된 6열 구조도 허용
    extended = required + ["활성"]
    if current == extended:
        return

    raise RuntimeError(
        f"'{ws.title}' 헤더가 올바르지 않습니다. "
        f"필수={required}, 허용={extended}, 현재={current}"
    )


def _get_or_create(book):
    worksheets = {ws.title: ws for ws in _with_backoff(book.worksheets)}
    for title, headers in HEADERS.items():
        if title not in worksheets:
            ws = _with_backoff(lambda title=title, headers=headers: book.add_worksheet(
                title=title, rows=1000, cols=max(12, len(headers))
            ))
            _with_backoff(lambda ws=ws, headers=headers: ws.update("A1", [headers]))
            worksheets[title] = ws
        else:
            if title == STUDENT_SHEET:
                _ensure_student_header(worksheets[title])
            else:
                _ensure_header(worksheets[title], headers)
    return worksheets


def prepare_sheets(secret_section, spreadsheet_url: str):
    client = get_client(secret_section)
    book = get_book(client, spreadsheet_url)
    return _get_or_create(book)


def read_records(ws) -> list[dict[str, str]]:
    values = _with_backoff(lambda: ws.get_all_values())
    if len(values) < 2:
        return []
    headers = values[0]
    return [dict(zip(headers, row + [""] * (len(headers) - len(row)))) for row in values[1:]]


def find_student(sheets, student_id: str) -> dict[str, str] | None:
    """학생명단에서 학번을 검증한다.

    - 기본적으로 A:E의 표준 5열 구조를 사용한다.
    - F열 '활성'이 있으면 N/NO/FALSE/0 학생만 차단한다.
    - 과거 시트에서 행 데이터가 잘못된 시작 열(C열 등)에 놓인 경우에도
      학번을 전체 행에서 찾아 로그인할 수 있도록 안전한 호환 fallback을 제공한다.
    """
    sid = str(student_id).strip()
    if not sid:
        return None

    ws = sheets[STUDENT_SHEET]
    values = _with_backoff(lambda: ws.get_all_values())
    if len(values) < 2:
        return None
    headers = values[0]
    required = HEADERS[STUDENT_SHEET]

    # 표준 구조: 헤더 순서가 A:E에 정확히 맞는 경우
    if headers[:5] == required:
        for raw in values[1:]:
            row = raw + [""] * max(0, len(headers) - len(raw))
            record = dict(zip(headers, row))
            if str(record.get("학번", "")).strip() != sid:
                continue
            active = str(record.get("활성", "Y")).strip().upper()
            if active in {"N", "NO", "FALSE", "0"}:
                return None
            return record

    # 레거시/잘못 붙여넣어진 행 호환: 전체 행에서 학번을 찾고
    # 바로 오른쪽 값을 이름으로 사용한다. 기존 데이터가 C열부터 들어온
    # 경우에도 로그인 자체는 가능하게 하되, 없는 학년/번호는 빈 값으로 둔다.
    for raw in values[1:]:
        for idx, cell in enumerate(raw):
            if str(cell).strip() != sid:
                continue
            record = {key: "" for key in required}
            record["학번"] = sid
            if idx + 1 < len(raw):
                record["이름"] = str(raw[idx + 1]).strip()
            # 확장 시트에서 활성값이 학번 오른쪽 5칸에 있을 수 있는 경우 확인
            if "활성" in headers:
                try:
                    active_idx = headers.index("활성")
                    active = str(raw[active_idx] if active_idx < len(raw) else "Y").strip().upper()
                    if active in {"N", "NO", "FALSE", "0"}:
                        return None
                except ValueError:
                    pass
            # 헤더 기반으로 일부 값이 정상적으로 존재하면 보존
            for key in required[1:]:
                if key in headers:
                    hidx = headers.index(key)
                    if hidx < len(raw):
                        record[key] = str(raw[hidx]).strip()
            return record
    return None


def get_week_settings(sheets) -> list[dict[str, Any]]:
    rows = []
    for row in read_records(sheets[WEEK_SHEET]):
        try:
            week = int(str(row.get("주차", "")).strip())
        except ValueError:
            continue
        if 1 <= week <= 17:
            try:
                score = int(float(row.get("배점", "0") or 0))
            except ValueError:
                score = 0
            rows.append({
                "주차": week,
                "학습목표": row.get("학습목표", ""),
                "활동지질문": row.get("활동지질문", ""),
                "배점": score,
                "공개여부": row.get("공개여부", "Y"),
            })
    by_week = {r["주차"]: r for r in rows}
    return [by_week[w] for w in range(1, 18) if w in by_week and str(by_week[w]["공개여부"]).upper() not in {"N", "NO", "FALSE", "0"}]


def get_student_portfolio(sheets, student_id: str) -> list[dict[str, str]]:
    sid = str(student_id).strip()
    return [r for r in read_records(sheets[PORTFOLIO]) if str(r.get("학번", "")).strip() == sid]


def get_all_portfolio(sheets) -> list[dict[str, str]]:
    return read_records(sheets[PORTFOLIO])


def _row_index_by_key(ws, student_id: str, week: int) -> int | None:
    values = _with_backoff(lambda: ws.get_all_values())
    if len(values) < 2:
        return None
    headers = values[0]
    try:
        sid_i = headers.index("학번")
        week_i = headers.index("주차")
    except ValueError:
        return None
    for i, row in enumerate(values[1:], start=2):
        if sid_i < len(row) and week_i < len(row) and str(row[sid_i]).strip() == str(student_id).strip() and str(row[week_i]).strip() == str(week):
            return i
    return None


def _ledger_status(sheets, submission_id: str) -> str | None:
    for row in read_records(sheets[LEDGER]):
        if str(row.get("submissionId", "")).strip() == submission_id:
            return str(row.get("상태", "")).strip()
    return None


def _claim(sheets, submission_id: str, student_id: str, name: str, week: int) -> str:
    existing = _ledger_status(sheets, submission_id)
    if existing == "COMPLETED":
        return "duplicate"
    if existing == "PROCESSING":
        return "processing"
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    _with_backoff(lambda: sheets[LEDGER].append_row(
        [submission_id, "PROCESSING", now, student_id, name, week, ""],
        value_input_option="USER_ENTERED",
    ))
    return "claimed"


def _complete(sheets, submission_id: str, when: str):
    ws = sheets[LEDGER]
    cell = _with_backoff(lambda: ws.find(submission_id))
    if cell is None:
        raise RuntimeError("제출기록에서 submissionId를 찾지 못했습니다.")
    _with_backoff(lambda: ws.update_cell(cell.row, 2, "COMPLETED"))
    _with_backoff(lambda: ws.update_cell(cell.row, 7, when))


def save_portfolio_submission(
    secret_section,
    spreadsheet_url: str,
    student: dict[str, Any],
    week: dict[str, Any],
    content: str,
    submission_id: str,
    sheets=None,
):
    if not submission_id:
        raise ValueError("submissionId가 필요합니다.")
    if sheets is None:
        sheets = prepare_sheets(secret_section, spreadsheet_url)

    claim = _claim(sheets, submission_id, str(student.get("학번", "")), str(student.get("이름", "")), int(week["주차"]))
    if claim in {"duplicate", "processing"}:
        return {"status": claim, "submission_id": submission_id}

    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    ws = sheets[PORTFOLIO]
    row_index = _row_index_by_key(ws, student["학번"], int(week["주차"]))
    headers = HEADERS[PORTFOLIO]
    row = [
        submission_id, student.get("학번", ""), student.get("이름", ""),
        student.get("학년", ""), student.get("반", ""), week["주차"],
        week.get("학습목표", ""), week.get("활동지질문", ""), content,
        "", week.get("배점", ""), "", now, now,
    ]
    if row_index:
        _with_backoff(lambda: ws.update(f"A{row_index}:{chr(64 + len(headers))}{row_index}", [row], value_input_option="USER_ENTERED"))
    else:
        _with_backoff(lambda: ws.append_row(row, value_input_option="USER_ENTERED"))
    _complete(sheets, submission_id, now)
    return {"status": "saved", "submission_id": submission_id, "saved_at": now}


def update_grade_and_feedback(secret_section, spreadsheet_url: str, student_id: str, week: int, score: int, feedback: str, sheets=None):
    if sheets is None:
        sheets = prepare_sheets(secret_section, spreadsheet_url)
    ws = sheets[PORTFOLIO]
    values = _with_backoff(lambda: ws.get_all_values())
    if len(values) < 2:
        return False
    headers = values[0]
    score_col = headers.index("점수") + 1
    feedback_col = headers.index("피드백") + 1
    modified_col = headers.index("수정일시") + 1
    sid_col = headers.index("학번")
    week_col = headers.index("주차")
    for row_no, row in enumerate(values[1:], start=2):
        if sid_col < len(row) and week_col < len(row) and str(row[sid_col]).strip() == str(student_id).strip() and str(row[week_col]).strip() == str(week):
            now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
            _with_backoff(lambda: ws.update_cell(row_no, score_col, int(score)))
            _with_backoff(lambda: ws.update_cell(row_no, feedback_col, feedback))
            _with_backoff(lambda: ws.update_cell(row_no, modified_col, now))
            return True
    return False
