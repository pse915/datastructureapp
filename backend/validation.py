"""서버 입력 검증 공용 모듈.

app.py와 backend 저장소가 공유한다. Sheets 헤더/Secrets 키 변경 없음.
"""
from __future__ import annotations

MAX_CONTENT_LENGTH = 4000
MAX_FEEDBACK_LENGTH = 2000
MAX_STUDENT_ID_LENGTH = 8
MIN_WEEK = 1
MAX_WEEK = 17


def validate_week(week: object) -> int:
    try:
        week_no = int(str(week).strip() if isinstance(week, str) else week)
    except (ValueError, TypeError, AttributeError) as exc:
        raise ValueError("주차는 1~17 사이 숫자여야 합니다.") from exc
    if not (MIN_WEEK <= week_no <= MAX_WEEK):
        raise ValueError("주차는 1~17만 가능합니다.")
    return week_no


def validate_student_id(student_id: object) -> str:
    sid = str(student_id or "").strip()
    if not sid:
        raise ValueError("학번이 필요합니다.")
    if len(sid) > MAX_STUDENT_ID_LENGTH:
        raise ValueError(f"학번은 최대 {MAX_STUDENT_ID_LENGTH}자리입니다.")
    if not sid.isdigit():
        raise ValueError("학번은 숫자로 입력해 주세요.")
    return sid


def validate_content(content: object, max_len: int = MAX_CONTENT_LENGTH) -> str:
    text = str(content or "").strip()
    if not text:
        raise ValueError("포트폴리오 내용을 입력해 주세요.")
    if len(text) > max_len:
        raise ValueError(f"내용이 너무 깁니다. 최대 {max_len}자까지 가능합니다.")
    return text


def validate_score(score: object, max_score: object = 100) -> int:
    try:
        value = int(float(str(score).strip() if isinstance(score, str) else score))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ValueError("점수는 숫자여야 합니다.") from exc
    try:
        cap = int(float(max_score))
    except (ValueError, TypeError):
        cap = 100
    if cap <= 0:
        cap = 100
    if not (0 <= value <= 1000):
        raise ValueError("점수는 0~1000 사이여야 합니다.")
    if cap and value > cap:
        raise ValueError(f"점수는 배점({cap}점)을 초과할 수 없습니다.")
    return value


def validate_feedback(feedback: object, max_len: int = MAX_FEEDBACK_LENGTH) -> str:
    text = str(feedback or "")
    if len(text) > max_len:
        raise ValueError(f"피드백이 너무 깁니다. 최대 {max_len}자까지 가능합니다.")
    return text


def validate_submission_id(submission_id: object) -> str:
    cid = str(submission_id or "").strip()
    if not cid:
        raise ValueError("제출 식별자가 없습니다. 다시 제출해 주세요.")
    if len(cid) > 128:
        raise ValueError("제출 식별자가 올바르지 않습니다.")
    return cid


def require_role(actual: object, expected: str, message: str = "") -> None:
    if actual != expected:
        raise RuntimeError(message or f"필요한 권한이 없습니다. (필요: {expected})")
