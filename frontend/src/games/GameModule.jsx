/* 주차별 미니게임 모듈 (vite dev용, App.jsx 내장본과 동일 코드, 인스타 테마) */
import React from 'react';
const { useState, useEffect, useMemo, useRef } = React;
/* ===== 주차별 미니게임 (Games 번들) =====
 * frontend/src/games/GameModule.jsx 와 동일한 코드의 App.jsx 내장본.
 * 인스타그램 디자인 테마(.ig-*) 적용. dist/index.html(Babel standalone)에서도
 * 동작하도록 import 없이 이 파일 스코프의 emit / hooks(useState..)를 직접 사용한다.
 * 원본 수정은 games/GameModule.jsx 에서 한 뒤 이 블록에 동기화할 것.
 */
const GAME_TYPE_LABEL = { quiz: '4지선다 퀴즈', memory: '단어 카드 맞추기', embed: '외부 게임 임베드' };
function gmUid(p = 'g') {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function gmShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/* 라인 아웃라인 아이콘 (Heart/Play/Check/Grid) */
function IgIcon({ name, size = 20 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'heart') return <svg {...c}><path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" /></svg>;
  if (name === 'heartFill') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" /></svg>;
  if (name === 'play') return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="m10 8.5 5.5 3.5L10 15.5v-7Z" /></svg>;
  if (name === 'check') return <svg {...c}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === 'grid') return <svg {...c}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  return <svg {...c}><circle cx="12" cy="12" r="9" /></svg>;
}
/* ---------- 플레이어: 4지선다 퀴즈 ---------- */
function QuizPlayer({ config, onFinish }) {
  const qs = (config.content && config.content.questions) || [];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [liked, setLiked] = useState(false);
  const [t0] = useState(Date.now());
  const [done, setDone] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  if (!qs.length) return <div className="ig-empty">등록된 문제가 없습니다. 관리자에게 문의하세요.</div>;
  if (done) return <div className="ig-card"><div className="ig-like-pop"><IgIcon name="heartFill" size={38} /></div><h3 style={{ textAlign: 'center' }}>{score} / {qs.length}점</h3><p style={{ textAlign: 'center' }} className="ig-hint">결과가 저장됐습니다. 다시 플레이하면 최고점수에 도전!</p></div>;
  const q = qs[idx];
  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    const ns = score + (i === q.answer ? 1 : 0);
    if (i === q.answer) setScore(ns);
    timers.current.push(setTimeout(() => {
      if (idx + 1 >= qs.length) {
        setDone(true);
        onFinish({ score: ns, maxScore: qs.length, durationSec: Math.round((Date.now() - t0) / 1000), detail: { correct: ns, total: qs.length } });
      } else { setIdx(idx + 1); setPicked(null); }
    }, 500));
  };
  return <div className="ig-card">
    <div className="ig-post-head"><div className="ig-avatar"><div>Q{idx + 1}</div></div><div><b>{config.title}</b><small>{idx + 1} / {qs.length} · {score}점</small></div></div>
    <div className="ig-progress"><i style={{ width: `${Math.round((idx / qs.length) * 100)}%` }} /></div>
    <h3>{q.q}</h3>
    {(q.options || []).map((o, j) => {
      let cls = 'ig-quiz-opt';
      if (picked !== null) {
        if (j === q.answer) cls += ' correct';
        else if (j === picked) cls += ' wrong';
      }
      return <button key={j} className={cls} onClick={() => choose(j)}><span className="letter">{'ABCD'[j] || j + 1}</span>{o}</button>;
    })}
    <div className="ig-actions"><button className={`ig-icon-btn ${liked ? 'liked' : ''}`} onClick={() => setLiked(!liked)} aria-label="좋아요"><IgIcon name={liked ? 'heartFill' : 'heart'} /></button></div>
  </div>;
}
/* ---------- 플레이어: 단어 카드 맞추기 ---------- */
function MemoryPlayer({ config, onFinish }) {
  const pairs = (config.content && config.content.pairs) || [];
  const deck = useMemo(() => gmShuffle(pairs.flatMap((p, i) => [{ key: i, text: p.a }, { key: i, text: p.b }])), [config.updatedAt, pairs.length]);
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [t0] = useState(Date.now());
  const [done, setDone] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  if (!pairs.length) return <div className="ig-empty">등록된 카드가 없습니다. 관리자에게 문의하세요.</div>;
  if (done) return <div className="ig-card"><div className="ig-like-pop"><IgIcon name="heartFill" size={38} /></div><h3 style={{ textAlign: 'center' }}>{pairs.length} / {pairs.length}쌍 완성!</h3><p style={{ textAlign: 'center' }} className="ig-hint">{moves}번 시도 · 결과가 저장됐습니다.</p></div>;
  const flip = (i) => {
    if (lock || open.includes(i) || matched.includes(deck[i].key)) return;
    const no = [...open, i];
    setOpen(no);
    if (no.length === 2) {
      setMoves(moves + 1);
      if (deck[no[0]].key === deck[no[1]].key) {
        const nm = [...matched, deck[no[0]].key];
        setMatched(nm);
        setOpen([]);
        if (nm.length === pairs.length) {
          setDone(true);
          onFinish({ score: pairs.length, maxScore: pairs.length, durationSec: Math.round((Date.now() - t0) / 1000), detail: { moves: moves + 1, pairs: pairs.length } });
        }
      } else {
        setLock(true);
        timers.current.push(setTimeout(() => { setOpen([]); setLock(false); }, 700));
      }
    }
  };
  return <div className="ig-card">
    <div className="ig-post-head"><div className="ig-avatar"><div><IgIcon name="grid" size={18} /></div></div><div><b>{config.title}</b><small>{matched.length}/{pairs.length}쌍 · {moves} 시도</small></div></div>
    <div className="ig-progress"><i style={{ width: `${Math.round((matched.length / pairs.length) * 100)}%` }} /></div>
    <div className="ig-mem-grid">
      {deck.map((c, i) => {
        const face = open.includes(i) || matched.includes(c.key);
        return <button key={i} className={`ig-mem-card ${face ? 'face' : ''} ${matched.includes(c.key) ? 'matched' : ''}`} onClick={() => flip(i)}>{face ? c.text : '?'}</button>;
      })}
    </div>
  </div>;
}
/* ---------- 플레이어: 외부 게임 임베드 ---------- */
function EmbedPlayer({ config, onFinish }) {
  const content = config.content || {};
  const maxScore = Number(content.passScore) || 100;
  useEffect(() => {
    const handler = (e) => {
      const d = e.data;
      if (d && d.source === 'external-game' && typeof d.score !== 'undefined') {
        onFinish({ score: Number(d.score) || 0, maxScore: Number(d.maxScore) || maxScore, durationSec: 0, detail: { via: 'postMessage' } });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
  return <div className="ig-card">
    <div className="ig-post-head"><div className="ig-avatar"><div><IgIcon name="play" size={18} /></div></div><div><b>{config.title}</b><small>외부 게임</small></div></div>
    {content.url
      ? <iframe title={config.title} src={content.url} className="ig-frame" sandbox="allow-scripts allow-same-origin allow-forms" />
      : content.html
        ? <iframe title={config.title} srcDoc={content.html} className="ig-frame" sandbox="allow-scripts allow-same-origin" />
        : <div className="ig-empty">등록된 게임 URL/HTML이 없습니다.</div>}
    <p className="ig-hint">외부 게임은 postMessage &#123;source:'external-game', score, maxScore&#125; 로 점수를 자동 전송할 수 있습니다.</p>
    <div><button className="ig-btn ig-btn-grad" onClick={() => onFinish({ score: maxScore, maxScore, durationSec: 0, detail: { via: 'manual' } })}>게임 완료 보고하기</button></div>
  </div>;
}
function GamePlayer({ config, onFinish }) {
  if (config.type === 'memory') return <MemoryPlayer config={config} onFinish={onFinish} />;
  if (config.type === 'embed') return <EmbedPlayer config={config} onFinish={onFinish} />;
  return <QuizPlayer config={config} onFinish={onFinish} />;
}
/* ---------- 학생용: 스토리 + 피드 ---------- */
function StudentGames({ games, myRecords }) {
  const list = games || [];
  const [week, setWeek] = useState(list[0] ? list[0].week : 1);
  const [playing, setPlaying] = useState(false);
  const [last, setLast] = useState(null);
  const [liked, setLiked] = useState({});
  useEffect(() => { setPlaying(false); setLast(null); }, [week]);
  if (!list.length) return <div className="ig-card"><div className="ig-empty">현재 플레이 가능한 주차 게임이 없습니다.</div></div>;
  const cfg = list.find((g) => Number(g.week) === Number(week)) || list[0];
  const rec = (myRecords || []).find((r) => Number(r.주차) === Number(cfg.week));
  const finish = (res) => {
    emit('student_game_submit', {
      week: Number(cfg.week), gameType: cfg.type,
      score: res.score, maxScore: res.maxScore, durationSec: res.durationSec || 0,
      detail: res.detail || {}, recordId: gmUid('game'),
    });
    setLast(res);
    setPlaying(false);
  };
  return <div className="ig-page">
    <div className="ig-stories">
      {list.map((g) => {
        const mine = (myRecords || []).find((r) => Number(r.주차) === Number(g.week));
        const on = Number(week) === Number(g.week);
        return <button key={g.week} className={`ig-story live ${on ? 'on' : ''}`} onClick={() => setWeek(Number(g.week))}>
          <span className="ring"><div>W{g.week}</div></span>
          <small>{g.week}주차</small>
          {mine && mine.최고점수 ? <i>★ {mine.최고점수}</i> : <i style={{ visibility: 'hidden' }}>★</i>}
        </button>;
      })}
    </div>
    <div className="ig-card hover">
      <div className="ig-post-head"><div className="ig-avatar"><div>W{cfg.week}</div></div><div><b>{cfg.title}</b><small>{GAME_TYPE_LABEL[cfg.type]}</small></div></div>
      <p>{cfg.desc}</p>
      <p className="ig-hint">{rec && rec.최고점수 ? `내 최고점수: ${rec.최고점수}점 · 시도 ${rec.시도횟수}회` : '아직 기록이 없어요. 플레이해보세요!'}</p>
      {!playing && <div><button className="ig-btn ig-btn-grad" onClick={() => { setLast(null); setPlaying(true); }}>게임 시작</button></div>}
      <div className="ig-actions">
        <button className={`ig-icon-btn ${liked[cfg.week] ? 'liked' : ''}`} onClick={() => setLiked({ ...liked, [cfg.week]: !liked[cfg.week] })} aria-label="좋아요"><IgIcon name={liked[cfg.week] ? 'heartFill' : 'heart'} /></button>
      </div>
    </div>
    {last && <div className="ig-card"><div className="ig-like-pop"><IgIcon name="heartFill" size={38} /></div><h3 style={{ textAlign: 'center' }}>{last.score} / {last.maxScore}점 저장 완료</h3></div>}
    {playing && <GamePlayer key={`${cfg.week}-${cfg.updatedAt}`} config={cfg} onFinish={finish} />}
  </div>;
}
/* ---------- 관리자용: 게임 설정 + 기록 (비즈니스 대시보드) ---------- */
function TeacherGames({ weeks, configs, records }) {
  const all = configs && configs.length ? configs : Array.from({ length: 17 }, (_, i) => ({ week: i + 1, enabled: false, type: 'quiz', title: `${i + 1}주차 미니게임`, desc: '', content: { questions: [] } }));
  const [week, setWeek] = useState(1);
  const [enabled, setEnabled] = useState(false);
  const [gtype, setGtype] = useState('quiz');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [quizQs, setQuizQs] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedHtml, setEmbedHtml] = useState('');
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    const c = all.find((x) => Number(x.week) === Number(week)) || {};
    setEnabled(!!c.enabled);
    setGtype(c.type || 'quiz');
    setTitle(c.title || `${week}주차 미니게임`);
    setDesc(c.desc || '');
    setQuizQs(((c.content || {}).questions || []).map((q) => ({ q: q.q || '', options: [...(q.options || ['', '', '', ''])], answer: q.answer || 0 })));
    setPairs(((c.content || {}).pairs || []).map((p) => ({ a: p.a || '', b: p.b || '' })));
    setEmbedUrl((c.content || {}).url || '');
    setEmbedHtml((c.content || {}).html || '');
    setPreview(false);
  }, [week, (all.find((x) => Number(x.week) === Number(week)) || {}).updatedAt]);
  const content = gtype === 'quiz'
    ? { questions: quizQs.map((q) => ({ q: q.q, options: q.options, answer: Number(q.answer) || 0 })) }
    : gtype === 'memory'
      ? { pairs }
      : { url: embedUrl.trim(), html: embedHtml };
  const current = { week: Number(week), enabled, type: gtype, title, desc, content };
  const weekRecs = (records || []).filter((r) => Number(r.주차) === Number(week)).slice(0, 200);
  const weekGoal = ((weeks || []).find((w) => Number(w.주차) === Number(week)) || {}).학습목표 || '';
  return <div className="ig-page">
    <header className="ig-head">
      <div><span className="eyebrow">WEEKLY GAME · ADMIN</span><h1>주차별 게임 관리</h1><p>스토리를 눌러 주차를 고르고, 스위치로 공개하세요.{weekGoal ? ` ${week}주차: ${weekGoal}` : ''}</p></div>
      <div className="ig-head-actions">
        <label className="ig-switch"><input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); emit('teacher_game_toggle', { week: Number(week), enabled: e.target.checked }); }} /><span className="ig-track" />{enabled ? '활성화' : '비활성화'}</label>
        <button className={preview ? 'ig-btn' : 'ig-btn ig-btn-grad'} onClick={() => setPreview(!preview)}>{preview ? '편집으로' : '미리보기'}</button>
        <button className="ig-btn ig-btn-blue" onClick={() => emit('teacher_game_save', { config: current })}>게임 저장</button>
      </div>
    </header>
    <div className="ig-stories">
      {all.map((c) => (
        <button key={c.week} className={`ig-story ${c.enabled ? 'live' : ''} ${Number(week) === Number(c.week) ? 'on' : ''}`} onClick={() => setWeek(Number(c.week))}>
          <span className="ring"><div>W{c.week}</div></span>
          <small>{c.week}주차</small>
          {c.enabled ? <i>ON</i> : <i style={{ visibility: 'hidden' }}>ON</i>}
        </button>
      ))}
    </div>
    {!preview ? <>
      <section className="ig-card">
        <div className="ig-row">
          <label>게임 유형
            <select className="ig-select" value={gtype} onChange={(e) => setGtype(e.target.value)}>
              {Object.keys(GAME_TYPE_LABEL).map((t) => <option key={t} value={t}>{GAME_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label>게임 제목<input className="ig-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`예: ${week}주차 퀴즈 챌린지`} /></label>
        </div>
        <label>설명<textarea className="ig-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="학생에게 보여줄 게임 안내" /></label>
      </section>
      {gtype === 'quiz' && <section className="ig-card">
        <b>퀴즈 문제 ({quizQs.length})</b>
        {quizQs.map((q, i) => <div key={i} className="ig-qedit">
          <input className="ig-input" value={q.q} onChange={(e) => { const c = [...quizQs]; c[i] = { ...c[i], q: e.target.value }; setQuizQs(c); }} placeholder={`문제 ${i + 1}`} />
          {q.options.map((o, j) => <div key={j} className="ig-opt-row">
            <input type="radio" checked={Number(q.answer) === j} onChange={() => { const c = [...quizQs]; c[i] = { ...c[i], answer: j }; setQuizQs(c); }} title="정답" />
            <input className="ig-input" value={o} onChange={(e) => { const c = [...quizQs]; c[i] = { ...c[i], options: c[i].options.map((x, k) => (k === j ? e.target.value : x)) }; setQuizQs(c); }} placeholder={`보기 ${'ABCD'[j]}`} />
            <span className="ig-badge">{'ABCD'[j]}</span>
          </div>)}
          <div><button className="ig-btn" onClick={() => setQuizQs(quizQs.filter((_, k) => k !== i))}>문제 삭제</button></div>
        </div>)}
        <div><button className="ig-btn" onClick={() => setQuizQs([...quizQs, { q: '', options: ['', '', '', ''], answer: 0 }])}>+ 문제 추가</button></div>
      </section>}
      {gtype === 'memory' && <section className="ig-card">
        <b>카드 쌍 ({pairs.length})</b>
        {pairs.map((p, i) => <div key={i} className="ig-row" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          <input className="ig-input" value={p.a} onChange={(e) => { const c = [...pairs]; c[i] = { ...c[i], a: e.target.value }; setPairs(c); }} placeholder="앞면 (예: photosynthesis)" />
          <input className="ig-input" value={p.b} onChange={(e) => { const c = [...pairs]; c[i] = { ...c[i], b: e.target.value }; setPairs(c); }} placeholder="뒷면 (예: 광합성)" />
          <button className="ig-btn" onClick={() => setPairs(pairs.filter((_, k) => k !== i))}>×</button>
        </div>)}
        <div><button className="ig-btn" onClick={() => setPairs([...pairs, { a: '', b: '' }])}>+ 카드 쌍 추가</button></div>
      </section>}
      {gtype === 'embed' && <section className="ig-card">
        <label>외부 게임 URL (iframe)<input className="ig-input" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://..." /></label>
        <label>또는 직접 HTML 코드<textarea className="ig-textarea" style={{ minHeight: '140px', fontFamily: 'monospace' }} value={embedHtml} onChange={(e) => setEmbedHtml(e.target.value)} placeholder="<html>… 점수 전송: postMessage({source:'external-game', score, maxScore})" /></label>
      </section>}
      <section className="ig-card">
        <b>{week}주차 기록 ({weekRecs.length}명)</b>
        {weekRecs.length ? <div style={{ overflowX: 'auto' }}><table className="ig-table">
          <thead><tr><th>학번</th><th>이름</th><th>점수</th><th>최고</th><th>시도</th><th>소요(초)</th><th>완료일시</th></tr></thead>
          <tbody>{weekRecs.map((r, i) => <tr key={i}><td>{r.학번}</td><td>{r.이름}</td><td><b>{r.점수}</b></td><td>{r.최고점수}</td><td>{r.시도횟수}</td><td>{r.소요초}</td><td>{r.완료일시}</td></tr>)}</tbody>
        </table></div> : <div className="ig-empty">아직 플레이 기록이 없습니다.</div>}
      </section>
    </> : <GamePlayer config={current} onFinish={() => {}} />}
  </div>;
}
/* ===== Games 번들 끝 ===== */

if (typeof window !== 'undefined') { window.TeacherGames = TeacherGames; window.StudentGames = StudentGames; window.GamePlayer = GamePlayer; }
