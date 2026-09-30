import re

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


def normalize(value: object) -> str:
    text = '' if value is None else str(value)
    text = text.strip().lower()
    text = re.sub(r'\s+', '', text)
    text = text.replace('·', '').replace('.', '')
    return text


def is_correct(value: object, accepted: list[str]) -> bool:
    v = normalize(value)
    return bool(v) and any(v == normalize(a) for a in accepted)


def grade_submission(payload: dict) -> dict:
    answers = payload.get('answers') or {}
    activities = payload.get('activities') or {}
    feedback = []
    score = 0
    max_score = 20

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
