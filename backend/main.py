import asyncio
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from cv_parser import parse_cv
from agent import run_agent, llm, evaluate_job_list
from langchain_core.messages import HumanMessage

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

class AutoApplyRequest(BaseModel):
    candidate: dict
    job: dict

class EvaluateBatchRequest(BaseModel):
    candidate: dict
    jobs: list

class SearchMoreRequest(BaseModel):
    candidate: dict
    existing_urls: list
    page: int = 1

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
            "raw_jobs": result.get("raw_jobs", []),
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
            "raw_jobs": result.get("raw_jobs", []),
            "insights": result.get("insights", {}),
            "stats": {
                "total_jobs_found": len(result.get("raw_jobs", [])),
                "jobs_evaluated": len(result.get("evaluated_jobs", [])),
                "queries_used": len(result.get("search_queries", [])),
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

@app.post("/auto-apply")
async def auto_apply(req: AutoApplyRequest):
    """Simulate AI applying to a job with the candidate's profile."""
    prompt = f"""You are an autonomous AI Agent applying for a job on behalf of the candidate.
Draft the final application email/submission packet that will be sent to the employer.

Candidate Profile: {req.candidate}
Job Details: {req.job.get('title')} at {req.job.get('source')}

Write a highly professional, persuasive email applying for this specific role. Include:
1. Subject line
2. A tailored greeting
3. A strong opening statement
4. 2-3 bullet points highlighting EXACTLY how the candidate's skills meet the job requirements
5. A confident closing

Make it sound like the candidate wrote it. Do not include placeholders like [Your Name], use the real data.
"""
    try:
        response = await asyncio.to_thread(lambda: llm.invoke([HumanMessage(content=prompt)]))
        return JSONResponse(content={
            "success": True,
            "application_packet": response.content,
            "job_url": req.job.get("url", "")
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apply error: {str(e)}")

@app.post("/evaluate-batch")
async def evaluate_batch(req: EvaluateBatchRequest):
    """Evaluate a batch of raw jobs on demand for Load More feature."""
    try:
        evaluated = await asyncio.to_thread(evaluate_job_list, req.candidate, req.jobs)
        return JSONResponse(content={
            "success": True,
            "evaluated_jobs": evaluated
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch evaluate error: {str(e)}")


@app.post("/search-more")
async def search_more(req: SearchMoreRequest):
    """Search for additional job listings beyond the initial set."""
    from agent import tavily
    import json
    p = req.candidate
    role = p.get("current_role", "software engineer")
    skills = p.get("skills", [])[:3]
    location = p.get("location", "")
    page = req.page

    # Build varied queries for the extra search
    extra_queries = [
        f"site:linkedin.com/jobs/view/ {role} {location}",
        f"site:indeed.com/viewjob {role} {location}",
        f"{role} hiring 2025 {location} apply now",
        f"{' '.join(skills)} developer jobs {location} 2025",
        f"{role} remote vacancies 2025",
    ]

    existing_urls = set(req.existing_urls)
    new_jobs = []
    seen = set(existing_urls)

    try:
        for query in extra_queries:
            results = tavily.search(
                query=query,
                search_depth="advanced",
                max_results=10,
                include_raw_content=True
            )
            for r in results.get("results", []):
                url = r.get("url", "")
                if url and url not in seen:
                    seen.add(url)
                    full_text = r.get("raw_content") or r.get("content", "")
                    new_jobs.append({
                        "title": r.get("title", "Position"),
                        "url": url,
                        "content": full_text[:12000],
                        "source": url.split("/")[2] if url else "Unknown",
                    })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

    if not new_jobs:
        return JSONResponse(content={"success": True, "evaluated_jobs": [], "message": "No new jobs found"})

    # Evaluate the new jobs
    try:
        evaluated = []
        for i in range(0, len(new_jobs), 5):
            batch = new_jobs[i:i+5]
            res = await asyncio.to_thread(evaluate_job_list, req.candidate, batch)
            if res:
                evaluated.extend(res)
                
        high_acc = [j for j in evaluated if j.get("match_score", 0) > 70]
        high_acc.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        final_jobs = high_acc if len(high_acc) > 0 else evaluated
        
        return JSONResponse(content={
            "success": True,
            "evaluated_jobs": final_jobs,
            "raw_count": len(new_jobs)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluate error: {str(e)}")
