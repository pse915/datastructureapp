from datetime import datetime, timezone
import json
import random
import time

import gspread
from google.oauth2.service_account import Credentials
from gspread.exceptions import APIError

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# Google Sheets 기본 한도는 사용자/프로젝트당 분당 60 read/write 요청입니다.
# 429가 발생하면 즉시 연속 재요청하지 않고 지수 백오프로 재시도합니다.
MAX_RETRIES = 5

SHEET_DEFS = {
    '답안': ['제출시각', '학번', '이름', '문항ID', '학생답', '정답여부', '점수'],
    '결과': ['제출시각', '학번', '이름', '총점', '만점', '정답률'],
    '학생정보': ['최종저장시각', '학번', '이름', '반'],
    '포트폴리오': ['제출시각', '학번', '이름', '활동1', '활동2', '활동3', '활동4'],
}


def _is_quota_error(exc):
    text = str(exc).lower()
    return '429' in text or 'quota exceeded' in text or 'rate limit' in text


def _with_backoff(fn):
    last_exc = None
    for attempt in range(MAX_RETRIES):
        try:
            return fn()
        except APIError as exc:
            last_exc = exc
            if not _is_quota_error(exc) or attempt == MAX_RETRIES - 1:
                raise
            delay = min(32.0, 2 ** attempt) + random.uniform(0, 1)
            time.sleep(delay)
    raise last_exc


def get_client(secret_section):
    info = dict(secret_section)
    credentials = Credentials.from_service_account_info(info, scopes=SCOPES)
    return gspread.authorize(credentials)


def get_book(client, spreadsheet_url):
    return _with_backoff(lambda: client.open_by_url(spreadsheet_url))


def _get_or_create_worksheets(book):
    """시트 목록을 한 번만 읽고 필요한 탭을 준비한다.

    제출할 때마다 worksheet(title)를 4번 호출하지 않도록 한 번의
    spreadsheet 메타데이터 조회로 기존 탭을 확인한다.
    """
    worksheets = {ws.title: ws for ws in _with_backoff(book.worksheets)}
    for title, headers in SHEET_DEFS.items():
        if title not in worksheets:
            ws = _with_backoff(
                lambda title=title, headers=headers: book.add_worksheet(
                    title=title, rows=1000, cols=max(10, len(headers))
                )
            )
            _with_backoff(
                lambda ws=ws, headers=headers: ws.append_row(
                    headers, value_input_option='USER_ENTERED'
                )
            )
            worksheets[title] = ws
    return worksheets


def _append_rows(ws, rows):
    if not rows:
        return
    _with_backoff(
        lambda: ws.append_rows(
            rows,
            value_input_option='USER_ENTERED',
            insert_data_option='INSERT_ROWS',
        )
    )


def save_submission(secret_section, spreadsheet_url, payload, result, sheets=None):
    if sheets is None:
        client = get_client(secret_section)
        book = get_book(client, spreadsheet_url)
        sheets = _get_or_create_worksheets(book)

    now = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    student = payload.get('student') or {}
    answers = payload.get('answers') or {}
    activities = payload.get('activities') or {}

    feedback = {x.get('key'): bool(x.get('ok')) for x in result.get('feedback', [])}

    # 답안은 문항마다 append_row 하지 않고 한 번의 append_rows로 묶습니다.
    answer_rows = [
        [
            now,
            student.get('id', ''),
            student.get('name', ''),
            key,
            value,
            feedback.get(key, False),
            1 if feedback.get(key, False) else 0,
        ]
        for key, value in answers.items()
    ]
    _append_rows(sheets['답안'], answer_rows)

    _append_rows(
        sheets['결과'],
        [[
            now,
            student.get('id', ''),
            student.get('name', ''),
            result['score'],
            result['maxScore'],
            result['percent'],
        ]],
    )

    _append_rows(
        sheets['학생정보'],
        [[now, student.get('id', ''), student.get('name', ''), student.get('className', '')]],
    )

    _append_rows(
        sheets['포트폴리오'],
        [[
            now,
            student.get('id', ''),
            student.get('name', ''),
            json.dumps(activities.get('list', ''), ensure_ascii=False),
            json.dumps(activities.get('rows', ''), ensure_ascii=False),
            json.dumps(activities.get('tree', ''), ensure_ascii=False),
            activities.get('note', ''),
        ]],
    )

    return now


def prepare_sheets(secret_section, spreadsheet_url):
    """한 세션에서 최초 1회만 시트 목록을 확인하고 Worksheet 객체를 반환합니다."""
    client = get_client(secret_section)
    book = get_book(client, spreadsheet_url)
    return _get_or_create_worksheets(book)
