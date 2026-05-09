import API_BASE_URL from "../api";

const API = API_BASE_URL;

const BASE_STEPS = [
  { id: "profile",  label: "Extracting skills & experience...", icon: "🧠" },
  { id: "queries",  label: "Generating smart search queries...", icon: "🔍" },
  { id: "search",   label: "Searching real-time job listings...",icon: "🌐" },
  { id: "evaluate", label: "AI scoring & ranking jobs...",       icon: "⚡" },
  { id: "insights", label: "Generating career insights...",      icon: "💡" },
];
const IMAGE_STEP = { id: "ocr", label: "Reading CV image with AI Vision...", icon: "🔬" };

export default function Home() {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  // Derive steps based on file type (image gets an extra OCR step)
  const STEPS = file && isImage(file)
    ? [{ id: "parse", label: "Reading your CV...", icon: "📄" }, IMAGE_STEP, ...BASE_STEPS]
    : [{ id: "parse", label: "Reading your CV...", icon: "📄" }, ...BASE_STEPS];

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    // Generate preview URL for image files
    if (isImage(f)) {
      const url = URL.createObjectURL(f);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  // Cleanup object URL on unmount
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const animateSteps = () => {
    let i = 0;
    const interval = setInterval(() => {
      setStepIdx(i);
      i++;
      if (i >= STEPS.length) clearInterval(interval);
    }, 3200);
    return interval;
  };

  const runAnalysis = async (useSample = false) => {
    setLoading(true);
    setStepIdx(0);
    const timer = animateSteps();

    try {
      let resp;
      if (useSample) {
        resp = await axios.post(`${API}/analyze-sample`);
      } else {
        const formData = new FormData();
        formData.append("file", file);
        resp = await axios.post(`${API}/analyze`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      clearInterval(timer);
      setStepIdx(STEPS.length);
      setTimeout(() => {
        navigate("/results", { state: resp.data });
      }, 800);
    } catch (err) {
      clearInterval(timer);
      setLoading(false);
      setStepIdx(-1);
      alert(err.response?.data?.detail || "Something went wrong. Is the backend running?");
    }
  };

  if (loading) {
    const pct = Math.min(100, Math.round(((stepIdx + 1) / STEPS.length) * 100));
    return (
      <div className="loading-screen">
        <div className="loading-brain">🤖</div>
        <div className="loading-title">
          <span className="gradient-text">JobScout AI is working...</span>
        </div>
        <div className="loading-steps">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`loading-step ${i === stepIdx ? "active" : i < stepIdx ? "done" : ""}`}
            >
              <div className="step-dot" />
              <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
              <span>{s.label}</span>
              {i < stepIdx && <span style={{ marginLeft: "auto", color: "var(--green)" }}>✓</span>}
            </div>
          ))}
        </div>
        <div className="loading-bar-wrap">
          <div className="loading-bar" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          Powered by LangGraph + Groq + Tavily — This may take 30–60 seconds
        </p>
      </div>
    );
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          <span className="logo-icon">🎯</span>
          <span className="gradient-text">JobScout AI</span>
        </div>
        <div className="navbar-badge">🤖 Agentic AI</div>
      </nav>

      <main className="hero">
        <div className="hero-bg" />

        <div className="hero-badge">
          🏆 SMIT Agentic AI Hackathon 2025
        </div>

        <h1>
          Your Personal<br />
          <span className="gradient-text">AI Career Agent</span>
        </h1>

        <p>
          Upload your CV and let our autonomous AI agent analyze your profile,
          search real-time jobs, score every match, and generate tailored
          cover letters — all in one click.
        </p>

        <div className="glass upload-card">
          <div
            className={`drop-zone ${drag ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.bmp,.gif"
              onChange={(e) => handleFile(e.target.files[0])}
              style={{ display: "none" }}
            />
            <span className="drop-icon">📁</span>
            <h3>Drop your CV here</h3>
            <p>PDF · Word · Image (JPG, PNG, WEBP) · Max 5MB</p>
          </div>

          {file && (
            <div className="file-selected" style={{ flexDirection: isImage(file) ? "column" : "row", alignItems: isImage(file) ? "stretch" : "center" }}>
              {isImage(file) && imagePreview ? (
                <>
                  {/* Image Preview */}
                  <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", maxHeight: 220 }}>
                    <img
                      src={imagePreview}
                      alt="CV Preview"
                      style={{ width: "100%", objectFit: "cover", display: "block", borderRadius: 10 }}
                    />
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: "rgba(124,58,237,0.85)", color: "#fff",
                      padding: "4px 10px", borderRadius: 50, fontSize: ".75rem", fontWeight: 700
                    }}>
                      🔬 Vision AI
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <span style={{ fontSize: "1.2rem" }}>🖼️</span>
                    <span style={{ fontWeight: 600, fontSize: ".88rem", flex: 1 }}>{file.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <p style={{ fontSize: ".78rem", color: "var(--purple-l)", marginTop: 4 }}>
                    ✨ Groq Vision AI will extract your CV from this image
                  </p>
                </>
              ) : (
                <>
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
                </>
              )}
            </div>
          )}

          <div className="upload-actions">
            <button
              className="btn-primary"
              disabled={!file}
              onClick={() => runAnalysis(false)}
            >
              🚀 Analyze My CV
            </button>
            <button className="btn-ghost" onClick={() => runAnalysis(true)}>
              🎭 Try Demo CV
            </button>
          </div>
        </div>
      </main>

      <section className="features">
        {[
          { icon: "🖼️", title: "Image CV Support", desc: "Upload a photo or screenshot of your CV — Groq Vision AI reads it automatically." },
          { icon: "🧠", title: "Smart CV Parsing", desc: "Extracts skills, roles, and experience from PDF, Word, and image CVs." },
          { icon: "🌐", title: "Real-Time Search", desc: "Agent queries live job listings autonomously — no hardcoded results." },
          { icon: "📊", title: "AI Match Scoring", desc: "Every job scored 0–100 with detailed reasoning from Groq Llama 3." },
          { icon: "✉️", title: "Cover Letters", desc: "Auto-generated, personalized cover letter openers for each job." },
          { icon: "🎯", title: "Skill Gap Analysis", desc: "Know exactly what skills to learn with free resources linked." },
        ].map((f) => (
          <div className="feature-card" key={f.title}>
            <span className="feat-icon">{f.icon}</span>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </>
  );
}
