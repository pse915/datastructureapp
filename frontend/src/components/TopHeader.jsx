// 상단 헤더: 로고 + 카테고리 탭 + 우측 액션 (스크린샷 1:1)
import React from 'react';
import { DbIcon } from './ui.jsx';

export function TopHeader({ brand, year, cat, setCat, cats, userName, onRefresh, onPull, onSave, onOpenSettings, saving }) {
  return (
    <header className="db-header">
      <div className="db-header-in">
        <div className="db-brand">
          <div className="db-brand-mark">🧱</div>
          <div>
            <b>{brand}<span className="db-year">{year}</span></b>
            <small>자료구조 학습 · 포트폴리오 통합 포털</small>
          </div>
        </div>
        <nav className="db-cat" aria-label="최상단 카테고리">
          {cats.map((c) => (
            <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
              {c.icon} {c.label}
            </button>
          ))}
        </nav>
        <div className="db-head-actions">
          <button className="db-admin-pill" title="현재 사용자">
            <DbIcon name="user" size={15} /><span className="nm">{userName}</span><span>▾</span>
          </button>
          <button className="db-btn db-btn-sm" onClick={onRefresh} title="Sheets에서 새로고침">
            <DbIcon name="refresh" size={15} /> 새로고침
          </button>
          <button className="db-btn db-btn-sm" onClick={onPull} title="학습지/게임 설정 불러오기">
            <DbIcon name="cloud" size={15} /> 불러오기
          </button>
          <button className="db-btn db-btn-blue db-btn-sm" onClick={onSave} disabled={!!saving} title="현재 작업 저장">
            <DbIcon name="save" size={15} /> {saving ? '저장 중…' : '작업 저장'}
          </button>
          <button className="db-btn db-btn-sm" onClick={onOpenSettings} title="시스템 도구 및 설정">···</button>
        </div>
      </div>
    </header>
  );
}
