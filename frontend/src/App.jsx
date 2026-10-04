import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Streamlit } from 'streamlit-component-lib';
import './styles.css';

const DEFAULT_ARGS = { role: null, student: null, weeks: [], portfolio: [], teacher: null, flash: null, result: null, worksheet: null, uploadResult: null, games: null };
function makeEventId(prefix = 'event') {
  try {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  } catch (_) {}
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function emit(action, payload = {}) {
  Streamlit.setComponentValue({ action, eventId: makeEventId(action), ...payload });
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

  // Python이 처리한 결과가 다시 내려오면 로그인 버튼 잠금을 해제합니다.
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
  const items = teacher ? [['dashboard','home','홈'],['games','star','게임'],['worksheets','plus','학습지'],['students','grid','학생'],['csv','download','내보내기']] : [['home','home','홈'],['portfolio','grid','포트폴리오'],['games','star','게임'],['summary','heart','나의 기록']];
  return <aside className="side-rail">
    <div className="rail-logo"><div className="brand-mark small">TH</div><span>TECH<br/>HOME</span></div>
    <nav className="rail-nav">{items.map(([key,icon,label])=><button key={key} className={active===key?'active':''} onClick={()=>onChange(key)}><Icon name={icon}/><span>{label}</span></button>)}</nav>
    <div className="rail-bottom"><div className="rail-profile"><Avatar name={student?.이름 || '교사'} /><div><b>{student?.이름 || '관리자'}</b><small>{teacher?'Teacher':`${student?.학년||''}학년 ${student?.반||''}반`}</small></div></div><button className="logout-icon" onClick={()=>emit('logout')} title="로그아웃"><Icon name="logout" size={18}/></button></div>
  </aside>;
}
function MobileNav({ active, onChange, teacher = false }) {
  const items = teacher ? [['dashboard','home','홈'],['games','star','게임'],['worksheets','plus','학습지'],['students','grid','학생'],['csv','download','CSV']] : [['home','home','홈'],['portfolio','grid','포트폴리오'],['games','star','게임'],['summary','heart','나의 기록']];
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
  return <div className="app-frame"><SideRail student={student} active={active} onChange={setActive}/><main className="main-canvas"><header className="topbar"><div className="mobile-brand"><div className="brand-mark small">TH</div><b>TECH · HOME</b></div><div className="topbar-context"><span>LEARNING PORTFOLIO</span><b>{active==='home'?'오늘의 기록':active==='games'?'주차별 게임':active==='portfolio'?`${selectedWeek}주차 포트폴리오`:'나의 아카이브'}</b></div><div className="topbar-actions"><button className="top-avatar" onClick={()=>setActive('summary')}><Avatar name={student.이름}/></button></div></header><Flash flash={args.flash}/><div className="content-wrap">{active==='home'&&<StudentHome student={student} portfolio={portfolio} weeks={weeks} onPortfolio={goPortfolio}/>} {active==='portfolio'&&<PortfolioPage weeks={weeks} portfolio={portfolio} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} content={content} setContent={setContent} submitting={submitting} onSubmit={submit}/>} {active==='games'&&<StudentGames games={(args.games&&args.games.active)||[]} myRecords={(args.games&&args.games.records)||[]}/>} {active==='summary'&&<SummaryPage portfolio={portfolio}/>}</div></main><MobileNav active={active} onChange={setActive}/></div>;
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
/* ===== 주차별 학습지 및 포트폴리오 문제 업로드/관리 (WorksheetUploader 번들) =====
 * frontend/src/admin/WorksheetUploader.jsx 와 동일한 코드의 App.jsx 내장본.
 * dist/index.html(Babel standalone, 번들러 없음)에서도 동작하도록 import 없이
 * 이 파일 스코프의 emit / Icon / React hooks(useState..)를 직접 사용한다.
 * 원본 수정은 admin/WorksheetUploader.jsx 에서 한 뒤 이 블록에 동기화할 것.
 */
const WS_TYPE_LABEL = { quiz: '퀴즈/선택형', blank: '빈칸 채우기', matching: '사다리/선잇기', image: '사진 연상' };
function wsNewId(p = 'q') {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function wsCreateQuestion(t) {
  const base = { id: wsNewId(), prompt: '', points: 5, explanation: '' };
  if (t === 'quiz') return { ...base, type: 'quiz', options: ['', '', '', ''], answerIndex: 0 };
  if (t === 'blank') return { ...base, type: 'blank', template: '오늘 배운 [빈칸]에 대해 쓰세요.', answers: [''] };
  if (t === 'matching') return { ...base, type: 'matching', left: ['A', 'B'], right: ['1', '2'], pairs: { 0: 0, 1: 1 } };
  return { ...base, type: 'image', imageUrl: '', fileId: '', hint: '', answer: '' };
}
function wsReducer(s, a) {
  switch (a.type) {
    case 'LOAD':
      return { ...s, week: a.ws.week, title: a.ws.title || '', unit: a.ws.unit || '', guide: a.ws.guide || '', published: a.ws.published !== false, questions: a.ws.questions || [], selectedId: (a.ws.questions || [])[0]?.id || null };
    case 'META': return { ...s, ...a.patch };
    case 'ADD': {
      const q = wsCreateQuestion(a.qtype);
      return { ...s, questions: [...s.questions, q], selectedId: q.id };
    }
    case 'PATCH_Q':
      return { ...s, questions: s.questions.map((q) => (q.id === a.id ? { ...q, ...a.patch } : q)) };
    case 'REMOVE':
      return { ...s, questions: s.questions.filter((q) => q.id !== a.id), selectedId: null };
    case 'MOVE': {
      const i = s.questions.findIndex((q) => q.id === a.id);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= s.questions.length) return s;
      const arr = [...s.questions];
      const [t] = arr.splice(i, 1);
      arr.splice(j, 0, t);
      return { ...s, questions: arr };
    }
    case 'REORDER': {
      const arr = [...s.questions];
      const [t] = arr.splice(a.from, 1);
      arr.splice(a.to, 0, t);
      return { ...s, questions: arr };
    }
    case 'DUP': {
      const src = s.questions.find((q) => q.id === a.id);
      if (!src) return s;
      const copy = { ...JSON.parse(JSON.stringify(src)), id: `${src.id}-copy-${Date.now().toString(36)}` };
      return { ...s, questions: [...s.questions, copy] };
    }
    default: return s;
  }
}
function WSQEditor({ q, onPatch, week }) {
  const [busy, setBusy] = useState(false);
  return <div className="ws-editor">
    <label>질문<input value={q.prompt} onChange={(e) => onPatch({ prompt: e.target.value })} placeholder="문제를 입력하세요" /></label>
    <label>배점<input type="number" value={q.points} min={1} max={100} onChange={(e) => onPatch({ points: Number(e.target.value) })} /></label>
    {q.type === 'quiz' && <>
      {q.options.map((op, i) => <div key={i} className="ws-opt">
        <input type="radio" checked={q.answerIndex === i} onChange={() => onPatch({ answerIndex: i })} title="정답" />
        <input value={op} onChange={(e) => { const a = [...q.options]; a[i] = e.target.value; onPatch({ options: a }); }} placeholder={`보기 ${'ABCD'[i] || i + 1}`} />
        <button onClick={() => onPatch({ options: q.options.filter((_, j) => j !== i) })}>×</button>
      </div>)}
      <button className="ws-btn" onClick={() => onPatch({ options: [...q.options, ''] })}>+ 보기 추가</button>
      <label>해설<textarea value={q.explanation || ''} onChange={(e) => onPatch({ explanation: e.target.value })} /></label>
    </>}
    {q.type === 'blank' && <>
      <label>지문 (빈칸은 <code>[빈칸]</code>으로)<textarea value={q.template} onChange={(e) => onPatch({ template: e.target.value })} /></label>
      {q.answers.map((a, i) => <input key={i} value={a} onChange={(e) => { const c = [...q.answers]; c[i] = e.target.value; onPatch({ answers: c }); }} placeholder={`모범답안 ${i + 1}`} />)}
      <button className="ws-btn" onClick={() => onPatch({ answers: [...q.answers, ''] })}>+ 답안 추가</button>
    </>}
    {q.type === 'matching' && <>
      <div className="ws-row">
        <div>
          {q.left.map((v, i) => <input key={i} value={v} onChange={(e) => { const c = [...q.left]; c[i] = e.target.value; onPatch({ left: c }); }} placeholder={`좌 A${i + 1}`} />)}
          <button className="ws-btn" onClick={() => onPatch({ left: [...q.left, ''] })}>+ 좌 항목</button>
        </div>
        <div>
          {q.right.map((v, i) => <input key={i} value={v} onChange={(e) => { const c = [...q.right]; c[i] = e.target.value; onPatch({ right: c }); }} placeholder={`우 ${i + 1}`} />)}
          <button className="ws-btn" onClick={() => onPatch({ right: [...q.right, ''] })}>+ 우 항목</button>
        </div>
      </div>
      <small>정답 매칭: 좌 인덱스→우 인덱스 JSON</small>
      <input value={JSON.stringify(q.pairs)} onChange={(e) => { try { onPatch({ pairs: JSON.parse(e.target.value) }); } catch (_) {} }} />
    </>}
    {q.type === 'image' && <>
      {q.imageUrl && <img src={q.imageUrl} alt="" className="ws-img" />}
      <input type="file" accept="image/*" disabled={busy} onChange={(e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        setBusy(true);
        const r = new FileReader();
        r.onload = () => { emit('teacher_worksheet_image', { week, fileName: f.name, fileBase64: String(r.result).split(',')[1], mimeType: f.type }); setBusy(false); };
        r.onerror = () => setBusy(false);
        r.readAsDataURL(f);
      }} />
      <small>{busy ? '업로드 중… (Drive 저장 후 URL 자동 바인딩)' : q.fileId ? `fileId: ${q.fileId}` : 'Drive 지정 폴더에 저장됩니다.'}</small>
      <label>힌트<input value={q.hint} onChange={(e) => onPatch({ hint: e.target.value })} /></label>
      <label>정답<input value={q.answer} onChange={(e) => onPatch({ answer: e.target.value })} /></label>
    </>}
  </div>;
}
function WorksheetPreview({ ws }) {
  return <div className="ws-preview">
    <div className="ws-card">
      <span className="eyebrow">WEEK {ws.week} · {ws.unit}</span>
      <h2>{ws.title || `${ws.week}주차 학습지`}</h2>
      <p>{ws.guide}</p>
    </div>
    {ws.questions.map((q, i) => <div key={q.id} className="ws-card">
      <span className="ws-badge">{WS_TYPE_LABEL[q.type]} · {q.points}점</span>
      <h3>Q{i + 1}. {q.prompt}</h3>
      {q.type === 'quiz' && q.options.map((o, j) => <label key={j} className="ws-pv-opt"><input type="radio" name={q.id} />{'ABCD'[j] || j + 1}. {o}</label>)}
      {q.type === 'blank' && <p>{q.template.split('[빈칸]').map((t, k, arr) => (k < arr.length - 1 ? <span key={k}>{t}<input className="ws-blank" placeholder="답" /></span> : t))}</p>}
      {q.type === 'matching' && <div className="ws-row">
        <div>{q.left.map((v, k) => (<div key={k} className="ws-chip">A{k + 1}. {v}</div>))}</div>
        <div>{q.right.map((v, k) => (<div key={k} className="ws-chip">● {v}</div>))}</div>
      </div>}
      {q.type === 'image' && <>
        {q.imageUrl && <img src={q.imageUrl} className="ws-img" alt="" />}
        <p className="ws-hint">힌트: {q.hint}</p>
        <input placeholder="연상되는 답을 쓰세요" />
      </>}
    </div>)}
  </div>;
}
function WorksheetUploader({ weeks, initial, uploadResult }) {
  const firstWeek = Number((weeks && weeks[0] && weeks[0].주차) || 1);
  const [s, d] = useReducer(wsReducer, { week: firstWeek, title: '', unit: '', guide: '', published: true, questions: [], selectedId: null, preview: false });
  const [drag, setDrag] = useState(null);
  const sel = (s.questions.find((q) => q.id === s.selectedId)) || null;
  useEffect(() => { if (initial) d({ type: 'LOAD', ws: initial }); }, [initial && initial.week, initial && initial.updatedAt]);
  useEffect(() => { if (uploadResult && uploadResult.fileId && sel && sel.type === 'image') d({ type: 'PATCH_Q', id: sel.id, patch: { fileId: uploadResult.fileId, imageUrl: uploadResult.viewUrl } }); }, [uploadResult && uploadResult.fileId]);
  const patch = (p) => { if (sel) d({ type: 'PATCH_Q', id: sel.id, patch: p }); };
  const current = { week: s.week, title: s.title, unit: s.unit, guide: s.guide, published: s.published, questions: s.questions };
  return <div className="ws-wrap">
    <header className="ws-top">
      <div><span className="eyebrow">WEEKLY WORKSHEET · ADMIN</span><h1>주차별 학습지 관리</h1></div>
      <div className="ws-top-actions">
        <select value={s.week} onChange={(e) => { const w = Number(e.target.value); d({ type: 'META', patch: { week: w } }); emit('teacher_worksheet_load', { week: w }); }}>
          {Array.from({ length: 17 }, (_, i) => {
            const found = (weeks || []).find((w) => Number(w.주차) === i + 1);
            return (<option key={i + 1} value={i + 1}>{i + 1}주차 {found ? found.학습목표 : ''}</option>);
          })}
        </select>
        <button className={s.preview ? 'ws-btn' : 'ws-btn primary'} onClick={() => d({ type: 'META', patch: { preview: !s.preview } })}>{s.preview ? '편집으로' : '미리보기'}</button>
        <button className="ws-btn primary" onClick={() => emit('teacher_worksheet_save', { worksheet: current })}>Sheets에 저장</button>
      </div>
    </header>
    {!s.preview ? <>
      <section className="ws-card">
        <label>학습지 제목<input value={s.title} onChange={(e) => d({ type: 'META', patch: { title: e.target.value } })} placeholder="예: 2주차 제작·생존 기술" /></label>
        <div className="ws-row">
          <label>단원명<input value={s.unit} onChange={(e) => d({ type: 'META', patch: { unit: e.target.value } })} placeholder="예: II. 기술의 세계" /></label>
          <label className="ws-check"><input type="checkbox" checked={s.published} onChange={(e) => d({ type: 'META', patch: { published: e.target.checked } })} />학생에게 공개</label>
        </div>
        <label>기본 안내 문구<textarea value={s.guide} onChange={(e) => d({ type: 'META', patch: { guide: e.target.value } })} placeholder="학생에게 보여줄 안내문" /></label>
      </section>
      <div className="ws-cols">
        <aside className="ws-card">
          <div className="ws-list-head">
            <b>문제 목록 ({s.questions.length})</b>
            <div className="ws-add">
              {['quiz', 'blank', 'matching', 'image'].map((t) => <button key={t} onClick={() => d({ type: 'ADD', qtype: t })}>+ {WS_TYPE_LABEL[t]}</button>)}
            </div>
          </div>
          {s.questions.map((q, i) => <div key={q.id} draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag !== null && drag !== i) d({ type: 'REORDER', from: drag, to: i }); setDrag(null); }}
            className={`ws-qrow ${q.id === s.selectedId ? 'on' : ''}`}
            onClick={() => d({ type: 'META', patch: { selectedId: q.id } })}>
            <span className="ws-badge">{WS_TYPE_LABEL[q.type]}</span>
            <b>{i + 1}. {q.prompt.slice(0, 24) || '(제목 없음)'}</b>
            <span className="ws-mini">{q.points}점 · 드래그 또는 ▲▼로 이동</span>
            <div className="ws-rowbtns">
              <button onClick={(e) => { e.stopPropagation(); d({ type: 'MOVE', id: q.id, dir: -1 }); }}>▲</button>
              <button onClick={(e) => { e.stopPropagation(); d({ type: 'MOVE', id: q.id, dir: 1 }); }}>▼</button>
              <button onClick={(e) => { e.stopPropagation(); d({ type: 'DUP', id: q.id }); }}>복제</button>
              <button onClick={(e) => { e.stopPropagation(); d({ type: 'REMOVE', id: q.id }); }}>삭제</button>
            </div>
          </div>)}
          {!s.questions.length && <p className="ws-empty">문제를 추가하세요. 드래그 또는 ▲▼로 순서 변경.</p>}
        </aside>
        <section className="ws-card">
          {sel ? <WSQEditor q={sel} onPatch={patch} week={s.week} /> : <p className="ws-empty">왼쪽에서 문제를 선택하세요.</p>}
        </section>
      </div>
    </> : <WorksheetPreview ws={current} />}
  </div>;
}
/* ===== WorksheetUploader 번들 끝 ===== */

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



function TeacherApp({ args }) {
  const dashboard=args.teacher||{students:[],portfolio:[],classStats:[]}; const [active,setActive]=useState('dashboard'); const [studentJump,setStudentJump]=useState('');
  const goStudent=(sid)=>{setStudentJump(String(sid));setActive('students');};
  return <div className="app-frame"><SideRail student={{이름:'관리자'}} teacher active={active} onChange={setActive}/><main className="main-canvas"><header className="topbar"><div className="mobile-brand"><div className="brand-mark small">TH</div><b>TECH · HOME</b></div><div className="topbar-context"><span>TEACHER SPACE</span><b>{active==='dashboard'?'종합 현황':active==='worksheets'?'학습지 관리':active==='games'?'주차별 게임':active==='students'?'학생 평가':'CSV 내보내기'}</b></div><div className="topbar-actions"><button className="refresh-button" onClick={()=>emit('teacher_refresh')}><Icon name="refresh" size={17}/><span>새로고침</span></button><button className="top-avatar" onClick={()=>emit('logout')}><Avatar name="T" accent="cool"/></button></div></header><Flash flash={args.flash}/><div className="content-wrap">{active==='dashboard'&&<TeacherDashboard dashboard={dashboard} onStudent={goStudent}/>} {active==='students'&&<TeacherStudents dashboard={dashboard} initialStudent={studentJump}/>} {active==='worksheets'&&<WorksheetUploader weeks={args.weeks||[]} initial={args.worksheet||null} uploadResult={args.uploadResult||null}/>} {active==='games'&&<TeacherGames weeks={args.weeks||[]} configs={(args.games&&args.games.configs)||[]} records={(args.games&&args.games.records)||[]}/>} {active==='csv'&&<CsvDownload portfolio={dashboard.portfolio||[]} students={dashboard.students||[]}/>}</div></main><MobileNav active={active} onChange={setActive} teacher/></div>;
}
function App({ args = DEFAULT_ARGS }) {
  const streamlitArgs = args || DEFAULT_ARGS;
  useEffect(()=>{
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.getElementById('root');
        const height = Math.max(640, Math.ceil(root?.scrollHeight || document.body.scrollHeight || 640));
        Streamlit.setFrameHeight(height);
      });
    };
    resize();
    const root = document.getElementById('root') || document.body;
    const obs = new ResizeObserver(resize);
    obs.observe(root);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); obs.disconnect(); window.removeEventListener('resize', resize); };
  }, [streamlitArgs.role]);
  if(streamlitArgs.role==='student') return <StudentApp args={streamlitArgs}/>;
  if(streamlitArgs.role==='teacher') return <TeacherApp args={streamlitArgs}/>;
  return <Login flash={streamlitArgs.flash}/>;
}
export default App;

