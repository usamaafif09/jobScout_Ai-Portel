import asyncio
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from cv_parser import parse_cv
from agent import run_agent

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx",
    ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"
}

app = FastAPI(title="JobScout AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SAMPLE_CV = """
John Ahmed
Senior Software Engineer | Karachi, Pakistan
john.ahmed@email.com | +92-300-1234567

PROFESSIONAL SUMMARY
Full-stack developer with 5 years of experience building scalable web applications.
Specialized in React, Node.js, and Python. Passionate about clean code and AI.

SKILLS
Python, JavaScript, TypeScript, React, Node.js, FastAPI, Django,
PostgreSQL, MongoDB, Docker, Git, AWS, REST APIs, Machine Learning basics

EXPERIENCE
Senior Software Engineer — TechCorp Pvt Ltd (2022–Present)
- Built microservices architecture serving 100K+ users
- Led frontend migration from Angular to React

Software Engineer — StartupXYZ (2020–2022)
- Developed RESTful APIs using Node.js and Express
- Integrated third-party payment gateways

EDUCATION
BS Computer Science — FAST NUCES, Karachi (2020)

LANGUAGES
English (Fluent), Urdu (Native)
"""


@app.get("/")
def root():
    return {"status": "JobScout AI is running 🚀", "version": "1.0.0"}


@app.post("/analyze")
async def analyze_cv(file: UploadFile = File(...)):
    """Upload a CV (PDF/DOCX/Image) and get AI-powered job matches."""
    import os
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOCX, JPG, PNG, WEBP."
        )
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    file_bytes = await file.read()
    cv_text = parse_cv(file_bytes, file.filename)

    if len(cv_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract text from CV. Please upload a readable PDF or DOCX.")

    try:
        result = await asyncio.to_thread(run_agent, cv_text)
        return JSONResponse(content={
            "success": True,
            "candidate": result.get("candidate_profile", {}),
            "jobs": result.get("evaluated_jobs", []),
            "insights": result.get("insights", {}),
            "stats": {
                "total_jobs_found": len(result.get("raw_jobs", [])),
                "jobs_evaluated": len(result.get("evaluated_jobs", [])),
                "queries_used": len(result.get("search_queries", [])),
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@app.post("/analyze-sample")
async def analyze_sample():
    """Run agent with a built-in sample CV for demo purposes."""
    try:
        result = await asyncio.to_thread(run_agent, SAMPLE_CV)
        return JSONResponse(content={
            "success": True,
            "candidate": result.get("candidate_profile", {}),
            "jobs": result.get("evaluated_jobs", []),
            "insights": result.get("insights", {}),
            "stats": {
                "total_jobs_found": len(result.get("raw_jobs", [])),
                "jobs_evaluated": len(result.get("evaluated_jobs", [])),
                "queries_used": len(result.get("search_queries", [])),
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
