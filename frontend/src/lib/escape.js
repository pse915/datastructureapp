// 텍스트 이스케이프 헬퍼. React 렌더링은 기본 이스케이프되므로
// CSV/URL 등 문자열 컨텍스트에서만 사용한다.
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function csvCell(v) {
  return `"${String(v ?? '').replaceAll('"', '""')}"`;
}
