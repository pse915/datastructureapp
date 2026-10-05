"""P0 검증용 순수함수 테스트. streamlit/gspread 없이 실행 가능.

실행: python -m pytest backend/test_validation.py -q (pytest 없으면 python backend/test_validation.py)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.validation import (
    validate_content,
    validate_feedback,
    validate_score,
    validate_student_id,
    validate_submission_id,
    validate_week,
)


def test_week_range():
    assert validate_week(1) == 1
    assert validate_week("17") == 17
    for bad in (0, 18, "x", "", None):
        try:
            validate_week(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"week {bad!r} should fail")


def test_student_id():
    assert validate_student_id("1701") == "1701"
    for bad in ("", "abc", "123456789"):
        try:
            validate_student_id(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"sid {bad!r} should fail")


def test_content_limits():
    assert validate_content("hello") == "hello"
    try:
        validate_content("   ")
    except ValueError:
        pass
    else:
        raise AssertionError("empty content should fail")
    try:
        validate_content("x" * 4001)
    except ValueError:
        pass
    else:
        raise AssertionError("overlong content should fail")


def test_score_cap():
    assert validate_score(10, 10) == 10
    try:
        validate_score(11, 10)
    except ValueError:
        pass
    else:
        raise AssertionError("over-cap score should fail")


def test_feedback_and_submission_id():
    assert validate_feedback("good") == "good"
    assert validate_submission_id("abc-123") == "abc-123"
    try:
        validate_submission_id("")
    except ValueError:
        pass
    else:
        raise AssertionError("empty submissionId should fail")


if __name__ == "__main__":
    test_week_range()
    test_student_id()
    test_content_limits()
    test_score_cap()
    test_feedback_and_submission_id()
    print("validation tests passed")
