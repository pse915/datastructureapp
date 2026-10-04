/* DS curriculum (global) */
const { useState: __us, useEffect: __ue, useMemo: __um, useRef: __ur, useReducer: __ud } = React;
const useState = __us; const useEffect = __ue; const useMemo = __um; const useRef = __ur; const useReducer = __ud;
// 자료구조 단원 데이터: 개념 + 코드 + 퀴즈
// Vite용 모듈이자 dist 번들(App.jsx)에 인라인되는 원본.

const DS_UNITS = [
  {
    id: 'array', label: '배열', icon: '🧱', handle: '@array.basics',
    title: '배열 — 인덱스로 바로 찾는 연속 공간',
    desc: '같은 타입의 데이터를 메모리 연속 공간에 저장합니다. 인덱스로 O(1) 접근이 가능하지만, 중간 삽입/삭제는 O(n) 비용이 듭니다.',
    points: ['인덱스 접근 O(1), 탐색 O(n)', '크기가 고정되면 삽입/삭제가 비쌈', '정렬·탐색 알고리즘의 기본 무대'],
    code: `# Python 리스트는 동적 배열\narr = [10, 20, 30, 40]\nprint(arr[2])      # 30, O(1)\narr.insert(1, 99)  # 중간 삽입 O(n)\nprint(arr)`,
    quiz: { q: '배열 arr 길이가 n일 때 arr[i] 접근 시간복잡도는?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 0, explain: '인덱스 연산은 시작 주소 + i×원소크기로 바로 계산되므로 O(1)입니다.' },
  },
  {
    id: 'linkedlist', label: '연결리스트', icon: '🔗', handle: '@linked.list',
    title: '연결리스트 — 노드가 손잡고 줄서기',
    desc: '각 노드가 값(data)과 다음 노드 주소(next)를 가집니다. 삽입/삭제는 링크만 바꾸면 되지만, 탐색은 head부터 순회해야 합니다.',
    points: ['삽입/삭제 O(1) — 위치를 알 때', '탐색 O(n) — 순차 접근', '스택·큐·해시충돌 체이닝의 뼈대'],
    code: `class Node:\n    def __init__(self, v):\n        self.data = v\n        self.next = None\n\na = Node(10); b = Node(20)\na.next = b  # 10 -> 20 연결`,
    quiz: { q: '단일 연결리스트에서 head부터 k번째 노드 탐색 비용은?', options: ['O(1)', 'O(k)', 'O(log n)', 'O(n log n)'], answer: 1, explain: '앞에서부터 k번 이동해야 하므로 O(k), 전체 기준 O(n)입니다.' },
  },
  {
    id: 'stack', label: '스택', icon: '🥞', handle: '@stack.lifo',
    title: '스택 — LIFO, 접시 쌓기 (Push / Pop)',
    desc: 'Last-In-First-Out. push로 쌓고 pop으로 꺼냅니다. 함수 호출 스택, 뒤로가기, 괄호 검사에 쓰입니다.',
    points: ['push / pop / peek 모두 O(1)', 'top에서만 출입 — LIFO', 'DFS·백트래킹·수식 계산의 핵심'],
    code: `stack = []\nstack.append(1)  # push\nstack.append(2)\nprint(stack.pop())  # 2 (LIFO)\nprint(stack[-1])    # peek: 1`,
    quiz: { q: 'push 1,2,3 후 pop 2번의 결과 순서는?', options: ['3, 2', '1, 2', '2, 3', '3, 1'], answer: 0, explain: 'LIFO이므로 마지막에 들어간 3, 2 순서로 나옵니다.' },
  },
  {
    id: 'queue', label: '큐', icon: '🎢', handle: '@queue.fifo',
    title: '큐 — FIFO, 줄서기 (Enqueue / Dequeue)',
    desc: 'First-In-First-Out. 뒤(rear)로 들어와 앞(front)으로 나갑니다. BFS, 작업 스케줄링, 버퍼에 쓰입니다.',
    points: ['enqueue / dequeue O(1)', 'front에서만 꺼냄 — FIFO', 'BFS·프린터 대기열·메시지큐'],
    code: `from collections import deque\nq = deque()\nq.append(1)   # enqueue\nq.append(2)\nprint(q.popleft())  # 1 (FIFO)`,
    quiz: { q: 'enqueue 1,2,3 후 dequeue 1번의 결과는?', options: ['1', '2', '3', '에러'], answer: 0, explain: 'FIFO이므로 가장 먼저 들어간 1이 나옵니다.' },
  },
  {
    id: 'tree', label: '트리', icon: '🌳', handle: '@tree.bst',
    title: '트리 — 계층 구조와 BST 탐색',
    desc: '부모-자식 계층 구조입니다. 이진탐색트리(BST)는 왼쪽<부모<오른쪽 규칙으로 평균 O(log n) 탐색을 제공합니다.',
    points: ['전위·중위·후위·레벨 순회', 'BST 평균 탐색 O(log n)', '힙·DB 인덱스·파일시스템의 기초'],
    code: `# BST 삽입 규칙\n# left < node < right\n# 중위순회(inorder) = 오름차순 정렬 결과\n# 예: 50,30,70,20,40 삽입\n# inorder -> 20 30 40 50 70`,
    quiz: { q: 'BST에 50,30,70,20,40 삽입 후 inorder 결과는?', options: ['20 30 40 50 70', '50 30 20 40 70', '20 40 30 70 50', '50 70 30 40 20'], answer: 0, explain: 'BST의 중위순회는 항상 오름차순으로 정렬됩니다.' },
  },
  {
    id: 'graph', label: '그래프', icon: '🕸️', handle: '@graph.bfs_dfs',
    title: '그래프 — 정점과 간선, BFS / DFS',
    desc: '정점(V)과 간선(E)의 관계망입니다. BFS는 큐로 가까운 순, DFS는 스택/재귀로 깊은 순으로 탐색합니다.',
    points: ['BFS = 큐, 최단거리 탐색', 'DFS = 스택/재귀, 경로·사이클 탐색', '지도·SNS·네트워크 라우팅'],
    code: `from collections import deque\ngraph = {'A':['B','C'],'B':['D'],'C':['D'],'D':[]}\n# BFS: A C B D 순 (레벨순)\n# DFS: A B D C 순 (깊은순)`,
    quiz: { q: '가중치 없는 그래프 최단경로에 적합한 탐색은?', options: ['BFS', 'DFS', '완전탐색만', '정렬'], answer: 0, explain: 'BFS는 시작점에서 레벨 순서로 퍼지므로 최단거리를 보장합니다.' },
  },
  {
    id: 'sort', label: '정렬', icon: '📊', handle: '@sort.compare',
    title: '정렬 — 버블·선택·삽입 비교하기',
    desc: '대표 비교정렬 3종을 막대 애니메이션으로 비교합니다. 모두 평균 O(n²)이지만 교환/비교 횟수와 직관이 다릅니다.',
    points: ['버블: 이웃 교환, 큰 값 뒤로', '선택: 최소값 골라 앞으로', '삽입: 손패 정렬하듯 끼워넣기'],
    code: `# 버블 정렬 핵심\nfor i in range(n):\n    for j in range(n-1-i):\n        if a[j] > a[j+1]:\n            a[j], a[j+1] = a[j+1], a[j]`,
    quiz: { q: '이미 정렬된 배열에 가장 빠른 비교정렬(최적화 시)은?', options: ['버블 O(n)', '선택 O(n²)', '삽입 O(n)', '모두 O(n²) 고정'], answer: 2, explain: '삽입정렬은 이미 정렬된 경우 각 원소를 한 번씩만 확인하므로 O(n)입니다.' },
  },
  {
    id: 'hash', label: '해시', icon: '🧮', handle: '@hash.table',
    title: '해시 — 키로 바로 찾는 사전',
    desc: '해시함수 h(key)로 버킷 위치를 계산합니다. 평균 O(1) 탐색, 충돌은 체이닝/개방주소로 해결합니다.',
    points: ['평균 탐색/삽입 O(1)', '충돌 해결: 체이닝·개방주소', '딕셔너리·캐시·DB 인덱스'],
    code: `table = {}\ntable['apple'] = 3   # h('apple') -> 버킷\nprint(table['apple'])  # 평균 O(1)\n# 충돌: 서로 다른 키가 같은 버킷`,
    quiz: { q: '해시테이블 평균 탐색 시간복잡도는?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 0, explain: '충돌이 잘 분산되면 해시 계산 한 번으로 바로 접근하므로 평균 O(1)입니다.' },
  },
];

const DS_IDS = DS_UNITS.map((u) => u.id);

window.DS_UNITS = DS_UNITS;


window.DS_IDS = DS_IDS;

