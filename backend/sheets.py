from datetime import datetime, timezone
import json
import random
import time

import gspread
from google.oauth2.service_account import Credentials
from gspread.exceptions import APIError

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
MAX_RETRIES = 5

# 제출 원장은 Google Sheets에 영구적으로 남는 idempotency ledger입니다.
# 같은 submissionId가 다시 들어오면 실제 데이터 append를 다시 수행하지 않습니다.
LEDGER_TITLE = '제출기록'
LEDGER_HEADERS = ['submissionId', '상태', '제출시각', '학번', '이름', '저장시각']

SHEET_DEFS = {
    '답안': ['submissionId', '제출시각', '학번', '이름', '문항ID', '학생답', '정답여부', '점수'],
    '결과': ['submissionId', '제출시각', '학번', '이름', '총점', '만점', '정답률'],
    '학생정보': ['submissionId', '최종저장시각', '학번', '이름', '반'],
    '포트폴리오': ['submissionId', '제출시각', '학번', '이름', '활동1', '활동2', '활동3', '활동4'],
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


def _ensure_submission_id_column(ws, headers):
    current = _with_backoff(lambda: ws.row_values(1))
    if current == headers:
        return

    # 기존 버전은 submissionId 열이 맨 앞에 없었습니다.
    # 기존 데이터를 지우지 않고 첫 열만 삽입한 뒤 새 헤더를 맞춥니다.
    if current and current == headers[1:]:
        _with_backoff(lambda: ws.insert_cols([['submissionId']], col=1))
        _with_backoff(lambda: ws.update('A1', [['submissionId']]))
        return

    # 빈/불완전한 시트는 필요한 헤더로 맞춥니다.
    if not current:
        _with_backoff(lambda: ws.update('A1', [headers]))
        return

    # 첫 번째 헤더만 누락된 구버전 외의 비표준 시트는 자동 변형하지 않습니다.
    # 잘못된 열 매핑을 방지하기 위해 명시적으로 실패시킵니다.
    raise RuntimeError(
        f"'{ws.title}' 시트의 헤더가 예상 구조와 다릅니다. 현재={current}, 예상={headers}"
    )


def _get_or_create_worksheets(book):
    worksheets = {ws.title: ws for ws in _with_backoff(book.worksheets)}

    definitions = {LEDGER_TITLE: LEDGER_HEADERS, **SHEET_DEFS}
    for title, headers in definitions.items():
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
        else:
            _ensure_submission_id_column(worksheets[title], headers)

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


def _ledger_records(ws):
    """제출 원장의 submissionId -> 상태 매핑을 한 번 읽습니다."""
    rows = _with_backoff(lambda: ws.get_all_values())
    if not rows:
        return {}

    header = rows[0]
    try:
        id_col = header.index('submissionId')
        status_col = header.index('상태')
        saved_col = header.index('저장시각')
    except ValueError:
        return {}

    records = {}
    for row in rows[1:]:
        if id_col >= len(row):
            continue
        submission_id = str(row[id_col]).strip()
        if not submission_id:
            continue
        records[submission_id] = {
            'status': str(row[status_col]).strip() if status_col < len(row) else '',
            'saved_at': str(row[saved_col]).strip() if saved_col < len(row) else '',
        }
    return records


def _claim_submission(ledger_ws, submission_id, student):
    """submissionId를 영구 원장에 등록합니다.

    반환값:
      - ('claimed', now): 이번 요청이 최초 제출
      - ('duplicate', saved_at): 이미 완료된 제출
      - ('processing', saved_at): 다른/이전 실행이 처리 중인 제출

    UUID 기반 submissionId라 정상적인 사용자 제출끼리 충돌할 가능성은 사실상 없으며,
    같은 이벤트의 Streamlit 재실행/컴포넌트 재전송은 여기서 차단됩니다.
    """
    records = _ledger_records(ledger_ws)
    existing = records.get(submission_id)
    if existing:
        state = existing.get('status', '')
        return ('duplicate' if state == 'COMPLETED' else 'processing', existing.get('saved_at', ''))

    now = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    _append_rows(
        ledger_ws,
        [[
            submission_id,
            'PROCESSING',
            now,
            student.get('id', ''),
            student.get('name', ''),
            '',
        ]],
    )
    return 'claimed', now


def _mark_completed(ledger_ws, submission_id, saved_at):
    # 원장에는 동일 submissionId가 하나만 존재하도록 설계합니다.
    # 최초 claim 직후 기록한 행을 찾아 상태/저장시각만 갱신합니다.
    cell = _with_backoff(lambda: ledger_ws.find(submission_id))
    if cell is None:
        raise RuntimeError('제출 원장에서 submissionId를 찾지 못했습니다.')

    status_col = 2
    saved_at_col = 6
    _with_backoff(lambda: ledger_ws.update_cell(cell.row, status_col, 'COMPLETED'))
    _with_backoff(lambda: ledger_ws.update_cell(cell.row, saved_at_col, saved_at))


def save_submission(secret_section, spreadsheet_url, payload, result, submission_id, sheets=None):
    """한 submissionId를 Google Sheets에 최대 한 번 저장합니다.

    중요:
    - submissionId는 React가 제출 버튼 클릭 시 생성합니다.
    - 영구 제출 원장에 먼저 claim합니다.
    - 이미 COMPLETED/PROCESSING이면 데이터 시트에 어떤 append도 하지 않습니다.
    - 성공 후 원장을 COMPLETED로 바꿉니다.
    """
    if not submission_id:
        raise ValueError('submissionId가 없어 저장할 수 없습니다.')

    if sheets is None:
        client = get_client(secret_section)
        book = get_book(client, spreadsheet_url)
        sheets = _get_or_create_worksheets(book)

    student = payload.get('student') or {}
    claim = _claim_submission(sheets[LEDGER_TITLE], submission_id, student)
    state = claim[0]

    if state == 'duplicate':
        return {
            'status': 'duplicate',
            'saved_at': claim[1],
            'submission_id': submission_id,
        }
    if state == 'processing':
        return {
            'status': 'processing',
            'saved_at': claim[1],
            'submission_id': submission_id,
        }

    now = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    answers = payload.get('answers') or {}
    activities = payload.get('activities') or {}
    feedback = {x.get('key'): bool(x.get('ok')) for x in result.get('feedback', [])}

    try:
        answer_rows = [
            [
                submission_id,
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
                submission_id,
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
            [[
                submission_id,
                now,
                student.get('id', ''),
                student.get('name', ''),
                student.get('className', ''),
            ]],
        )

        _append_rows(
            sheets['포트폴리오'],
            [[
                submission_id,
                now,
                student.get('id', ''),
                student.get('name', ''),
                json.dumps(activities.get('list', ''), ensure_ascii=False),
                json.dumps(activities.get('rows', ''), ensure_ascii=False),
                json.dumps(activities.get('tree', ''), ensure_ascii=False),
                activities.get('note', ''),
            ]],
        )

        _mark_completed(sheets[LEDGER_TITLE], submission_id, now)
    except Exception:
        # PROCESSING 상태를 유지합니다. 같은 submissionId가 재전송되더라도
        # 중복 append를 하지 않게 하는 것이 우선입니다.
        # 운영자가 원장을 확인하고 실패한 부분을 복구할 수 있습니다.
        raise

    return {
        'status': 'saved',
        'saved_at': now,
        'submission_id': submission_id,
    }


def prepare_sheets(secret_section, spreadsheet_url):
    """한 세션에서 최초 1회만 시트 목록을 확인하고 Worksheet 객체를 반환합니다."""
    client = get_client(secret_section)
    book = get_book(client, spreadsheet_url)
    return _get_or_create_worksheets(book)
