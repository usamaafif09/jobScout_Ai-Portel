# JobScout AI 🎯
**SMIT Agentic AI Hackathon 2025**

An autonomous AI career agent that analyzes your CV, searches real-time job listings, scores every match with reasoning, and generates personalized cover letters — powered by LangGraph + Groq + Tavily.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 📄 CV Parsing | Supports PDF & DOCX via PyMuPDF & python-docx |
| 🧠 Profile Extraction | LLM extracts skills, roles, experience, location |
| 🌐 Real-Time Job Search | Tavily queries live job listings autonomously |
| 📊 AI Match Scoring | Jobs scored 0-100 with full reasoning |
| ✉️ Cover Letter Generator | Personalized opening per job |
| 🎤 Interview Tips | Role-specific prep tips per job |
| 🧩 Skill Gap Analysis | Missing skills with free learning resources |
| 🛤️ Career Path Suggestions | AI-recommended career directions |
| 🔗 LinkedIn Optimization | Profile improvement tips |
| 💰 Salary Estimates | AI-estimated salary ranges |

---

## 🏗️ Architecture (LangGraph)

```
CV Upload → extract_profile → generate_queries → search_jobs → evaluate_jobs → generate_insights → Results Dashboard
```

## ⚙️ Tech Stack

- **Agent Framework**: LangGraph
- **LLM**: Groq (Llama 3.3-70b-versatile)
- **Job Search**: Tavily API
- **Backend**: FastAPI + Python
- **Frontend**: React + Vite

---

## 🛠️ Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# Add .env with GROQ_API_KEY and TAVILY_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3030
```

---

## 🔑 Environment Variables

Create `backend/.env`:
```
GROQ_API_KEY=your_groq_key
TAVILY_API_KEY=your_tavily_key
```
**Never commit this file!**
