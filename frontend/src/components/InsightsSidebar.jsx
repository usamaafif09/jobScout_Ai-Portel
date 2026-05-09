export default function InsightsSidebar({ insights, candidate }) {
  if (!insights) return null;

  const {
    top_skill_gaps = [],
    career_paths   = [],
    linkedin_tips  = [],
    cv_tips        = [],
    market_summary = "",
    salary_range   = "",
  } = insights;

  return (
    <>
      <h3>💡 Career Insights</h3>

      {market_summary && (
        <div className="insight-section">
          <h4>📈 Market Overview</h4>
          <div className="market-card">
            {market_summary}
            {salary_range && (
              <div className="market-salary">💰 {salary_range}</div>
            )}
          </div>
        </div>
      )}

      {top_skill_gaps.length > 0 && (
        <div className="insight-section">
          <h4>🚀 Skill Gaps to Close</h4>
          {top_skill_gaps.map((g, i) => (
            <div className="gap-item" key={i}>
              <div className="gap-item-top">
                <strong>{g.skill || g}</strong>
                {g.priority && (
                  <span className={`priority-badge priority-${(g.priority || "medium").toLowerCase()}`}>
                    {g.priority}
                  </span>
                )}
              </div>
              {g.reason && <p className="gap-reason">{g.reason}</p>}
              {g.resource && (
                <div className="gap-resource">
                  🎓 <a href={g.resource} target="_blank" rel="noreferrer">Free Resource ↗</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {career_paths.length > 0 && (
        <div className="insight-section">
          <h4>🛤️ Career Paths</h4>
          {career_paths.map((p, i) => (
            <div className="path-item" key={i}>{p}</div>
          ))}
        </div>
      )}

      {linkedin_tips.length > 0 && (
        <div className="insight-section">
          <h4>🔗 LinkedIn Tips</h4>
          {linkedin_tips.map((t, i) => (
            <div className="tip-card" key={i}>{t}</div>
          ))}
        </div>
      )}

      {cv_tips.length > 0 && (
        <div className="insight-section">
          <h4>📝 CV Improvements</h4>
          {cv_tips.map((t, i) => (
            <div className="tip-card" key={i}>{t}</div>
          ))}
        </div>
      )}
    </>
  );
}
