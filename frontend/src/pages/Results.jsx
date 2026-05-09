import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import ScoreRing from "../components/ScoreRing";
import InsightsSidebar from "../components/InsightsSidebar";

function getBadgeClass(label) {
  if (!label) return "badge-partial";
  const l = label.toLowerCase();
  if (l.includes("strong")) return "badge-strong";
  if (l.includes("good"))   return "badge-good";
  if (l.includes("partial"))return "badge-partial";
  return "badge-weak";
}

function FormattedJobDescription({ text }) {
  if (!text) return <p style={{ color: "var(--muted)" }}>Description not available.</p>;

  // Split by newline, remove excessive empty lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');

  return (
    <div style={{ background: "var(--surface)", padding: "20px", borderRadius: 8, maxHeight: 400, overflowY: "auto", border: "1px solid var(--border)", fontSize: "0.9rem" }}>
      {lines.map((line, i) => {
        // Heading detection (short line ending with colon, or uppercase short line, or markdown hash)
        if (line.startsWith('#')) {
          const content = line.replace(/^#+\s*/, '');
          return <h4 key={i} style={{ color: 'var(--text)', marginTop: 16, marginBottom: 8 }}>{content}</h4>;
        }
        if (line.length < 50 && (line.endsWith(':') || line === line.toUpperCase() && line.length > 3)) {
          return <h5 key={i} style={{ color: 'var(--text)', marginTop: 16, marginBottom: 8, fontSize: "1rem" }}>{line}</h5>;
        }
        // Bullet point detection
        if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, marginLeft: 16, color: 'var(--muted)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--primary)' }}>•</span> 
              <span>{line.substring(2).trim()}</span>
            </div>
          );
        }
        // Normal paragraph
        return <p key={i} style={{ color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>{line}</p>;
      })}
    </div>
  );
}

function JobCard({ job, candidate }) {
  const [tab, setTab] = useState("reason");
  const [applyState, setApplyState] = useState("idle"); // idle, loading, done
  const [applyPacket, setApplyPacket] = useState("");

  const tabs = [
    { id: "reason",    label: "🎯 Match Reason" },
    { id: "description",label: "📄 Job Description" },
    { id: "cover",     label: "✉️ Cover Letter" },
    { id: "interview", label: "🎤 Interview Tips" },
    { id: "skills",    label: "🧩 Skills Gap" },
  ];

  const handleAutoApply = async () => {
    setApplyState("loading");
    try {
      const resp = await axios.post("http://localhost:8000/auto-apply", {
        candidate,
        job
      });
      setApplyPacket(resp.data.application_packet);
      setApplyState("done");
    } catch (err) {
      alert("Auto Apply failed. Backend may be offline.");
      setApplyState("idle");
    }
  };

  return (
    <div className="job-card">
      <div className="job-card-header">
        <div className="score-ring-wrap">
          <ScoreRing score={job.match_score || 0} />
        </div>
        <div className="job-title-block">
          <h3>{job.title}</h3>
          <div className="job-source">🔗 {job.source}</div>
          <div className="job-badges">
            <span className={`badge ${getBadgeClass(job.match_label)}`}>
              {job.match_label || "Match"}
            </span>
            {job.ats_score && (
              <span className="badge badge-ats">ATS {job.ats_score}%</span>
            )}
            {job.salary_estimate && (
              <span className="badge badge-salary">💰 {job.salary_estimate}</span>
            )}
          </div>
        </div>
      </div>

      <div className="job-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`job-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="job-tab-content">
        {tab === "reason" && (
          <>
            <h4>Why it's a match</h4>
            <p>{job.why_good || "This job aligns with your profile."}</p>
            {job.why_not && (
              <p style={{ color: "var(--muted)", marginTop: 8 }}>⚠️ {job.why_not}</p>
            )}
          </>
        )}

        {tab === "description" && (
          <>
            {job.short_summary && (
              <div style={{ marginBottom: 16, padding: 16, background: "rgba(99,102,241,0.08)", borderRadius: 8, borderLeft: "4px solid var(--primary)" }}>
                <h4 style={{ color: "var(--primary)", marginBottom: 8, fontSize: "0.9rem" }}>✨ AI Short Summary</h4>
                <p style={{ color: "var(--text)", fontSize: "0.9rem", lineHeight: 1.5 }}>{job.short_summary}</p>
              </div>
            )}
            
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: "bold", color: "var(--text)", padding: "10px 0", outline: "none" }}>
                View Full Raw Job Description 👇
              </summary>
              <div style={{ marginTop: 10 }}>
                <FormattedJobDescription text={job.content} />
              </div>
            </details>
          </>
        )}

        {tab === "cover" && (
          <>
            <h4>Personalized Cover Letter Opening</h4>
            <div className="cover-letter-box">
              "{job.cover_letter_opening || "I am excited to apply for this role, as my experience aligns strongly with your requirements."}"
            </div>
            <p style={{ color: "var(--muted)", marginTop: 10, fontSize: ".8rem" }}>
              💡 Use this as the opening paragraph of your cover letter.
            </p>
          </>
        )}

        {tab === "interview" && (
          <>
            <h4>Interview Preparation Tips</h4>
            <ul className="tip-list">
              {(job.interview_tips || ["Research the company thoroughly.", "Highlight your most relevant projects.", "Prepare questions about the team culture."]).map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </>
        )}

        {tab === "skills" && (
          <>
            <h4>Skills You Have</h4>
            <div className="skill-tags">
              {(job.candidate_meets || []).map((s) => (
                <span key={s} className="skill-tag has">✓ {s}</span>
              ))}
            </div>
            {job.candidate_missing?.length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}>Skills to Develop</h4>
                <div className="skill-tags">
                  {job.candidate_missing.map((s) => (
                    <span key={s} className="skill-tag miss">✗ {s}</span>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Global Auto Apply Section (Always Visible) */}
      <div style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {applyState === "idle" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button 
              className="btn-primary" 
              onClick={handleAutoApply} 
              style={{ padding: "12px 20px", fontSize: "1rem", borderRadius: 8, margin: 0, flex: 1, fontWeight: "bold" }}
            >
              ✨ One-Click AI Apply
            </button>
            <a 
              className="job-link" 
              href={job.url} 
              target="_blank" 
              rel="noreferrer" 
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)", padding: "12px 20px", borderRadius: 8, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500 }}
            >
              ↗ View Original
            </a>
          </div>
        )}

        {applyState !== "idle" && (
          <div style={{ padding: 20, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10 }}>
            {applyState === "loading" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--green)" }}>
                <span className="loading-brain" style={{ fontSize: "1.5rem", animationDuration: "1s" }}>🤖</span>
                <div>
                  <strong>AI is submitting application...</strong>
                  <p style={{ fontSize: ".8rem", opacity: .8 }}>Processing profile and sending to {job.source}</p>
                </div>
              </div>
            ) : (
              <div>
                <h4 style={{ color: "var(--green)", marginBottom: 12 }}>✅ Application Successfully Sent!</h4>
                <p style={{ fontSize: ".8rem", color: "var(--muted)", marginBottom: 12 }}>
                  Your profile and custom cover letter have been submitted directly through JobScout AI.
                </p>
                <div className="cover-letter-box" style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: ".8rem", background: "rgba(0,0,0,0.3)" }}>
                  {applyPacket}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  const [filter, setFilter] = useState("all");
  const [sort, setSort]     = useState("score");

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
        <p style={{ color: "var(--muted)" }}>No results found.</p>
        <button className="btn-primary" onClick={() => navigate("/")}>← Go Back</button>
      </div>
    );
  }

  const { candidate, jobs = [], insights = {}, stats = {} } = data;

  const filterMap = { all: null, strong: "Strong Match", good: "Good Match", partial: "Partial Match" };
  let filtered = jobs.filter((j) =>
    filter === "all" ? true : j.match_label === filterMap[filter]
  );
  if (sort === "score") filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  if (sort === "ats")   filtered.sort((a, b) => (b.ats_score || 0)   - (a.ats_score || 0));

  const avgScore = jobs.length
    ? Math.round(jobs.reduce((s, j) => s + (j.match_score || 0), 0) / jobs.length)
    : 0;

  return (
    <div className="results-page">
      <nav className="navbar">
        <div className="navbar-logo">
          <span className="logo-icon">🎯</span>
          <span className="gradient-text">JobScout AI</span>
        </div>
        <button className="btn-ghost" onClick={() => navigate("/")}>← New Search</button>
      </nav>

      <div className="results-hero">
        <div className="candidate-info">
          <p style={{ color: "var(--muted)", fontSize: ".85rem", marginBottom: 4 }}>Candidate Profile</p>
          <h2>{candidate?.name || "Your Profile"}</h2>
          <p className="gradient-text" style={{ fontWeight: 600 }}>{candidate?.current_role}</p>
          <div className="candidate-meta">
            {candidate?.location && <span className="meta-pill">📍 {candidate.location}</span>}
            {candidate?.years_experience > 0 && (
              <span className="meta-pill">🗓 {candidate.years_experience} yrs exp</span>
            )}
            {candidate?.email && <span className="meta-pill">✉️ {candidate.email}</span>}
            {(candidate?.skills || []).slice(0, 4).map((s) => (
              <span key={s} className="meta-pill">{s}</span>
            ))}
          </div>
        </div>
        <div className="stat-cards">
          <div className="stat-card">
            <span className="stat-num gradient-text">{jobs.length}</span>
            <span className="stat-label">Jobs Found</span>
          </div>
          <div className="stat-card">
            <span className="stat-num" style={{ color: "var(--green)" }}>{avgScore}%</span>
            <span className="stat-label">Avg Match</span>
          </div>
          <div className="stat-card">
            <span className="stat-num" style={{ color: "var(--cyan)" }}>{stats.queries_used || 0}</span>
            <span className="stat-label">Queries Run</span>
          </div>
        </div>
      </div>

      <div className="results-body">
        <div>
          <div className="controls">
            <h3>🔎 Job Matches</h3>
            <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Jobs</option>
              <option value="strong">Strong Match</option>
              <option value="good">Good Match</option>
              <option value="partial">Partial Match</option>
            </select>
            <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="score">Sort: Match Score</option>
              <option value="ats">Sort: ATS Score</option>
            </select>
          </div>

          <div className="jobs-grid">
            {filtered.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: 20 }}>No jobs match this filter.</p>
            ) : (
              filtered.map((job, i) => <JobCard key={i} job={job} candidate={candidate} />)
            )}
          </div>
        </div>

        <div className="insights-sidebar">
          <InsightsSidebar insights={insights} candidate={candidate} />
        </div>
      </div>
    </div>
  );
}
