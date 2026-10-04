// DS BLACKBOARD — Pure Black SaaS 대시보드 (Vite 개발용)
// 실행: cd frontend && npm install && npm run dev   (3001 포트)
// 배포: npm run build → frontend/build 를 Streamlit이 서빙 (app.py _RELEASE 블록 참조)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Streamlit } from 'streamlit-component-lib';
import './theme/black-dashboard.css';
import { DS_UNITS } from './data/dsCurriculum.js';
import { DbIcon } from './components/ui.jsx';
import { TopHeader } from './components/TopHeader.jsx';
import { SubTabs } from './components/SubTabs.jsx';
import { UnitCards } from './components/UnitCards.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { VIZ_MAP } from './components/Visualizers.jsx';
import { QuizCard } from './components/QuizCard.jsx';

const DEFAULT_ARGS = { role: null, student: null, weeks: [], portfolio: [], teacher: null, flash: null, result: null, worksheet: null, uploadResult: null, games: null, ds: null };

function makeEventId(p = 'event') {
  try { if (globalThis.crypto?.randomUUID) return `${p}-${globalThis.crypto.randomUUID()}`; } catch (_) {}
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function emit(action, payload = {}) {
  Streamlit.setComponentValue({ action, eventId: makeEventId(action), ...payload });
}
function downloadBlob(name, text, mime = 'text/html;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ================= 로그인 ================= */
function Login({ flash }) {
  const [sid, setSid] = useState('');
  const [pw, setPw] = useState('');
  const [pending, setPending] = useState('');
  useEffect(() => { if (flash) setPending(''); }, [flash?.type, flash?.text]);
  const goS = (e) => { e?.preventDefault?.(); if (!sid.trim() || pending) return; setPending('s'); emit('student_login', { studentId: sid.trim() }); };
  const goT = (e) => { e?.preventDefault?.(); if (!pw || pending) return; setPending('t'); emit('teacher_login', { password: pw }); };
  return (
    <div className="db-app" data-theme="pure-black">
      <TopHeader brand="DS Blackboard" year="2026학년도" cat="learn" setCat={() => {}} cats={[{ id: 'learn', icon: '📚', label: '학습 업무' }, { id: 'admin', icon: '🏫', label: '교무 행정' }]} userName="게스트" onRefresh={() => {}} onPull={() => {}} onSave={() => {}} onOpenSettings={() => {}} />
      <main className="db-shell">
        {flash && <div className={`db-toast ${flash.type || ''}`}>{flash.text}</div>}
        <div className="db-auth-grid">
          <section className="db-section db-hero">
            <span className="db-badge hot">8 UNITS · PURE BLACK</span>
            <h1>피드가 아니라 <i>대시보드</i>로 배우는 자료구조.</h1>
            <p className="db-hint">단원 카드를 고르고, 타일을 눌러 개념→코드→실습→퀴즈→게임 5단계를 밟으세요. 퀴즈 정답과 게임 점수는 Sheets에 실시간 저장됩니다.</p>
            <div className="db-subtabs">{DS_UNITS.slice(0, 6).map((u) => <span key={u.id} className="db-subtab"><span className="ico">{u.icon}</span>{u.label}</span>)}</div>
          </section>
          <section className="db-section">
            <div><span className="db-badge">STUDENT</span><h2 style={{ margin: '6px 0' }}>학번으로 시작</h2></div>
            <form onSubmit={goS} className="db-row">
              <input className="db-input" value={sid} onChange={(e) => setSid(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))} placeholder="학번 예) 1701" inputMode="numeric" />
              <button className="db-btn db-btn-blue" type="submit" disabled={!sid.trim() || pending !== ''}>{pending === 's' ? '확인 중…' : '학생 로그인'}</button>
            </form>
            <div><span className="db-badge">TEACHER</span><h2 style={{ margin: '6px 0' }}>교사 관리자</h2></div>
            <form onSubmit={goT} className="db-row">
              <input className="db-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="관리자 비밀번호" />
              <button className="db-btn db-btn-green" type="submit" disabled={!pw || pending !== ''}>{pending === 't' ? '확인 중…' : '교사 로그인'}</button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ================= 단원 상세 (개념+코드+실습+퀴즈) ================= */
function UnitDetail({ unit, solved, onSolve, compact }) {
  const Viz = VIZ_MAP[unit.id];
  return (
    <section className="db-section">
      <div className="db-card-head">
        <span className="ico" style={{ width: 44, height: 44, fontSize: 22 }}>{unit.icon}</span>
        <span><h2>{unit.title}</h2><p className="desc">{unit.handle}</p></span>
        <span className={`db-pill${solved ? ' done' : ' hot'}`}>{solved ? '★ 해결됨' : '학습 중'}</span>
      </div>
      <p className="desc" style={{ color: 'var(--db-text)', fontSize: 14.5 }}>{unit.desc}</p>
      <ul className="db-points">{unit.points.map((p) => <li key={p}>{p}</li>)}</ul>
      <pre className="db-code">{unit.code}</pre>
      {Viz && <div className="db-lab"><span className="db-lab-title">● INTERACTIVE LAB — 직접 조작</span><Viz /></div>}
      {!compact && <QuizCard unit={unit} solved={!!solved} onSolve={onSolve} />}
    </section>
  );
}

/* ================= 미니게임 (기존 기능 유지) ================= */
const GAME_LABEL = { quiz: '4지선다 퀴즈', memory: '카드 맞추기', embed: '외부 게임' };
function gmUid(p = 'g') { return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function gmShuffle(a) { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[x[i], x[j]] = [x[j], x[i]]; } return x; }
function QuizPlayer({ config, onFinish }) {
  const qs = config.content?.questions || [];
  const [idx, setIdx] = useState(0); const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0); const [done, setDone] = useState(false);
  const [t0] = useState(Date.now()); const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  if (!qs.length) return <div className="db-empty">등록된 문제가 없습니다.</div>;
  if (done) return <div className="db-section"><div className="db-like-pop">♥</div><h2 style={{ textAlign: 'center' }}>{score}/{qs.length}점 저장 완료</h2></div>;
  const q = qs[idx];
  const choose = (i) => {
    if (picked !== null) return; setPicked(i);
    const ns = score + (i === q.answer ? 1 : 0); if (i === q.answer) setScore(ns);
    timers.current.push(setTimeout(() => {
      if (idx + 1 >= qs.length) { setDone(true); onFinish({ score: ns, maxScore: qs.length, durationSec: Math.round((Date.now() - t0) / 1000), detail: { correct: ns } }); }
      else { setIdx(idx + 1); setPicked(null); }
    }, 450));
  };
  return (
    <section className="db-section">
      <div className="db-progress"><i style={{ width: `${Math.round((idx / qs.length) * 100)}%` }} /></div>
      <h2 style={{ fontSize: 16 }}>{q.q}</h2>
      {(q.options || []).map((o, j) => {
        let cls = 'db-quiz-opt';
        if (picked !== null) { if (j === q.answer) cls += ' correct'; else if (j === picked) cls += ' wrong'; }
        return <button key={j} className={cls} onClick={() => choose(j)}><span className="letter">{'ABCD'[j] || j + 1}</span>{o}</button>;
      })}
    </section>
  );
}
function MemoryPlayer({ config, onFinish }) {
  const pairs = config.content?.pairs || [];
  const deck = useMemo(() => gmShuffle(pairs.flatMap((p, i) => [{ key: i, text: p.a }, { key: i, text: p.b }])), [config.updatedAt, pairs.length]);
  const [open, setOpen] = useState([]); const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0); const [lock, setLock] = useState(false);
  const [t0] = useState(Date.now()); const [done, setDone] = useState(false);
  const timers = useRef([]); useEffect(() => () => timers.current.forEach(clearTimeout), []);
  if (!pairs.length) return <div className="db-empty">등록된 카드가 없습니다.</div>;
  if (done) return <div className="db-section"><div className="db-like-pop">♥</div><h2 style={{ textAlign: 'center' }}>{pairs.length}쌍 완성 · 저장 완료</h2></div>;
  const flip = (i) => {
    if (lock || open.includes(i) || matched.includes(deck[i].key)) return;
    const no = [...open, i]; setOpen(no);
    if (no.length === 2) {
      setMoves(moves + 1);
      if (deck[no[0]].key === deck[no[1]].key) {
        const nm = [...matched, deck[no[0]].key]; setMatched(nm); setOpen([]);
        if (nm.length === pairs.length) { setDone(true); onFinish({ score: pairs.length, maxScore: pairs.length, durationSec: Math.round((Date.now() - t0) / 1000), detail: { moves: moves + 1 } }); }
      } else { setLock(true); timers.current.push(setTimeout(() => { setOpen([]); setLock(false); }, 650)); }
    }
  };
  return (
    <section className="db-section">
      <div className="db-progress"><i style={{ width: `${Math.round((matched.length / Math.max(1, pairs.length)) * 100)}%` }} /></div>
      <div className="db-mem-grid">{deck.map((c, i) => {
        const face = open.includes(i) || matched.includes(c.key);
        return <button key={i} className={`db-mem-card${face ? ' face' : ''}${matched.includes(c.key) ? ' matched' : ''}`} onClick={() => flip(i)}>{face ? c.text : '?'}</button>;
      })}</div>
    </section>
  );
}
function GamePlayer({ config, onFinish }) {
  if (config.type === 'memory') return <MemoryPlayer config={config} onFinish={onFinish} />;
  if (config.type === 'embed') {
    const url = config.content?.url || '';
    return <section className="db-section">{url ? <iframe title={config.title} src={url} className="db-frame" sandbox="allow-scripts allow-same-origin allow-forms" /> : <div className="db-empty">등록된 게임 URL이 없습니다.</div>}
      <button className="db-btn db-btn-green" onClick={() => onFinish({ score: 100, maxScore: 100, durationSec: 0, detail: { via: 'manual' } })}>게임 완료 보고하기</button></section>;
  }
  return <QuizPlayer config={config} onFinish={onFinish} />;
}
function StudentGames({ games, myRecords }) {
  const list = games || [];
  const [week, setWeek] = useState(list[0]?.week || 1);
  const [playing, setPlaying] = useState(false); const [last, setLast] = useState(null);
  useEffect(() => { setPlaying(false); setLast(null); }, [week]);
  if (!list.length) return <section className="db-section"><div className="db-empty">플레이 가능한 주차 게임이 없습니다.</div></section>;
  const cfg = list.find((g) => Number(g.week) === Number(week)) || list[0];
  const finish = (res) => {
    emit('student_game_submit', { week: Number(cfg.week), gameType: cfg.type, score: res.score, maxScore: res.maxScore, durationSec: res.durationSec || 0, detail: res.detail || {}, recordId: gmUid('game') });
    setLast(res); setPlaying(false);
  };
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="db-subtabs">{list.map((g) => (
        <button key={g.week} className={`db-subtab${Number(week) === Number(g.week) ? ' on' : ''}`} onClick={() => setWeek(Number(g.week))}>
          <span className="dot" />W{g.week} · {GAME_LABEL[g.type] || g.type}
        </button>))}</div>
      <section className="db-section">
        <div className="db-card-head"><span><h2>{cfg.title}</h2><p className="desc">{cfg.desc}</p></span></div>
        {!playing && <button className="db-btn db-btn-green" onClick={() => { setLast(null); setPlaying(true); }}>게임 시작</button>}
      </section>
      {last && <section className="db-section"><div className="db-like-pop">♥</div><h2 style={{ textAlign: 'center' }}>{last.score}/{last.maxScore}점 저장 완료</h2></section>}
      {playing && <GamePlayer key={`${cfg.week}-${cfg.updatedAt}`} config={cfg} onFinish={finish} />}
    </div>
  );
}

/* ================= 학생 셸 ================= */
const LEARN_TABS = () => [
  ...DS_UNITS.map((u) => ({ id: u.id, icon: u.icon, label: u.label })),
  { id: '__game', icon: '⭐', label: '미니게임' },
  { id: '__my', icon: '📝', label: '나의 기록' },
];

function StudentApp({ args, theme, setTheme, font, setFont }) {
  const student = args.student || {};
  const [tab, setTab] = useState(DS_UNITS[0].id);
  const [query, setQuery] = useState('');
  const [seg, setSeg] = useState('all');
  const [settings, setSettings] = useState(false);
  const [solved, setSolved] = useState(() => { const o = {}; (args.ds?.solved || []).forEach((u) => { o[u] = true; }); return o; });
  const [sel, setSel] = useState(Number(args.weeks?.[0]?.주차 || 1));
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localToast, setLocalToast] = useState(null);
  const undo = useRef([]); const redo = useRef([]); const subId = useRef(null);
  const rec = (args.portfolio || []).find((r) => Number(r.주차) === Number(sel));

  useEffect(() => { setContent(rec?.제출내용 || ''); subId.current = null; setSubmitting(false); undo.current = []; redo.current = []; }, [sel, rec?.제출내용]);
  useEffect(() => {
    if (args.result?.submissionId) { subId.current = null; setSubmitting(false); }
    else if (args.flash) setSubmitting(false);
    if (args.result?.solvedUnit) setSolved((s) => ({ ...s, [args.result.solvedUnit]: true }));
    if (args.result?.appPy) { downloadBlob('app.py', args.result.appPy, 'text/x-python;charset=utf-8'); }
  }, [args.result, args.flash]);

  const onDsSolve = (unitId, recordId) => { setSolved((s) => ({ ...s, [unitId]: true })); emit('ds_quiz_submit', { unitId, score: 10, maxScore: 10, recordId }); };
  const submit = () => {
    if (submitting || !content.trim()) return; setSubmitting(true);
    undo.current.push(content); if (undo.current.length > 10) undo.current.shift(); redo.current = [];
    if (!subId.current) subId.current = makeEventId('submission');
    emit('student_submit', { week: Number(sel), content, submissionId: subId.current });
  };
  const doUndo = () => { if (!undo.current.length) return; redo.current.push(content); const v = undo.current.pop(); setContent(v); setLocalToast('Undo: 이전 입력으로 되돌렸습니다.'); };
  const doRedo = () => { if (!redo.current.length) return; undo.current.push(content); setContent(redo.current.pop()); };
  const onSave = () => {
    if ((tab === '__my') && content.trim()) submit();
    else { setLocalToast('저장할 포트폴리오 입력이 없습니다. 나의 기록 탭에서 작성하세요.'); setTab('__my'); }
  };
  const filtered = useMemo(() => {
    let u = DS_UNITS;
    const q = query.trim().toLowerCase();
    if (q) u = u.filter((x) => (x.label + x.title + x.desc).toLowerCase().includes(q));
    if (seg === 'todo') u = u.filter((x) => !solved[x.id]);
    if (seg === 'done') u = u.filter((x) => solved[x.id]);
    return u;
  }, [query, seg, solved]);
  const active = DS_UNITS.find((u) => u.id === tab);
  const doneCount = Object.keys(solved).length;
  const tabs = LEARN_TABS().map((t) => ({ ...t, done: !!solved[t.id] }));

  return (
    <div className="db-app" data-theme={theme} data-font={font}>
      <TopHeader brand="DS Blackboard" year="2026학년도" cat="learn" setCat={() => {}} cats={[{ id: 'learn', icon: '📚', label: '학습 업무' }, { id: 'admin', icon: '🏫', label: '교무 행정' }]} userName={`${student.이름 || '학생'}`} onRefresh={() => emit('teacher_refresh')} onPull={() => emit('teacher_refresh')} onSave={onSave} onOpenSettings={() => setSettings(true)} saving={submitting} />
      <main className="db-shell">
        {args.flash && <div className={`db-toast ${args.flash.type || ''}`}>{args.flash.text}</div>}
        {localToast && <div className="db-toast">{localToast}</div>}
        <SubTabs tabs={tabs} active={tab} onChange={setTab} />
        <div className="db-filterbar">
          <div className="db-seg">
            {[['all', '전체 단원'], ['todo', '미해결'], ['done', '해결됨']].map(([k, l]) => <button key={k} className={seg === k ? 'on' : ''} onClick={() => setSeg(k)}>{l}</button>)}
          </div>
          <div className="db-seg"><button className="on">🧱 단원별 주간</button><button onClick={() => setTab('__my')}>📝 나의 기록</button></div>
          <div className="db-search"><DbIcon name="search" size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="단원 검색 (스택, 트리…)" /></div>
          <button className="db-btn db-btn-sm" onClick={() => window.print()}><DbIcon name="print" size={15} /> 인쇄</button>
        </div>
        <div className="db-legend"><b>표시 범례:</b>
          <span className="k"><span className="sw" style={{ background: '#5B6272' }} /> 개념 학습</span>
          <span className="k"><span className="sw" style={{ background: '#00D1FF' }} /> 인터랙티브 실습</span>
          <span className="k"><span className="sw" style={{ background: '#00E676' }} /> 퀴즈 해결</span>
          <span className="k"><span className="sw" style={{ background: '#FFB020' }} /> 게임 기록</span>
        </div>

        {active && (
          <section className="db-section">
            <div><h2>단원별 학습 현황 <span className="db-badge hot">{doneCount}/{DS_UNITS.length} 해결</span></h2>
              <p className="desc">카드를 눌러 5단계(개념·코드·실습·퀴즈·게임)를 밟으세요. 아래 상세 패널에서 직접 조작합니다.</p></div>
            <div className="db-progress"><i style={{ width: `${Math.round((doneCount / DS_UNITS.length) * 100)}%` }} /></div>
            <UnitCards units={filtered} solved={solved} selectedId={active.id} onSelect={setTab} />
          </section>
        )}

        {active && <UnitDetail unit={active} solved={!!solved[active.id]} onSolve={(id) => onDsSolve(id, makeEventId('quiz'))} />}

        {tab === '__game' && (
          <section className="db-section"><div><h2>주차별 미니게임</h2><p className="desc">교사 공개 게임에 도전하면 최고·시도 기록이 저장됩니다.</p></div>
            <StudentGames games={args.games?.active || []} myRecords={args.games?.records || []} /></section>
        )}

        {tab === '__my' && (
          <section className="db-section">
            <div><h2>나의 기록 — {sel}주차 포트폴리오</h2><p className="desc">제출 후 교사 평가(점수·피드백)가 표시됩니다.</p></div>
            <div className="db-subtabs">{(args.weeks || []).map((w) => (
              <button key={w.주차} className={`db-subtab${Number(sel) === Number(w.주차) ? ' on' : ''}`} onClick={() => setSel(Number(w.주차))}>
                <span className="dot" />{w.주차}주차</button>))}</div>
            <p className="desc">{(args.weeks || []).find((w) => Number(w.주차) === Number(sel))?.활동지질문 || '이번 주 배운 점을 기록하세요.'}</p>
            <textarea className="db-textarea" style={{ minHeight: 200 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="배운 것 · 해본 것 · 어려웠던 점" />
            <div className="db-row">
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="db-btn db-btn-sm" disabled={!undo.current.length && !content} onClick={doUndo}><DbIcon name="undo" size={14} /> Undo</button>
                <button className="db-btn db-btn-sm" disabled={!redo.current.length} onClick={doRedo}><DbIcon name="redo" size={14} /> Redo</button>
              </div>
              <button className="db-btn db-btn-blue" disabled={submitting || !content.trim()} onClick={submit}>{submitting ? '저장 중…' : rec?.제출 ? '수정하여 제출' : '기록 제출'}</button>
            </div>
            {(args.portfolio || []).filter((r) => r.제출).length > 0 && (
              <div><h3 style={{ fontSize: 14 }}>아카이브</h3>
                {(args.portfolio || []).filter((r) => r.제출).map((r) => (
                  <div key={r.주차} className="db-lab" style={{ marginTop: 8 }}><span className="db-badge">W{r.주차} · {r.점수 || '—'}점</span><p className="db-hint">{String(r.제출내용 || '').slice(0, 80)}</p></div>))}
              </div>)}
          </section>
        )}
      </main>
      <SettingsModal open={settings} onClose={() => setSettings(false)} theme={theme} setTheme={setTheme} font={font} setFont={setFont}
        onUndo={doUndo} onRedo={doRedo} canUndo={undo.current.length > 0} canRedo={redo.current.length > 0}
        onPrintPlan={() => window.print()}
        onDownloadHtml={() => downloadBlob('ds-내역서.html', `<html><head><meta charset="utf-8"><title>DS 내역서</title></head><body><h1>${student.이름 || ''} 학습 내역</h1><p>해결 ${doneCount}/${DS_UNITS.length}</p><ul>${Object.keys(solved).map((k) => `<li>${k}</li>`).join('')}</ul></body></html>`)}
        onDownloadAppPy={() => emit('teacher_export_app')} stamp="2026-09-28" />
    </div>
  );
}

/* ================= 교사 셸 ================= */
function TeacherDash({ dash, onStudent }) {
  const max = Math.max(1, ...(dash.classStats || []).map((x) => Number(x.제출건수) || 0));
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="db-section"><div><h2>학생 학습 현황</h2><p className="desc">포트폴리오·게임·DS 퀴즈를 한 곳에서 관리합니다.</p></div>
        <div className="db-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {[['등록 학생', dash.totalStudents], ['제출 학생', dash.submittedStudents], ['평균 점수', dash.averageScore]].map(([k, v]) => (
            <div key={k} className="db-lab" style={{ textAlign: 'center' }}><span className="db-hint">{k}</span><b style={{ fontSize: 24 }}>{v}</b></div>))}
        </div></section>
      <section className="db-section"><h2 style={{ fontSize: 15 }}>반별 활동량</h2>
        {(dash.classStats || []).map((r, i) => (
          <div key={i}><p className="db-hint">{r.학년}학년 {r.반}반 · {r.제출건수}건 · 평균 {r.평균점수}점</p>
            <div className="db-progress"><i style={{ width: `${Math.max(4, (r.제출건수 / max) * 100)}%` }} /></div></div>))}
        {!(dash.classStats || []).length && <div className="db-empty">제출 데이터 없음</div>}</section>
      <section className="db-section"><h2 style={{ fontSize: 15 }}>최근 제출</h2>
        {(dash.portfolio || []).slice(0, 6).map((r, i) => (
          <button key={i} className="db-quiz-opt" onClick={() => onStudent(r.학번)}><span className="letter">{String(r.이름 || '?').slice(0, 1)}</span><span>{r.이름} · {r.주차}주차 — {String(r.제출내용 || '').slice(0, 40)}</span></button>))}
      </section>
    </div>
  );
}

function TeacherApp({ args, theme, setTheme, font, setFont }) {
  const dash = args.teacher || { students: [], portfolio: [], classStats: [] };
  const [tab, setTab] = useState('dash');
  const [settings, setSettings] = useState(false);
  const [sid, setSid] = useState(''); const [week, setWeek] = useState(1);
  const [score, setScore] = useState(0); const [fb, setFb] = useState('');
  const found = (dash.portfolio || []).find((r) => String(r.학번) === String(sid) && Number(r.주차) === Number(week));
  useEffect(() => { setScore(Number(found?.점수) || 0); setFb(found?.피드백 || ''); }, [found?.제출ID, sid, week]);
  useEffect(() => { if (args.result?.appPy) downloadBlob('app.py', args.result.appPy, 'text/x-python;charset=utf-8'); }, [args.result]);

  const tabs = [
    { id: 'dash', icon: '📊', label: '통계' }, { id: 'ds', icon: '🧱', label: '단원' },
    { id: 'game', icon: '⭐', label: '테스트' }, { id: 'ws', icon: '📝', label: '학습지' },
    { id: 'eval', icon: '👥', label: '학생' }, { id: 'csv', icon: '📥', label: '내보내기' },
  ];
  const headers = { 학번: '학번', 이름: '이름', 학년: '학년', 반: '반' };
  const csvHeaders = ['학번', '이름', '학년', '반', ...Array.from({ length: 17 }, (_, i) => `${i + 1}주차`), '총점'];
  const csvRows = (() => {
    const map = new Map();
    (dash.students || []).forEach((s) => { if (s.학번) map.set(String(s.학번), { ...headers, 학번: String(s.학번), 이름: s.이름 || '', 학년: s.학년 || '', 반: s.반 || '' }); });
    (dash.portfolio || []).forEach((r) => {
      const id = String(r.학번); if (!map.has(id)) map.set(id, { 학번: id, 이름: r.이름 || '', 학년: r.학년 || '', 반: r.반 || '' });
      const it = map.get(id); it[`${r.주차}주차`] = r.점수 || ''; it.총점 = (Number(it.총점) || 0) + (Number(r.점수) || 0);
    });
    return [csvHeaders, ...[...map.values()].map((row) => csvHeaders.map((h) => row[h] ?? ''))]
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
  })();

  return (
    <div className="db-app" data-theme={theme} data-font={font}>
      <TopHeader brand="DS Blackboard" year="2026학년도" cat="admin" setCat={() => {}} cats={[{ id: 'learn', icon: '📚', label: '학습 업무' }, { id: 'admin', icon: '🏫', label: '교무 행정' }]} userName="관리자 (마스터)" onRefresh={() => emit('teacher_refresh')} onPull={() => emit('teacher_worksheet_load', { week: 1 })} onSave={() => emit('teacher_refresh')} onOpenSettings={() => setSettings(true)} />
      <main className="db-shell">
        {args.flash && <div className={`db-toast ${args.flash.type || ''}`}>{args.flash.text}</div>}
        <SubTabs tabs={tabs} active={tab} onChange={setTab} />
        {tab === 'dash' && <TeacherDash dash={dash} onStudent={(id) => { setSid(String(id)); setTab('eval'); }} />}
        {tab === 'ds' && <section className="db-section"><div><h2>단원 미리보기</h2><p className="desc">학생 화면 그대로 검수합니다.</p></div>
          <UnitCards units={DS_UNITS} solved={{}} selectedId={DS_UNITS[0].id} onSelect={() => {}} />
          <UnitDetail unit={DS_UNITS[0]} solved={false} onSolve={() => {}} compact /></section>}
        {tab === 'game' && (
          <section className="db-section"><div><h2>주차별 게임 관리</h2><p className="desc">유형·제목·문제를 저장하면 학생에게 공개됩니다.</p></div>
            <GameAdmin weeks={args.weeks || []} configs={args.games?.configs || []} records={args.games?.records || []} /></section>)}
        {tab === 'ws' && (
          <section className="db-section"><div><h2>주차별 학습지 관리</h2><p className="desc">제목·안내·문제를 Sheets에 저장합니다.</p></div>
            <WsAdmin weeks={args.weeks || []} initial={args.worksheet} /></section>)}
        {tab === 'eval' && (
          <section className="db-section"><div><h2>학생 기록과 피드백</h2></div>
            <div className="db-row">
              <select className="db-select" value={sid} onChange={(e) => setSid(e.target.value)}>
                <option value="">학생 선택</option>{(dash.students || []).map((s) => <option key={s.학번} value={s.학번}>{s.학번} · {s.이름}</option>)}
              </select>
              <select className="db-select" value={week} onChange={(e) => setWeek(Number(e.target.value))}>{Array.from({ length: 17 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}주차</option>)}</select>
            </div>
            <div className="db-lab">{found ? String(found.제출내용) : '제출 기록이 없습니다.'}</div>
            <div className="db-row">
              <input className="db-input" type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="점수" />
              <button className="db-btn db-btn-blue" onClick={() => emit('teacher_grade_save', { studentId: sid, week: Number(week), score: Number(score), feedback: fb })}>평가 저장</button>
            </div>
            <textarea className="db-textarea" value={fb} onChange={(e) => setFb(e.target.value)} placeholder="한 줄 피드백" /></section>)}
        {tab === 'csv' && (
          <section className="db-section"><div><h2>성적 CSV 내보내기</h2><p className="desc">1—17주차 점수·총점을 Excel용 CSV로 저장합니다.</p></div>
            <a href={`data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(csvRows)}`} download="ds_성적표.csv" className="db-btn db-btn-blue" style={{ textAlign: 'center' }}>CSV 다운로드</a></section>)}
      </main>
      <SettingsModal open={settings} onClose={() => setSettings(false)} theme={theme} setTheme={setTheme} font={font} setFont={setFont}
        onUndo={() => {}} onRedo={() => {}} canUndo={false} canRedo={false}
        onPrintPlan={() => window.print()}
        onDownloadHtml={() => downloadBlob('ds-내역서.html', `<html><head><meta charset="utf-8"></head><body><h1>DS 전체 내역</h1><pre>${csvRows.slice(0, 2000)}</pre></body></html>`)}
        onDownloadAppPy={() => emit('teacher_export_app')} stamp="2026-09-28" />
    </div>
  );
}

/* ---- 교사 게임/학습지 간이 어드민 (이벤트 규격은 기존과 동일) ---- */
function GameAdmin({ weeks, configs, records }) {
  const all = configs?.length ? configs : Array.from({ length: 17 }, (_, i) => ({ week: i + 1, enabled: false, type: 'quiz', title: `${i + 1}주차 미니게임`, desc: '', content: { questions: [] } }));
  const [week, setWeek] = useState(1); const [gtype, setGtype] = useState('quiz');
  const [title, setTitle] = useState(''); const [desc, setDesc] = useState('');
  const [qs, setQs] = useState([]); const [url, setUrl] = useState('');
  useEffect(() => {
    const c = all.find((x) => Number(x.week) === Number(week)) || {};
    setGtype(c.type || 'quiz'); setTitle(c.title || `${week}주차 미니게임`); setDesc(c.desc || '');
    setQs(((c.content || {}).questions || []).map((q) => ({ q: q.q || '', options: [...(q.options || ['', '', '', ''])], answer: q.answer || 0 })));
    setUrl((c.content || {}).url || '');
  }, [week]);
  const current = { week: Number(week), enabled: true, type: gtype, title, desc, content: gtype === 'quiz' ? { questions: qs } : { url: url.trim() } };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="db-subtabs">{all.map((c) => (
        <button key={c.week} className={`db-subtab${Number(week) === Number(c.week) ? ' on' : ''}`} onClick={() => setWeek(Number(c.week))}>
          <span className="dot" />{c.week}주차</button>))}</div>
      <div className="db-row">
        <select className="db-select" value={gtype} onChange={(e) => setGtype(e.target.value)}>
          <option value="quiz">4지선다 퀴즈</option><option value="memory">카드 맞추기</option><option value="embed">외부 게임</option>
        </select>
        <input className="db-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="게임 제목" />
      </div>
      <textarea className="db-textarea" style={{ minHeight: 70 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="학생 안내문" />
      {gtype === 'quiz' && <>{qs.map((q, i) => (
        <div key={i} className="db-lab"><input className="db-input" value={q.q} onChange={(e) => { const c = [...qs]; c[i] = { ...c[i], q: e.target.value }; setQs(c); }} placeholder={`문제 ${i + 1}`} />
          {q.options.map((o, j) => <div key={j} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 8, alignItems: 'center' }}>
            <input type="radio" checked={Number(q.answer) === j} onChange={() => { const c = [...qs]; c[i] = { ...c[i], answer: j }; setQs(c); }} />
            <input className="db-input" value={o} onChange={(e) => { const c = [...qs]; c[i] = { ...c[i], options: c[i].options.map((x, k) => (k === j ? e.target.value : x)) }; setQs(c); }} placeholder={`보기 ${'ABCD'[j]}`} />
          </div>})}</div>)}
        <button className="db-btn" onClick={() => setQs([...qs, { q: '', options: ['', '', '', ''], answer: 0 }])}>+ 문제 추가</button></>}
      {gtype === 'embed' && <input className="db-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />}
      <div className="db-row">
        <button className="db-btn" onClick={() => emit('teacher_game_toggle', { week: Number(week), enabled: false })}>비공개</button>
        <button className="db-btn db-btn-blue" onClick={() => emit('teacher_game_save', { config: current })}>게임 저장</button>
      </div>
      <p className="db-hint">{week}주차 기록 {(records || []).filter((r) => Number(r.주차) === Number(week)).length}건</p>
    </div>
  );
}
function WsAdmin({ weeks, initial }) {
  const [week, setWeek] = useState(1); const [title, setTitle] = useState(''); const [guide, setGuide] = useState('');
  useEffect(() => { if (initial) { setWeek(initial.week || 1); setTitle(initial.title || ''); setGuide(initial.guide || ''); } }, [initial?.week, initial?.updatedAt]);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="db-row">
        <select className="db-select" value={week} onChange={(e) => { const w = Number(e.target.value); setWeek(w); emit('teacher_worksheet_load', { week: w }); }}>
          {Array.from({ length: 17 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}주차</option>)}
        </select>
        <button className="db-btn db-btn-blue" onClick={() => emit('teacher_worksheet_save', { worksheet: { week, title, guide, questions: initial?.questions || [], published: true } })}>Sheets에 저장</button>
      </div>
      <input className="db-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="학습지 제목" />
      <textarea className="db-textarea" value={guide} onChange={(e) => setGuide(e.target.value)} placeholder="안내문" />
      <p className="db-hint">문제 편집(4유형)은 기존 Worksheet 에디터와 동일 규격으로 저장됩니다.</p>
    </div>
  );
}

/* ================= 루트 ================= */
export default function App(props) {
  const args = { ...DEFAULT_ARGS, ...(props.args || {}) };
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('db-theme') || 'pure-black'; } catch (_) { return 'pure-black'; } });
  const [font, setFont] = useState('pretendard');
  useEffect(() => { try { localStorage.setItem('db-theme', theme); } catch (_) {} }, [theme]);
  useEffect(() => { Streamlit.setFrameHeight(2200); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const h = Math.max(900, Math.ceil(document.getElementById('root')?.scrollHeight || 2200));
      Streamlit.setFrameHeight(h);
    }, 350);
    return () => clearTimeout(t);
  }, [args.role, theme]);
  const shared = { theme, setTheme, font, setFont };
  if (args.role === 'student') return <StudentApp args={args} {...shared} />;
  if (args.role === 'teacher') return <TeacherApp args={args} {...shared} />;
  return <Login flash={args.flash} />;
}
