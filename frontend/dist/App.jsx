const { useEffect, useMemo, useRef, useState } = React;
const Streamlit = {
  setFrameHeight: (height) => window.parent.postMessage({isStreamlitMessage:true,type:'streamlit:setFrameHeight',height}, '*'),
  setComponentValue: (value) => window.parent.postMessage({isStreamlitMessage:true,type:'streamlit:setComponentValue',value}, '*')
};

const WORDS = ['데이터','특성','정리','배열','통일된 모양','쉽게 찾을','관계','효율적으로 관리','기준','소프트웨어 개발 전문가','시스템 SW 개발자','응용 SW 개발자'];
const DEFAULT_RESULT = {score:0,maxScore:20,percent:0,graded:false,answers:{},feedback:[]};

let ACTIVE_DRAG_WORD = '';
function DropZone({id,value,onDrop,onClear,placeholder='빈칸',small=false}) {
  return <div className={`drop-zone ${value?'filled':''} ${small?'small':''}`} data-drop-id={id}
    onPointerUp={()=>{if(ACTIVE_DRAG_WORD){onDrop(id,ACTIVE_DRAG_WORD);ACTIVE_DRAG_WORD=''}}}
    onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); const w=e.dataTransfer.getData('text/plain'); if(w) onDrop(id,w)}}
    onDoubleClick={()=>value&&onClear(id)} title={value?'두 번 탭하면 지웁니다':''}>{value||placeholder}</div>;
}

function WordBank({used,onPick}) {
  const remaining=WORDS.filter(w=>!used.includes(w));
  const start=(e,w)=>{e.dataTransfer.setData('text/plain',w);};
  return <section className="wordbank card">
    <div className="section-kicker">단어 보관함</div><div className="word-count">남은 단어 <b>{remaining.length}</b>개</div>
    <div className="word-grid">{remaining.map(w=><button key={w} draggable onDragStart={e=>start(e,w)} onPointerDown={()=>{ACTIVE_DRAG_WORD=w}} onPointerUp={()=>{onPick(w);ACTIVE_DRAG_WORD=''}} onClick={()=>onPick(w)} className="word-chip">{w}</button>)}</div>
    <div className="hint">클릭하거나 손가락으로 끌어 빈칸에 놓으세요. 빈칸을 두 번 탭하면 비울 수 있습니다.</div>
  </section>
}

function Activity1({list,onChange}) {
  const rows=list?.length?list:[{item:'',person:'',done:false},{item:'',person:'',done:false}];
  return <div className="activity-card"><div className="activity-title">활동 1 · 목록(List) 만들기 실습</div><p>우리 모둠 준비물 체크리스트</p><table className="input-table"><thead><tr><th>순번</th><th>점검 및 준비 항목</th><th>담당자</th><th>완료</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{i+2}</td><td><input value={r.item} onChange={e=>{const x=[...rows];x[i]={...x[i],item:e.target.value};onChange(x)}} placeholder="점검 항목을 입력하세요"/></td><td><input value={r.person} onChange={e=>{const x=[...rows];x[i]={...x[i],person:e.target.value};onChange(x)}} placeholder="담당 친구"/></td><td><input type="checkbox" checked={!!r.done} onChange={e=>{const x=[...rows];x[i]={...x[i],done:e.target.checked};onChange(x)}}/></td></tr>)}</tbody></table></div>
}

function Activity2({rows,onChange}) {
  return <div className="activity-card"><div className="activity-title">활동 2 · 표(Table) 만들기 실습</div><p>우리 모둠 친구 프로필 데이터</p><table className="input-table"><thead><tr><th>번호</th><th>친구 이름</th><th>생일 (월/일)</th><th>취미 및 특기</th><th>모둠 내 역할</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{i+2}</td>{['name','birthday','hobby','role'].map(k=><td key={k}><input value={r[k]} onChange={e=>{const x=[...rows];x[i]={...x[i],[k]:e.target.value};onChange(x)}} placeholder={k==='name'?'이름':k==='birthday'?'생일':k==='hobby'?'취미':'역할'}/></td>)}</tr>)}</tbody></table></div>
}

function Activity3({tree,onChange}) {
  const drop=(key,word)=>onChange({...tree,[key]:word});
  return <div className="activity-card"><div className="activity-title">활동 3 · 다이어그램 만들기</div><p>제시문을 읽고 계층형 다이어그램의 빈칸을 채우세요.</p><div className="diagram"><div className="node root">최상위 직무 분류<br/><DropZone id="d0" value={tree.root} onDrop={drop} onClear={k=>onChange({...tree,[k]:''})} placeholder="빈칸"/></div><div className="branch-row"><div><div className="node">하위 분류 1<br/><DropZone id="d1" value={tree.left} onDrop={drop} onClear={k=>onChange({...tree,[k]:''})} placeholder="빈칸"/></div><div className="leaf">운영체제 프로그래머</div><div className="leaf">임베디드 프로그래머</div></div><div><div className="node">하위 분류 2<br/><DropZone id="d2" value={tree.right} onDrop={drop} onClear={k=>onChange({...tree,[k]:''})} placeholder="빈칸"/></div><div className="leaf">응용 SW 프로그래머</div><div className="leaf">네트워크 프로그래머</div><div className="leaf">모바일 게임 프로그래머</div></div></div></div></div>
}

function Activity4({note,onChange}) {
  const data=[['3호선','4월',3,'경복궁, 창덕궁, 종묘'],['2호선','5월',1,'덕수궁'],['4호선','6월',2,'전쟁기념관, 국립중앙박물관']];
  return <div className="activity-card"><div className="activity-title">활동 4 · 체험학습 계획 구조화 및 통계 막대그래프</div><p>호선별 방문 장소 수를 비교해 봅니다.</p><div className="bars">{data.map(([line,month,n,places])=><div className="bar-row" key={line}><span>{line} ({month})</span><div className="bar"><i style={{width:`${n/3*100}%`}}></i></div><b>{n}곳</b><small>{places}</small></div>)}</div><textarea value={note} onChange={e=>onChange(e.target.value)} placeholder="자신이 정리한 구조화 내용(목록/표/노선 흐름)을 자유롭게 기록해 보세요..."/></div>
}

function App({args={}}) {
  const [student,setStudent]=useState({id:'',name:'',className:''});
  const [tab,setTab]=useState('worksheet');
  const [answers,setAnswers]=useState({q1:'',q2:'',q3:'',q4:'',r1:'',r2:'',r4:'',listRule:''});
  const [list,setList]=useState([{item:'',person:'',done:false},{item:'',person:'',done:false}]);
  const [rows,setRows]=useState([{name:'',birthday:'',hobby:'',role:''},{name:'',birthday:'',hobby:'',role:''}]);
  const [tree,setTree]=useState({root:'',left:'',right:''});
  const [note,setNote]=useState('');
  const [componentArgs,setComponentArgs]=useState(args.result ? args : (window.__streamlitArgs || {}));
  useEffect(()=>{ const h=e=>setComponentArgs(e.detail||{}); window.addEventListener('streamlitArgs',h); return ()=>window.removeEventListener('streamlitArgs',h); },[]);
  const [result,setResult]=useState((componentArgs.result)||DEFAULT_RESULT);
  const [submitting,setSubmitting]=useState(false);
  const submissionIdRef=useRef(null);
  const used=useMemo(()=>Object.values(answers).filter(Boolean),[answers]);

  useEffect(()=>{ if(componentArgs.result) { setResult(componentArgs.result); setSubmitting(false); submissionIdRef.current=null; } },[componentArgs.result]);
  useEffect(()=>{Streamlit.setFrameHeight(document.body.scrollHeight+20)},[tab,result,answers,list,rows,tree,note]);

  const setDrop=(id,word)=>setAnswers(a=>({...a,[id]:word}));
  const clearDrop=id=>setAnswers(a=>({...a,[id]:''}));
  const pickWord=word=>{ const target=['q1','q2','q3','q4','r1','r2','r4','listRule'].find(k=>!answers[k]); if(target) setDrop(target,word); };
  const submit=()=>{
    if(submitting) return;
    setSubmitting(true);
    submissionIdRef.current=submissionIdRef.current || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    Streamlit.setComponentValue({action:'submit',submissionId:submissionIdRef.current,student,answers,activities:{list,rows,tree,note},submittedAt:new Date().toISOString()});
  };
  const saveProgress=()=>Streamlit.setComponentValue({action:'progress',student,answers,activities:{list,rows,tree,note}});
  const reset=()=>{submitLock.current=false; setAnswers({q1:'',q2:'',q3:'',q4:'',r1:'',r2:'',r4:'',listRule:''});setResult(DEFAULT_RESULT);setTab('worksheet');};

  return <main className="app-shell">
    <header className="topbar"><div><div className="eyebrow">MIDDLE SCHOOL · INFORMATION</div><h1>데이터의 구조화</h1><p>Ⅱ. 데이터 · 인터랙티브 포트폴리오 활동지</p></div><div className="student-box"><input value={student.id} onChange={e=>setStudent({...student,id:e.target.value})} placeholder="학번"/><input value={student.name} onChange={e=>setStudent({...student,name:e.target.value})} placeholder="이름"/></div></header>
    <nav className="tabs"><button className={tab==='worksheet'?'active':''} onClick={()=>setTab('worksheet')}>활동지</button><button className={tab==='result'?'active':''} onClick={()=>setTab('result')}>나의 결과</button></nav>
    {tab==='result'?<Result result={result} student={student}/>:<>
      <section className="a4-page">
        <div className="paper-head"><span>중학교 1학년 정보</span><strong>Ⅱ. 데이터</strong><span>활동지 · 데이터의 구조화</span></div>
        <h2>1. 데이터 구조화의 뜻과 필요성</h2>
        <p className="question">전달하려고 하는 <DropZone id="q1" value={answers.q1} onDrop={setDrop} onClear={clearDrop}/> 의 내용 요소들을 <DropZone id="q2" value={answers.q2} onDrop={setDrop} onClear={clearDrop}/> 에 맞게 <DropZone id="q3" value={answers.q3} onDrop={setDrop} onClear={clearDrop}/> 하여 <DropZone id="q4" value={answers.q4} onDrop={setDrop} onClear={clearDrop}/> 으로 표현하는 것.</p>
        <h3>데이터 구조화를 하는 주요 이유 4가지</h3>
        <div className="reason-grid"><div>① 데이터를 <DropZone id="r1" value={answers.r1} onDrop={setDrop} onClear={clearDrop}/> 수 있다.</div><div>② 데이터 사이의 <DropZone id="r2" value={answers.r2} onDrop={setDrop} onClear={clearDrop}/> 을 쉽게 이해할 수 있다.</div><div>③ 빠지거나 잘못된 내용(오류 및 결측치)을 쉽게 파악할 수 있다.</div><div>④ 데이터를 <DropZone id="r4" value={answers.r4} onDrop={setDrop} onClear={clearDrop}/> 할 수 있다.</div></div>
        <h2>2. 데이터는 어떤 방법으로 구조화할 수 있을까?</h2><p className="sequence">순서: 목록 ➔ 표 ➔ 다이어그램</p>
        <div className="methods"><div><b>1. 목록 (List)</b><p>일정한 <DropZone id="listRule" value={answers.listRule} onDrop={setDrop} onClear={clearDrop} small/> 에 맞추어 항목을 차례대로 나열</p><small>예: 준비물 목록, 장보기 리스트</small></div><div><b>2. 표 (Table)</b><p>행(가로)과 열(세로)의 격자 구조로 구성</p><small>예: 학교 시간표, 주소록</small></div><div><b>3. 다이어그램 (Diagram)</b><p>점, 선, 도형, 화살표 등으로 시각화</p><small>예: 지하철 노선도, 계층 조직도</small></div></div>
        <Activity1 list={list} onChange={setList}/><Activity2 rows={rows} onChange={setRows}/><Activity3 tree={tree} onChange={setTree}/><Activity4 note={note} onChange={setNote}/>
        <div className="selfcheck"><b>스스로 배움 점검하기</b><label><input type="checkbox"/> 데이터 구조화의 뜻과 필요한 이유 4가지를 설명할 수 있다.</label><label><input type="checkbox"/> 데이터의 특성에 맞춰 목록, 표, 다이어그램을 올바르게 선택할 수 있다.</label><label><input type="checkbox"/> 줄글 데이터를 표나 계층형/차트 다이어그램으로 직접 표현할 수 있다.</label></div>
      </section>
      <WordBank used={used} onPick={pickWord}/>
      <div className="actionbar"><button onClick={saveProgress} className="secondary">임시 저장</button><button onClick={reset} className="secondary">초기화</button><button onClick={submit} disabled={submitting} className="primary">{submitting?'제출 처리 중…':'제출하고 자동채점'}</button></div>
    </>}
  </main>
}

function Result({result,student}) {return <section className="result-card"><div className="result-icon">✓</div><div className="eyebrow">MY PORTFOLIO</div><h2>{student.name||'학생'}의 학습 결과</h2><div className="score"><strong>{result.score}</strong><span> / {result.maxScore}</span></div><div className="progress"><i style={{width:`${result.percent||0}%`}}/></div><p>정답률 {result.percent||0}%</p><div className="feedback">{(result.feedback||[]).map((x,i)=><div key={i} className={x.ok?'ok':'no'}>{x.ok?'✓':'△'} {x.text}</div>)}</div><p className="portfolio-note">제출 결과는 교사용 포트폴리오 데이터로 저장됩니다.</p></section>}

window.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'streamlit:render') return;
  window.__streamlitArgs = event.data.args || {};
  window.dispatchEvent(new CustomEvent('streamlitArgs', {detail: window.__streamlitArgs}));
});
window.parent.postMessage({isStreamlitMessage:true,type:'streamlit:componentReady',apiVersion:1}, '*');
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
