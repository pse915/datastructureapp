/* 주차별 미니게임 모듈 (vite dev용, App.jsx 내장본과 동일 코드) */
import React from 'react';
const { useState, useEffect, useMemo } = React;
/* ===== 주차별 미니게임 (Games 번들) =====
 * frontend/src/games/GameModule.jsx 와 동일한 코드의 App.jsx 내장본.
 * dist/index.html(Babel standalone, 번들러 없음)에서도 동작하도록 import 없이
 * 이 파일 스코프의 emit / hooks(useState..)를 직접 사용한다.
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
/* ---------- 플레이어: 4지선다 퀴즈 ---------- */
function QuizPlayer({ config, onFinish }) {
  const qs = (config.content && config.content.questions) || [];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [t0] = useState(Date.now());
  const [done, setDone] = useState(false);
  if (!qs.length) return <div className="empty-mini">등록된 문제가 없습니다. 관리자에게 문의하세요.</div>;
  if (done) return <div className="ws-card"><span className="ws-badge">게임 완료</span><h3>{score} / {qs.length}점</h3><p>결과가 저장됐습니다. 다시 플레이하면 최고점수에 도전할 수 있어요.</p></div>;
  const q = qs[idx];
  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    const ns = score + (i === q.answer ? 1 : 0);
    if (i === q.answer) setScore(ns);
    setTimeout(() => {
      if (idx + 1 >= qs.length) {
        setDone(true);
        onFinish({ score: ns, maxScore: qs.length, durationSec: Math.round((Date.now() - t0) / 1000), detail: { correct: ns, total: qs.length } });
      } else { setIdx(idx + 1); setPicked(null); }
    }, 500);
  };
  return <div className="ws-card">
    <span className="ws-badge">Q{idx + 1} / {qs.length} · {score}점</span>
    <h3>{q.q}</h3>
    {(q.options || []).map((o, j) => {
      let cls = 'gm-quiz-opt';
      if (picked !== null) {
        if (j === q.answer) cls += ' correct';
        else if (j === picked) cls += ' wrong';
      }
      return <button key={j} className={cls} onClick={() => choose(j)}>{'ABCD'[j] || j + 1}. {o}</button>;
    })}
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
  if (!pairs.length) return <div className="empty-mini">등록된 카드가 없습니다. 관리자에게 문의하세요.</div>;
  if (done) return <div className="ws-card"><span className="ws-badge">게임 완료</span><h3>{pairs.length} / {pairs.length}쌍 완성!</h3><p>{moves}번 시도 · 결과가 저장됐습니다.</p></div>;
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
        setTimeout(() => { setOpen([]); setLock(false); }, 700);
      }
    }
  };
  return <div className="ws-card">
    <span className="ws-badge">CARD MATCH · {matched.length}/{pairs.length}쌍 · {moves} 시도</span>
    <div className="gm-mem-grid">
      {deck.map((c, i) => {
        const face = open.includes(i) || matched.includes(c.key);
        return <button key={i} className={`gm-card ${face ? 'face' : ''} ${matched.includes(c.key) ? 'matched' : ''}`} onClick={() => flip(i)}>{face ? c.text : '?'}</button>;
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
  return <div className="ws-card">
    <span className="ws-badge">외부 게임 · {config.title}</span>
    {content.url
      ? <iframe title={config.title} src={content.url} className="gm-frame" sandbox="allow-scripts allow-same-origin allow-forms" />
      : content.html
        ? <iframe title={config.title} srcDoc={content.html} className="gm-frame" sandbox="allow-scripts allow-same-origin" />
        : <div className="empty-mini">등록된 게임 URL/HTML이 없습니다.</div>}
    <p className="ws-hint">외부 게임은 postMessage &#123;source:'external-game', score, maxScore&#125; 로 점수를 자동 전송할 수 있습니다.</p>
    <button className="ws-btn primary" onClick={() => onFinish({ score: maxScore, maxScore, durationSec: 0, detail: { via: 'manual' } })}>게임 완료 보고하기</button>
  </div>;
}
function GamePlayer({ config, onFinish }) {
  if (config.type === 'memory') return <MemoryPlayer config={config} onFinish={onFinish} />;
  if (config.type === 'embed') return <EmbedPlayer config={config} onFinish={onFinish} />;
  return <QuizPlayer config={config} onFinish={onFinish} />;
}
/* ---------- 학생용: 주차별 게임 탭 ---------- */
function StudentGames({ games, myRecords }) {
  const list = games || [];
  const [week, setWeek] = useState(list[0] ? list[0].week : 1);
  const [playing, setPlaying] = useState(false);
  const [last, setLast] = useState(null);
  useEffect(() => { setPlaying(false); setLast(null); }, [week]);
  if (!list.length) return <div className="empty-state large">현재 플레이 가능한 주차 게임이 없습니다.</div>;
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
  return <div className="gm-student">
    <div className="gm-tabs">
      {list.map((g) => {
        const mine = (myRecords || []).find((r) => Number(r.주차) === Number(g.week));
        return <button key={g.week} className={`gm-tab ${Number(week) === Number(g.week) ? 'on' : ''}`} onClick={() => setWeek(Number(g.week))}>
          <b>W{g.week}</b><small>{GAME_TYPE_LABEL[g.type]}</small>{mine && mine.최고점수 ? <i>★{mine.최고점수}</i> : null}
        </button>;
      })}
    </div>
    <div className="ws-card">
      <span className="ws-badge">{GAME_TYPE_LABEL[cfg.type]}</span>
      <h2>{cfg.title}</h2>
      <p>{cfg.desc}</p>
      <p className="ws-hint">{rec && rec.최고점수 ? `내 최고점수: ${rec.최고점수}점 · 시도 ${rec.시도횟수}회` : '아직 기록이 없어요. 플레이해보세요!'}</p>
      {!playing && <button className="ws-btn primary" onClick={() => { setLast(null); setPlaying(true); }}>게임 시작</button>}
    </div>
    {last && <div className="ws-card"><span className="ws-badge">결과 저장됨</span><h3>{last.score} / {last.maxScore}점</h3></div>}
    {playing && <GamePlayer key={`${cfg.week}-${cfg.updatedAt}`} config={cfg} onFinish={finish} />}
  </div>;
}
/* ---------- 관리자용: 게임 설정 + 기록 조회 ---------- */
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
    setQuizQs(((c.content || {}).questions || []).map((q) => ({ q: q.q || '', options: [...(q.options || ['', '', '', '')], answer: q.answer || 0 })));
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
  const weekRecs = (records || []).filter((r) => Number(r.주차) === Number(week));
  const goal = (weeks || []).find((w) => Number(w.주차) === Number(week));
  return <div className="ws-wrap">
    <header className="ws-top">
      <div><span className="eyebrow">WEEKLY GAME · ADMIN</span><h1>주차별 게임 관리</h1></div>
      <div className="ws-top-actions">
        <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
          {Array.from({ length: 17 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}주차 {goal && Number(goal.주차) === i + 1 ? '' : ''}{((weeks || []).find((w) => Number(w.주차) === i + 1) || {}).학습목표 || ''}</option>)}
        </select>
        <label className="ws-check gm-switch"><input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); emit('teacher_game_toggle', { week: Number(week), enabled: e.target.checked }); }} />{enabled ? '활성화' : '비활성화'}</label>
        <button className={preview ? 'ws-btn' : 'ws-btn primary'} onClick={() => setPreview(!preview)}>{preview ? '편집으로' : '미리보기'}</button>
        <button className="ws-btn primary" onClick={() => emit('teacher_game_save', { config: current })}>게임 저장</button>
      </div>
    </header>
    {!preview ? <>
      <section className="ws-card">
        <div className="ws-row">
          <label>게임 유형
            <select value={gtype} onChange={(e) => setGtype(e.target.value)}>
              {Object.keys(GAME_TYPE_LABEL).map((t) => <option key={t} value={t}>{GAME_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label>게임 제목<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        </div>
        <label>설명<textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="학생에게 보여줄 게임 안내" /></label>
      </section>
      {gtype === 'quiz' && <section className="ws-card">
        <b>퀴즈 문제 ({quizQs.length})</b>
        {quizQs.map((q, i) => <div key={i} className="gm-qedit">
          <input value={q.q} onChange={(e) => { const c = [...quizQs]; c[i] = { ...c[i], q: e.target.value }; setQuizQs(c); }} placeholder={`문제 ${i + 1}`} />
          {q.options.map((o, j) => <div key={j} className="ws-opt">
            <input type="radio" checked={Number(q.answer) === j} onChange={() => { const c = [...quizQs]; c[i] = { ...c[i], answer: j }; setQuizQs(c); }} title="정답" />
            <input value={o} onChange={(e) => { const c = [...quizQs]; c[i] = { ...c[i], options: c[i].options.map((x, k) => (k === j ? e.target.value : x)) }; setQuizQs(c); }} placeholder={`보기 ${'ABCD'[j]}`} />
          </div>)}
          <button className="ws-btn" onClick={() => setQuizQs(quizQs.filter((_, k) => k !== i))}>문제 삭제</button>
        </div>)}
        <button className="ws-btn" onClick={() => setQuizQs([...quizQs, { q: '', options: ['', '', '', ''], answer: 0 }])}>+ 문제 추가</button>
      </section>}
      {gtype === 'memory' && <section className="ws-card">
        <b>카드 쌍 ({pairs.length})</b>
        {pairs.map((p, i) => <div key={i} className="ws-row">
          <input value={p.a} onChange={(e) => { const c = [...pairs]; c[i] = { ...c[i], a: e.target.value }; setPairs(c); }} placeholder="앞면 (예: photosynthesis)" />
          <input value={p.b} onChange={(e) => { const c = [...pairs]; c[i] = { ...c[i], b: e.target.value }; setPairs(c); }} placeholder="뒷면 (예: 광합성)" />
          <button className="ws-btn" onClick={() => setPairs(pairs.filter((_, k) => k !== i))}>×</button>
        </div>)}
        <button className="ws-btn" onClick={() => setPairs([...pairs, { a: '', b: '' }])}>+ 카드 쌍 추가</button>
      </section>}
      {gtype === 'embed' && <section className="ws-card">
        <label>외부 게임 URL (iframe)<input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://..." /></label>
        <label>또는 직접 HTML 코드<textarea value={embedHtml} onChange={(e) => setEmbedHtml(e.target.value)} placeholder="<html>... 점수 전송: postMessage({source:'external-game', score, maxScore})" rows={6} /></label>
      </section>}
      <section className="ws-card">
        <b>{week}주차 기록 ({weekRecs.length}명)</b>
        {weekRecs.length ? <table className="gm-table">
          <thead><tr><th>학번</th><th>이름</th><th>점수</th><th>최고</th><th>시도</th><th>소요(초)</th><th>완료일시</th></tr></thead>
          <tbody>{weekRecs.map((r, i) => <tr key={i}><td>{r.학번}</td><td>{r.이름}</td><td>{r.점수}</td><td>{r.최고점수}</td><td>{r.시도횟수}</td><td>{r.소요초}</td><td>{r.완료일시}</td></tr>)}</tbody>
        </table> : <div className="empty-mini">아직 플레이 기록이 없습니다.</div>}
      </section>
    </> : <GamePlayer config={current} onFinish={() => {}} />}
  </div>;
}
/* ===== Games 번들 끝 ===== */

if (typeof window !== 'undefined') { window.TeacherGames = TeacherGames; window.StudentGames = StudentGames; window.GamePlayer = GamePlayer; }
