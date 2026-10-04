// 피드 포스트 카드 형태의 자료구조 설명 + 시각화 래퍼 (Vite 모듈 버전)

function HeartIcon({ fill }) {
  if (fill)
    return (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" /></svg>);
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" /></svg>);
}
const CIcon = ({ d }) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>);

function FeedCard({ unit, VizComp, children, quizNode, labRef }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(128 + unit.id.length * 17);
  return (
    <article className="ig-card hover">
      <div className="ig-post-head">
        <div className="ig-avatar"><div>{unit.icon}</div></div>
        <div><b>{unit.label} · 핵심개념</b><small>{unit.handle}</small></div>
        <button className="dots" aria-label="더보기">•••</button>
      </div>
      <div className="ig-post-body">
        <span className="ig-badge-grad ig-badge">{unit.label} FEED</span>
        <h2>{unit.title}</h2>
        <p>{unit.desc}</p>
        <ul className="ig-points">{unit.points.map((p) => <li key={p}>{p}</li>)}</ul>
        <pre className="ig-code">{unit.code}</pre>
        {VizComp && (
          <div className="ig-lab" ref={labRef}>
            <span className="ig-lab-title">● INTERACTIVE LAB — 직접 조작해보세요</span>
            <VizComp />
          </div>
        )}
        {children}
        {quizNode}
      </div>
      <div className="ig-actions">
        <button className={`ig-icon-btn ${liked ? 'liked' : ''}`} aria-label="좋아요"
          onClick={() => { setLiked(!liked); setLikes((n) => (liked ? n - 1 : n + 1)); }}>
          <HeartIcon fill={liked} />
        </button>
        <button className="ig-icon-btn" aria-label="댓글"><CIcon d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /></button>
        <button className="ig-icon-btn" aria-label="공유"><CIcon d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></button>
        <button className="ig-icon-btn" style={{ marginLeft: 'auto' }} aria-label="북마크"
          onClick={() => setSaved(!saved)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9"><path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4Z" /></svg>
        </button>
      </div>
      <div className="ig-likes">좋아요 {likes.toLocaleString()}개</div>
      <div className="ig-comments"><b>{unit.handle}</b> {unit.title} <span>· 댓글을 달아 질문해보세요</span></div>
    </article>
  );
}

window.FeedCard = FeedCard;

