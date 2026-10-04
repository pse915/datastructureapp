const { useEffect, useMemo, useRef, useState } = React;


const DEFAULT_ARGS = { role: null, student: null, weeks: [], portfolio: [], teacher: null, flash: null, result: null };

// Streamlit Component v1 bridge. Install the render listener BEFORE announcing readiness
// so the first streamlit:render message cannot be lost in a React useEffect race.
window.__streamlitArgs = window.__streamlitArgs || DEFAULT_ARGS;
window.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'streamlit:render') return;
  const raw = event.data.args;
  // Python: portfolio_component(**payload)  → raw = payload
  // Python: portfolio_component(args=payload) → raw = { args: payload }
  const next =
    raw && typeof raw === 'object' && raw.args && typeof raw.args === 'object' && !('role' in raw)
      ? raw.args
      : (raw && typeof raw === 'object' ? raw : DEFAULT_ARGS);
  window.__streamlitArgs = next;
  window.dispatchEvent(new CustomEvent('technicalHomeArgs', { detail: next }));
});


const Streamlit = {
  setFrameHeight(height) {
    const safeHeight = Math.max(640, Math.ceil(Number(height) || 640));
    if (safeHeight === this._lastFrameHeight) return;
    this._lastFrameHeight = safeHeight;
    window.parent.postMessage({
      isStreamlitMessage: true,
      type: 'streamlit:setFrameHeight',
      height: safeHeight
    }, '*');
  },
  setComponentValue(value) {
    window.parent.postMessage({
      isStreamlitMessage: true,
      type: 'streamlit:setComponentValue',
      value,
      dataType: 'json'
    }, '*');
  },
  setComponentReady() {
    window.parent.postMessage({
      isStreamlitMessage: true,
      type: 'streamlit:componentReady',
      apiVersion: 1
    }, '*');
  }
};

function makeEventId(prefix = 'event') {
  try {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  } catch (_) {}
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function emit(action, payload = {}) {
  const msg = { action, eventId: makeEventId(action), ...payload };
  console.log('[TECH HOME emit]', msg);  // F12 Console에서 확인
  Streamlit.setComponentValue(msg);
}
function Icon({ name, size = 21, stroke = 1.9 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    heart: <path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z"/>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-3.4 3.1-5.2 7.5-5.2s6.8 1.8 7.5 5.2"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.7-4L3 10"/><path d="M3 5v5h5"/><path d="M4 13a8 8 0 0 0 14.7 4L21 14"/><path d="M21 19v-5h-5"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    logout: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>,
    bookmark: <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4Z"/>,
  };
  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}
function Avatar({ name = '학생', large = false, accent = 'ink' }) {
  const initial = String(name).trim().slice(0, 1) || 'T';
  return <div className={`avatar ${large ? 'avatar-lg' : ''} avatar-${accent}`}>{initial}</div>;
}
function Flash({ flash }) {
  if (!flash) return null;
  const icon = flash.type === 'success' ? 'check' : flash.type === 'error' ? 'star' : 'grid';
  return <div className={`toast toast-${flash.type || 'info'}`}><Icon name={icon} size={17}/><span>{flash.text}</span></div>;
}
function Login({ flash }) {
  const [studentId, setStudentId] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [pending, setPending] = useState('');
  const canStudent = studentId.trim().length > 0;

  useEffect(() => {
    if (flash) setPending('');
  }, [flash?.type, flash?.text]);

  const submitStudent = (e) => {
    e?.preventDefault?.();
    const sid = studentId.trim();
    if (!sid || pending) return;
    setPending('student');
    emit('student_login', { studentId: sid });
  };

  const submitTeacher = (e) => {
    e?.preventDefault?.();
    if (!teacherPassword || pending) return;
    setPending('teacher');
    emit('teacher_login', { password: teacherPassword });
  };

  return <main className="auth-page">
    <div className="auth-glow glow-one"/><div className="auth-glow glow-two"/>
    <section className="auth-brand"><div className="brand-mark">TH</div><div><b>TECH · HOME</b><span>LEARNING PORTFOLIO</span></div></section>
    <div className="auth-layout">
      <section className="auth-showcase">
        <div className="showcase-tag"><span/> 2026 · SEMESTER 01</div>
        <h1>배운 것을<br/><i>기록하고</i>,<br/>성장으로 남기다.</h1>
        <p>기술·가정 한 학기 1—17주차의 학습 과정과 생각을 나만의 포트폴리오로 쌓아보세요.</p>
        <div className="story-row"><div className="story story-active"><div className="story-ring"><div className="story-core">01</div></div><small>이번 주</small></div>{[2,3,4,5].map(n=><div className="story" key={n}><div className="story-ring muted"><span>{n}</span></div><small>WEEK {n}</small></div>)}</div>
      </section>
      <section className="auth-card">
        <div className="auth-card-head"><span className="eyebrow">WELCOME BACK</span><h2>포트폴리오에<br/>들어오세요.</h2><p>학번으로 학생 공간을 시작하거나 교사 모드로 관리하세요.</p></div>
        <form className="login-field" onSubmit={submitStudent} noValidate><label htmlFor="student-id">학생 로그인</label><div className="input-wrap"><Icon name="user"/><input id="student-id" value={studentId} onChange={e=>setStudentId(e.target.value.replace(/[^0-9]/g,'').slice(0,8))} placeholder="학번  예) 1701" inputMode="numeric" autoComplete="username"/><button type="submit" disabled={!canStudent || pending!==''} aria-label="학생 로그인"><Icon name="arrow"/></button></div></form>
        <div className="or-line"><span>TEACHER</span></div>
        <form className="login-field" onSubmit={submitTeacher} noValidate><label htmlFor="teacher-password">교사 관리자</label><div className="input-wrap"><Icon name="lock"/><input id="teacher-password" type="password" value={teacherPassword} onChange={e=>setTeacherPassword(e.target.value)} placeholder="관리자 비밀번호" autoComplete="current-password"/><button type="submit" disabled={!teacherPassword || pending!==''} aria-label="교사 로그인"><Icon name="arrow"/></button></div></form>
        <Flash flash={flash}/>
        <div className="auth-note"><Icon name="lock" size={15}/><span>학번과 교사용 비밀번호는 안전하게 처리됩니다.</span></div>
      </section>
    </div>
    <footer className="auth-footer">TECH · HOME <span>·</span> Learning Portfolio</footer>
  </main>;
}
function SideRail({ student, active, onChange, teacher = false }) {
  const items = teacher ? [['dashboard','home','홈'],['students','grid','학생'],['csv','download','내보내기']] : [['home','home','홈'],['portfolio','grid','포트폴리오'],['summary','heart','나의 기록']];
  return <aside className="side-rail">
    <div className="rail-logo"><div className="brand-mark small">TH</div><span>TECH<br/>HOME</span></div>
    <nav className="rail-nav">{items.map(([key,icon,label])=><button key={key} className={active===key?'active':''} onClick={()=>onChange(key)}><Icon name={icon}/><span>{label}</span></button>)}</nav>
    <div className="rail-bottom"><div className="rail-profile"><Avatar name={student?.이름 || '교사'} /><div><b>{student?.이름 || '관리자'}</b><small>{teacher?'Teacher':`${student?.학년||''}학년 ${student?.반||''}반`}</small></div></div><button className="logout-icon" onClick={()=>emit('logout')} title="로그아웃"><Icon name="logout" size={18}/></button></div>
  </aside>;
}
function MobileNav({ active, onChange, teacher = false }) {
  const items = teacher ? [['dashboard','home','홈'],['students','grid','학생'],['csv','download','CSV']] : [['home','home','홈'],['portfolio','grid','포트폴리오'],['summary','heart','나의 기록']];
  return <nav className="mobile-nav">{items.map(([key,icon,label])=><button key={key} className={active===key?'active':''} onClick={()=>onChange(key)}><Icon name={icon}/><span>{label}</span></button>)}</nav>;
}
function WeekStories({ weeks, portfolio, selected, onSelect }) {
  return <div className="stories-strip"><div className="stories-title"><span>YOUR WEEKS</span><b>1—17</b></div><div className="stories-scroll">{weeks.map(w=>{
    const no=Number(w.주차); const done=portfolio.find(r=>Number(r.주차)===no)?.제출;
    return <button key={no} className={`story-item ${selected===no?'selected':''} ${done?'done':''}`} onClick={()=>onSelect(no)}><div className="week-story-ring"><div>{String(no).padStart(2,'0')}</div></div><small>W{no}</small></button>;
  })}</div></div>;
}
function StudentHome({ student, portfolio, weeks, onPortfolio }) {
  const submitted=portfolio.filter(r=>r.제출).length;
  const total=portfolio.reduce((s,r)=>s+(Number(r.점수)||0),0);
  const next=weeks.find(w=>!portfolio.find(r=>Number(r.주차)===Number(w.주차)));
  const latest=[...portfolio].filter(r=>r.제출).sort((a,b)=>Number(b.주차)-Number(a.주차)).slice(0,3);
  return <div className="feed-page">
    <section className="profile-banner"><div className="profile-main"><Avatar name={student.이름} large accent="warm"/><div><span className="eyebrow">MY PORTFOLIO</span><h1>{student.이름}<span>의 학습 기록</span></h1><p>{student.학년}학년 {student.반}반 · 학번 {student.학번}</p></div></div><div className="profile-stats"><div><b>{submitted}</b><span>제출 주차</span></div><div><b>{total}</b><span>누적 점수</span></div><div><b>{Math.round((submitted/17)*100)}%</b><span>진행률</span></div></div></section>
    <section className="progress-card"><div className="progress-top"><div><span className="eyebrow">SEMESTER PROGRESS</span><h2>이번 학기의 흐름</h2></div><span className="progress-percent">{Math.round((submitted/17)*100)}%</span></div><div className="progress-line"><i style={{width:`${Math.max(2,(submitted/17)*100)}%`}}/></div><div className="progress-bottom"><span>1주차</span><b>{submitted} / 17주차 완료</b><span>17주차</span></div></section>
    <div className="feed-grid">
      <article className="feed-card featured"><div className="feed-head"><Avatar name={student.이름}/><div><b>나의 포트폴리오</b><small>가장 최근 학습 기록</small></div><span className="dot-menu">•••</span></div><div className="featured-copy"><span className="mini-tag">NEXT STEP</span><h2>{next?`${next.주차}주차 기록을 시작해보세요.`:'17주차까지 모두 기록했습니다.'}</h2><p>{next?.학습목표 || '한 학기 동안 쌓은 생각과 성장을 다시 돌아보세요.'}</p><button onClick={()=>next?onPortfolio(next.주차):onPortfolio(17)}>{next?'기록 시작':'마지막 기록 보기'} <Icon name="arrow" size={17}/></button></div></article>
      <article className="feed-card weekly-card"><div className="feed-head"><div className="icon-tile"><Icon name="star" size={18}/></div><div><b>이번 주 요약</b><small>최근 3개 기록</small></div></div>{latest.length?latest.map(r=><button className="recent-row" key={r.주차} onClick={()=>onPortfolio(Number(r.주차))}><span>W{r.주차}</span><div><b>{String(r.제출내용||'').slice(0,46)||'학습 기록'}</b><small>{r.피드백||'교사 피드백을 기다리고 있어요.'}</small></div><Icon name="arrow" size={16}/></button>):<div className="empty-mini">아직 제출한 기록이 없습니다.</div>}</article>
    </div>
  </div>;
}
function PortfolioPage({ weeks, portfolio, selectedWeek, setSelectedWeek, content, setContent, submitting, onSubmit }) {
  const week=weeks.find(w=>Number(w.주차)===Number(selectedWeek));
  const record=portfolio.find(r=>Number(r.주차)===Number(selectedWeek));
  return <div className="portfolio-page">
    <WeekStories weeks={weeks} portfolio={portfolio} selected={Number(selectedWeek)} onSelect={setSelectedWeek}/>
    <div className="portfolio-layout">
      <section className="journal-card">
        <div className="journal-cover"><div className="cover-number">{String(selectedWeek).padStart(2,'0')}</div><div><span className="eyebrow">WEEK {selectedWeek}</span><h1>{week?.학습목표||`${selectedWeek}주차 학습 기록`}</h1></div><span className="cover-star">✦</span></div>
        <div className="journal-body"><div className="question-block"><span>ACTIVITY PROMPT</span><p>{week?.활동지질문||'이번 주 활동에서 배운 점과 나의 생각을 자유롭게 기록해보세요.'}</p></div><label>MY LEARNING NOTE</label><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="오늘 배운 것, 직접 해본 것, 어려웠던 점, 새롭게 생각한 것을 기록하세요."/><div className="journal-footer"><span>{record?.제출?`마지막 저장 ${record.수정일시||record.제출일시||'-'}`:'아직 제출하지 않았어요.'}</span><button className="ink-button" disabled={submitting||!content.trim()} onClick={onSubmit}>{submitting?'저장 중…':record?.제출?'수정하여 제출':'기록 제출'} <Icon name="arrow" size={17}/></button></div></div>
      </section>
      <aside className="portfolio-side"><div className="side-card score-card"><span className="eyebrow">THIS WEEK</span><strong>{record?.점수||'—'}<small> / {record?.배점||week?.배점||0}</small></strong><p>{record?.점수?'교사가 채점한 결과입니다.':'제출 후 교사 평가가 표시됩니다.'}</p></div><div className="side-card feedback-side"><span className="eyebrow">TEACHER NOTE</span>{record?.피드백?<><h3>이번 기록에 대한 피드백</h3><p>“{record.피드백}”</p></>:<><h3>아직 피드백이 없어요.</h3><p>교사가 기록을 확인하면 이곳에 한 줄 평이 표시됩니다.</p></>}</div></aside>
    </div>
  </div>;
}
function SummaryPage({ portfolio }) {
  const total=portfolio.reduce((s,r)=>s+(Number(r.점수)||0),0); const max=portfolio.reduce((s,r)=>s+(Number(r.배점)||0),0); const done=portfolio.filter(r=>r.제출).length;
  return <div className="summary-page"><div className="summary-hero"><div><span className="eyebrow">MY ARCHIVE</span><h1>한 학기의 기록.</h1><p>17개의 주차가 하나의 학습 이야기로 이어집니다.</p></div><div className="archive-number">{done}<small>/17</small></div></div><div className="summary-stat-grid"><div><span>누적 점수</span><b>{total}</b><small>점</small></div><div><span>총 배점</span><b>{max}</b><small>점</small></div><div><span>제출률</span><b>{Math.round((done/17)*100)}</b><small>%</small></div></div><section className="archive-list">{Array.from({length:17},(_,i)=>i+1).map(no=>{const r=portfolio.find(x=>Number(x.주차)===no);return <div className={`archive-row ${r?.제출?'done':''}`} key={no}><div className="archive-week">{String(no).padStart(2,'0')}</div><div className="archive-content"><b>{r?.제출내용?String(r.제출내용).slice(0,90):'아직 기록하지 않았습니다.'}</b><span>{r?.피드백||'학습 기록을 제출하면 교사 피드백이 표시됩니다.'}</span></div><div className="archive-score">{r?.점수||'—'}<small>{r?.점수?` / ${r.배점}`:''}</small></div><div className={`status-pill ${r?.제출?'done':''}`}>{r?.제출?'제출완료':'미제출'}</div></div>})}</section></div>;
}
function StudentApp({ args }) {
  const student=args.student||{}; const weeks=args.weeks||[]; const portfolio=args.portfolio||[];
  const [active,setActive]=useState('home'); const [selectedWeek,setSelectedWeek]=useState(Number(weeks[0]?.주차||1)); const [content,setContent]=useState(''); const [submitting,setSubmitting]=useState(false);
  const pendingSubmissionId=useRef(null);
  const record=portfolio.find(r=>Number(r.주차)===Number(selectedWeek));
  useEffect(()=>{setContent(record?.제출내용||'');pendingSubmissionId.current=null;setSubmitting(false);},[selectedWeek,record?.제출내용]);
  useEffect(()=>{if(args.result?.submissionId){pendingSubmissionId.current=null;setSubmitting(false);}else if(args.flash){setSubmitting(false);}},[args.result?.submissionId,args.flash]);
  const goPortfolio=(week)=>{if(week)setSelectedWeek(Number(week));setActive('portfolio');};
  const submit=()=>{if(submitting)return;setSubmitting(true);if(!pendingSubmissionId.current)pendingSubmissionId.current=makeEventId('submission');emit('student_submit',{week:Number(selectedWeek),content,submissionId:pendingSubmissionId.current});};
  return <div className="app-frame"><SideRail student={student} active={active} onChange={setActive}/><main className="main-canvas"><header className="topbar"><div className="mobile-brand"><div className="brand-mark small">TH</div><b>TECH · HOME</b></div><div className="topbar-context"><span>LEARNING PORTFOLIO</span><b>{active==='home'?'오늘의 기록':active==='portfolio'?`${selectedWeek}주차 포트폴리오`:'나의 아카이브'}</b></div><div className="topbar-actions"><button className="top-avatar" onClick={()=>setActive('summary')}><Avatar name={student.이름}/></button></div></header><Flash flash={args.flash}/><div className="content-wrap">{active==='home'&&<StudentHome student={student} portfolio={portfolio} weeks={weeks} onPortfolio={goPortfolio}/>} {active==='portfolio'&&<PortfolioPage weeks={weeks} portfolio={portfolio} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} content={content} setContent={setContent} submitting={submitting} onSubmit={submit}/>} {active==='summary'&&<SummaryPage portfolio={portfolio}/>}</div></main><MobileNav active={active} onChange={setActive}/></div>;
}
function TeacherDashboard({ dashboard, onStudent }) {
  const max=Math.max(1,...(dashboard.classStats||[]).map(x=>Number(x.제출건수)||0));
  return <div className="teacher-dashboard"><section className="teacher-welcome"><div><span className="eyebrow">TEACHER SPACE · 2026</span><h1>학생들의 학습을<br/><i>한눈에</i> 살펴보세요.</h1><p>포트폴리오 기록과 평가 흐름을 한 곳에서 관리합니다.</p></div><div className="teacher-orbit"><div className="orbit-core"><Icon name="star" size={28}/></div><span>01—17</span></div></section><div className="admin-metrics"><MetricCard label="등록 학생" value={dashboard.totalStudents} note="학생명단 기준"/><MetricCard label="제출 학생" value={dashboard.submittedStudents} note={`${dashboard.submissionRate}% 참여`}/><MetricCard label="평균 점수" value={dashboard.averageScore} note="전체 제출 기준"/><MetricCard label="학기" value="17주" note="포트폴리오 기간"/></div><div className="admin-grid"><section className="admin-card"><div className="admin-card-head"><div><span className="eyebrow">CLASS OVERVIEW</span><h2>반별 활동량</h2></div><span className="muted">제출 건수</span></div>{dashboard.classStats?.length?dashboard.classStats.map((r,i)=><div className="class-bar" key={`${r.학년}-${r.반}-${i}`}><div><b>{r.학년}학년 {r.반}반</b><span>{r.제출건수}건 · 평균 {r.평균점수}점</span></div><div className="bar-line"><i style={{width:`${Math.max(4,(r.제출건수/max)*100)}%`}}/></div></div>):<Empty text="아직 제출 데이터가 없습니다."/>}</section><section className="admin-card recent-admin"><div className="admin-card-head"><div><span className="eyebrow">RECENT WORK</span><h2>최근 포트폴리오</h2></div></div>{(dashboard.portfolio||[]).slice(0,6).map((r,i)=><button className="admin-student-row" key={`${r.제출ID||r.학번}-${r.주차}-${i}`} onClick={()=>onStudent(r.학번)}><Avatar name={r.이름}/><div><b>{r.이름} · {r.주차}주차</b><span>{String(r.제출내용||'').slice(0,50)||'학습 기록'}</span></div><strong>{r.점수||'—'}<small>{r.배점?` / ${r.배점}`:''}</small></strong></button>)}{!(dashboard.portfolio||[]).length&&<Empty text="최근 기록이 없습니다."/>}</section></div></div>;
}
function MetricCard({label,value,note}){return <div className="admin-metric"><span>{label}</span><b>{value}</b><small>{note}</small></div>}
function Empty({text}){return <div className="empty-mini">{text}</div>}
function TeacherStudents({ dashboard, initialStudent = '' }) {
  const students=dashboard.students||[]; const portfolio=dashboard.portfolio||[]; const [sid,setSid]=useState(''); const [week,setWeek]=useState(1); const [score,setScore]=useState(0); const [feedback,setFeedback]=useState('');
  const filtered=useMemo(()=>portfolio.find(r=>String(r.학번)===String(sid)&&Number(r.주차)===Number(week)),[portfolio,sid,week]);
  useEffect(()=>{if(filtered){setScore(Number(filtered.점수)||0);setFeedback(filtered.피드백||'');}else{setScore(0);setFeedback('');}},[filtered?.제출ID,sid,week]);
  useEffect(()=>{if(initialStudent)setSid(String(initialStudent));},[initialStudent]);
  const selected=students.find(s=>String(s.학번)===String(sid));
  const save=()=>emit('teacher_grade_save',{studentId:sid,week:Number(week),score:Number(score),feedback});
  return <div className="teacher-students"><div className="student-picker"><div><span className="eyebrow">ASSESSMENT</span><h1>학생 기록과 피드백</h1><p>학생의 제출 내용을 읽고 주차별 평가를 남겨보세요.</p></div><div className="picker-controls"><select value={sid} onChange={e=>setSid(e.target.value)}><option value="">학생 선택</option>{students.map(s=><option key={s.학번} value={s.학번}>{s.학번} · {s.이름} · {s.학년}-{s.반}</option>)}</select><select value={week} onChange={e=>setWeek(Number(e.target.value))}>{Array.from({length:17},(_,i)=><option key={i+1} value={i+1}>{i+1}주차</option>)}</select></div></div>{selected?<div className="assessment-layout"><section className="work-paper"><div className="paper-head"><Avatar name={selected.이름} large accent="cool"/><div><span>{selected.학년}학년 {selected.반}반 · {selected.학번}</span><h2>{selected.이름}의 {week}주차 기록</h2></div><span className="paper-week">W{week}</span></div>{filtered?<div className="student-answer">{filtered.제출내용||'작성 내용이 없습니다.'}</div>:<Empty text="이 학생의 해당 주차 제출 기록이 없습니다."/>}</section><aside className="assessment-card"><span className="eyebrow">TEACHER REVIEW</span><h2>평가 남기기</h2><label>점수 <small> / {filtered?.배점||10}점</small></label><input className="grade-input" type="number" min="0" max={filtered?.배점||10} value={score} onChange={e=>setScore(e.target.value)}/><label>한 줄 피드백</label><textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="학생의 성장을 구체적으로 칭찬하거나 다음 학습 방향을 적어주세요."/><button className="ink-button full" onClick={save}><Icon name="check" size={17}/> 평가 저장</button></aside></div>:<div className="empty-state large">학생을 선택하면 제출 기록과 평가 영역이 나타납니다.</div>}</div>;
}
function CsvDownload({ portfolio, students }) {
  const headers=['학번','이름','학년','반',...Array.from({length:17},(_,i)=>`${i+1}주차`),'총점']; const map=new Map(); (students||[]).forEach(s=>{const id=String(s.학번||'');if(id)map.set(id,{학번:id,이름:s.이름||'',학년:s.학년||'',반:s.반||''});}); (portfolio||[]).forEach(r=>{const id=String(r.학번);if(!map.has(id))map.set(id,{학번:id,이름:r.이름||'',학년:r.학년||'',반:r.반||''});const item=map.get(id);item[`${r.주차}주차`]=r.점수||'';item.총점=(Number(item.총점)||0)+(Number(r.점수)||0);}); const csv=[headers,...[...map.values()].map(row=>headers.map(h=>row[h]??''))].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'); const href=`data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(csv)}`;
  return <div className="export-page"><section className="export-hero"><div><span className="eyebrow">DATA EXPORT</span><h1>학습 데이터를<br/><i>가져가세요.</i></h1><p>전체 학생의 1—17주차 점수와 총점을 Excel에서 바로 열 수 있는 CSV로 내보냅니다.</p></div><div className="export-icon"><Icon name="download" size={42}/></div></section><div className="export-note"><div><b>포함 데이터</b><span>학번 · 이름 · 학년 · 반 · 1—17주차 점수 · 총점</span></div><a href={href} download="기술가정_포트폴리오_성적표.csv" className="ink-button"><Icon name="download" size={17}/> CSV 다운로드</a></div></div>;
}
function TeacherApp({ args }) {
  const dashboard=args.teacher||{students:[],portfolio:[],classStats:[]}; const [active,setActive]=useState('dashboard'); const [studentJump,setStudentJump]=useState('');
  const goStudent=(sid)=>{setStudentJump(String(sid));setActive('students');};
  return <div className="app-frame"><SideRail student={{이름:'관리자'}} teacher active={active} onChange={setActive}/><main className="main-canvas"><header className="topbar"><div className="mobile-brand"><div className="brand-mark small">TH</div><b>TECH · HOME</b></div><div className="topbar-context"><span>TEACHER SPACE</span><b>{active==='dashboard'?'종합 현황':active==='students'?'학생 평가':'CSV 내보내기'}</b></div><div className="topbar-actions"><button className="refresh-button" onClick={()=>emit('teacher_refresh')}><Icon name="refresh" size={17}/><span>새로고침</span></button><button className="top-avatar" onClick={()=>emit('logout')}><Avatar name="T" accent="cool"/></button></div></header><Flash flash={args.flash}/><div className="content-wrap">{active==='dashboard'&&<TeacherDashboard dashboard={dashboard} onStudent={goStudent}/>} {active==='students'&&<TeacherStudents dashboard={dashboard} initialStudent={studentJump}/>}  {active==='csv'&&<CsvDownload portfolio={dashboard.portfolio||[]} students={dashboard.students||[]}/>}</div></main><MobileNav active={active} onChange={setActive} teacher/></div>;
}
function App({ args = DEFAULT_ARGS }) {
  const [streamlitArgs, setStreamlitArgs] = useState(args || DEFAULT_ARGS);
  useEffect(() => {
    const onArgs = (event) => {
      const next = event.detail && typeof event.detail === 'object' ? event.detail : DEFAULT_ARGS;
      setStreamlitArgs(next);
    };
    window.addEventListener('technicalHomeArgs', onArgs);
    // Pick up an args payload that arrived before React effects mounted.
    if (window.__streamlitArgs) setStreamlitArgs(window.__streamlitArgs);
    return () => window.removeEventListener('technicalHomeArgs', onArgs);
  }, []);
  useEffect(()=>{
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.getElementById('root');
        if (!root) return;
        const height = Math.max(640, Math.ceil(root.getBoundingClientRect().height || root.scrollHeight || 640));
        Streamlit.setFrameHeight(height);
      });
    };
    resize();
    const root = document.getElementById('root');
    const obs = typeof ResizeObserver !== 'undefined' && root ? new ResizeObserver(resize) : null;
    if (obs) obs.observe(root);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); if (obs) obs.disconnect(); window.removeEventListener('resize', resize); };
  }, [streamlitArgs.role, streamlitArgs.active]);
  if(streamlitArgs.role==='student') return <StudentApp args={streamlitArgs}/>;
  if(streamlitArgs.role==='teacher') return <TeacherApp args={streamlitArgs}/>;
  return <Login flash={streamlitArgs.flash}/>;
}


// Standalone deployment entrypoint: dist/App.jsx is not a Vite module.
// Install the message bridge first, announce readiness, then render React.
if (window.parent !== window) Streamlit.setComponentReady();

const technicalHomeRoot = document.getElementById('root');
if (technicalHomeRoot && window.ReactDOM && typeof ReactDOM.createRoot === 'function') {
  ReactDOM.createRoot(technicalHomeRoot).render(
    React.createElement(App, { args: window.__streamlitArgs || DEFAULT_ARGS })
  );
}
