// 서브 탭: 아이콘 가로 버튼 (스크린샷: 시간표/결강보강/맞교환/테스트/… → 단원 탭으로 매핑)
import React from 'react';
import { DbIcon } from './ui.jsx';

export function SubTabs({ tabs, active, onChange }) {
  return (
    <nav className="db-subtabs" role="tablist" aria-label="단원 및 기능 선택">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`db-subtab ${active === t.id ? 'on' : ''} ${t.done ? 'done' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="dot" />
          <span className="ico">{t.icon || <DbIcon name={t.iconName || 'grid'} size={16} />}</span>
          {t.label}
          {t.badge && <small>{t.badge}</small>}
        </button>
      ))}
    </nav>
  );
}
