/* TECH·HOME 공용 검증 (src/lib/validation.js와 동기화, import 없이 동작) */
(function () {
  var C = window.__TECH_CONSTANTS__ || { MIN_WEEK: 1, MAX_WEEK: 17, MAX_CONTENT_LENGTH: 4000, MAX_FEEDBACK_LENGTH: 2000, MAX_STUDENT_ID_LENGTH: 8 };
  function validateStudentId(sid) {
    var v = String(sid == null ? '' : sid).trim();
    if (!v) return '학번을 입력해 주세요.';
    if (v.length > C.MAX_STUDENT_ID_LENGTH) return '학번은 최대 ' + C.MAX_STUDENT_ID_LENGTH + '자리입니다.';
    if (!/^\d+$/.test(v)) return '학번은 숫자로 입력해 주세요.';
    return '';
  }
  function validateWeek(week) {
    var n = Number(week);
    if (!Number.isInteger(n) || n < C.MIN_WEEK || n > C.MAX_WEEK) return '주차는 1~17만 가능합니다.';
    return '';
  }
  function validateContent(content, maxLen) {
    var v = String(content == null ? '' : content).trim();
    var cap = maxLen || C.MAX_CONTENT_LENGTH;
    if (!v) return '포트폴리오 내용을 입력해 주세요.';
    if (v.length > cap) return '내용이 너무 깁니다. 최대 ' + cap + '자까지 가능합니다.';
    return '';
  }
  function validateScore(score, cap) {
    var n = Number(score);
    if (!Number.isFinite(n)) return '점수는 숫자여야 합니다.';
    if (n < 0 || n > 1000) return '점수는 0~1000 사이여야 합니다.';
    var capNum = Number(cap);
    var effectiveCap = (cap == null || cap === '' || !Number.isFinite(capNum) || capNum <= 0) ? 100 : capNum;
    if (n > effectiveCap) return '점수는 배점(' + effectiveCap + '점)을 초과할 수 없습니다.';
    return '';
  }
  function validateFeedback(feedback, maxLen) {
    var v = String(feedback == null ? '' : feedback);
    var cap = maxLen || C.MAX_FEEDBACK_LENGTH;
    if (v.length > cap) return '피드백이 너무 깁니다. 최대 ' + cap + '자까지 가능합니다.';
    return '';
  }
  function validateEmbedUrl(url) {
    var v = String(url == null ? '' : url).trim();
    if (!v) return '';
    try {
      var u = new URL(v);
      if (u.protocol !== 'https:') return '외부 게임 URL은 https만 허용됩니다.';
    } catch (_) {
      return 'URL 형식이 올바르지 않습니다.';
    }
    return '';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  window.__TECH_VALIDATION__ = {
    validateStudentId: validateStudentId,
    validateWeek: validateWeek,
    validateContent: validateContent,
    validateScore: validateScore,
    validateFeedback: validateFeedback,
    validateEmbedUrl: validateEmbedUrl,
    escapeHtml: escapeHtml
  };
})();
