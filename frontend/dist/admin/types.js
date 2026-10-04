// Plain-JS mirror of types.ts (Babel-standalone / vite 공용)
function wsNewId(p = 'q') {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function wsCreateQuestion(t) {
  const base = { id: wsNewId(), prompt: '', points: 5, explanation: '' };
  if (t === 'quiz') return { ...base, type: 'quiz', options: ['', '', '', ''], answerIndex: 0 };
  if (t === 'blank') return { ...base, type: 'blank', template: '오늘 배운 [빈칸]에 대해 쓰세요.', answers: [''] };
  if (t === 'matching') return { ...base, type: 'matching', left: ['A', 'B'], right: ['1', '2'], pairs: { 0: 0, 1: 1 } };
  return { ...base, type: 'image', imageUrl: '', fileId: '', hint: '', answer: '' };
}
const WS_TYPE_LABEL = { quiz: '퀴즈/선택형', blank: '빈칸 채우기', matching: '사다리/선잇기', image: '사진 연상' };
