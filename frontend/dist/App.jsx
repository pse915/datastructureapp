// Datastructuregram — Instagram Redesign, 전체 기능 통합본 (Vite 개발용)
// 실행: cd frontend && npm install && npm run dev
// 기능 100% 유지: 개념+코드, 인터랙티브 시각화, 주차별 게임/퀴즈, 포트폴리오 제출, Sheets 저장

const DEFAULT_ARGS = { role: null, student: null, weeks: [], portfolio: [], teacher: null, flash: null, result: null, worksheet: null, uploadResult: null, games: null };

function makeEventId(p = 'event') {
  try { if (globalThis.crypto?.randomUUID) return `${p}-${globalThis.crypto.randomUUID()}`; } catch (_) {}
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function emit(action, payload = {}) {
  Streamlit.setComponentValue({ action, eventId: makeEventId(action), ...payload });
}

/* ---------- 공용 아이콘 ---------- */
function Icon({ name, size = 21 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const P = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    heart: <path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" />,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.7-3.4 3.1-5.2 7.5-5.2s6.8 1.8 7.5 5.2" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    refresh: <><path d="M20 11a8 8 0 0 0-14.7-4L3 10" /><path d="M3 5v5h5" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    book: <><path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M4 19a2 2 0 0 0 2 2h13" /></>,
  };
  return <svg {...c}>{P[name] || P.grid}</svg>;
}
function HeartIcon({ fill, size = 24 }) {
  if (fill) return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" /></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" /></svg>;
}

/* ---------- 로그인 (인스타 스타일 입력 폼) ---------- */
function Login({ flash }) {
  const [sid, setSid] = useState('');
  const [pw, setPw] = useState('');
  const [pending, setPending] = useState('');
  useEffect(() => { if (flash) setPending(''); }, [flash?.type, flash?.text]);
  const goStudent = (e) => { e?.preventDefault?.(); if (!sid.trim() || pending) return; setPending('s'); emit('student_login', { studentId: sid.trim() }); };
  const goTeacher = (e) => { e?.preventDefault?.(); if (!pw || pending) return; setPending('t'); emit('teacher_login', { password: pw }); };
  return (
    <div className="ig-app">
      <header className="ig-topbar"><div className="ig-topbar-inner">
        <div className="ig-logo">Datastructuregram<small>DS LEARNING FEED</small></div>
      </div></header>
      <main className="ig-feed">
        <div className="ig-card hover"><div className="ig-post-head">
          <div className="ig-avatar"><div>🧱</div></div>
          <div><b>datastructuregram</b><small>스토리로 단원 선택 · 피드로 실습</small></div>
        </div>
        <div className="ig-post-body">
          <span className="ig-badge-grad ig-badge">8 UNITS FEED</span>
          <h2>배열부터 해시까지, 피드를 넘기듯 배우자.</h2>
          <p>스토리 링에서 단원을 고르고, 카드 안에서 직접 Push/Pop·BFS를 만져보세요. 퀴즈 정답은 Sheets에 자동 저장됩니다.</p>
          <div className="ig-stories" style={{ boxShadow: 'none' }}>
            {DS_UNITS.slice(0, 6).map((u) => (
              <div key={u.id} className="ig-story live"><span className="ring"><div>{u.icon}</div></span><small>{u.label}</small></div>
            ))}
          </div>
        </div></div>
        {flash && <div className={`ig-toast ${flash.type || ''}`}>{flash.text}</div>}
        <div className="ig-card ig-auth-card"><div className="ig-auth">
          <div><span className="ig-badge">STUDENT</span><h2>학번으로 시작</h2><p>포트폴리오·게임 기록과 DS 퀴즈 진행도가 함께 저장돼요.</p></div>
          <form onSubmit={goStudent} className="ig-row">
            <input className="ig-input" value={sid} onChange={(e) => setSid(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))} placeholder="학번  예) 1701" inputMode="numeric" />
            <button className="ig-btn ig-btn-blue" type="submit" disabled={!sid.trim() || pending !== ''}>{pending === 's' ? '확인 중…' : '학생 로그인'}</button>
          </form>
          <div><span className="ig-badge">TEACHER</span><h2>교사 관리자</h2><p>단원 미리보기·게임 공개·학습지·평가·CSV를 관리합니다.</p></div>
          <form onSubmit={goTeacher} className="ig-row">
            <input className="ig-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="관리자 비밀번호" />
            <button className="ig-btn ig-btn-grad" type="submit" disabled={!pw || pending !== ''}>{pending === 't' ? '확인 중…' : '교사 로그인'}</button>
          </form>
        </div></div>
      </main>
    </div>
  );
}

/* ---------- 하단/상단 내비 ---------- */
const STUDENT_TABS = [['learn', 'book', '학습'], ['pf', 'grid', '기록'], ['game', 'star', '게임'], ['my', 'heart', '나의기록']];
const TEACHER_TABS = [['dash', 'home', '현황'], ['ds', 'book', '단원'], ['game', 'star', '게임'], ['ws', 'grid', '학습지'], ['eval', 'user', '학생'], ['csv', 'download', 'CSV']];
function TopTabs({ tabs, active, onChange, onLogout, name }) {
  return (
    <header className="ig-topbar"><div className="ig-topbar-inner">
      <div className="ig-logo">Datastructuregram<small>DS LEARNING FEED</small></div>
      <nav style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        {tabs.map(([k, ic, label]) => (
          <button key={k} onClick={() => onChange(k)} className="ig-btn-sm ig-btn" style={active === k ? { background: 'var(--ig-grad)', color: '#fff', border: 0 } : { border: 0 }} title={label}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name={ic} size={16} />{label}</span>
          </button>
        ))}
        <button className="ig-login-pill" onClick={onLogout} title={`${name} 로그아웃`}>{name || '로그아웃'}</button>
      </div>
    </div></header>
  );
}
function BottomNav({ tabs, active, onChange }) {
  return (
    <nav className="ig-bottomnav">
      {tabs.map(([k, ic, label]) => (
        <button key={k} className={active === k ? 'on' : ''} onClick={() => onChange(k)}><Icon name={ic} size={20} /><span>{label}</span></button>
      ))}
    </nav>
  );
}

/* ---------- 학생: 홈/포트폴리오/요약 ---------- */
function StudentHome({ student, portfolio, weeks, onGo }) {
  const done = portfolio.filter((r) => r.제출).length;
  const total = portfolio.reduce((s, r) => s + (Number(r.점수) || 0), 0);
  const next = (weeks || []).find((w) => !portfolio.find((r) => Number(r.주차) === Number(w.주차)));
  const latest = [...portfolio].filter((r) => r.제출).sort((a, b) => Number(b.주차) - Number(a.주차)).slice(0, 3);
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-card"><div className="ig-post-head">
        <div className="ig-avatar"><div>{String(student.이름 || '학').slice(0, 1)}</div></div>
        <div><b>{student.이름} · {student.학년}학년 {student.반}반</b><small>학번 {student.학번} · 제출 {done}/17 · 누적 {total}점</small></div>
      </div>
      <div className="ig-post-body">
        <div className="ig-progress"><i style={{ width: `${Math.round((done / 17) * 100)}%` }} /></div>
        <p className="ig-hint">이번 학기 진행률 {Math.round((done / 17) * 100)}% · {next ? `${next.주차}주차부터 이어쓰기` : '전 주차 완료 🎉'}</p>
        <div className="ig-row">
          <button className="ig-btn ig-btn-grad" onClick={() => onGo('learn')}>자료구조 학습하기</button>
          <button className="ig-btn ig-btn-blue" onClick={() => onGo('pf')}>{next ? `${next.주차}주차 기록 쓰기` : '기록 보기'}</button>
        </div>
      </div></div>
      <div className="ig-card"><div className="ig-post-head">
        <div className="ig-avatar"><div>⭐</div></div><div><b>최근 기록</b><small>최근 제출 3개</small></div>
      </div>
      <div className="ig-post-body">
        {latest.length ? latest.map((r) => (
          <button key={r.주차} className="ig-quiz-opt" onClick={() => onGo('pf', Number(r.주차))}>
            <span className="letter">W{r.주차}</span><span>{String(r.제출내용 || '').slice(0, 48) || '학습 기록'}</span>
          </button>
        )) : <div className="ig-empty">아직 제출이 없어요. 첫 기록을 남겨보세요.</div>}
      </div></div>
    </div>
  );
}

function PortfolioPage({ weeks, portfolio, sel, setSel, content, setContent, submitting, onSubmit }) {
  const week = (weeks || []).find((w) => Number(w.주차) === Number(sel));
  const rec = portfolio.find((r) => Number(r.주차) === Number(sel));
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-stories">
        {(weeks || []).map((w) => {
          const no = Number(w.주차); const done = portfolio.find((r) => Number(r.주차) === no)?.제출;
          return (
            <button key={no} className={`ig-story ${done ? 'live' : ''} ${Number(sel) === no ? 'on' : ''}`} onClick={() => setSel(no)}>
              <span className="ring"><div>W{no}</div></span><small>{no}주차</small>
              <i className="cnt" style={done ? {} : { visibility: 'hidden' }}>제출됨</i>
            </button>
          );
        })}
      </div>
      <article className="ig-card hover">
        <div className="ig-post-head">
          <div className="ig-avatar"><div>{String(sel).padStart(2, '0')}</div></div>
          <div><b>{week?.학습목표 || `${sel}주차 학습 기록`}</b><small>WEEK {sel} · 배점 {rec?.배점 || week?.배점 || 10}점</small></div>
        </div>
        <div className="ig-post-body">
          <span className="ig-badge">ACTIVITY PROMPT</span>
          <p>{week?.활동지질문 || '이번 주에 배운 점과 나의 생각을 자유롭게 기록해보세요.'}</p>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#555' }}>MY LEARNING NOTE
            <textarea className="ig-textarea" style={{ minHeight: 220 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="배운 것 · 해본 것 · 어려웠던 점 · 새로 생각한 것" />
          </label>
          <div className="ig-row">
            <span className="ig-hint">{rec?.제출 ? `마지막 저장 ${rec.수정일시 || rec.제출일시 || '-'}` : '아직 제출하지 않았어요.'}</span>
            <button className="ig-btn ig-btn-grad" disabled={submitting || !content.trim()} onClick={onSubmit}>{submitting ? '저장 중…' : rec?.제출 ? '수정하여 제출' : '기록 제출'}</button>
          </div>
        </div>
        <div className="ig-actions">
          <span className="ig-hint">점수 {rec?.점수 || '—'} / {rec?.배점 || week?.배점 || 10} · 피드백: {rec?.피드백 || '제출 후 표시'}</span>
        </div>
      </article>
    </div>
  );
}

function SummaryPage({ portfolio }) {
  const total = portfolio.reduce((s, r) => s + (Number(r.점수) || 0), 0);
  const done = portfolio.filter((r) => r.제출).length;
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-card"><div className="ig-post-body">
        <span className="ig-badge-grad ig-badge">MY ARCHIVE · {done}/17</span>
        <h2>한 학기의 기록 — 누적 {total}점</h2>
        <div className="ig-progress"><i style={{ width: `${Math.round((done / 17) * 100)}%` }} /></div>
      </div></div>
      {Array.from({ length: 17 }, (_, i) => i + 1).map((no) => {
        const r = portfolio.find((x) => Number(x.주차) === no);
        return (
          <div key={no} className="ig-card"><div className="ig-post-body">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="ig-badge">{String(no).padStart(2, '0')}주차</span>
              <b style={{ fontSize: 14 }}>{r?.제출 ? String(r.제출내용).slice(0, 60) : '아직 기록하지 않았습니다.'}</b>
              <span className="ig-hint" style={{ marginLeft: 'auto' }}>{r?.점수 ?? '—'}점</span>
            </div>
            <p className="ig-hint">{r?.피드백 || '교사 피드백이 표시됩니다.'}</p>
          </div></div>
        );
      })}
    </div>
  );
}

/* ---------- 미니게임 번들 (기능 100% 유지, 인스타 카드 래핑) ---------- */
const GAME_TYPE_LABEL = { quiz: '4지선다 퀴즈', memory: '단어 카드 맞추기', embed: '외부 게임 임베드' };
function gmUid(p = 'g') { return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function gmShuffle(a) { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[x[i], x[j]] = [x[j], x[i]]; } return x; }

function QuizPlayer({ config, onFinish }) {
  const qs = (config.content?.questions) || [];
  const [idx, setIdx] = useState(0); const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0); const [done, setDone] = useState(false);
  const [t0] = useState(Date.now()); const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  if (!qs.length) return <div className="ig-empty">등록된 문제가 없습니다.</div>;
  if (done) return <div className="ig-card"><div className="ig-like-pop">♥</div><h3 style={{ textAlign: 'center' }}>{score} / {qs.length}점 저장 완료</h3></div>;
  const q = qs[idx];
  const choose = (i) => {
    if (picked !== null) return; setPicked(i);
    const ns = score + (i === q.answer ? 1 : 0); if (i === q.answer) setScore(ns);
    timers.current.push(setTimeout(() => {
      if (idx + 1 >= qs.length) { setDone(true); onFinish({ score: ns, maxScore: qs.length, durationSec: Math.round((Date.now() - t0) / 1000), detail: { correct: ns, total: qs.length } }); }
      else { setIdx(idx + 1); setPicked(null); }
    }, 450));
  };
  return (
    <div className="ig-card"><div className="ig-post-head">
      <div className="ig-avatar"><div>Q{idx + 1}</div></div><div><b>{config.title}</b><small>{idx + 1}/{qs.length} · {score}점</small></div>
    </div><div className="ig-post-body">
      <div className="ig-progress"><i style={{ width: `${Math.round((idx / qs.length) * 100)}%` }} /></div>
      <h2 style={{ fontSize: 16 }}>{q.q}</h2>
      {(q.options || []).map((o, j) => {
        let cls = 'ig-quiz-opt';
        if (picked !== null) { if (j === q.answer) cls += ' correct'; else if (j === picked) cls += ' wrong'; }
        return <button key={j} className={cls} onClick={() => choose(j)}><span className="letter">{'ABCD'[j] || j + 1}</span>{o}</button>;
      })}
    </div></div>
  );
}
function MemoryPlayer({ config, onFinish }) {
  const pairs = config.content?.pairs || [];
  const deck = useMemo(() => gmShuffle(pairs.flatMap((p, i) => [{ key: i, text: p.a }, { key: i, text: p.b }])), [config.updatedAt, pairs.length]);
  const [open, setOpen] = useState([]); const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0); const [lock, setLock] = useState(false);
  const [t0] = useState(Date.now()); const [done, setDone] = useState(false);
  const timers = useRef([]); useEffect(() => () => timers.current.forEach(clearTimeout), []);
  if (!pairs.length) return <div className="ig-empty">등록된 카드가 없습니다.</div>;
  if (done) return <div className="ig-card"><div className="ig-like-pop">♥</div><h3 style={{ textAlign: 'center' }}>{pairs.length}쌍 완성 · {moves} 시도 저장 완료</h3></div>;
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
    <div className="ig-card"><div className="ig-post-head">
      <div className="ig-avatar"><div>🃏</div></div><div><b>{config.title}</b><small>{matched.length}/{pairs.length}쌍 · {moves}시도</small></div>
    </div><div className="ig-post-body">
      <div className="ig-progress"><i style={{ width: `${Math.round((matched.length / Math.max(1, pairs.length)) * 100)}%` }} /></div>
      <div className="ig-mem-grid">{deck.map((c, i) => {
        const face = open.includes(i) || matched.includes(c.key);
        return <button key={i} className={`ig-mem-card ${face ? 'face' : ''} ${matched.includes(c.key) ? 'matched' : ''}`} onClick={() => flip(i)}>{face ? c.text : '?'}</button>;
      })}</div>
    </div></div>
  );
}
function EmbedPlayer({ config, onFinish }) {
  const content = config.content || {}; const max = Number(content.passScore) || 100;
  useEffect(() => {
    const h = (e) => { const d = e.data; if (d?.source === 'external-game' && typeof d.score !== 'undefined') onFinish({ score: Number(d.score) || 0, maxScore: Number(d.maxScore) || max, durationSec: 0, detail: { via: 'postMessage' } }); };
    window.addEventListener('message', h); return () => window.removeEventListener('message', h);
  }, []);
  return (
    <div className="ig-card"><div className="ig-post-head"><div className="ig-avatar"><div>▶</div></div><div><b>{config.title}</b><small>외부 게임</small></div></div>
    <div className="ig-post-body">
      {content.url ? <iframe title={config.title} src={content.url} className="ig-frame" sandbox="allow-scripts allow-same-origin allow-forms" />
        : content.html ? <iframe title={config.title} srcDoc={content.html} className="ig-frame" sandbox="allow-scripts allow-same-origin" />
        : <div className="ig-empty">등록된 게임 URL/HTML이 없습니다.</div>}
      <button className="ig-btn ig-btn-grad" onClick={() => onFinish({ score: max, maxScore: max, durationSec: 0, detail: { via: 'manual' } })}>게임 완료 보고하기</button>
    </div></div>
  );
}
function GamePlayer({ config, onFinish }) {
  if (config.type === 'memory') return <MemoryPlayer config={config} onFinish={onFinish} />;
  if (config.type === 'embed') return <EmbedPlayer config={config} onFinish={onFinish} />;
  return <QuizPlayer config={config} onFinish={onFinish} />;
}
function StudentGames({ games, myRecords }) {
  const list = games || [];
  const [week, setWeek] = useState(list[0]?.week || 1);
  const [playing, setPlaying] = useState(false); const [last, setLast] = useState(null);
  useEffect(() => { setPlaying(false); setLast(null); }, [week]);
  if (!list.length) return <div className="ig-card"><div className="ig-empty">플레이 가능한 주차 게임이 없습니다.</div></div>;
  const cfg = list.find((g) => Number(g.week) === Number(week)) || list[0];
  const rec = (myRecords || []).find((r) => Number(r.주차) === Number(cfg.week));
  const finish = (res) => {
    emit('student_game_submit', { week: Number(cfg.week), gameType: cfg.type, score: res.score, maxScore: res.maxScore, durationSec: res.durationSec || 0, detail: res.detail || {}, recordId: gmUid('game') });
    setLast(res); setPlaying(false);
  };
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-stories">{list.map((g) => {
        const mine = (myRecords || []).find((r) => Number(r.주차) === Number(g.week));
        return (
          <button key={g.week} className={`ig-story live ${Number(week) === Number(g.week) ? 'on' : ''}`} onClick={() => setWeek(Number(g.week))}>
            <span className="ring"><div>W{g.week}</div></span><small>{g.week}주차</small>
            <i className="cnt" style={mine?.최고점수 ? {} : { visibility: 'hidden' }}>★ {mine?.최고점수 ?? ''}</i>
          </button>
        );
      })}</div>
      <article className="ig-card hover"><div className="ig-post-head">
        <div className="ig-avatar"><div>W{cfg.week}</div></div><div><b>{cfg.title}</b><small>{GAME_TYPE_LABEL[cfg.type]}</small></div>
      </div><div className="ig-post-body">
        <p>{cfg.desc}</p>
        <p className="ig-hint">{rec?.최고점수 ? `내 최고 ${rec.최고점수}점 · ${rec.시도횟수}회` : '첫 플레이에 도전!'}</p>
        {!playing && <button className="ig-btn ig-btn-grad" onClick={() => { setLast(null); setPlaying(true); }}>게임 시작</button>}
      </div></article>
      {last && <div className="ig-card"><div className="ig-like-pop">♥</div><h3 style={{ textAlign: 'center' }}>{last.score}/{last.maxScore}점 저장 완료</h3></div>}
      {playing && <GamePlayer key={`${cfg.week}-${cfg.updatedAt}`} config={cfg} onFinish={finish} />}
    </div>
  );
}
function TeacherGames({ weeks, configs, records }) {
  const all = configs?.length ? configs : Array.from({ length: 17 }, (_, i) => ({ week: i + 1, enabled: false, type: 'quiz', title: `${i + 1}주차 미니게임`, desc: '', content: { questions: [] } }));
  const [week, setWeek] = useState(1); const [enabled, setEnabled] = useState(false);
  const [gtype, setGtype] = useState('quiz'); const [title, setTitle] = useState('');
  const [desc, setDesc] = useState(''); const [quizQs, setQuizQs] = useState([]);
  const [pairs, setPairs] = useState([]); const [embedUrl, setEmbedUrl] = useState(''); const [preview, setPreview] = useState(false);
  useEffect(() => {
    const c = all.find((x) => Number(x.week) === Number(week)) || {};
    setEnabled(!!c.enabled); setGtype(c.type || 'quiz'); setTitle(c.title || `${week}주차 미니게임`); setDesc(c.desc || '');
    setQuizQs(((c.content || {}).questions || []).map((q) => ({ q: q.q || '', options: [...(q.options || ['', '', '', ''])], answer: q.answer || 0 })));
    setPairs(((c.content || {}).pairs || []).map((p) => ({ a: p.a || '', b: p.b || '' })));
    setEmbedUrl((c.content || {}).url || ''); setPreview(false);
  }, [week]);
  const current = { week: Number(week), enabled, type: gtype, title, desc, content: gtype === 'quiz' ? { questions: quizQs } : gtype === 'memory' ? { pairs } : { url: embedUrl.trim() } };
  const weekRecs = (records || []).filter((r) => Number(r.주차) === Number(week)).slice(0, 200);
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-card"><div className="ig-post-body">
        <span className="eyebrow" style={{ fontSize: 11, fontWeight: 800, color: '#cc2366' }}>WEEKLY GAME · ADMIN</span>
        <h2 style={{ margin: 0 }}>주차별 게임 관리</h2>
        <div className="ig-row">
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800 }}>유형
            <select className="ig-select" value={gtype} onChange={(e) => setGtype(e.target.value)}>{Object.keys(GAME_TYPE_LABEL).map((t) => <option key={t} value={t}>{GAME_TYPE_LABEL[t]}</option>)}</select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800 }}>제목<input className="ig-input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        </div>
        <textarea className="ig-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="학생 안내문" />
        <div className="ig-row">
          <label className="ig-switch" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); emit('teacher_game_toggle', { week: Number(week), enabled: e.target.checked }); }} />{enabled ? '공개 중' : '비공개'}</label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="ig-btn" onClick={() => setPreview(!preview)}>{preview ? '편집으로' : '미리보기'}</button>
            <button className="ig-btn ig-btn-blue" onClick={() => emit('teacher_game_save', { config: current })}>게임 저장</button>
          </div>
        </div>
      </div></div>
      <div className="ig-stories">{all.map((c) => (
        <button key={c.week} className={`ig-story ${c.enabled ? 'live' : ''} ${Number(week) === Number(c.week) ? 'on' : ''}`} onClick={() => setWeek(Number(c.week))}>
          <span className="ring"><div>W{c.week}</div></span><small>{c.week}주차</small>
        </button>
      ))}</div>
      {!preview ? (
        <div className="ig-card"><div className="ig-post-body">
          {gtype === 'quiz' && <><b>퀴즈 {quizQs.length}문제</b>{quizQs.map((q, i) => (
            <div key={i} className="ig-lab"><input className="ig-input" value={q.q} onChange={(e) => { const c = [...quizQs]; c[i] = { ...c[i], q: e.target.value }; setQuizQs(c); }} placeholder={`문제 ${i + 1}`} />
              {q.options.map((o, j) => <div key={j} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 8, alignItems: 'center' }}>
                <input type="radio" checked={Number(q.answer) === j} onChange={() => { const c = [...quizQs]; c[i] = { ...c[i], answer: j }; setQuizQs(c); }} />
                <input className="ig-input" value={o} onChange={(e) => { const c = [...quizQs]; c[i] = { ...c[i], options: c[i].options.map((x, k) => (k === j ? e.target.value : x)) }; setQuizQs(c); }} placeholder={`보기 ${'ABCD'[j]}`} />
              </div>)}
              <button className="ig-btn ig-btn-sm" onClick={() => setQuizQs(quizQs.filter((_, k) => k !== i))}>삭제</button></div>)}
            <button className="ig-btn" onClick={() => setQuizQs([...quizQs, { q: '', options: ['', '', '', ''], answer: 0 }])}>+ 문제 추가</button></>}
          {gtype === 'memory' && <><b>카드 {pairs.length}쌍</b>{pairs.map((p, i) => (
            <div key={i} className="ig-row"><input className="ig-input" value={p.a} onChange={(e) => { const c = [...pairs]; c[i] = { ...c[i], a: e.target.value }; setPairs(c); }} placeholder="앞면" />
              <input className="ig-input" value={p.b} onChange={(e) => { const c = [...pairs]; c[i] = { ...c[i], b: e.target.value }; setPairs(c); }} placeholder="뒷면" /></div>)}
            <button className="ig-btn" onClick={() => setPairs([...pairs, { a: '', b: '' }])}>+ 카드 추가</button></>}
          {gtype === 'embed' && <input className="ig-input" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://…" />}
          <b>{week}주차 기록 {weekRecs.length}건</b>
          {weekRecs.length ? <div style={{ overflowX: 'auto' }}><table className="ig-table"><thead><tr><th>학번</th><th>이름</th><th>점수</th><th>최고</th><th>시도</th></tr></thead>
            <tbody>{weekRecs.map((r, i) => <tr key={i}><td>{r.학번}</td><td>{r.이름}</td><td><b>{r.점수}</b></td><td>{r.최고점수}</td><td>{r.시도횟수}</td></tr>)}</tbody></table></div>
            : <div className="ig-empty">기록 없음</div>}
        </div></div>
      ) : <GamePlayer config={current} onFinish={() => {}} />}
    </div>
  );
}

/* ---------- 학습지 (교사) : 4유형 지원, Sheets 저장 ---------- */
const WS_LABEL = { quiz: '퀴즈/선택형', blank: '빈칸', matching: '선잇기', image: '사진연상' };
function wsId(p = 'q') { return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }
function wsNew(t) {
  const b = { id: wsId(), prompt: '', points: 5, explanation: '' };
  if (t === 'quiz') return { ...b, type: 'quiz', options: ['', '', '', ''], answerIndex: 0 };
  if (t === 'blank') return { ...b, type: 'blank', template: '오늘 배운 [빈칸]에 대해 쓰세요.', answers: [''] };
  if (t === 'matching') return { ...b, type: 'matching', left: ['A', 'B'], right: ['1', '2'] };
  return { ...b, type: 'image', imageUrl: '', hint: '', answer: '' };
}
function wsReducer(s, a) {
  switch (a.type) {
    case 'LOAD': return { ...s, week: a.ws.week, title: a.ws.title || '', guide: a.ws.guide || '', questions: a.ws.questions || [] };
    case 'META': return { ...s, ...a.patch };
    case 'ADD': { const q = wsNew(a.qtype); return { ...s, questions: [...s.questions, q] }; }
    case 'PATCH': return { ...s, questions: s.questions.map((q) => (q.id === a.id ? { ...q, ...a.patch } : q)) };
    case 'DEL': return { ...s, questions: s.questions.filter((q) => q.id !== a.id) };
    default: return s;
  }
}
function WorksheetAdmin({ weeks, initial }) {
  const [s, d] = useReducer(wsReducer, { week: 1, title: '', guide: '', questions: [] });
  useEffect(() => { if (initial) d({ type: 'LOAD', ws: initial }); }, [initial?.week, initial?.updatedAt]);
  const cur = { week: s.week, title: s.title, guide: s.guide, questions: s.questions, published: true };
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-card"><div className="ig-post-body">
        <span className="ig-badge">WEEKLY WORKSHEET · ADMIN</span><h2 style={{ margin: 0 }}>주차별 학습지 관리</h2>
        <div className="ig-row">
          <select className="ig-select" value={s.week} onChange={(e) => { const w = Number(e.target.value); d({ type: 'META', patch: { week: w } }); emit('teacher_worksheet_load', { week: w }); }}>
            {Array.from({ length: 17 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}주차</option>)}
          </select>
          <button className="ig-btn ig-btn-blue" onClick={() => emit('teacher_worksheet_save', { worksheet: cur })}>Sheets에 저장</button>
        </div>
        <input className="ig-input" value={s.title} onChange={(e) => d({ type: 'META', patch: { title: e.target.value } })} placeholder="학습지 제목" />
        <textarea className="ig-textarea" value={s.guide} onChange={(e) => d({ type: 'META', patch: { guide: e.target.value } })} placeholder="안내문" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{Object.keys(WS_LABEL).map((t) => <button key={t} className="ig-btn ig-btn-sm" onClick={() => d({ type: 'ADD', qtype: t })}>+ {WS_LABEL[t]}</button>)}</div>
        {s.questions.map((q, i) => (
          <div key={q.id} className="ig-lab">
            <b>Q{i + 1} · {WS_LABEL[q.type]}</b>
            <input className="ig-input" value={q.prompt} onChange={(e) => d({ type: 'PATCH', id: q.id, patch: { prompt: e.target.value } })} placeholder="문제 입력" />
            {q.type === 'quiz' && q.options.map((o, j) => (
              <div key={j} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 8, alignItems: 'center' }}>
                <input type="radio" checked={q.answerIndex === j} onChange={() => d({ type: 'PATCH', id: q.id, patch: { answerIndex: j } })} />
                <input className="ig-input" value={o} onChange={(e) => { const a = [...q.options]; a[j] = e.target.value; d({ type: 'PATCH', id: q.id, patch: { options: a } }); }} placeholder={`보기 ${'ABCD'[j]}`} />
              </div>))}
            {q.type === 'blank' && <input className="ig-input" value={q.template} onChange={(e) => d({ type: 'PATCH', id: q.id, patch: { template: e.target.value } })} placeholder="지문 ([빈칸] 포함)" />}
            {q.type === 'image' && <><input className="ig-input" value={q.imageUrl} onChange={(e) => d({ type: 'PATCH', id: q.id, patch: { imageUrl: e.target.value } })} placeholder="이미지 URL" />
              <input className="ig-input" value={q.answer} onChange={(e) => d({ type: 'PATCH', id: q.id, patch: { answer: e.target.value } })} placeholder="정답" /></>}
            <button className="ig-btn ig-btn-sm" onClick={() => d({ type: 'DEL', id: q.id })}>삭제</button>
          </div>))}
      </div></div>
    </div>
  );
}

/* ---------- 교사: 현황/평가/CSV ---------- */
function TeacherDash({ dash, onStudent }) {
  const max = Math.max(1, ...(dash.classStats || []).map((x) => Number(x.제출건수) || 0));
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-card"><div className="ig-post-body">
        <span className="ig-badge-grad ig-badge">TEACHER SPACE</span>
        <h2 style={{ margin: 0 }}>학생 학습을 한눈에 👀</h2>
        <div className="ig-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {[['등록', dash.totalStudents], ['제출자', dash.submittedStudents], ['평균', dash.averageScore]].map(([k, v]) => (
            <div key={k} className="ig-lab" style={{ textAlign: 'center' }}><small className="ig-hint">{k}</small><b style={{ fontSize: 22 }}>{v}</b></div>
          ))}
        </div>
      </div></div>
      <div className="ig-card"><div className="ig-post-body"><b>반별 활동량</b>
        {(dash.classStats || []).map((r, i) => (
          <div key={i}><small>{r.학년}학년 {r.반}반 · {r.제출건수}건 · 평균 {r.평균점수}점</small>
            <div className="ig-progress"><i style={{ width: `${Math.max(4, (r.제출건수 / max) * 100)}%` }} /></div></div>
        ))}
        {!(dash.classStats || []).length && <div className="ig-empty">제출 데이터 없음</div>}
      </div></div>
      <div className="ig-card"><div className="ig-post-body"><b>최근 제출</b>
        {(dash.portfolio || []).slice(0, 6).map((r, i) => (
          <button key={i} className="ig-quiz-opt" onClick={() => onStudent(r.학번)}>
            <span className="letter">{String(r.이름 || '?').slice(0, 1)}</span>
            <span>{r.이름} · {r.주차}주차 — {String(r.제출내용 || '').slice(0, 40)}</span>
          </button>))}
      </div></div>
    </div>
  );
}
function TeacherEval({ dash }) {
  const [sid, setSid] = useState(''); const [week, setWeek] = useState(1);
  const [score, setScore] = useState(0); const [fb, setFb] = useState('');
  const found = (dash.portfolio || []).find((r) => String(r.학번) === String(sid) && Number(r.주차) === Number(week));
  useEffect(() => { setScore(Number(found?.점수) || 0); setFb(found?.피드백 || ''); }, [found?.제출ID, sid, week]);
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-card"><div className="ig-post-body">
        <span className="ig-badge">ASSESSMENT</span><h2 style={{ margin: 0 }}>학생 기록과 피드백</h2>
        <div className="ig-row">
          <select className="ig-select" value={sid} onChange={(e) => setSid(e.target.value)}>
            <option value="">학생 선택</option>{(dash.students || []).map((s) => <option key={s.학번} value={s.학번}>{s.학번} · {s.이름}</option>)}
          </select>
          <select className="ig-select" value={week} onChange={(e) => setWeek(Number(e.target.value))}>{Array.from({ length: 17 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}주차</option>)}</select>
        </div>
        <div className="ig-lab">{found ? String(found.제출내용) : '제출 기록이 없습니다.'}</div>
        <div className="ig-row">
          <input className="ig-input" type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="점수" />
          <button className="ig-btn ig-btn-blue" onClick={() => emit('teacher_grade_save', { studentId: sid, week: Number(week), score: Number(score), feedback: fb })}>평가 저장</button>
        </div>
        <textarea className="ig-textarea" value={fb} onChange={(e) => setFb(e.target.value)} placeholder="한 줄 피드백" />
      </div></div>
    </div>
  );
}
function CsvPage({ portfolio, students }) {
  const headers = ['학번', '이름', '학년', '반', ...Array.from({ length: 17 }, (_, i) => `${i + 1}주차`), '총점'];
  const map = new Map();
  (students || []).forEach((s) => { if (s.학번) map.set(String(s.학번), { 학번: String(s.학번), 이름: s.이름 || '', 학년: s.학년 || '', 반: s.반 || '' }); });
  (portfolio || []).forEach((r) => {
    const id = String(r.학번); if (!map.has(id)) map.set(id, { 학번: id, 이름: r.이름 || '', 학년: r.학년 || '', 반: r.반 || '' });
    const it = map.get(id); it[`${r.주차}주차`] = r.점수 || ''; it.총점 = (Number(it.총점) || 0) + (Number(r.점수) || 0);
  });
  const csv = [headers, ...[...map.values()].map((row) => headers.map((h) => row[h] ?? ''))]
    .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
  const href = `data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(csv)}`;
  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-card"><div className="ig-post-body">
        <span className="ig-badge">DATA EXPORT</span><h2 style={{ margin: 0 }}>성적 CSV 내보내기</h2>
        <p className="ig-hint">학번·이름·1—17주차 점수·총점을 Excel용 CSV로 저장합니다.</p>
        <a href={href} download="datastructure_성적표.csv" className="ig-btn ig-btn-grad" style={{ textAlign: 'center', textDecoration: 'none' }}>CSV 다운로드</a>
      </div></div>
    </div>
  );
}

/* ---------- 학생/교사 셸 ---------- */
function StudentApp({ args }) {
  const [tab, setTab] = useState('learn');
  const [sel, setSel] = useState(Number(args.weeks?.[0]?.주차 || 1));
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [solved, setSolved] = useState(() => {
    const init = {};
    (args.ds?.solved || []).forEach((u) => { init[u] = true; });
    return init;
  });
  const subId = useRef(null);
  const rec = (args.portfolio || []).find((r) => Number(r.주차) === Number(sel));
  useEffect(() => { setContent(rec?.제출내용 || ''); subId.current = null; setSubmitting(false); }, [sel, rec?.제출내용]);
  useEffect(() => {
    if (args.result?.submissionId) { subId.current = null; setSubmitting(false); }
    else if (args.flash) setSubmitting(false);
    if (args.result?.solvedUnit) setSolved((s) => ({ ...s, [args.result.solvedUnit]: true }));
  }, [args.result, args.flash]);
  const goPf = (w) => { if (w) setSel(Number(w)); setTab('pf'); };
  const submit = () => {
    if (submitting) return; setSubmitting(true);
    if (!subId.current) subId.current = makeEventId('submission');
    emit('student_submit', { week: Number(sel), content, submissionId: subId.current });
  };
  const onDsSolve = (unitId, recordId) => {
    setSolved((s) => ({ ...s, [unitId]: true }));
    emit('ds_quiz_submit', { unitId, score: 10, maxScore: 10, recordId });
  };
  const student = args.student || {};
  return (
    <div className="ig-app">
      <TopTabs tabs={STUDENT_TABS} active={tab} onChange={setTab} onLogout={() => emit('logout')} name={student.이름} />
      <main style={{ paddingTop: 18 }}>
        {args.flash && <div className="ig-feed" style={{ paddingBottom: 0 }}><div className={`ig-toast ${args.flash.type || ''}`}>{args.flash.text}</div></div>}
        {tab === 'learn' && <DsLearnFeed units={DS_UNITS} solved={solved} onSolve={onDsSolve} query={query} setQuery={setQuery} />}
        {tab === 'pf' && <PortfolioPage weeks={args.weeks || []} portfolio={args.portfolio || []} sel={sel} setSel={setSel} content={content} setContent={setContent} submitting={submitting} onSubmit={submit} />}
        {tab === 'game' && <StudentGames games={args.games?.active || []} myRecords={args.games?.records || []} />}
        {tab === 'my' && <><StudentHome student={student} portfolio={args.portfolio || []} weeks={args.weeks || []} onGo={(t, w) => { if (t === 'pf') goPf(w); else setTab(t); }} /><SummaryPage portfolio={args.portfolio || []} /></>}
      </main>
      <BottomNav tabs={STUDENT_TABS} active={tab} onChange={setTab} />
    </div>
  );
}

function TeacherApp({ args }) {
  const [tab, setTab] = useState('dash');
  const [jump, setJump] = useState('');
  const dash = args.teacher || { students: [], portfolio: [], classStats: [] };
  return (
    <div className="ig-app">
      <TopTabs tabs={TEACHER_TABS} active={tab} onChange={setTab} onLogout={() => emit('logout')} name="교사" />
      <main style={{ paddingTop: 18 }}>
        {args.flash && <div className="ig-feed" style={{ paddingBottom: 0 }}><div className={`ig-toast ${args.flash.type || ''}`}>{args.flash.text}</div></div>}
        {tab === 'dash' && <TeacherDash dash={dash} onStudent={(sid) => { setJump(String(sid)); setTab('eval'); }} />}
        {tab === 'ds' && <div className="ig-feed" style={{ paddingTop: 0 }}><DsTeacherPreview units={DS_UNITS} /></div>}
        {tab === 'game' && <TeacherGames weeks={args.weeks || []} configs={args.games?.configs || []} records={args.games?.records || []} />}
        {tab === 'ws' && <WorksheetAdmin weeks={args.weeks || []} initial={args.worksheet} />}
        {tab === 'eval' && <TeacherEval dash={dash} key={jump} />}
        {tab === 'csv' && <CsvPage portfolio={dash.portfolio || []} students={dash.students || []} />}
        <div className="ig-feed" style={{ paddingTop: 0 }}>
          <button className="ig-btn" onClick={() => emit('teacher_refresh')}><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="refresh" size={16} /> Sheets 새로고침</span></button>
        </div>
      </main>
      <BottomNav tabs={TEACHER_TABS} active={tab} onChange={setTab} />
    </div>
  );
}

function App(props) {
  const args = { ...DEFAULT_ARGS, ...(props.args || {}) };
  useEffect(() => { Streamlit.setFrameHeight(2400); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const h = Math.max(900, Math.ceil(document.getElementById('root')?.scrollHeight || 2400));
      Streamlit.setFrameHeight(h);
    }, 300);
    return () => clearTimeout(t);
  }, [args.role]);
  if (args.role === 'student') return <StudentApp args={args} />;
  if (args.role === 'teacher') return <TeacherApp args={args} />;
  return <Login flash={args.flash} />;
}


/* ===== Streamlit mount ===== */
function renderDsRoot() {
  var args = window.__streamlitArgs || {};
  var el = React.createElement(App, { args: args });
  var root = document.getElementById("root");
  try {
    if (ReactDOM.createRoot) {
      if (!window.__dsRoot) window.__dsRoot = ReactDOM.createRoot(root);
      window.__dsRoot.render(el);
    } else { ReactDOM.render(el, root); }
  } catch (e) { try { ReactDOM.render(el, root); } catch (e2) {} }
  try {
    var h = Math.max(900, Math.ceil((document.getElementById("root") || document.body).scrollHeight || 2400));
    Streamlit.setFrameHeight(h);
  } catch (e) {}
}
window.addEventListener("dsArgs", function() { try { renderDsRoot(); } catch (e) {} });
renderDsRoot();
setTimeout(function() { try { renderDsRoot(); } catch (e) {} }, 500);
