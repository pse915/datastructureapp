// 인터랙티브 시각화 컴포넌트 (Vite 모듈 버전)
// dist/App.jsx 번들본과 로직 동일. 수정 시 양쪽 동기화.

import React, { useMemo, useRef, useState } from 'react';

export function StackViz() {
  const [stack, setStack] = useState([10, 20, 30]);
  const [val, setVal] = useState('');
  const [msg, setMsg] = useState('top = 맨 위 원소');
  const push = () => {
    const v = val.trim() === '' ? Math.floor(Math.random() * 90) + 10 : val.trim();
    setStack((s) => [...s, v]); setVal(''); setMsg(`push(${v}) — top에 쌓임`);
  };
  const pop = () => {
    if (!stack.length) { setMsg('underflow! 스택이 비었어요.'); return; }
    const top = stack[stack.length - 1];
    setStack((s) => s.slice(0, -1)); setMsg(`pop() → ${top} 꺼냄 (LIFO)`);
  };
  return (
    <div>
      <div className="ig-controls">
        <input className="ig-input" style={{ maxWidth: 140 }} value={val} onChange={(e) => setVal(e.target.value)} placeholder="값 (비우면 랜덤)" />
        <button className="ig-btn ig-btn-blue ig-btn-sm" onClick={push}>Push</button>
        <button className="ig-btn ig-btn-sm" onClick={pop}>Pop</button>
        <button className="ig-btn ig-btn-sm" onClick={() => setStack([])}>Clear</button>
      </div>
      <div className="ig-viz" style={{ flexDirection: 'column-reverse', alignItems: 'stretch' }}>
        {stack.length === 0 && <div className="ig-empty">비어 있음 — Push로 쌓아보세요.</div>}
        {[...stack].reverse().map((v, i) => (
          <div key={`${i}-${v}`} className={`ig-node ${i === 0 ? 'top' : ''}`} style={{ width: '100%' }}>
            {String(v)} {i === 0 && <span style={{ fontSize: 11, fontWeight: 800, color: '#cc2366' }}>← top</span>}
          </div>
        ))}
      </div>
      <p className="ig-hint">{msg} · push/pop O(1)</p>
    </div>
  );
}

export function QueueViz() {
  const [q, setQ] = useState([10, 20, 30]);
  const [val, setVal] = useState('');
  const [msg, setMsg] = useState('front = 맨 앞(꺼내는 쪽)');
  const enq = () => {
    const v = val.trim() === '' ? Math.floor(Math.random() * 90) + 10 : val.trim();
    setQ((s) => [...s, v]); setVal(''); setMsg(`enqueue(${v}) — rear에 줄섬`);
  };
  const deq = () => {
    if (!q.length) { setMsg('empty! 큐가 비었어요.'); return; }
    setQ((s) => s.slice(1)); setMsg(`dequeue() → ${q[0]} 나감 (FIFO)`);
  };
  return (
    <div>
      <div className="ig-controls">
        <input className="ig-input" style={{ maxWidth: 140 }} value={val} onChange={(e) => setVal(e.target.value)} placeholder="값 (비우면 랜덤)" />
        <button className="ig-btn ig-btn-blue ig-btn-sm" onClick={enq}>Enqueue</button>
        <button className="ig-btn ig-btn-sm" onClick={deq}>Dequeue</button>
        <button className="ig-btn ig-btn-sm" onClick={() => setQ([])}>Clear</button>
      </div>
      <div className="ig-viz">
        {q.length === 0 && <div className="ig-empty">비어 있음 — Enqueue로 줄세우세요.</div>}
        {q.map((v, i) => (
          <React.Fragment key={`${i}-${v}`}>
            <div className={`ig-node ${i === 0 ? 'front' : ''}`}>{String(v)}{i === 0 && ' ◀front'}{i === q.length - 1 && q.length > 1 && ' rear▶'}</div>
            {i < q.length - 1 && <span className="ig-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>
      <p className="ig-hint">{msg} · enqueue/dequeue O(1)</p>
    </div>
  );
}

export function LinkedListViz() {
  const [nodes, setNodes] = useState([10, 20, 30]);
  const [val, setVal] = useState('');
  const [msg, setMsg] = useState('head → … → None');
  const insertHead = () => {
    const v = val.trim() === '' ? Math.floor(Math.random() * 90) + 10 : val.trim();
    setNodes((s) => [v, ...s]); setVal(''); setMsg(`insert_head(${v}) — 맨 앞에 연결 O(1)`);
  };
  const append = () => {
    const v = val.trim() === '' ? Math.floor(Math.random() * 90) + 10 : val.trim();
    setNodes((s) => [...s, v]); setVal(''); setMsg(`append(${v}) — 맨 뒤에 연결 O(n) 순회`);
  };
  const removeHead = () => {
    if (!nodes.length) { setMsg('빈 리스트입니다.'); return; }
    setNodes((s) => s.slice(1)); setMsg(`delete_head() → ${nodes[0]} 제거`);
  };
  return (
    <div>
      <div className="ig-controls">
        <input className="ig-input" style={{ maxWidth: 140 }} value={val} onChange={(e) => setVal(e.target.value)} placeholder="값" />
        <button className="ig-btn ig-btn-blue ig-btn-sm" onClick={insertHead}>맨앞 삽입</button>
        <button className="ig-btn ig-btn-sm" onClick={append}>맨뒤 추가</button>
        <button className="ig-btn ig-btn-sm" onClick={removeHead}>맨앞 삭제</button>
      </div>
      <div className="ig-viz">
        <span className="ig-badge">head</span>
        {nodes.length === 0 && <span className="ig-hint">None (빈 리스트)</span>}
        {nodes.map((v, i) => (
          <React.Fragment key={`${i}-${v}`}>
            <div className="ig-node">{String(v)}</div>
            <span className="ig-arrow">→</span>
          </React.Fragment>
        ))}
        <span className="ig-badge">None</span>
      </div>
      <p className="ig-hint">{msg}</p>
    </div>
  );
}

function bstInsert(root, v) {
  if (!root) return { v, l: null, r: null };
  if (v < root.v) return { ...root, l: bstInsert(root.l, v) };
  if (v > root.v) return { ...root, r: bstInsert(root.r, v) };
  return root;
}
function bstWalk(root, order = 'in', out = []) {
  if (!root) return out;
  if (order === 'pre') out.push(root.v);
  bstWalk(root.l, order, out);
  if (order === 'in') out.push(root.v);
  bstWalk(root.r, order, out);
  if (order === 'post') out.push(root.v);
  return out;
}
function bstLayout(root, x = 0, y = 0, dx = 90, nodes = [], edges = []) {
  if (!root) return { nodes, edges };
  nodes.push({ v: root.v, x, y });
  if (root.l) { edges.push([x, y, x - dx, y + 58]); bstLayout(root.l, x - dx, y + 58, dx * 0.6, nodes, edges); }
  if (root.r) { edges.push([x, y, x + dx, y + 58]); bstLayout(root.r, x + dx, y + 58, dx * 0.6, nodes, edges); }
  return { nodes, edges };
}

export function TreeViz() {
  const [vals, setVals] = useState([50, 30, 70, 20, 40]);
  const [val, setVal] = useState('');
  const [order, setOrder] = useState('in');
  const root = useMemo(() => vals.reduce((r, v) => bstInsert(r, v), null), [vals]);
  const { nodes, edges } = useMemo(() => bstLayout(root), [root]);
  const seq = useMemo(() => bstWalk(root, order, []), [root, order]);
  const W = 340, H = Math.max(150, (root ? 150 : 100));
  const add = () => {
    const n = parseInt(val, 10);
    const v = Number.isNaN(n) ? Math.floor(Math.random() * 90) + 10 : n;
    if (vals.includes(v)) return;
    setVals((s) => [...s, v]); setVal('');
  };
  return (
    <div>
      <div className="ig-controls">
        <input className="ig-input" style={{ maxWidth: 120 }} value={val} onChange={(e) => setVal(e.target.value)} placeholder="숫자" inputMode="numeric" />
        <button className="ig-btn ig-btn-blue ig-btn-sm" onClick={add}>삽입</button>
        <button className="ig-btn ig-btn-sm" onClick={() => setVals([50, 30, 70, 20, 40])}>리셋</button>
        {['pre', 'in', 'post'].map((o) => (
          <button key={o} className={`ig-btn ig-btn-sm ${order === o ? 'ig-btn-grad' : ''}`} onClick={() => setOrder(o)}>
            {o === 'pre' ? '전위' : o === 'in' ? '중위' : '후위'}
          </button>
        ))}
      </div>
      <svg viewBox={`-170 -20 ${W} ${H + 40}`} style={{ width: '100%', background: '#fff', border: '1px solid #EFEFEF', borderRadius: 12 }}>
        {edges.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C7C7C7" strokeWidth="2" />)}
        {nodes.map((n, i) => (
          <g key={`${n.v}-${i}`}>
            <circle cx={n.x} cy={n.y} r="17" fill="#fff" stroke="#cc2366" strokeWidth="2.5" />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="12" fontWeight="900" fill="#262626">{n.v}</text>
          </g>
        ))}
      </svg>
      <p className="ig-hint">순회 결과 ({order}): <b>{seq.join(' → ') || '—'}</b></p>
    </div>
  );
}

const G_NODES = { A: [40, 30], B: [130, 30], C: [40, 120], D: [130, 120], E: [220, 75] };
const G_EDGES = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E'], ['B', 'E']];
const G_ADJ = { A: ['B', 'C'], B: ['A', 'D', 'E'], C: ['A', 'D'], D: ['B', 'C', 'E'], E: ['B', 'D'] };

export function GraphViz() {
  const [visited, setVisited] = useState([]);
  const [mode, setMode] = useState('BFS');
  const run = () => {
    const seen = []; const q = ['A']; const mark = new Set(['A']);
    if (mode === 'BFS') {
      while (q.length) { const cur = q.shift(); seen.push(cur); for (const nx of G_ADJ[cur]) if (!mark.has(nx)) { mark.add(nx); q.push(nx); } }
    } else {
      const st = ['A'];
      while (st.length) { const cur = st.pop(); if (seen.includes(cur)) continue; seen.push(cur); for (let i = G_ADJ[cur].length - 1; i >= 0; i--) { const nx = G_ADJ[cur][i]; if (!seen.includes(nx) && !st.includes(nx)) st.push(nx); } }
    }
    setVisited(seen);
  };
  return (
    <div>
      <div className="ig-controls">
        <button className={`ig-btn ig-btn-sm ${mode === 'BFS' ? 'ig-btn-grad' : ''}`} onClick={() => { setMode('BFS'); setVisited([]); }}>BFS (큐)</button>
        <button className={`ig-btn ig-btn-sm ${mode === 'DFS' ? 'ig-btn-grad' : ''}`} onClick={() => { setMode('DFS'); setVisited([]); }}>DFS (스택)</button>
        <button className="ig-btn ig-btn-blue ig-btn-sm" onClick={run}>탐색 실행</button>
        <button className="ig-btn ig-btn-sm" onClick={() => setVisited([])}>초기화</button>
      </div>
      <svg viewBox="0 0 260 155" style={{ width: '100%', background: '#fff', border: '1px solid #EFEFEF', borderRadius: 12 }}>
        {G_EDGES.map(([a, b], i) => <line key={i} x1={G_NODES[a][0]} y1={G_NODES[a][1]} x2={G_NODES[b][0]} y2={G_NODES[b][1]} stroke="#DBDBDB" strokeWidth="2.5" />)}
        {Object.entries(G_NODES).map(([k, [x, y]]) => {
          const idx = visited.indexOf(k);
          return (
            <g key={k}>
              <circle cx={x} cy={y} r="16" fill={idx >= 0 ? '#FDEFF4' : '#fff'} stroke={idx >= 0 ? '#cc2366' : '#8E8E8E'} strokeWidth="2.5" />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fontWeight="900" fill="#262626">{k}</text>
              {idx >= 0 && <text x={x + 20} y={y - 12} fontSize="10" fontWeight="800" fill="#cc2366">{idx + 1}</text>}
            </g>
          );
        })}
      </svg>
      <p className="ig-hint">{mode} 순서: <b>{visited.join(' → ') || '실행 버튼을 눌러보세요'}</b></p>
    </div>
  );
}

export function SortViz() {
  const [arr, setArr] = useState([38, 12, 51, 27, 64, 19]);
  const [cmp, setCmp] = useState([]);
  const [done, setDone] = useState([]);
  const [running, setRunning] = useState(false);
  const timers = useRef([]);
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; setRunning(false); };
  const shuffle = () => { stop(); setArr([...arr].sort(() => Math.random() - 0.5)); setCmp([]); setDone([]); };
  const bubble = () => {
    stop(); setRunning(true);
    const a = [...arr]; const steps = [];
    for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length - 1 - i; j++) { steps.push([j, j + 1, [...a], false]); if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; steps.push([j, j + 1, [...a], true]); } }
    steps.forEach(([x, y, snap, swapped], k) => {
      timers.current.push(setTimeout(() => {
        setArr(snap); setCmp([x, y]);
        if (k === steps.length - 1) { setDone(snap.map((_, i) => i)); setCmp([]); setRunning(false); }
      }, k * 320));
    });
  };
  const max = Math.max(...arr, 1);
  return (
    <div>
      <div className="ig-controls">
        <button className="ig-btn ig-btn-blue ig-btn-sm" disabled={running} onClick={bubble}>{running ? '정렬 중…' : '버블 정렬 실행'}</button>
        <button className="ig-btn ig-btn-sm" disabled={running} onClick={shuffle}>셔플</button>
      </div>
      <div className="ig-bars">
        {arr.map((v, i) => (
          <div key={i} className={`ig-bar ${done.includes(i) ? 'done' : cmp.includes(i) ? 'cmp' : ''}`} style={{ height: `${30 + (v / max) * 80}px` }}>{v}</div>
        ))}
      </div>
      <p className="ig-hint">이웃 비교→교환을 반복. 평균 O(n²)</p>
    </div>
  );
}

export function HashViz() {
  const [keys, setKeys] = useState(['apple', 'banana', 'grape']);
  const [val, setVal] = useState('');
  const buckets = useMemo(() => {
    const b = [[], [], [], [], []];
    keys.forEach((k) => { let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 5; b[h].push(k); });
    return b;
  }, [keys]);
  return (
    <div>
      <div className="ig-controls">
        <input className="ig-input" style={{ maxWidth: 160 }} value={val} onChange={(e) => setVal(e.target.value)} placeholder="키 입력" />
        <button className="ig-btn ig-btn-blue ig-btn-sm" onClick={() => { if (val.trim()) { setKeys((s) => [...s, val.trim()]); setVal(''); } }}>삽입</button>
        <button className="ig-btn ig-btn-sm" onClick={() => setKeys(['apple', 'banana', 'grape'])}>리셋</button>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {buckets.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="ig-badge">bucket {i}</span>
            {b.length === 0 && <span className="ig-hint">— 비어 있음</span>}
            {b.map((k) => <span key={k} className="ig-node" style={{ height: 36 }}>{k}</span>)}
            {b.length > 1 && <span className="ig-badge-grad ig-badge">충돌→체이닝</span>}
          </div>
        ))}
      </div>
      <p className="ig-hint">h(key) = Σord(c) mod 5 · 평균 O(1)</p>
    </div>
  );
}

export const VIZ_MAP = { array: ArrayViz, stack: StackViz, queue: QueueViz, linkedlist: LinkedListViz, tree: TreeViz, graph: GraphViz, sort: SortViz, hash: HashViz };

export function ArrayViz() {
  const [arr, setArr] = useState([10, 20, 30, 40]);
  const [idx, setIdx] = useState('2');
  const [val, setVal] = useState('');
  const [msg, setMsg] = useState('arr[i] 접근 O(1) — 인덱스를 눌러보세요');
  const [hi, setHi] = useState(2);
  const read = (i) => { setHi(i); setMsg(`arr[${i}] = ${arr[i]} (O(1) 직접 접근)`); };
  const insert = () => {
    const i = Math.max(0, Math.min(arr.length, parseInt(idx, 10) || 0));
    const v = val.trim() === '' ? Math.floor(Math.random() * 90) + 10 : val.trim();
    setArr((s) => [...s.slice(0, i), v, ...s.slice(i)]); setMsg(`insert(${i}, ${v}) — 뒤 원소 밀기 O(n)`);
  };
  const remove = () => {
    const i = Math.max(0, Math.min(arr.length - 1, parseInt(idx, 10) || 0));
    if (!arr.length) return;
    setArr((s) => s.filter((_, k) => k !== i)); setMsg(`delete(${i}) — 뒤 원소 당기기 O(n)`);
  };
  return (
    <div>
      <div className="ig-controls">
        <input className="ig-input" style={{ maxWidth: 90 }} value={idx} onChange={(e) => setIdx(e.target.value)} placeholder="인덱스" inputMode="numeric" />
        <input className="ig-input" style={{ maxWidth: 120 }} value={val} onChange={(e) => setVal(e.target.value)} placeholder="값(랜덤가능)" />
        <button className="ig-btn ig-btn-blue ig-btn-sm" onClick={insert}>삽입</button>
        <button className="ig-btn ig-btn-sm" onClick={remove}>삭제</button>
        <button className="ig-btn ig-btn-sm" onClick={() => setArr([10, 20, 30, 40])}>리셋</button>
      </div>
      <div className="ig-viz">
        {arr.map((v, i) => (
          <button key={`${i}-${v}`} className={`ig-node ${i === hi ? 'top' : ''}`} style={{ flexDirection: 'column', height: 58 }} onClick={() => read(i)}>
            <span>{String(v)}</span><span style={{ fontSize: 10, color: '#8E8E8E' }}>[{i}]</span>
          </button>
        ))}
        {!arr.length && <div className="ig-empty">빈 배열</div>}
      </div>
      <p className="ig-hint">{msg}</p>
    </div>
  );
}
