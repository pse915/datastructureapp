// 상단 Story 링 형태의 자료구조 카테고리 탭 (Vite 모듈 버전)
import React from 'react';

export function StoryBar({ units, activeId, onSelect, solved = {} }) {
  return (
    <div className="ig-stories" role="tablist" aria-label="자료구조 단원 선택">
      {units.map((u) => {
        const on = u.id === activeId;
        return (
          <button
            key={u.id}
            role="tab"
            aria-selected={on}
            className={`ig-story live ${on ? 'on' : ''}`}
            onClick={() => onSelect(u.id)}
          >
            <span className="ring"><div>{u.icon}</div></span>
            <small>{u.label}</small>
            <i className="cnt" style={solved[u.id] ? {} : { visibility: 'hidden' }}>
              {solved[u.id] ? '★ 해결' : '★'}
            </i>
          </button>
        );
      })}
    </div>
  );
}
