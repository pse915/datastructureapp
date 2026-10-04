// 대단원 카드 그리드 (2x2): 카드 안 5단계 타일 (개념/코드/실습/퀴즈/게임)
import React from 'react';

const STEPS = ['개념', '코드', '실습', '퀴즈', '게임'];

export function UnitCards({ units, solved, gamePlayed, selectedId, onSelect }) {
  return (
    <div className="db-grid">
      {units.map((u) => {
        const done = !!solved[u.id];
        const played = !!(gamePlayed && gamePlayed[u.id]);
        const sel = selectedId === u.id;
        const tileCls = (s) => `db-tile${s === '퀴즈' && done ? ' good' : s === '게임' && played ? ' hit' : ''}`;
        return (
          <button key={u.id} className={`db-card${sel ? ' sel' : ''}`} onClick={() => onSelect(u.id)}>
            <div className="db-card-head">
              <span className="ico">{u.icon}</span>
              <span><b>{u.label}</b><small>{u.handle}</small></span>
              <span className={`db-pill${done ? ' done' : ''}`}>{done ? '★ 해결' : `5단계 중 ${played ? 3 : done ? 5 : 0}/5`}</span>
            </div>
            <div className="db-days">
              {STEPS.map((s) => (
                <div key={s} className="db-day"><span>{s}</span><span className={tileCls(s)}>{s === '퀴즈' ? (done ? '정답' : '도전') : s}</span></div>
              ))}
            </div>
            <ul className="db-points">{u.points.slice(0, 2).map((p) => <li key={p}>{p}</li>)}</ul>
          </button>
        );
      })}
    </div>
  );
}
