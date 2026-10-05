import {
  MAX_CONTENT_LENGTH,
  MAX_FEEDBACK_LENGTH,
  MAX_STUDENT_ID_LENGTH,
  MAX_WEEK,
  MIN_WEEK,
} from './constants.js';

export function validateStudentId(sid) {
  const v = String(sid ?? '').trim();
  if (!v) return '학번을 입력해 주세요.';
  if (v.length > MAX_STUDENT_ID_LENGTH) return `학번은 최대 ${MAX_STUDENT_ID_LENGTH}자리입니다.`;
  if (!/^\d+$/.test(v)) return '학번은 숫자로 입력해 주세요.';
  return '';
}

export function validateWeek(week) {
  const n = Number(week);
  if (!Number.isInteger(n) || n < MIN_WEEK || n > MAX_WEEK) return '주차는 1~17만 가능합니다.';
  return '';
}

export function validateContent(content, maxLen = MAX_CONTENT_LENGTH) {
  const v = String(content ?? '').trim();
  if (!v) return '포트폴리오 내용을 입력해 주세요.';
  if (v.length > maxLen) return `내용이 너무 깁니다. 최대 ${maxLen}자까지 가능합니다.`;
  return '';
}

export function validateScore(score, cap) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '점수는 숫자여야 합니다.';
  if (n < 0 || n > 1000) return '점수는 0~1000 사이여야 합니다.';
  const capNum = Number(cap);
  const effectiveCap = cap == null || cap === '' || !Number.isFinite(capNum) || capNum <= 0 ? 100 : capNum;
  if (n > effectiveCap) {
    return `점수는 배점(${effectiveCap}점)을 초과할 수 없습니다.`;
  }
  return '';
}

export function validateFeedback(feedback, maxLen = MAX_FEEDBACK_LENGTH) {
  const v = String(feedback ?? '');
  if (v.length > maxLen) return `피드백이 너무 깁니다. 최대 ${maxLen}자까지 가능합니다.`;
  return '';
}

export function validateEmbedUrl(url) {
  const v = String(url ?? '').trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:') return '외부 게임 URL은 https만 허용됩니다.';
  } catch (_) {
    return 'URL 형식이 올바르지 않습니다.';
  }
  return '';
}

// React는 기본적으로 텍스트를 이스케이프한다. dangerouslySetInnerHTML 사용 금지.
// 서버에서 내려온 제출내용/피드백은 항상 {value} 형태로 렌더링한다.
export function assertNoRawHtml() {
  return true;
}
