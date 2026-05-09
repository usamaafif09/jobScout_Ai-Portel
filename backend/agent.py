import os
import json
from typing import TypedDict, List, Optional
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END, START
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from tavily import TavilyClient

load_dotenv()

# ── LLM & Search clients ─────────────────────────────────────────────────────
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3,
)
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


# ── Agent State ───────────────────────────────────────────────────────────────
class AgentState(TypedDict):
    cv_text: str
    candidate_profile: dict
    search_queries: List[str]
    raw_jobs: List[dict]
    evaluated_jobs: List[dict]
    insights: dict
    current_step: str
    error: Optional[str]


# ── Helper: safe JSON parse ────────────────────────────────────────────────────
def safe_json(text: str, fallback):
    try:
        start = text.find("{") if "{" in text else text.find("[")
        end = (text.rfind("}") + 1) if "{" in text else (text.rfind("]") + 1)
        return json.loads(text[start:end])
    except Exception:
        return fallback


def safe_json_obj(text: str) -> dict:
    try:
        s, e = text.find("{"), text.rfind("}") + 1
        return json.loads(text[s:e])
    except Exception:
        return {}


def safe_json_arr(text: str) -> list:
    try:
        s, e = text.find("["), text.rfind("]") + 1
        return json.loads(text[s:e])
    except Exception:
        return []


# ── Node 1: Extract candidate profile from CV ─────────────────────────────────
def extract_profile(state: AgentState) -> dict:
    prompt = f"""You are an expert CV parser. Extract structured information from this CV.
Return ONLY valid JSON (no markdown, no explanation):
{{
  "name": "full name or Unknown",
  "email": "email or null",
  "phone": "phone or null",
  "current_role": "current/most recent job title",
  "years_experience": 0,
  "skills": ["skill1", "skill2"],
  "education": ["Degree - Institution"],
  "previous_roles": ["role1", "role2"],
  "location": "city/country or null",
  "languages": ["English"],
  "summary": "2-sentence professional summary"
}}

CV:
{state['cv_text'][:4000]}
"""
    resp = llm.invoke([HumanMessage(content=prompt)])
    profile = safe_json_obj(resp.content)
    if not profile:
        profile = {"name": "Candidate", "skills": [], "current_role": "Professional", "years_experience": 0}
    return {"candidate_profile": profile, "current_step": "profile_extracted"}


# ── Node 2: Generate smart search queries ─────────────────────────────────────
def generate_queries(state: AgentState) -> dict:
    p = state["candidate_profile"]
    prompt = f"""Based on this candidate profile, generate 8 diverse real-time job search queries.
Mix role titles, skills, and locations. Return ONLY a JSON array of strings.

Profile: {json.dumps(p, indent=2)}

Return: ["query1", "query2", ...]
"""
    resp = llm.invoke([HumanMessage(content=prompt)])
    queries = safe_json_arr(resp.content)
    if not queries:
        role = p.get("current_role", "software engineer")
        queries = [f"{role} jobs 2025", f"{role} remote jobs", f"{role} Pakistan jobs"]
    return {"search_queries": queries, "current_step": "queries_generated"}


# ── Node 3: Search real-time jobs via Tavily ──────────────────────────────────
def search_jobs(state: AgentState) -> dict:
    all_jobs, seen = [], set()
    for query in state["search_queries"][:8]:
        try:
            results = tavily.search(
                query=f"job opening {query} apply now hiring 2025",
                search_depth="advanced",
                max_results=5,
                include_raw_content=True
            )
            for r in results.get("results", []):
                url = r.get("url", "")
                if url not in seen:
                    seen.add(url)
                    full_text = r.get("raw_content") or r.get("content", "")
                    all_jobs.append({
                        "title": r.get("title", "Position"),
                        "url": url,
                        "content": full_text[:12000],
                        "source": url.split("/")[2] if url else "Unknown",
                    })
        except Exception:
            continue
    return {"raw_jobs": all_jobs[:30], "current_step": "jobs_found"}


# ── Node 4: Evaluate & score each job ────────────────────────────────────────
def evaluate_jobs(state: AgentState) -> dict:
    profile = state["candidate_profile"]
    evaluated = []
    # Cap evaluation to 8 jobs to prevent Groq Rate Limits (TPM/RPM)
    for job in state["raw_jobs"][:8]:
        prompt = f"""You are a career expert. Evaluate this job vs candidate profile. Return ONLY valid JSON:
{{
  "match_score": 85,
  "match_label": "Strong Match",
  "why_good": "2-3 sentence explanation of why this is a good match",
  "why_not": "1-2 sentence on gaps or concerns",
  "key_requirements": ["req1", "req2", "req3"],
  "candidate_meets": ["met_skill1", "met_skill2"],
  "candidate_missing": ["missing1", "missing2"],
  "ats_score": 78,
  "salary_estimate": "$X,XXX - $X,XXX/month",
  "interview_tips": ["tip1", "tip2", "tip3"],
  "cover_letter_opening": "Personalized 2-sentence opening for this specific role"
}}
match_label must be one of: Strong Match, Good Match, Partial Match, Weak Match

Candidate: {json.dumps(profile, indent=2)}
Job Title: {job['title']}
Job Content: {job['content'][:3000]}
"""
        try:
            resp = llm.invoke([HumanMessage(content=prompt)])
            ev = safe_json_obj(resp.content)
            if ev and ev.get("match_score"):
                evaluated.append({**job, **ev})
        except Exception:
            continue

    evaluated.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    return {"evaluated_jobs": evaluated, "current_step": "jobs_evaluated"}


# ── Node 5: Generate career insights ─────────────────────────────────────────
def generate_insights(state: AgentState) -> dict:
    profile = state["candidate_profile"]
    all_missing = []
    for job in state["evaluated_jobs"]:
        all_missing.extend(job.get("candidate_missing", []))
    missing_skills = list(set(all_missing))[:10]

    prompt = f"""You are a career coach. Provide strategic insights. Return ONLY valid JSON:
{{
  "top_skill_gaps": [
    {{"skill": "Docker", "priority": "High", "reason": "why needed", "resource": "free course link"}}
  ],
  "career_paths": [
    "Career path suggestion 1 based on current skills",
    "Alternative path 2",
    "Growth opportunity 3"
  ],
  "linkedin_tips": [
    "Specific LinkedIn optimization tip based on profile"
  ],
  "cv_tips": [
    "Specific CV improvement suggestion"
  ],
  "market_summary": "2-3 sentence market demand analysis for this candidate",
  "top_industries": ["Industry1", "Industry2", "Industry3"],
  "salary_range": "$X,XXX - $X,XXX/month based on profile"
}}

Candidate: {json.dumps(profile, indent=2)}
Common missing skills in market: {missing_skills}
"""
    try:
        resp = llm.invoke([HumanMessage(content=prompt)])
        insights = safe_json_obj(resp.content)
    except Exception:
        insights = {}

    return {"insights": insights, "current_step": "complete"}


# ── Build LangGraph ────────────────────────────────────────────────────────────
def build_agent():
    graph = StateGraph(AgentState)
    graph.add_node("extract_profile", extract_profile)
    graph.add_node("generate_queries", generate_queries)
    graph.add_node("search_jobs", search_jobs)
    graph.add_node("evaluate_jobs", evaluate_jobs)
    graph.add_node("generate_insights", generate_insights)

    graph.add_edge(START, "extract_profile")
    graph.add_edge("extract_profile", "generate_queries")
    graph.add_edge("generate_queries", "search_jobs")
    graph.add_edge("search_jobs", "evaluate_jobs")
    graph.add_edge("evaluate_jobs", "generate_insights")
    graph.add_edge("generate_insights", END)

    return graph.compile()


agent = build_agent()


def run_agent(cv_text: str) -> dict:
    """Run the full JobScout LangGraph agent."""
    initial_state: AgentState = {
        "cv_text": cv_text,
        "candidate_profile": {},
        "search_queries": [],
        "raw_jobs": [],
        "evaluated_jobs": [],
        "insights": {},
        "current_step": "starting",
        "error": None,
    }
    result = agent.invoke(initial_state)
    return result
