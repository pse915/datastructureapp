/* 자료구조 시각화 랩 (games/GameModule.jsx 패턴 재사용)
 * Stack / Queue / LinkedList / BinaryTree / Sorting 5종.
 * - 조작 버튼 + 단계 애니메이션(CSS transition) + 연산 복잡도 표시
 * - Python 의사코드 하이라이트와 현재 상태 동기화
 * - 완료 로그는 student_visual_log 이벤트로 게임기록 시트에 저장
 *   (점수 대신 완료여부 1/0 + 소요초, 최고점수=완료 이력)
 * - 외부 라이브러리 없음. iframe postMessage 규격은 건드리지 않음.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

export const VISUAL_TYPES = ['visual:stack', 'visual:queue', 'visual:linkedlist', 'visual:tree', 'visual:sort'];
export const VISUAL_LABEL = {
  'visual:stack': '스택 실습',
  'visual:queue': '큐 실습',
  'visual:linkedlist': '연결리스트 실습',
  'visual:tree': '이진트리 실습',
  'visual:sort': '정렬 실습',
};

export function vsUid(p = 'v') {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseInitial(raw, fallback) {
  if (Array.isArray(raw) && raw.length) return raw.map((v) => (typeof v === 'number' ? v : String(v).slice(0, 20))).slice(0, 20);
  return [...fallback];
}

function CodePanel({ lines, active }) {
  const set = new Set(Array.isArray(active) ? active : [active]);
  return (
    <pre className="vs-code">
      {lines.map((ln, i) => (
        <code key={i} className={set.has(i) ? 'on' : ''}>
          <span className="vs-ln">{String(i + 1).padStart(2, ' ')}</span> {ln}
        </code>
      ))}
    </pre>
  );
}

function ComplexityRow({ items }) {
  return (
    <div className="vs-complex">
      {items.map(([op, c]) => (
        <span key={op} className="vs-badge">
          {op} <b>{c}</b>
        </span>
      ))}
    </div>
  );
}

/* ---------- 스택 ---------- */
const STACK_CODE = ['top = -1', 'def push(x):', '    top += 1', '    a[top] = x', 'def pop():', '    x = a[top]', '    top -= 1', '    return x'];
export function StackPlayer({ config, onLog }) {
  const content = config.content || {};
  const [vals, setVals] = useState(() => parseInitial(content.initial, [10, 20, 30]));
  const [input, setInput] = useState('');
  const [lines, setLines] = useState([]);
  const [msg, setMsg] = useState('push / pop으로 LIFO를 체험해 보세요.');
  const [steps, setSteps] = useState(0);
  const [t0] = useState(Date.now());
  const bump = () => setSteps((s) => s + 1);
  const push = () => {
    const v = input.trim() === '' ? Math.floor(Math.random() * 90) + 10 : input.trim().slice(0, 20);
    setVals((s) => [...s, v]); setInput(''); setLines([1, 2, 3]); setMsg(`push(${v}) — top에 쌓임`); bump();
  };
  const pop = () => {
    if (!vals.length) { setMsg('underflow! 스택이 비었어요.'); setLines([4]); return; }
    const top = vals[vals.length - 1];
    setVals((s) => s.slice(0, -1)); setLines([4, 5, 6, 7]); setMsg(`pop() → ${top} 꺼냄 (LIFO)`); bump();
  };
  return (
    <div className="vs-player">
      <div className="vs-controls">
        <input className="text-input vs-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="값 (비우면 랜덤)" />
        <button className="ws-btn primary" onClick={push}>Push</button>
        <button className="ws-btn" onClick={pop}>Pop</button>
        <button className="ws-btn" onClick={() => { setVals([]); setLines([0]); setMsg('clear — top = -1'); bump(); }}>Clear</button>
        <button className="ws-btn" onClick={() => onLog && onLog({ completed: true, durationSec: Math.round((Date.now() - t0) / 1000), steps, detail: { ops: steps } })}>완료 기록</button>
      </div>
      <div className="vs-stack">
        {!vals.length && <div className="empty-mini">비어 있음 — Push로 쌓아보세요.</div>}
        {[...vals].reverse().map((v, i) => (
          <div key={`${vals.length - 1 - i}-${v}`} className={`vs-block ${i === 0 ? 'hot' : ''}`}>
            {String(v)} {i === 0 && <span className="vs-tag">← top</span>}
          </div>
        ))}
      </div>
      <p className="ws-hint">{msg} · {steps}단계</p>
      <ComplexityRow items={[['push', 'O(1)'], ['pop', 'O(1)'], ['peek', 'O(1)']]} />
      <CodePanel lines={STACK_CODE} active={lines} />
    </div>
  );
}

/* ---------- 큐 ---------- */
const QUEUE_CODE = ['front = 0; rear = 0', 'def enqueue(x):', '    a[rear] = x', '    rear += 1', 'def dequeue():', '    x = a[front]', '    front += 1', '    return x'];
export function QueuePlayer({ config, onLog }) {
  const content = config.content || {};
  const [vals, setVals] = useState(() => parseInitial(content.initial, [10, 20, 30]));
  const [input, setInput] = useState('');
  const [lines, setLines] = useState([]);
  const [msg, setMsg] = useState('enqueue / dequeue로 FIFO를 체험해 보세요.');
  const [steps, setSteps] = useState(0);
  const [t0] = useState(Date.now());
  const bump = () => setSteps((s) => s + 1);
  const enq = () => {
    const v = input.trim() === '' ? Math.floor(Math.random() * 90) + 10 : input.trim().slice(0, 20);
    setVals((s) => [...s, v]); setInput(''); setLines([1, 2, 3]); setMsg(`enqueue(${v}) — rear에 줄섬`); bump();
  };
  const deq = () => {
    if (!vals.length) { setMsg('empty! 큐가 비었어요.'); setLines([4]); return; }
    setVals((s) => s.slice(1)); setLines([4, 5, 6, 7]); setMsg(`dequeue() → ${vals[0]} 나감 (FIFO)`); bump();
  };
  return (
    <div className="vs-player">
      <div className="vs-controls">
        <input className="text-input vs-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="값 (비우면 랜덤)" />
        <button className="ws-btn primary" onClick={enq}>Enqueue</button>
        <button className="ws-btn" onClick={deq}>Dequeue</button>
        <button className="ws-btn" onClick={() => { setVals([]); setLines([0]); setMsg('clear — front = rear = 0'); bump(); }}>Clear</button>
        <button className="ws-btn" onClick={() => onLog && onLog({ completed: true, durationSec: Math.round((Date.now() - t0) / 1000), steps, detail: { ops: steps } })}>완료 기록</button>
      </div>
      <div className="vs-row">
        {!vals.length && <div className="empty-mini">비어 있음 — Enqueue로 줄세우세요.</div>}
        {vals.map((v, i) => (
          <React.Fragment key={`${i}-${v}`}>
            <div className={`vs-block ${i === 0 ? 'hot' : ''}`}>
              {String(v)}
              {i === 0 && <span className="vs-tag">◀front</span>}
              {i === vals.length - 1 && vals.length > 1 && <span className="vs-tag">rear▶</span>}
            </div>
            {i < vals.length - 1 && <span className="vs-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>
      <p className="ws-hint">{msg} · {steps}단계</p>
      <ComplexityRow items={[['enqueue', 'O(1)'], ['dequeue', 'O(1)']]} />
      <CodePanel lines={QUEUE_CODE} active={lines} />
    </div>
  );
}

/* ---------- 연결리스트 ---------- */
const LIST_CODE = ['head = None', 'def insert_head(x):', '    node.next = head', '    head = node', 'def append(x):', '    cur = head  # 끝까지 순회', '    cur.next = node', 'def delete_head():', '    head = head.next'];
export function LinkedListPlayer({ config, onLog }) {
  const content = config.content || {};
  const [nodes, setNodes] = useState(() => parseInitial(content.initial, [10, 20, 30]));
  const [input, setInput] = useState('');
  const [find, setFind] = useState('');
  const [hi, setHi] = useState(-1);
  const [lines, setLines] = useState([]);
  const [msg, setMsg] = useState('head → … → None 구조를 직접 연결해 보세요.');
  const [steps, setSteps] = useState(0);
  const [t0] = useState(Date.now());
  const timer = useRef(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const bump = () => setSteps((s) => s + 1);
  const insertHead = () => {
    const v = input.trim() === '' ? Math.floor(Math.random() * 90) + 10 : input.trim().slice(0, 20);
    setNodes((s) => [v, ...s]); setInput(''); setLines([1, 2, 3]); setMsg(`insert_head(${v}) — 맨 앞에 연결 O(1)`); bump();
  };
  const append = () => {
    const v = input.trim() === '' ? Math.floor(Math.random() * 90) + 10 : input.trim().slice(0, 20);
    setNodes((s) => [...s, v]); setInput(''); setLines([4, 5, 6]); setMsg(`append(${v}) — 맨 뒤에 연결 (순회 O(n))`); bump();
  };
  const removeHead = () => {
    if (!nodes.length) { setMsg('빈 리스트입니다.'); return; }
    setNodes((s) => s.slice(1)); setLines([7, 8]); setMsg(`delete_head() → ${nodes[0]} 제거`); bump();
  };
  const traverse = () => {
    if (!nodes.length) { setMsg('빈 리스트입니다.'); return; }
    const target = find.trim();
    setHi(-1); setLines([5]); bump();
    let i = 0;
    const step = () => {
      if (i >= nodes.length) { setMsg(target ? `'${target}' 없음 — 끝까지 순회 O(n)` : `순회 완료 — ${nodes.length}개 노드`); return; }
      setHi(i);
      if (target && String(nodes[i]) === target) { setMsg(`찾음! index ${i}에서 '${target}' 발견`); return; }
      i += 1;
      timer.current = setTimeout(step, 450);
    };
    step();
  };
  return (
    <div className="vs-player">
      <div className="vs-controls">
        <input className="text-input vs-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="값" />
        <button className="ws-btn primary" onClick={insertHead}>맨앞 삽입</button>
        <button className="ws-btn" onClick={append}>맨뒤 추가</button>
        <button className="ws-btn" onClick={removeHead}>맨앞 삭제</button>
        <button className="ws-btn" onClick={() => onLog && onLog({ completed: true, durationSec: Math.round((Date.now() - t0) / 1000), steps, detail: { ops: steps } })}>완료 기록</button>
      </div>
      <div className="vs-controls">
        <input className="text-input vs-input" value={find} onChange={(e) => setFind(e.target.value)} placeholder="찾을 값 (순회)" />
        <button className="ws-btn" onClick={traverse}>탐색(순회)</button>
      </div>
      <div className="vs-row">
        <span className="vs-badge">head</span>
        {!nodes.length && <span className="ws-hint">None (빈 리스트)</span>}
        {nodes.map((v, i) => (
          <React.Fragment key={`${i}-${v}`}>
            <div className={`vs-block ${i === hi ? 'hot' : ''}`}>{String(v)}</div>
            <span className="vs-arrow">→</span>
          </React.Fragment>
        ))}
        <span className="vs-badge">None</span>
      </div>
      <p className="ws-hint">{msg} · {steps}단계</p>
      <ComplexityRow items={[['insert_head', 'O(1)'], ['append', 'O(n)'], ['search', 'O(n)']]} />
      <CodePanel lines={LIST_CODE} active={lines} />
    </div>
  );
}

/* ---------- 이진트리 ---------- */
const TREE_CODE = ['def bst_insert(root, x):', '    if not root: return Node(x)', '    if x < root.x: root.L = ins(L, x)', '    if x > root.x: root.R = ins(R, x)', '    return root  # 중복 무시', 'def walk(root, order):  # pre/in/post'];
function bstInsertNode(root, v) {
  if (!root) return { v, l: null, r: null };
  if (v < root.v) return { ...root, l: bstInsertNode(root.l, v) };
  if (v > root.v) return { ...root, r: bstInsertNode(root.r, v) };
  return root;
}
function bstLayout(root, x = 0, y = 0, dx = 90, nodes = [], edges = []) {
  if (!root) return { nodes, edges };
  nodes.push({ v: root.v, x, y });
  if (root.l) { edges.push([x, y, x - dx, y + 58]); bstLayout(root.l, x - dx, y + 58, dx * 0.6, nodes, edges); }
  if (root.r) { edges.push([x, y, x + dx, y + 58]); bstLayout(root.r, x + dx, y + 58, dx * 0.6, nodes, edges); }
  return { nodes, edges };
}
function bstOrder(root, order, out = []) {
  if (!root) return out;
  if (order === 'pre') out.push(root.v);
  bstOrder(root.l, order, out);
  if (order === 'in') out.push(root.v);
  bstOrder(root.r, order, out);
  if (order === 'post') out.push(root.v);
  return out;
}
export function TreePlayer({ config, onLog }) {
  const content = config.content || {};
  const [vals, setVals] = useState(() => {
    const init = parseInitial(content.initial, [50, 30, 70, 20, 40]);
    return init.map((v) => (typeof v === 'number' ? v : (parseInt(v, 10) || 0))).filter((v) => v > 0);
  });
  const [input, setInput] = useState('');
  const [order, setOrder] = useState('in');
  const [visit, setVisit] = useState([]);
  const [lines, setLines] = useState([]);
  const [steps, setSteps] = useState(0);
  const [t0] = useState(Date.now());
  const timer = useRef(null);
  useEffect(() => () => { (timer.current || []).forEach(clearTimeout); }, []);
  const root = useMemo(() => vals.reduce((r, v) => bstInsertNode(r, v), null), [vals]);
  const { nodes, edges } = useMemo(() => bstLayout(root), [root]);
  const seq = useMemo(() => bstOrder(root, order, []), [root, order]);
  const add = () => {
    const n = parseInt(input, 10);
    const v = Number.isNaN(n) ? Math.floor(Math.random() * 90) + 10 : n;
    if (vals.includes(v)) return;
    setVals((s) => [...s, v]); setInput(''); setLines([0, 1, 2, 3]); setSteps((s) => s + 1);
  };
  const play = () => {
    (timer.current || []).forEach(clearTimeout);
    timer.current = [];
    setVisit([]);
    setLines([5]);
    seq.forEach((v, k) => {
      timer.current.push(setTimeout(() => {
        setVisit((prev) => [...prev, v]);
        if (k === seq.length - 1) setSteps((s) => s + 1);
      }, 500 * (k + 1)));
    });
  };
  return (
    <div className="vs-player">
      <div className="vs-controls">
        <input className="text-input vs-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="숫자" inputMode="numeric" />
        <button className="ws-btn primary" onClick={add}>삽입</button>
        <button className="ws-btn" onClick={() => { setVals([50, 30, 70, 20, 40]); setVisit([]); }}>리셋</button>
        {['pre', 'in', 'post'].map((o) => (
          <button key={o} className={`ws-btn ${order === o ? 'primary' : ''}`} onClick={() => { setOrder(o); setVisit([]); }}>
            {o === 'pre' ? '전위' : o === 'in' ? '중위' : '후위'}
          </button>
        ))}
        <button className="ws-btn" onClick={play}>순회 재생</button>
        <button className="ws-btn" onClick={() => onLog && onLog({ completed: true, durationSec: Math.round((Date.now() - t0) / 1000), steps, detail: { ops: steps, order } })}>완료 기록</button>
      </div>
      <svg viewBox="-170 -24 340 190" className="vs-tree" role="img" aria-label="이진 탐색 트리">
        {edges.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="vs-edge" />)}
        {nodes.map((n, i) => (
          <g key={`${n.v}-${i}`}>
            <circle cx={n.x} cy={n.y} r="17" className={`vs-tnode ${visit.includes(n.v) ? 'hot' : ''}`} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className="vs-tlabel">{n.v}</text>
          </g>
        ))}
      </svg>
      <p className="ws-hint">순회({order}): <b>{seq.join(' → ') || '—'}</b>{visit.length ? ` · 재생: ${visit.join(' → ')}` : ''}</p>
      <ComplexityRow items={[['insert', '평균 O(log n)'], ['search', '평균 O(log n)'], ['walk', 'O(n)']]} />
      <CodePanel lines={TREE_CODE} active={lines} />
    </div>
  );
}

/* ---------- 정렬 ---------- */
const SORT_CODE = {
  bubble: ['for i in range(n):', '    for j in range(n-1-i):', '        if a[j] > a[j+1]:', '            swap(a, j, j+1)'],
  select: ['for i in range(n):', '    m = argmin(i..n)', '    swap(a, i, m)'],
  insert: ['for i in range(1, n):', '    key = a[i]; j = i-1', '    while j>=0 and a[j]>key:', '        a[j+1] = a[j]; j -= 1', '    a[j+1] = key'],
};
const SORT_LABEL = { bubble: '버블', select: '선택', insert: '삽입' };
function sortSteps(kind, base) {
  const a = [...base];
  const steps = [];
  if (kind === 'bubble') {
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a.length - 1 - i; j++) {
        steps.push({ arr: [...a], cmp: [j, j + 1], line: 2, msg: `비교 a[${j}]=${a[j]} vs a[${j + 1}]=${a[j + 1]}` });
        if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; steps.push({ arr: [...a], cmp: [j, j + 1], line: 3, msg: `교환 → [${a}]` }); }
      }
    }
  } else if (kind === 'select') {
    for (let i = 0; i < a.length; i++) {
      let m = i;
      for (let j = i + 1; j < a.length; j++) {
        steps.push({ arr: [...a], cmp: [m, j], line: 1, msg: `최솟값 탐색: m=${m} vs j=${j}` });
        if (a[j] < a[m]) m = j;
      }
      [a[i], a[m]] = [a[m], a[i]];
      steps.push({ arr: [...a], cmp: [i, m], line: 2, msg: `swap(i=${i}, m=${m})` });
    }
  } else {
    for (let i = 1; i < a.length; i++) {
      const key = a[i];
      let j = i - 1;
      steps.push({ arr: [...a], cmp: [i, j], line: 1, msg: `key=${key}, j=${j}` });
      while (j >= 0 && a[j] > key) {
        steps.push({ arr: [...a], cmp: [j, j + 1], line: 2, msg: `a[${j}]=${a[j]} > ${key} → 뒤로` });
        a[j + 1] = a[j];
        steps.push({ arr: [...a], cmp: [j, j + 1], line: 3, msg: `이동 → [${a}]` });
        j -= 1;
      }
      a[j + 1] = key;
      steps.push({ arr: [...a], cmp: [j + 1], line: 4, msg: `삽입 a[${j + 1}]=${key}` });
    }
  }
  return steps;
}
export function SortPlayer({ config, onLog }) {
  const content = config.content || {};
  const [arr, setArr] = useState(() => {
    const init = parseInitial(content.initial, [38, 12, 51, 27, 64, 19]);
    return init.map((v) => (typeof v === 'number' ? v : (parseInt(v, 10) || 0))).slice(0, 8);
  });
  const [algo, setAlgo] = useState(content.algo === 'select' || content.algo === 'insert' ? content.algo : 'bubble');
  const [cmp, setCmp] = useState([]);
  const [line, setLine] = useState(-1);
  const [msg, setMsg] = useState('알고리즘을 선택하고 실행을 눌러보세요.');
  const [running, setRunning] = useState(false);
  const [compares, setCompares] = useState(0);
  const [t0] = useState(Date.now());
  const timers = useRef([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; setRunning(false); };
  const shuffle = () => { stop(); setArr((s) => [...s].sort(() => Math.random() - 0.5)); setCmp([]); setLine(-1); setCompares(0); setMsg('셔플 완료'); };
  const run = () => {
    stop(); setRunning(true);
    const steps = sortSteps(algo, arr);
    setCompares(steps.length);
    steps.forEach((st, k) => {
      timers.current.push(setTimeout(() => {
        setArr(st.arr); setCmp(st.cmp); setLine(st.line); setMsg(st.msg);
        if (k === steps.length - 1) { setCmp([]); setRunning(false); }
      }, 420 * (k + 1)));
    });
  };
  const max = Math.max(...arr, 1);
  return (
    <div className="vs-player">
      <div className="vs-controls">
        {['bubble', 'select', 'insert'].map((k) => (
          <button key={k} className={`ws-btn ${algo === k ? 'primary' : ''}`} disabled={running} onClick={() => { setAlgo(k); setCmp([]); setLine(-1); }}>
            {SORT_LABEL[k]}
          </button>
        ))}
        <button className="ws-btn primary" disabled={running} onClick={run}>{running ? '정렬 중…' : '실행'}</button>
        <button className="ws-btn" disabled={running} onClick={shuffle}>셔플</button>
        <button className="ws-btn" disabled={running} onClick={() => onLog && onLog({ completed: true, durationSec: Math.round((Date.now() - t0) / 1000), steps: compares, detail: { ops: compares, algo } })}>완료 기록</button>
      </div>
      <div className="vs-bars">
        {arr.map((v, i) => (
          <div key={i} className={`vs-bar ${cmp.includes(i) ? 'hot' : ''}`} style={{ height: `${26 + (v / max) * 84}px` }}>{v}</div>
        ))}
      </div>
      <p className="ws-hint">{msg}{compares ? ` · ${compares}단계` : ''}</p>
      <ComplexityRow items={[[`${SORT_LABEL[algo]} 평균`, 'O(n²)'], [`${SORT_LABEL[algo]} 최선`, algo === 'insert' ? 'O(n)' : 'O(n²)']]} />
      <CodePanel lines={SORT_CODE[algo]} active={[line]} />
    </div>
  );
}

/* ---------- 래퍼 ---------- */
export function VisualPlayer({ config, onLog }) {
  if (!config) return <div className="empty-mini">실습 설정이 없습니다.</div>;
  if (config.type === 'visual:queue') return <QueuePlayer config={config} onLog={onLog} />;
  if (config.type === 'visual:linkedlist') return <LinkedListPlayer config={config} onLog={onLog} />;
  if (config.type === 'visual:tree') return <TreePlayer config={config} onLog={onLog} />;
  if (config.type === 'visual:sort') return <SortPlayer config={config} onLog={onLog} />;
  return <StackPlayer config={config} onLog={onLog} />;
}

/* ---------- 학생용: 실습 탭 ---------- */
export function StudentVisual({ visuals, myRecords, emit }) {
  const list = visuals || [];
  const [week, setWeek] = useState(list[0] ? list[0].week : 1);
  const [active, setActive] = useState(false);
  const [last, setLast] = useState(null);
  const [t0, setT0] = useState(Date.now());
  useEffect(() => { setActive(false); setLast(null); }, [week]);
  if (!list.length) return <div className="empty-state large">현재 실습 가능한 주차가 없습니다.</div>;
  const cfg = list.find((g) => Number(g.week) === Number(week)) || list[0];
  const rec = (myRecords || []).find((r) => Number(r.주차) === Number(cfg.week));
  const done = rec && Number(rec.최고점수) >= 1;
  const start = () => { setLast(null); setActive(true); setT0(Date.now()); };
  const finish = (res) => {
    emit('student_visual_log', {
      week: Number(cfg.week), visualType: cfg.type,
      completed: res.completed !== false, durationSec: res.durationSec != null ? res.durationSec : Math.round((Date.now() - t0) / 1000),
      steps: res.steps || 0, detail: res.detail || {}, recordId: vsUid('visual'),
    });
    setLast(res);
    setActive(false);
  };
  return (
    <div className="gm-student">
      <div className="gm-tabs">
        {list.map((g) => {
          const mine = (myRecords || []).find((r) => Number(r.주차) === Number(g.week));
          const ok = mine && Number(mine.최고점수) >= 1;
          return (
            <button key={g.week} className={`gm-tab ${Number(week) === Number(g.week) ? 'on' : ''}`} onClick={() => setWeek(Number(g.week))}>
              <b>W{g.week}</b>
              <small>{VISUAL_LABEL[g.type] || g.type}</small>
              {ok ? <i>✔</i> : null}
            </button>
          );
        })}
      </div>
      <div className="ws-card">
        <span className="ws-badge">{VISUAL_LABEL[cfg.type] || cfg.type}</span>
        <h2>{cfg.title}</h2>
        <p>{cfg.desc}</p>
        <p className="ws-hint">
          {done ? `완료 ✔ · 시도 ${rec.시도횟수}회 · 소요 ${rec.소요초}초` : '조작 버튼으로 직접 만져보고 완료를 기록하세요!'}
        </p>
        {!active && <button className="ws-btn primary" onClick={start}>실습 시작</button>}
      </div>
      {last && <div className="ws-card"><span className="ws-badge">기록 저장됨</span><h3>완료 ✔ · {last.steps || 0}단계</h3></div>}
      {active && <VisualPlayer key={`${cfg.week}-${cfg.updatedAt}`} config={cfg} onLog={finish} />}
    </div>
  );
}

/* ---------- 관리자용: 주차별 시각화 설정 ---------- */
export function TeacherVisual({ weeks, configs, records, emit }) {
  const all = configs && configs.length ? configs : [];
  const [week, setWeek] = useState(1);
  const [enabled, setEnabled] = useState(false);
  const [vtype, setVtype] = useState('visual:stack');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [initialText, setInitialText] = useState('10, 20, 30');
  const [note, setNote] = useState('');
  const [algo, setAlgo] = useState('bubble');
  const [preview, setPreview] = useState(false);
  const stored = all.find((x) => Number(x.week) === Number(week)) || {};
  const isVisualStored = String(stored.type || '').startsWith('visual:');
  useEffect(() => {
    setEnabled(!!stored.enabled);
    if (isVisualStored) {
      setVtype(stored.type);
      setTitle(stored.title || `${week}주차 실습`);
      setDesc(stored.desc || '');
      const init = (stored.content || {}).initial;
      setInitialText(Array.isArray(init) ? init.join(', ') : '10, 20, 30');
      setNote((stored.content || {}).note || '');
      setAlgo((stored.content || {}).algo || 'bubble');
    } else {
      setVtype('visual:stack');
      setTitle(`${week}주차 실습`);
      setDesc('');
      setInitialText(vtype === 'visual:tree' ? '50, 30, 70, 20, 40' : vtype === 'visual:sort' ? '38, 12, 51, 27, 64, 19' : '10, 20, 30');
      setNote('');
    }
    setPreview(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, stored.updatedAt]);
  const parsedInitial = initialText.split(',').map((s) => s.trim()).filter((s) => s !== '').slice(0, 20).map((s) => (/^-?\d+$/.test(s) ? parseInt(s, 10) : s.slice(0, 20)));
  const content = vtype === 'visual:sort'
    ? { initial: parsedInitial, note: note.trim(), algo }
    : { initial: parsedInitial, note: note.trim() };
  const current = { week: Number(week), enabled, type: vtype, title, desc, content };
  const weekRecs = (records || []).filter((r) => Number(r.주차) === Number(week));
  const goal = (weeks || []).find((w) => Number(w.주차) === Number(week));
  const canSave = String(title || '').trim().length > 0;
  return (
    <div className="ws-wrap">
      <header className="ws-top">
        <div><span className="eyebrow">VISUAL LAB · ADMIN</span><h1>주차별 실습 관리</h1></div>
        <div className="ws-top-actions">
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: 17 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}주차 {((weeks || []).find((w) => Number(w.주차) === i + 1) || {}).학습목표 || ''}</option>)}
          </select>
          <label className="ws-check gm-switch">
            <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); emit('teacher_game_toggle', { week: Number(week), enabled: e.target.checked }); }} />
            {enabled ? '활성화' : '비활성화'}
          </label>
          <button className={preview ? 'ws-btn' : 'ws-btn primary'} onClick={() => setPreview(!preview)}>{preview ? '편집으로' : '미리보기'}</button>
          <button className="ws-btn primary" disabled={!canSave} onClick={() => emit('teacher_visual_save', { config: current })}>실습 저장</button>
        </div>
      </header>
      {!preview ? (
        <>
          <section className="ws-card">
            <div className="ws-row">
              <label>실습 유형
                <select value={vtype} onChange={(e) => setVtype(e.target.value)}>
                  {VISUAL_TYPES.map((t) => <option key={t} value={t}>{VISUAL_LABEL[t]}</option>)}
                </select>
              </label>
              <label>실습 제목<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            </div>
            <label>설명<textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="학생에게 보여줄 실습 안내" /></label>
            {stored.type && !isVisualStored && (
              <div className="empty-mini">참고: 이 주차에는 미니게임({stored.type})이 설정되어 있습니다. 실습을 저장하면 게임 설정이 교체됩니다.</div>
            )}
          </section>
          <section className="ws-card">
            <b>초기값 (쉼표 구분, 최대 20개)</b>
            <input className="text-input" value={initialText} onChange={(e) => setInitialText(e.target.value)} placeholder="10, 20, 30" />
            {vtype === 'visual:sort' && (
              <label>기본 알고리즘
                <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
                  <option value="bubble">버블</option>
                  <option value="select">선택</option>
                  <option value="insert">삽입</option>
                </select>
              </label>
            )}
            <label>참고 메모 (학생에게 표시)<textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="예) push 3번 후 pop 결과를 관찰하세요" rows={2} /></label>
          </section>
          <section className="ws-card">
            <b>{week}주차 실습 기록 ({weekRecs.length}명)</b>
            {weekRecs.length ? (
              <table className="gm-table">
                <thead><tr><th>학번</th><th>이름</th><th>완료</th><th>시도</th><th>소요(초)</th><th>완료일시</th></tr></thead>
                <tbody>
                  {weekRecs.map((r, i) => (
                    <tr key={i}>
                      <td>{r.학번}</td><td>{r.이름}</td>
                      <td>{Number(r.최고점수) >= 1 ? '✔' : '—'}</td>
                      <td>{r.시도횟수}</td><td>{r.소요초}</td><td>{r.완료일시}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty-mini">아직 실습 기록이 없습니다.</div>}
          </section>
        </>
      ) : <VisualPlayer config={current} onLog={() => {}} />}
    </div>
  );
}
