// 설정 모달: 테마/서체/Undo-Redo/다운로드 (스크린샷 2:1)
import React from 'react';
import { DbIcon } from './ui.jsx';

const THEMES = [
  { id: 'pure-black', label: 'Pure Black' },
  { id: 'apple-light', label: 'Apple Light' },
  { id: 'obsidian', label: 'X.AI Obsidian' },
];

export function SettingsModal({ open, onClose, theme, setTheme, font, setFont, onUndo, onRedo, canUndo, canRedo, onPrintPlan, onDownloadHtml, onDownloadAppPy, stamp }) {
  if (!open) return null;
  return (
    <div className="db-backdrop" onClick={onClose}>
      <div className="db-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="시스템 도구 및 설정">
        <div className="db-modal-head"><b>시스템 도구 및 설정</b><button className="db-modal-x" onClick={onClose} aria-label="닫기">×</button></div>
        <div className="db-modal-body">
          <div>
            <h3>🎨 화면 디자인 테마 &amp; 글꼴</h3>
            <p className="db-hint">테마 스타일</p>
            <div className="db-theme-row">
              {THEMES.map((t) => (
                <button key={t.id} className={`db-theme-opt${theme === t.id ? ' on' : ''}`} onClick={() => setTheme(t.id)}>{t.label}</button>
              ))}
            </div>
            <p className="db-hint">서체(Font)</p>
            <select className="db-select" value={font} onChange={(e) => setFont(e.target.value)}>
              <option value="pretendard">Pretendard (추천 · 최적 가독성)</option>
              <option value="system">System UI (시스템 기본)</option>
            </select>
          </div>
          <div>
            <h3>작업 기록 되돌리기 (Undo / Redo) <small>최대 10단계 히스토리</small></h3>
            <div className="db-row">
              <button className="db-btn" disabled={!canUndo} onClick={onUndo}><DbIcon name="undo" size={15} /> Undo (실행 취소)</button>
              <button className="db-btn" disabled={!canRedo} onClick={onRedo}><DbIcon name="redo" size={15} /> Redo (다시 실행)</button>
            </div>
          </div>
          <div>
            <h3>공문서 출력 및 내역서 다운로드</h3>
            <button className="db-btn" style={{ width: '100%' }} onClick={onPrintPlan}><DbIcon name="print" size={16} /> 학습 계획서 인쇄 (A4)</button>
            <div className="db-dl">
              <b style={{ fontSize: 13.5 }}>전체 일일 내역서 다운로드 <span className="db-badge" style={{ float: 'right' }}>{stamp}</span></b>
              <button className="db-btn db-btn-blue" style={{ width: '100%' }} onClick={onDownloadHtml}><DbIcon name="down" size={16} /> 일일 내역서 (HTML) 다운로드</button>
            </div>
            <div className="db-dl">
              <b style={{ fontSize: 13.5 }}>📄 파이썬 소스코드 (app.py) <span className="db-badge hot" style={{ float: 'right' }}>Streamlit</span></b>
              <p>백엔드 이벤트 라우팅이 포함된 완전한 단일 파이썬 파일입니다.</p>
              <button className="db-btn db-btn-green" style={{ width: '100%' }} onClick={onDownloadAppPy}><DbIcon name="down" size={16} /> app.py 파일 다운로드</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
