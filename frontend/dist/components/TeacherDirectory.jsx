

function emitLocal(emitProp, action, payload = {}) {
  if (typeof emitProp === 'function') return emitProp(action, payload);
  const fn = window.__TECH_EMIT__;
  if (typeof fn === 'function') return fn(action, payload);
}

function TeacherDirectory({ dashboard, weeks = [], csvExport, result, onStudent, emit }) {
  const q = dashboard?.query || { search: '', grade: '', klass: '', week: '', onlyUngraded: false, page: 1 };
  const [search, setSearch] = React.useState(q.search || '');
  const [grade, setGrade] = React.useState(q.grade || '');
  const [klass, setKlass] = React.useState(q.klass || '');
  const [week, setWeek] = React.useState(q.week || '');
  const [onlyUngraded, setOnlyUngraded] = React.useState(!!q.onlyUngraded);
  const [selected, setSelected] = React.useState({});
  const [bulkScore, setBulkScore] = React.useState('');
  const [bulkFeedback, setBulkFeedback] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setSearch(q.search || ''); setGrade(q.grade || ''); setKlass(q.klass || '');
    setWeek(q.week || ''); setOnlyUngraded(!!q.onlyUngraded);
  }, [q.search, q.grade, q.klass, q.week, q.onlyUngraded]);

  React.useEffect(() => { setSelected({}); setBusy(false); }, [dashboard?.page, dashboard?.portfolioTotal, result?.savedAt, result?.count]);

  const rows = dashboard?.portfolio || [];
  const total = dashboard?.portfolioTotal ?? rows.length;
  const page = dashboard?.page || 1;
  const totalPages = dashboard?.totalPages || 1;

  const grades = React.useMemo(() => {
    const s = new Set((dashboard?.students || []).map((x) => String(x.학년 || '')).filter(Boolean));
    return [...s].sort();
  }, [dashboard?.students]);
  const klasses = React.useMemo(() => {
    const s = new Set((dashboard?.students || []).filter((x) => !grade || String(x.학년) === String(grade)).map((x) => String(x.반 || '')).filter(Boolean));
    return [...s].sort();
  }, [dashboard?.students, grade]);

  const apply = (nextPage = 1) => {
    emitLocal(emit, 'teacher_search', { query: { search, grade, klass, week, onlyUngraded, page: nextPage } });
  };
  const reset = () => {
    setSearch(''); setGrade(''); setKlass(''); setWeek(''); setOnlyUngraded(false);
    emitLocal(emit, 'teacher_search', { query: { search: '', grade: '', klass: '', week: '', onlyUngraded: false, page: 1 } });
  };

  const toggle = (key) => setSelected((p) => ({ ...p, [key]: !p[key] }));
  const toggleAll = () => {
    if (Object.values(selected).some(Boolean)) setSelected({});
    else {
      const next = {};
      rows.forEach((r, i) => { next[`${r.학번}-${r.주차}-${i}`] = true; });
      setSelected(next);
    }
  };
  const selectedRows = rows.filter((r, i) => selected[`${r.학번}-${r.주차}-${i}`]);

  const bulkSave = () => {
    if (!selectedRows.length || busy) return;
    const score = bulkScore === '' ? 0 : Number(bulkScore);
    if (!Number.isFinite(score) || score < 0 || score > 1000) return;
    setBusy(true);
    emitLocal(emit, 'teacher_bulk_grade', {
      items: selectedRows.slice(0, 30).map((r) => ({
        studentId: String(r.학번), week: Number(r.주차), score, feedback: bulkFeedback,
      })),
    });
  };

  const csvHref = React.useMemo(() => {
    const text = csvExport?.csv;
    if (!text) return '';
    return `data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(text)}`;
  }, [csvExport?.csv, csvExport?.generatedAt]);

  const pageNums = React.useMemo(() => {
    const out = [];
    const start = Math.max(1, Math.min(page - 2, Math.max(1, totalPages - 4)));
    for (let p = start; p <= Math.min(totalPages, start + 4); p++) out.push(p);
    return out;
  }, [page, totalPages]);

  return (
    <div className="teacher-directory">
      <div className="student-picker">
        <div><span className="eyebrow">DIRECTORY · {total}건</span><h1>제출 목록 검색</h1><p>50건씩 페이징됩니다. 체크 후 일괄 평가가 가능합니다.</p></div>
        <div className="picker-controls">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="학번·이름·내용 검색" onKeyDown={(e) => { if (e.key === 'Enter') apply(1); }} />
          <select value={grade} onChange={(e) => { setGrade(e.target.value); setKlass(''); }}><option value="">전체 학년</option>{grades.map((g) => <option key={g} value={g}>{g}학년</option>)}</select>
          <select value={klass} onChange={(e) => setKlass(e.target.value)}><option value="">전체 반</option>{klasses.map((k) => <option key={k} value={k}>{k}반</option>)}</select>
          <select value={week} onChange={(e) => setWeek(e.target.value)}><option value="">전체 주차</option>{Array.from({ length: 17 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}주차</option>)}</select>
          <label className="ws-check"><input type="checkbox" checked={onlyUngraded} onChange={(e) => setOnlyUngraded(e.target.checked)} />미채점만</label>
          <button className="ws-btn primary" onClick={() => apply(1)}>검색</button>
          <button className="ws-btn" onClick={reset}>초기화</button>
        </div>
      </div>

      <div className="ws-card">
        <div className="ws-row" style={{ justifyContent: 'space-between' }}>
          <b>{page} / {totalPages} 페이지 · 선택 {selectedRows.length}건</b>
          <div className="ws-row">
            <input type="number" min="0" max="1000" value={bulkScore} onChange={(e) => setBulkScore(e.target.value)} placeholder="일괄 점수" style={{ width: 110 }} />
            <input value={bulkFeedback} onChange={(e) => setBulkFeedback(e.target.value.slice(0, 2000))} placeholder="일괄 피드백 (선택)" style={{ width: 220 }} />
            <button className="ws-btn primary" disabled={!selectedRows.length || busy || bulkScore === ''} onClick={bulkSave}>{busy ? '저장 중…' : `선택 ${Math.min(selectedRows.length, 30)}건 일괄 저장`}</button>
          </div>
        </div>
        {rows.length ? (
          <table className="gm-table">
            <thead><tr><th><input type="checkbox" checked={Object.values(selected).some(Boolean)} onChange={toggleAll} /></th><th>학번</th><th>이름</th><th>반</th><th>주차</th><th>점수</th><th>피드백</th><th>제출일시</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const key = `${r.학번}-${r.주차}-${i}`;
                return (
                  <tr key={key}>
                    <td><input type="checkbox" checked={!!selected[key]} onChange={() => toggle(key)} /></td>
                    <td><button className="ws-btn" onClick={() => onStudent && onStudent(r.학번)}>{r.학번}</button></td>
                    <td>{r.이름}</td>
                    <td>{r.학년}-{r.반}</td>
                    <td>{r.주차}주</td>
                    <td>{r.점수 === '' || r.점수 == null ? '미채점' : `${r.점수}/${r.배점 || ''}`}</td>
                    <td>{String(r.피드백 || '').slice(0, 24)}</td>
                    <td>{String(r.제출일시 || '').slice(0, 16)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <div className="empty-mini">검색 결과가 없습니다.</div>}
        <div className="ws-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button className="ws-btn" disabled={page <= 1} onClick={() => apply(page - 1)}>이전</button>
          {pageNums.map((p) => <button key={p} className={p === page ? 'ws-btn primary' : 'ws-btn'} onClick={() => apply(p)}>{p}</button>)}
          <button className="ws-btn" disabled={page >= totalPages} onClick={() => apply(page + 1)}>다음</button>
        </div>
      </div>

      <div className="ws-card">
        <b>CSV 내보내기 (현재 필터 기준, UTF-8 BOM)</b>
        <div className="ws-row">
          <button className="ws-btn primary" onClick={() => emitLocal(emit, 'teacher_export_csv', {})}>CSV 준비</button>
          {csvHref ? <a className="ws-btn primary" href={csvHref} download={csvExport?.filename || '포트폴리오_성적표.csv'}>CSV 다운로드 ({csvExport?.count ?? 0}건)</a> : <span className="empty-mini">준비 버튼을 누르면 다운로드 링크가 생성됩니다.</span>}
        </div>
      </div>
    </div>
  );
}
