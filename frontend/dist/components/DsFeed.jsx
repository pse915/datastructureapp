// DS 학습 피드: StoryBar + FeedCard + QuizCard + 진행도 — Vite 모듈 버전
// dist/App.jsx 번들본과 로직 동일. 수정 시 양쪽 동기화.

function makeId(p = 'quiz') {
  try {
    if (globalThis.crypto?.randomUUID) return `${p}-${globalThis.crypto.randomUUID()}`;
  } catch (_) {}
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function DsLearnFeed({ units, solved = {}, onSolve, query, setQuery }) {
  const [activeId, setActiveId] = useState(units[0]?.id || 'array');
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => (u.label + u.title + u.desc).toLowerCase().includes(q));
  }, [units, query]);
  const active = filtered.find((u) => u.id === activeId) || filtered[0] || units[0];
  const done = Object.keys(solved).length;

  return (
    <div className="ig-feed" style={{ paddingTop: 0 }}>
      <div className="ig-progress-strip">
        <div style={{ fontSize: 26 }}>🎓</div>
        <div className="bar"><i style={{ width: `${Math.round((done / units.length) * 100)}%` }} /></div>
        <div><b>{done} / {units.length} 해결</b><small>퀴즈 정답 시 자동 저장돼요</small></div>
      </div>

      <StoryBar units={units} activeId={active?.id} onSelect={(id) => setActiveId(id)} solved={solved} />

      {active && (
        <FeedCard
          key={active.id}
          unit={active}
          VizComp={VIZ_MAP[active.id]}
          quizNode={
            <QuizCard
              unit={active}
              solved={!!solved[active.id]}
              onSolve={(unitId) => onSolve?.(unitId, makeId('quiz'))}
            />
          }
        />
      )}

      <div className="ig-card">
        <div className="ig-post-head">
          <div className="ig-avatar"><div>📚</div></div>
          <div><b>전체 피드</b><small>@all.units · 스크롤로 복습</small></div>
        </div>
        <div className="ig-post-body"><p className="ig-hint">스토리를 눌러 단원을 바꾸거나, 아래에서 전체를 스크롤하세요.</p></div>
      </div>

      {units.filter((u) => u.id !== active?.id).map((u) => (
        <FeedCard
          key={u.id}
          unit={u}
          VizComp={null}
          quizNode={
            <button className="ig-btn ig-btn-grad" onClick={() => { setActiveId(u.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              {u.label} 실습하러 가기
            </button>
          }
        />
      ))}
    </div>
  );
}

function DsTeacherPreview({ units }) {
  const [activeId, setActiveId] = useState(units[0]?.id || 'array');
  const active = units.find((u) => u.id === activeId) || units[0];
  const Viz = VIZ_MAP[active.id];
  return (
    <div className="ig-page">
      <header className="ig-head">
        <div>
          <span className="eyebrow">DS CURRICULUM · PREVIEW</span>
          <h1>자료구조 단원 미리보기</h1>
          <p>학생에게 보이는 피드 그대로 확인합니다. 퀴즈 정답·해설을 검수하세요.</p>
        </div>
      </header>
      <StoryBar units={units} activeId={active.id} onSelect={setActiveId} solved={{}} />
      <FeedCard unit={active} VizComp={Viz} quizNode={<QuizCard unit={active} solved={false} onSolve={() => {}} />} />
    </div>
  );
}

window.DsLearnFeed = DsLearnFeed; window.DsTeacherPreview = DsTeacherPreview;

