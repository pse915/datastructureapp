// 오답노트 localStorage 저장소.
// 키: th-wrong-{학번} → [{week, key, text, at}]
// Sheets에는 포트폴리오 자동상세(JSON) 열에 동일 문항 결과가 함께 저장된다
// (게임기록 상세JSON과 같은 재활용 패턴). 오프라인/즉시 확인용은 로컬을 쓴다.
const PREFIX = 'th-wrong-';

function safeParse(text, fallback) {
  try {
    const v = JSON.parse(text);
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
}

export function wrongKey(studentId) {
  return `${PREFIX}${String(studentId || 'anon')}`;
}

export function loadWrongNotes(studentId) {
  try {
    const raw = localStorage.getItem(wrongKey(studentId));
    const list = safeParse(raw, []);
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

export function saveWrongNotes(studentId, items) {
  try {
    const prev = loadWrongNotes(studentId);
    const seen = new Map(prev.map((w) => [`${w.week}:${w.key}`, w]));
    for (const w of items) seen.set(`${w.week}:${w.key}`, w);
    const next = [...seen.values()].slice(-200);
    localStorage.setItem(wrongKey(studentId), JSON.stringify(next));
    return next;
  } catch (_) {
    return items;
  }
}

export function clearWrongNote(studentId, week, key) {
  try {
    const next = loadWrongNotes(studentId).filter(
      (w) => !(Number(w.week) === Number(week) && String(w.key) === String(key))
    );
    localStorage.setItem(wrongKey(studentId), JSON.stringify(next));
    return next;
  } catch (_) {
    return [];
  }
}

export function wrongCountForWeek(studentId, week) {
  return loadWrongNotes(studentId).filter((w) => Number(w.week) === Number(week)).length;
}
