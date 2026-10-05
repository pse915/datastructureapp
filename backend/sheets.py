from __future__ import annotations

from datetime import datetime, timezone
import logging
import random
import time
from typing import Any

import gspread
from google.oauth2.service_account import Credentials
from gspread.exceptions import APIError

from backend.validation import (
    MAX_CONTENT_LENGTH,
    validate_content,
    validate_feedback,
    validate_score,
    validate_student_id,
    validate_submission_id,
    validate_week,
)

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]
MAX_RETRIES = 5

# get_all_values 호출 절감을 위한 인메모리 TTL 캐시.
# Streamlit rerun 환경에서 동일 세션의 반복 읽기를 줄인다.
# 쓰기 발생 시 해당 시트 키를 무효화한다.
_VALUES_CACHE: dict[str, tuple[float, list[list[str]]]] = {}
_CACHE_TTL_SEC = 60.0


def _cache_key(ws) -> str:
    try:
        sheet_id = getattr(getattr(ws, "spreadsheet", None), "id", "")
        return f"{sheet_id}::{getattr(ws, 'title', '')}"
    except Exception:
        return f"::{getattr(ws, 'title', '')}"


def _cache_get(ws) -> list[list[str]] | None:
    try:
        entry = _VALUES_CACHE.get(_cache_key(ws))
    except Exception:
        return None
    if not entry:
        return None
    stamped, values = entry
    if time.monotonic() - stamped > _CACHE_TTL_SEC:
        return None
    return values


def _cache_set(ws, values: list[list[str]]) -> None:
    try:
        _VALUES_CACHE[_cache_key(ws)] = (time.monotonic(), values)
    except Exception:
        pass


def invalidate_sheet_cache(ws_or_title, sheets=None) -> None:
    """단일 시트 캐시 무효화. 쓰기 후에 호출한다."""
    titles: list[str] = []
    if isinstance(ws_or_title, str):
        titles = [ws_or_title]
    else:
        try:
            titles = [getattr(ws_or_title, "title", "")]
        except Exception:
            titles = []
    if sheets is not None:
        # spreadsheet id가 키에 포함되므로 해당 타이틀의 모든 엔트리 제거
        for key in [k for k in list(_VALUES_CACHE.keys()) if k.split("::")[-1] in titles]:
            _VALUES_CACHE.pop(key, None)
        return
    for key in [k for k in list(_VALUES_CACHE.keys()) if k.split("::")[-1] in titles]:
        _VALUES_CACHE.pop(key, None)


def _cached_get_all_values(ws) -> list[list[str]]:
    cached = _cache_get(ws)
    if cached is not None:
        return cached
    values = _with_backoff(lambda: ws.get_all_values())
    _cache_set(ws, values)
    return values


def _col_letter(n: int) -> str:
    """1-based 열 번호를 A1 표기로 변환한다. (27 -> AA)"""
    result = ""
    while n > 0:
        n, rem = divmod(n - 1, 26)
        result = chr(65 + rem) + result
    return result or "A"

LEDGER = "제출기록"
STUDENT_SHEET = "학생명단"
WEEK_SHEET = "주차설정"
PORTFOLIO = "포트폴리오"
AUDIT_SHEET = "감사로그"

HEADERS = {
    LEDGER: ["submissionId", "상태", "제출시각", "학번", "이름", "주차", "처리시각"],
    STUDENT_SHEET: ["학번", "이름", "학년", "반", "번호"],
    WEEK_SHEET: ["주차", "학습목표", "활동지질문", "배점", "공개여부"],
    PORTFOLIO: [
        "제출ID", "학번", "이름", "학년", "반", "주차", "학습목표",
        "활동지질문", "제출내용", "점수", "배점", "피드백", "제출일시", "수정일시"
    ],
    AUDIT_SHEET: ["조작일시", "역할", "액션", "대상", "상세"],
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


WEEK_OPTIONAL_COLS = ["자료링크", "루브릭JSON"]
PORTFOLIO_OPTIONAL_COLS = ["채점상태", "자동상세"]


def _ensure_header(ws, expected: list[str]):
    current = _with_backoff(lambda: ws.row_values(1))
    if not current:
        _with_backoff(lambda: ws.update("A1", [expected]))
        return
    if current == expected:
        return
    raise RuntimeError(f"'{ws.title}' 헤더가 예상과 다릅니다. 현재={current}, 예상={expected}")


def _ensure_header_tolerant(
    ws,
    required: list[str],
    optional: list[str] | None = None,
    auto_add: bool = True,
) -> list[str]:
    """필수 prefix + 알려진 선택열을 허용하고, 누락된 선택열은 자동 추가한다.

    - 신규 시트: required + optional 전체로 생성한다.
    - 기존 시트: required prefix가 맞고, 추가 열이 모두 알려진 선택열이면 통과.
      누락된 선택열이 있으면 헤더 행에 append한다.
    - 모르는 열이 있으면 기존 데이터를 건드리지 않기 위해 그대로 허용한다.
    """
    optional = optional or []
    current = _with_backoff(lambda: ws.row_values(1))
    if not current:
        full = required + optional
        _with_backoff(lambda: ws.update("A1", [full]))
        _cache_set(ws, [full])
        return full
    if current == required + optional:
        return current
    if current == required:
        # 기본 헤더만 있는 기존 시트: 선택열을 자동 추가한다.
        if optional and auto_add:
            new_header = current + [c for c in optional if c not in current]
            _with_backoff(lambda: ws.update("A1", [new_header]))
            invalidate_sheet_cache(ws.title if hasattr(ws, "title") else str(ws))
            return new_header
        return current
    if current[:len(required)] != required:
        raise RuntimeError(f"'{ws.title}' 헤더가 예상과 다릅니다. 현재={current}, 예상 prefix={required}")
    # 이미 있는 선택열 외의未知 열이 있으면 건드리지 않고 허용한다.
    unknown = [c for c in current[len(required):] if c not in optional]
    if unknown:
        return current
    missing = [c for c in optional if c not in current]
    if missing and auto_add:
        new_header = current + missing
        _with_backoff(lambda: ws.update("A1", [new_header]))
        invalidate_sheet_cache(ws.title if hasattr(ws, "title") else str(ws))
        return new_header
    return current


def _ensure_student_header(ws):
    """학생명단은 기존 5열 구조와 확장 6열(활성) 구조를 모두 허용한다."""
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
            elif title == WEEK_SHEET:
                _ensure_header_tolerant(worksheets[title], headers, WEEK_OPTIONAL_COLS)
            elif title == PORTFOLIO:
                _ensure_header_tolerant(worksheets[title], headers, PORTFOLIO_OPTIONAL_COLS)
            else:
                _ensure_header(worksheets[title], headers)
    return worksheets


def prepare_sheets(secret_section, spreadsheet_url: str):
    client = get_client(secret_section)
    book = get_book(client, spreadsheet_url)
    sheets = _get_or_create(book)
    # 하위 모듈(game_store/worksheet/ds)이 book에 접근할 수 있도록 참조 보관.
    # 기존 코드와의 호환을 위해 일반 시트 키와 충돌하지 않는 이름 사용.
    try:
        sheets["__book__"] = book
    except Exception:
        pass
    return sheets


def get_book_from_sheets(sheets):
    """sheets dict에서 gspread Spreadsheet 객체를 안전하게 추출한다.

    기존 next(iter(sheets.values())) 방식은 빈 dict/순서 의존으로 깨지기 쉬워
    명시적 __book__ 키 우선, 없으면 첫 worksheet의 spreadsheet로 폴백한다.
    """
    if sheets is None:
        raise RuntimeError("Sheets 핸들이 없습니다. prepare_sheets()를 먼저 호출하세요.")
    book = None
    try:
        book = sheets.get("__book__")
    except AttributeError:
        book = None
    if book is not None:
        return book
    try:
        values = [v for k, v in sheets.items() if not str(k).startswith("__")]
    except AttributeError as exc:
        raise RuntimeError("Sheets 핸들 형식이 올바르지 않습니다.") from exc
    if not values:
        raise RuntimeError("Sheets 핸들이 비어 있습니다. prepare_sheets()를 먼저 호출하세요.")
    book = getattr(values[0], "spreadsheet", None)
    if book is None:
        raise RuntimeError("Spreadsheet 객체를 찾을 수 없습니다.")
    return book


def read_records(ws) -> list[dict[str, str]]:
    values = _cached_get_all_values(ws)
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
    try:
        sid = validate_student_id(student_id)
    except ValueError:
        return None

    ws = sheets[STUDENT_SHEET]
    values = _cached_get_all_values(ws)
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
    from backend.grading import parse_rubric

    # 루브릭JSON 열이 없으면 자동 추가한다 (기존행 호환).
    try:
        _ensure_header_tolerant(sheets[WEEK_SHEET], HEADERS[WEEK_SHEET], WEEK_OPTIONAL_COLS)
    except Exception as exc:
        logger.warning("주차설정 헤더 마이그레이션 실패: %s", exc)
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
            raw_rubric = row.get("루브릭JSON", "")
            rows.append({
                "주차": week,
                "학습목표": row.get("학습목표", ""),
                "활동지질문": row.get("활동지질문", ""),
                "배점": score,
                "공개여부": row.get("공개여부", "Y"),
                "루브릭JSON": raw_rubric,
                "루브릭": parse_rubric(raw_rubric),
            })
    by_week = {r["주차"]: r for r in rows}
    return [by_week[w] for w in range(1, 18) if w in by_week and str(by_week[w]["공개여부"]).upper() not in {"N", "NO", "FALSE", "0"}]


def get_student_portfolio(sheets, student_id: str) -> list[dict[str, str]]:
    sid = str(student_id).strip()
    return [r for r in read_records(sheets[PORTFOLIO]) if str(r.get("학번", "")).strip() == sid]


def get_all_portfolio(sheets) -> list[dict[str, str]]:
    return read_records(sheets[PORTFOLIO])


def _row_index_by_key(ws, student_id: str, week: int, values: list[list[str]] | None = None) -> int | None:
    if values is None:
        values = _cached_get_all_values(ws)
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
    submission_id = validate_submission_id(submission_id)
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
    invalidate_sheet_cache(LEDGER, sheets)
    return "claimed"


def _complete(sheets, submission_id: str, when: str):
    ws = sheets[LEDGER]
    # find 1회 + batch_update 1회로 기존 update_cell 2회를 대체한다.
    cell = _with_backoff(lambda: ws.find(submission_id))
    if cell is None:
        raise RuntimeError("제출기록에서 submissionId를 찾지 못했습니다.")
    _with_backoff(lambda: ws.batch_update([
        {"range": f"B{cell.row}", "values": [["COMPLETED"]]},
        {"range": f"G{cell.row}", "values": [[when]]},
    ], value_input_option="USER_ENTERED"))
    invalidate_sheet_cache(LEDGER, sheets)


def save_portfolio_submission(
    secret_section,
    spreadsheet_url: str,
    student: dict[str, Any],
    week: dict[str, Any],
    content: str,
    submission_id: str,
    sheets=None,
):
    submission_id = validate_submission_id(submission_id)
    week_no = validate_week(week.get("주차") if isinstance(week, dict) else week)
    content = validate_content(content, MAX_CONTENT_LENGTH)
    if sheets is None:
        sheets = prepare_sheets(secret_section, spreadsheet_url)

    claim = _claim(sheets, submission_id, str(student.get("학번", "")), str(student.get("이름", "")), week_no)
    if claim in {"duplicate", "processing"}:
        return {"status": claim, "submission_id": submission_id}

    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    ws = sheets[PORTFOLIO]
    try:
        live_headers = _ensure_header_tolerant(ws, HEADERS[PORTFOLIO], PORTFOLIO_OPTIONAL_COLS)
    except Exception as exc:
        logger.warning("포트폴리오 헤더 마이그레이션 실패: %s", exc)
        live_headers = _cached_get_all_values(ws)[0] if _cached_get_all_values(ws) else HEADERS[PORTFOLIO]
    portfolio_values = _cached_get_all_values(ws)
    # 헤더가 방금 확장됐으면 캐시를 버리고 다시 읽는다.
    if portfolio_values and portfolio_values[0] != live_headers:
        invalidate_sheet_cache(PORTFOLIO, sheets)
        portfolio_values = _cached_get_all_values(ws)
    row_index = _row_index_by_key(ws, student["학번"], week_no, values=portfolio_values)
    base = [
        submission_id, student.get("학번", ""), student.get("이름", ""),
        student.get("학년", ""), student.get("반", ""), week_no,
        week.get("학습목표", "") if isinstance(week, dict) else "", week.get("활동지질문", "") if isinstance(week, dict) else "", content,
        "", week.get("배점", "") if isinstance(week, dict) else "", "", now, now,
    ]
    # 선택열(채점상태/자동상세)이 있으면 빈 값으로 맞춰 행 길이를 맞춘다.
    # 학생이 재제출하면 상태는 비우고, 자동채점 단계에서 다시 채운다.
    row = base + [""] * max(0, len(live_headers) - len(base))
    end_col = _col_letter(len(live_headers))
    if row_index:
        _with_backoff(lambda: ws.update(f"A{row_index}:{end_col}{row_index}", [row], value_input_option="USER_ENTERED"))
    else:
        _with_backoff(lambda: ws.append_row(row, value_input_option="USER_ENTERED"))
    invalidate_sheet_cache(PORTFOLIO, sheets)
    _complete(sheets, submission_id, now)
    return {"status": "saved", "submission_id": submission_id, "saved_at": now}


def save_auto_grade(
    sheets,
    student_id: str,
    week: int,
    score: int,
    feedback_summary: str,
    detail: dict[str, Any] | None = None,
    status: str = "자동채점",
) -> bool:
    """자동채점 결과를 포트폴리오에 저장한다. 교사확정 행도 새 제출이므로 덮어쓴다.

    호출 전제: 해당 학번+주차 행이 이미 존재한다 (student_submit 직후).
    점수/피드백/채점상태/자동상세를 batch 1회로 갱신한다.
    """
    import json as _json

    from backend.validation import validate_student_id as _vsid
    from backend.validation import validate_week as _vw

    sid = _vsid(student_id)
    week_no = _vw(week)
    ws = sheets[PORTFOLIO]
    values = _cached_get_all_values(ws)
    if len(values) < 2:
        return False
    headers = values[0]
    # 선택열이 없으면 추가한다.
    if "채점상태" not in headers or "자동상세" not in headers:
        try:
            headers = _ensure_header_tolerant(ws, HEADERS[PORTFOLIO], PORTFOLIO_OPTIONAL_COLS)
            invalidate_sheet_cache(PORTFOLIO, sheets)
            values = _cached_get_all_values(ws)
        except Exception as exc:
            logger.warning("채점상태 열 추가 실패: %s", exc)
            return False
    try:
        score_col = headers.index("점수") + 1
        feedback_col = headers.index("피드백") + 1
        modified_col = headers.index("수정일시") + 1
        status_col = headers.index("채점상태") + 1
        detail_col = headers.index("자동상세") + 1
        sid_col = headers.index("학번")
        week_col = headers.index("주차")
        max_col = headers.index("배점") if "배점" in headers else None
    except ValueError:
        return False
    for row_no, row in enumerate(values[1:], start=2):
        if sid_col < len(row) and week_col < len(row) and str(row[sid_col]).strip() == sid and str(row[week_col]).strip() == str(week_no):
            now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
            cap = None
            if max_col is not None and max_col < len(row):
                try:
                    cap = int(float(str(row[max_col]).strip() or "0") or 0) or None
                except ValueError:
                    cap = None
            score = validate_score(score, cap if cap else 1000)
            feedback_summary = validate_feedback(feedback_summary, 2000)
            try:
                detail_text = _json.dumps(detail or {}, ensure_ascii=False)[:8000]
            except (TypeError, ValueError):
                detail_text = "{}"
            _with_backoff(lambda: ws.batch_update([
                {"range": f"{_col_letter(score_col)}{row_no}", "values": [[score]]},
                {"range": f"{_col_letter(feedback_col)}{row_no}", "values": [[feedback_summary]]},
                {"range": f"{_col_letter(modified_col)}{row_no}", "values": [[now]]},
                {"range": f"{_col_letter(status_col)}{row_no}", "values": [[status]]},
                {"range": f"{_col_letter(detail_col)}{row_no}", "values": [[detail_text]]},
            ], value_input_option="USER_ENTERED"))
            invalidate_sheet_cache(PORTFOLIO, sheets)
            return True
    return False


def update_grade_and_feedback(secret_section, spreadsheet_url: str, student_id: str, week: int, score: int, feedback: str, sheets=None):
    student_id = validate_student_id(student_id)
    week_no = validate_week(week)
    feedback = validate_feedback(feedback)
    if sheets is None:
        sheets = prepare_sheets(secret_section, spreadsheet_url)
    ws = sheets[PORTFOLIO]
    values = _cached_get_all_values(ws)
    if len(values) < 2:
        return False
    headers = values[0]
    try:
        score_col = headers.index("점수") + 1
        feedback_col = headers.index("피드백") + 1
        modified_col = headers.index("수정일시") + 1
        sid_col = headers.index("학번")
        week_col = headers.index("주차")
        max_col = headers.index("배점") if "배점" in headers else None
    except ValueError:
        return False
    for row_no, row in enumerate(values[1:], start=2):
        if sid_col < len(row) and week_col < len(row) and str(row[sid_col]).strip() == str(student_id).strip() and str(row[week_col]).strip() == str(week_no):
            now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
            cap = None
            if max_col is not None and max_col < len(row):
                try:
                    cap = int(float(str(row[max_col]).strip() or "0") or 0) or None
                except ValueError:
                    cap = None
            score = validate_score(score, cap if cap else 1000)
            # 기존 update_cell 3회를 batch_update 1회로 합친다.
            # 채점상태 열이 있으면 교사확정으로 표시한다.
            requests = [
                {"range": f"{_col_letter(score_col)}{row_no}", "values": [[score]]},
                {"range": f"{_col_letter(feedback_col)}{row_no}", "values": [[feedback]]},
                {"range": f"{_col_letter(modified_col)}{row_no}", "values": [[now]]},
            ]
            if "채점상태" in headers:
                requests.append({"range": f"{_col_letter(headers.index('채점상태') + 1)}{row_no}", "values": [["교사확정"]]})
            _with_backoff(lambda: ws.batch_update(requests, value_input_option="USER_ENTERED"))
            invalidate_sheet_cache(PORTFOLIO, sheets)
            return True
    return False


# ---------- P1: 교사 검색/페이지네이션/일괄평가/CSV/감사로그 ----------

TEACHER_PAGE_SIZE = 50
MAX_BULK_ITEMS = 30


def _norm(v: object) -> str:
    return str(v or "").strip()


def _is_ungraded(row: dict[str, Any]) -> bool:
    return _norm(row.get("점수")) == ""


def match_teacher_query(
    row: dict[str, Any],
    search: str = "",
    grade: str = "",
    klass: str = "",
    week: str | int = "",
    only_ungraded: bool = False,
) -> bool:
    """교사 목록 필터. 모두 메모리 연산이라 500건에서도 빠르다."""
    if grade and _norm(row.get("학년")) != _norm(grade):
        return False
    if klass and _norm(row.get("반")) != _norm(klass):
        return False
    if week not in ("", None):
        if _norm(row.get("주차")) != str(week).strip():
            return False
    if only_ungraded and not _is_ungraded(row):
        return False
    if search:
        keyword = search.strip().lower()
        hay = " ".join([
            _norm(row.get("학번")), _norm(row.get("이름")),
            _norm(row.get("제출내용")), _norm(row.get("피드백")),
        ]).lower()
        if keyword not in hay:
            return False
    return True


def query_portfolio(
    all_rows: list[dict[str, Any]],
    search: str = "",
    grade: str = "",
    klass: str = "",
    week: str | int = "",
    only_ungraded: bool = False,
    page: int = 1,
    page_size: int = TEACHER_PAGE_SIZE,
) -> dict[str, Any]:
    try:
        page_no = max(1, int(page))
    except (ValueError, TypeError):
        page_no = 1
    try:
        size = int(page_size)
    except (ValueError, TypeError):
        size = TEACHER_PAGE_SIZE
    size = min(max(10, size), 100)
    if isinstance(week, str) and week.strip() == "":
        week = ""
    filtered = [
        r for r in all_rows
        if match_teacher_query(r, search, grade, klass, week, only_ungraded)
    ]
    # 최신 제출 우선 정렬 (제출일시 내림차순, 없으면 주차 내림차순)
    def _sort_key(r: dict[str, Any]) -> tuple[str, int]:
        try:
            w = int(str(r.get("주차", "0")).strip() or 0)
        except ValueError:
            w = 0
        return (str(r.get("제출일시", "") or ""), w)
    filtered.sort(key=_sort_key, reverse=True)
    total = len(filtered)
    total_pages = max(1, (total + size - 1) // size)
    page_no = min(page_no, total_pages)
    start = (page_no - 1) * size
    return {
        "rows": filtered[start:start + size],
        "total": total,
        "page": page_no,
        "pageSize": size,
        "totalPages": total_pages,
    }


def build_class_stats(
    students: list[dict[str, Any]],
    portfolio: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """반별 제출률/평균/미제출자수/미채점 포함 통계."""
    from collections import defaultdict

    students_by_class: dict[tuple[str, str], set[str]] = defaultdict(set)
    for s in students:
        g, k = _norm(s.get("학년")), _norm(s.get("반"))
        sid = _norm(s.get("학번"))
        if sid:
            students_by_class[(g, k)].add(sid)
    submitted_by_class: dict[tuple[str, str], set[str]] = defaultdict(set)
    submit_count: dict[tuple[str, str], int] = defaultdict(int)
    score_sum: dict[tuple[str, str], float] = defaultdict(float)
    score_n: dict[tuple[str, str], int] = defaultdict(int)
    ungraded: dict[tuple[str, str], int] = defaultdict(int)
    for r in portfolio:
        g, k = _norm(r.get("학년")), _norm(r.get("반"))
        sid = _norm(r.get("학번"))
        key = (g, k)
        submit_count[key] += 1
        if sid:
            submitted_by_class[key].add(sid)
        if _is_ungraded(r):
            ungraded[key] += 1
        try:
            sc = float(str(r.get("점수", "")).strip())
        except ValueError:
            continue
        score_sum[key] += sc
        score_n[key] += 1
    keys = set(students_by_class) | set(submit_count)
    stats = []
    for g, k in sorted(keys):
        total_students = len(students_by_class.get((g, k), set()))
        submitted_students = len(submitted_by_class.get((g, k), set()))
        rate = round(submitted_students / total_students * 100, 1) if total_students else 0
        avg = round(score_sum[(g, k)] / score_n[(g, k)], 1) if score_n[(g, k)] else 0
        stats.append({
            "학년": g, "반": k,
            "학생수": total_students,
            "제출학생수": submitted_students,
            "제출건수": submit_count.get((g, k), 0),
            "제출률": rate,
            "평균점수": avg,
            "미제출자수": max(0, total_students - submitted_students),
            "미채점건수": ungraded.get((g, k), 0),
        })
    return stats


def bulk_update_grades(
    secret_section,
    spreadsheet_url: str,
    items: list[dict[str, Any]],
    sheets=None,
) -> dict[str, Any]:
    """30건 이하 일괄 평가를 batch_update 1회로 처리한다."""
    if not isinstance(items, list) or not items:
        raise ValueError("일괄 평가 대상이 없습니다.")
    if len(items) > MAX_BULK_ITEMS:
        raise ValueError(f"한 번에 최대 {MAX_BULK_ITEMS}건까지 가능합니다.")
    if sheets is None:
        sheets = prepare_sheets(secret_section, spreadsheet_url)
    ws = sheets[PORTFOLIO]
    values = _cached_get_all_values(ws)
    if len(values) < 2:
        return {"updated": 0, "notFound": len(items)}
    headers = values[0]
    try:
        score_col = headers.index("점수") + 1
        feedback_col = headers.index("피드백") + 1
        modified_col = headers.index("수정일시") + 1
        sid_col = headers.index("학번")
        week_col = headers.index("주차")
        max_col = headers.index("배점") if "배점" in headers else None
    except ValueError:
        raise RuntimeError("포트폴리오 헤더가 올바르지 않습니다.")
    # (학번, 주차) -> 행번호 인덱스 1회 구성
    index: dict[tuple[str, str], int] = {}
    for row_no, row in enumerate(values[1:], start=2):
        if sid_col < len(row) and week_col < len(row):
            index[(str(row[sid_col]).strip(), str(row[week_col]).strip())] = row_no
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    requests: list[dict[str, Any]] = []
    not_found: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for raw in items:
        if not isinstance(raw, dict):
            continue
        sid = validate_student_id(raw.get("studentId", raw.get("학번", "")))
        week_no = validate_week(raw.get("week", raw.get("주차", 0)))
        key = (sid, str(week_no))
        if key in seen:
            continue
        seen.add(key)
        row_no = index.get(key)
        if not row_no:
            not_found.append({"학번": sid, "주차": week_no})
            continue
        row = values[row_no - 1] if row_no - 1 < len(values) else []
        cap = None
        if max_col is not None and max_col < len(row):
            try:
                cap = int(float(str(row[max_col]).strip() or "0") or 0) or None
            except ValueError:
                cap = None
        score = validate_score(raw.get("score", 0), cap if cap else 1000)
        feedback = validate_feedback(raw.get("feedback", ""), 2000)
        requests.append({"range": f"{_col_letter(score_col)}{row_no}", "values": [[score]]})
        requests.append({"range": f"{_col_letter(feedback_col)}{row_no}", "values": [[feedback]]})
        requests.append({"range": f"{_col_letter(modified_col)}{row_no}", "values": [[now]]})
        if "채점상태" in headers:
            requests.append({"range": f"{_col_letter(headers.index('채점상태') + 1)}{row_no}", "values": [["교사확정"]]})
    if requests:
        _with_backoff(lambda: ws.batch_update(requests, value_input_option="USER_ENTERED"))
        invalidate_sheet_cache(PORTFOLIO, sheets)
    return {"updated": len(seen) - len(not_found), "notFound": not_found, "savedAt": now}


def _csv_escape(v: object) -> str:
    return '"%s"' % str(v if v is not None else "").replace('"', '""')


def build_teacher_csv(
    portfolio: list[dict[str, Any]],
    students: list[dict[str, Any]] | None = None,
) -> str:
    """교사 내보내기 CSV 본문 (BOM 제외, \n 개행). 프론트에서 BOM을 붙여 다운로드한다."""
    headers = ["학번", "이름", "학년", "반", "주차", "점수", "배점", "피드백", "제출일시", "수정일시"]
    lines = [",".join(_csv_escape(h) for h in headers)]
    # 학생명단 기준 정렬을 위해 학생 순서 인덱스 구성
    order: dict[str, int] = {}
    if students:
        for i, s in enumerate(students):
            sid = _norm(s.get("학번"))
            if sid and sid not in order:
                order[sid] = i
    def _key(r: dict[str, Any]) -> tuple[int, int, str]:
        try:
            w = int(str(r.get("주차", "0")).strip() or 0)
        except ValueError:
            w = 0
        return (order.get(_norm(r.get("학번")), 10**9), w, _norm(r.get("제출일시")))
    for r in sorted(portfolio, key=_key):
        lines.append(",".join(_csv_escape(r.get(h, "")) for h in headers))
    return "\n".join(lines) + "\n"


def append_audit_log(
    sheets,
    role: str,
    action: str,
    target: str = "",
    detail: str = "",
) -> None:
    """감사로그 best-effort 기록. 실패해도 본 동작을 막지 않는다."""
    try:
        ws = sheets.get(AUDIT_SHEET)
        if ws is None:
            try:
                book = get_book_from_sheets(sheets)
                try:
                    ws = book.worksheet(AUDIT_SHEET)
                except Exception:
                    ws = book.add_worksheet(title=AUDIT_SHEET, rows=1000, cols=5)
                cur = _with_backoff(lambda: ws.row_values(1))
                if not cur:
                    _with_backoff(lambda: ws.update("A1", [HEADERS[AUDIT_SHEET]]))
                try:
                    sheets[AUDIT_SHEET] = ws
                except Exception:
                    pass
            except Exception as exc:
                logger.warning("감사로그 시트 준비 실패: %s", exc)
                return
        now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
        _with_backoff(lambda: ws.append_row(
            [now, str(role or "")[:20], str(action or "")[:64],
             str(target or "")[:200], str(detail or "")[:2000]],
            value_input_option="USER_ENTERED",
        ))
        invalidate_sheet_cache(AUDIT_SHEET, sheets)
    except Exception as exc:
        logger.warning("감사로그 기록 실패: %s", exc)
