import React from 'react';

export function AutoGradeResult({ autoGrade }) {
  if (!autoGrade || !autoGrade.graded) return null;
  const items = autoGrade.feedback || [];
  const wrong = items.filter((f) => !f.ok);
  return (
    <div className="side-card auto-grade-card">
      <span className="eyebrow">AUTO GRADE</span>
      <strong>
        {autoGrade.score}
        <small> / {autoGrade.maxScore}</small>
      </strong>
      <p>
        제출 직후 자동채점 결과입니다. 교사가 확정하면 교사 점수로 바뀝니다.
        {wrong.length ? ` (복습 ${wrong.length}개)` : ' (모두 정답)'}
      </p>
      <div className="auto-grade-list">
        {items.map((f, i) => (
          <div key={`${f.key}-${i}`} className={`auto-grade-row ${f.ok ? 'ok' : 'wrong'}`}>
            <span>{f.ok ? '○' : '●'}</span>
            <div>
              <b>{f.key}</b>
              <small>{f.text}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
