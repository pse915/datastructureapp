// 인스타 스타일 Quiz 문제 카드 + 결과 제출 (Vite 모듈 버전)
import React, { useState } from 'react';

export function QuizCard({ unit, solved, onSolve }) {
  const [picked, setPicked] = useState(null);
  const done = picked !== null;
  const correct = done && picked === unit.quiz.answer;
  const choose = (i) => {
    if (done) return;
    setPicked(i);
    if (i === unit.quiz.answer) onSolve?.(unit.id);
  };
  return (
    <div className="db-lab" style={{ borderStyle: 'solid' }}>
      <span className="db-lab-title">● MINI QUIZ — {solved ? '해결됨 ★' : '풀어보기'}</span>
      <div><b style={{ fontSize: 15 }}>{unit.quiz.q}</b></div>
      {unit.quiz.options.map((o, j) => {
        let cls = 'db-quiz-opt';
        if (done) { if (j === unit.quiz.answer) cls += ' correct'; else if (j === picked) cls += ' wrong'; }
        return (
          <button key={j} className={cls} disabled={done} onClick={() => choose(j)}>
            <span className="letter">{'ABCD'[j] || j + 1}</span>{o}
          </button>
        );
      })}
      {done && (
        <div className="db-explain">
          {correct ? '정답! 🎉 ' : '아쉬워요. 정답은 ' + 'ABCD'[unit.quiz.answer] + '번. '}{unit.quiz.explain}
        </div>
      )}
    </div>
  );
}

