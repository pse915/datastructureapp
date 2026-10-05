"""포트폴리오 자동채점.

- 1주차 레거시 로직은 그대로 유지한다 (회귀 방지).
- 주차별 루브릭이 있으면 루브릭 기준으로 채점한다.
  루브릭 형식 (주차설정 시트 루브릭JSON 열):
  {
    "questions": [{"key": "q1", "accepted": ["데이터"], "score": 1, "hint": "안내"}],
    "keywords": [{"term": "정리", "score": 1}],
    "minLength": 10,
    "maxScore": 20,
    "activities": {"listMin": 2, "tableMin": 2, "treeRequired": true, "noteMinLen": 1}
  }
- payload 형식: {"answers": {...}, "activities": {...}, "content": "...", "week": 1}
- answers/activities가 없고 keywords도 없으면 graded=False로 스킵한다
  (기존 자유서술 제출 흐름을 덮어쓰지 않기 위함).
"""
from __future__ import annotations

import json
import re
from typing import Any

CORE_ANSWERS = {
    'q1': ['데이터'],
    'q2': ['기준'],
    'q3': ['정리'],
    'q4': ['통일된 모양'],
    'r1': ['쉽게 찾을'],
    'r2': ['관계'],
    'r4': ['효율적으로 관리'],
    'listRule': ['기준'],
}

LEGACY_MAX_SCORE = 20


def normalize(value: object) -> str:
    text = '' if value is None else str(value)
    text = text.strip().lower()
    text = re.sub(r'\s+', '', text)
    text = text.replace('·', '').replace('.', '')
    return text


def is_correct(value: object, accepted: list[str]) -> bool:
    v = normalize(value)
    return bool(v) and any(v == normalize(a) for a in accepted)


def _contains(content: str, term: str) -> bool:
    return bool(content) and bool(term) and normalize(term) in normalize(content)


def parse_rubric(raw: object) -> dict[str, Any] | None:
    """루브릭JSON 파싱. 비어있거나 깨졌으면 None."""
    if raw is None:
        return None
    if isinstance(raw, dict):
        data = raw
    elif isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        try:
            data = json.loads(text)
        except (ValueError, TypeError):
            return None
    else:
        return None
    if not isinstance(data, dict) or not data:
        return None
    questions = data.get("questions", [])
    keywords = data.get("keywords", [])
    if not isinstance(questions, list):
        questions = []
    if not isinstance(keywords, list):
        keywords = []
    questions = [q for q in questions if isinstance(q, dict) and q.get("key")]
    cleaned_keywords = []
    for k in keywords:
        if isinstance(k, dict) and k.get("term"):
            try:
                score = int(float(k.get("score", 1)))
            except (ValueError, TypeError):
                score = 1
            cleaned_keywords.append({"term": str(k["term"]), "score": max(0, score)})
    try:
        max_score = int(float(data.get("maxScore", 0)) or 0) or None
    except (ValueError, TypeError):
        max_score = None
    try:
        min_length = int(float(data.get("minLength", 0)) or 0)
    except (ValueError, TypeError):
        min_length = 0
    activities = data.get("activities")
    if activities is not None and not isinstance(activities, dict):
        activities = None
    return {
        "questions": questions,
        "keywords": cleaned_keywords,
        "maxScore": max_score,
        "minLength": max(0, min_length),
        "activities": activities,
    }


def _grade_legacy(answers: dict, activities: dict) -> dict:
    feedback = []
    score = 0
    max_score = LEGACY_MAX_SCORE

    for key, accepted in CORE_ANSWERS.items():
        ok = is_correct(answers.get(key), accepted)
        if ok:
            score += 1
        feedback.append({'key': key, 'ok': ok, 'text': f'{key} ' + ('정답' if ok else '확인이 필요합니다')})

    # 활동 1: 두 개의 실습 행에서 핵심 입력이 모두 채워졌는지 평가
    rows = activities.get('list') or []
    activity1_ok = len(rows) >= 2 and all(str(r.get('item', '')).strip() and str(r.get('person', '')).strip() for r in rows[:2])
    if activity1_ok:
        score += 4
    feedback.append({'key': 'activity1', 'ok': activity1_ok, 'text': '활동 1 목록 작성'})

    # 활동 2: 두 학생 행의 네 필드가 모두 채워졌는지 평가
    table_rows = activities.get('rows') or []
    fields = ('name', 'birthday', 'hobby', 'role')
    activity2_ok = len(table_rows) >= 2 and all(all(str(r.get(k, '')).strip() for k in fields) for r in table_rows[:2])
    if activity2_ok:
        score += 4
    feedback.append({'key': 'activity2', 'ok': activity2_ok, 'text': '활동 2 표 작성'})

    # 활동 3: 세 개의 노드 빈칸
    tree = activities.get('tree') or {}
    activity3_ok = all(str(tree.get(k, '')).strip() for k in ('root', 'left', 'right'))
    if activity3_ok:
        score += 3
    feedback.append({'key': 'activity3', 'ok': activity3_ok, 'text': '활동 3 계층형 다이어그램'})

    # 활동 4: 학생의 자유 구조화 기록
    activity4_ok = bool(str(activities.get('note', '')).strip())
    if activity4_ok:
        score += 1
    feedback.append({'key': 'activity4', 'ok': activity4_ok, 'text': '활동 4 구조화 기록'})

    return {
        'score': score,
        'maxScore': max_score,
        'percent': round(score / max_score * 100),
        'graded': True,
        'answers': answers,
        'feedback': feedback,
    }


def _grade_with_rubric(
    answers: dict,
    activities: dict,
    content: str,
    rubric: dict[str, Any],
) -> dict:
    feedback: list[dict[str, Any]] = []
    score = 0

    for q in rubric.get("questions", []):
        key = str(q.get("key", ""))
        accepted = q.get("accepted", [])
        if isinstance(accepted, str):
            accepted = [accepted]
        if not isinstance(accepted, list):
            accepted = []
        try:
            q_score = max(0, int(float(q.get("score", 1))))
        except (ValueError, TypeError):
            q_score = 1
        value = answers.get(key, "")
        # 답안칸이 비었으면 본문에서 키워드 포함 여부로도 인정한다.
        ok = is_correct(value, [str(a) for a in accepted])
        via = "answer"
        if not ok and content and accepted:
            ok = any(_contains(content, str(a)) for a in accepted)
            via = "content" if ok else via
        if ok:
            score += q_score
        hint = str(q.get("hint", "") or "")
        feedback.append({
            "key": key, "ok": ok, "score": q_score if ok else 0, "via": via,
            "text": f"{key} " + ("정답" if ok else ("확인이 필요합니다" + (f" ({hint})" if hint else ""))),
        })

    for kw in rubric.get("keywords", []):
        term = str(kw.get("term", ""))
        try:
            k_score = max(0, int(float(kw.get("score", 1))))
        except (ValueError, TypeError):
            k_score = 1
        ok = _contains(content, term) or any(
            _contains(str(v), term) for v in answers.values() if isinstance(v, str)
        )
        if ok:
            score += k_score
        feedback.append({
            "key": f"kw:{term}", "ok": ok, "score": k_score if ok else 0,
            "text": f"핵심어 '{term}' " + ("포함" if ok else "누락"),
        })

    min_len = int(rubric.get("minLength", 0) or 0)
    if min_len > 0:
        ok = len(content.strip()) >= min_len
        feedback.append({
            "key": "minLength", "ok": ok, "score": 0,
            "text": f"분량 {len(content.strip())}/{min_len}자 " + ("충족" if ok else "부족"),
        })

    # activities 규칙이 있으면 레거시와 동일한 4개 활동을 지정된 최소 기준으로 평가한다.
    rules = rubric.get("activities")
    if isinstance(rules, dict):
        list_min = int(rules.get("listMin", rules.get("list_min", 2)) or 2)
        table_min = int(rules.get("tableMin", rules.get("table_min", 2)) or 2)
        tree_required = bool(rules.get("treeRequired", rules.get("tree_required", True)))
        try:
            note_min = int(float(rules.get("noteMinLen", rules.get("note_min_len", 1)) or 1))
        except (ValueError, TypeError):
            note_min = 1
        try:
            list_score = max(0, int(float(rules.get("listScore", 4))))
            table_score = max(0, int(float(rules.get("tableScore", 4))))
            tree_score = max(0, int(float(rules.get("treeScore", 3))))
            note_score = max(0, int(float(rules.get("noteScore", 1))))
        except (ValueError, TypeError):
            list_score, table_score, tree_score, note_score = 4, 4, 3, 1
        rows = activities.get('list') or []
        a1 = len(rows) >= list_min and all(
            str(r.get('item', '')).strip() and str(r.get('person', '')).strip() for r in rows[:list_min]
        )
        if a1:
            score += list_score
        feedback.append({'key': 'activity1', 'ok': a1, 'score': list_score if a1 else 0, 'text': '활동 1 목록 작성'})
        table_rows = activities.get('rows') or []
        fields = ('name', 'birthday', 'hobby', 'role')
        a2 = len(table_rows) >= table_min and all(
            all(str(r.get(k, '')).strip() for k in fields) for r in table_rows[:table_min]
        )
        if a2:
            score += table_score
        feedback.append({'key': 'activity2', 'ok': a2, 'score': table_score if a2 else 0, 'text': '활동 2 표 작성'})
        if tree_required:
            tree = activities.get('tree') or {}
            a3 = all(str(tree.get(k, '')).strip() for k in ('root', 'left', 'right'))
            if a3:
                score += tree_score
            feedback.append({'key': 'activity3', 'ok': a3, 'score': tree_score if a3 else 0, 'text': '활동 3 계층형 다이어그램'})
        a4 = len(str(activities.get('note', '')).strip()) >= note_min
        if a4:
            score += note_score
        feedback.append({'key': 'activity4', 'ok': a4, 'score': note_score if a4 else 0, 'text': '활동 4 구조화 기록'})

    declared_max = rubric.get("maxScore")
    if isinstance(declared_max, int) and declared_max > 0:
        max_score = declared_max
    else:
        max_score = score + sum(1 for f in feedback if not f.get("ok") and f.get("key", "").startswith("q"))
        # 오답 여지를 남기기 위해 최소 1점 이상으로 보정하지 않고, 만점은 획득 가능 총합으로 둔다.
        max_score = max(score, 1)
        # questions/keywords 만점 합산이 더 정확하면 그것을 사용한다.
        potential = 0
        for q in rubric.get("questions", []):
            try:
                potential += max(0, int(float(q.get("score", 1))))
            except (ValueError, TypeError):
                potential += 1
        for kw in rubric.get("keywords", []):
            try:
                potential += max(0, int(float(kw.get("score", 1))))
            except (ValueError, TypeError):
                potential += 1
        if potential > 0:
            max_score = potential
    score = min(score, max_score)
    return {
        'score': score,
        'maxScore': max_score,
        'percent': round(score / max_score * 100) if max_score else 0,
        'graded': True,
        'answers': answers,
        'feedback': feedback,
    }


def grade_submission(payload: dict, rubric: dict | str | None = None) -> dict:
    """채점 진입점. rubric이 없으면 1주차 레거시 로직 그대로."""
    payload = payload if isinstance(payload, dict) else {}
    answers = payload.get('answers') or {}
    activities = payload.get('activities') or {}
    content = str(payload.get('content', '') or '')
    if not isinstance(answers, dict):
        answers = {}
    if not isinstance(activities, dict):
        activities = {}

    parsed = parse_rubric(rubric)
    if parsed is None:
        has_structured = bool(answers) or bool(activities)
        if not has_structured and not content.strip():
            return {'score': 0, 'maxScore': LEGACY_MAX_SCORE, 'percent': 0,
                    'graded': False, 'skipped': True, 'answers': {},
                    'feedback': [{'key': 'empty', 'ok': False, 'text': '채점할 답안이 없습니다.'}]}
        if not has_structured:
            # 기존 자유서술 제출 흐름을 덮어쓰지 않기 위해 스킵한다.
            # (루브릭이 없고 구조화 답안이 없으면 자동점수를 저장하지 않는다.)
            return {'score': 0, 'maxScore': LEGACY_MAX_SCORE, 'percent': 0,
                    'graded': False, 'skipped': True, 'answers': {},
                    'feedback': [{'key': 'free', 'ok': True, 'text': '자유서술 제출: 자동채점을 건너뜁니다.'}]}
        return _grade_legacy(answers, activities)
    return _grade_with_rubric(answers, activities, content, parsed)


def summarize_feedback(result: dict, max_len: int = 500) -> str:
    """포트폴리오 피드백 칸에 들어갈 한 줄 요약."""
    if not result.get("graded"):
        return ""
    parts = []
    for f in result.get("feedback", []):
        mark = "O" if f.get("ok") else "X"
        parts.append(f"{f.get('key')}{mark}")
    head = f"[자동채점 {result.get('score', 0)}/{result.get('maxScore', 0)}] " + ", ".join(parts)
    return head[:max_len]
