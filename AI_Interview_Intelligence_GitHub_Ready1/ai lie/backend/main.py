from dotenv import load_dotenv

# Load .env BEFORE importing routers
load_dotenv()


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.interview import router as interview_router
from routers.resume import router as resume_router


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="AI Interview Intelligence API",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# INTERVIEW ROUTER
# =========================================================

app.include_router(
    interview_router,
    prefix="/api/interview",
    tags=["Interview"]
)


# =========================================================
# RESUME ROUTER
# =========================================================

app.include_router(
    resume_router,
    prefix="/api/resume",
    tags=["Resume"]
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
async def root():

    return {
        "status": "online",
        "service": "AI Interview Intelligence API"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
async def health():

    return {
        "status": "healthy"
    }


# =========================================================
# API INFORMATION
# =========================================================

@app.get("/api")
async def api_info():

    return {
        "status": "online",
        "service": "AI Interview Intelligence API",
        "endpoints": {
            "resume": "/api/resume/analyze",
            "interview_start": "/api/interview/start",
            "interview_analysis": "/api/interview/analyze-answer"
        }
    }