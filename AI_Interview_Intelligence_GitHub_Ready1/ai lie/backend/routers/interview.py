# ============================================================
# AI INTERVIEW INTELLIGENCE
# routers/interview.py
# ============================================================

import os
import json
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# GEMINI CONFIGURATION
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is not configured.")
    gemini_client = None
else:
    try:
        gemini_client = genai.Client(
            api_key=GEMINI_API_KEY
        )

        print("Gemini client initialized successfully.")

    except Exception as error:
        print("Gemini client initialization failed:")
        print(error)
        gemini_client = None


MODEL_NAME = "gemini-3.6-flash"


# ============================================================
# ROUTER
# ============================================================

router = APIRouter()


# ============================================================
# REQUEST MODELS
# ============================================================

class StartInterviewRequest(BaseModel):

    role: str = "Software Developer"

    skills: List[str] = Field(
        default_factory=lambda: [
            "Python",
            "JavaScript",
            "SQL"
        ]
    )

    difficulty: str = "medium"

    total_questions: int = 5


class NextQuestionRequest(BaseModel):

    role: str

    skills: List[str]

    difficulty: str

    question_number: int

    previous_questions: List[str] = Field(
        default_factory=list
    )

    previous_answers: List[str] = Field(
        default_factory=list
    )


class AnalyzeAnswerRequest(BaseModel):

    role: str

    question: str

    answer: str

    previous_answers: List[str] = Field(
        default_factory=list
    )


# ============================================================
# GEMINI HELPER
# ============================================================

def ask_gemini(prompt: str) -> str:

    if gemini_client is None:

        raise RuntimeError(
            "Gemini API is not configured. "
            "Check GEMINI_API_KEY in your .env file."
        )

    try:

        response = gemini_client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        if not response or not response.text:

            raise RuntimeError(
                "Gemini returned an empty response."
            )

        return response.text.strip()

    except Exception as error:

        print("Gemini request failed:")
        print(error)

        raise RuntimeError(
            f"Gemini request failed: {error}"
        )


# ============================================================
# CLEAN GEMINI JSON
# ============================================================

def clean_json_response(text: str):

    text = text.strip()

    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    return text.strip()


# ============================================================
# GENERATE INTERVIEW QUESTION
# ============================================================

def generate_question(
    role: str,
    skills: List[str],
    difficulty: str,
    question_number: int,
    previous_questions: List[str],
    previous_answers: List[str]
):

    skills_text = ", ".join(skills)

    previous_questions_text = (
        "\n".join(
            f"- {question}"
            for question in previous_questions
        )
        if previous_questions
        else "None"
    )

    previous_answers_text = (
        "\n".join(
            f"- {answer}"
            for answer in previous_answers
        )
        if previous_answers
        else "None"
    )

    prompt = f"""
You are an AI technical interviewer.

Conduct a realistic technical interview.

ROLE:
{role}

SKILLS:
{skills_text}

DIFFICULTY:
{difficulty}

CURRENT QUESTION NUMBER:
{question_number}

PREVIOUS QUESTIONS:
{previous_questions_text}

PREVIOUS ANSWERS:
{previous_answers_text}

Generate ONE interview question.

Requirements:

1. The question must be relevant to the candidate's role.
2. Use the listed technical skills.
3. Do not repeat previous questions.
4. Gradually increase difficulty.
5. If previous answers show weakness, ask a related
   follow-up question.
6. Keep the question natural and suitable for a real interview.
7. Return ONLY the question.
"""

    return ask_gemini(prompt)


# ============================================================
# START INTERVIEW
# ============================================================

@router.post("/start")
async def start_interview(
    request: StartInterviewRequest
):

    try:

        print("Generating first interview question...")

        question = generate_question(
            role=request.role,
            skills=request.skills,
            difficulty=request.difficulty,
            question_number=1,
            previous_questions=[],
            previous_answers=[]
        )

        return {
            "success": True,
            "question": question,
            "question_number": 1,
            "total_questions": request.total_questions
        }

    except Exception as error:

        print("Interview start error:")
        print(error)

        return {
            "success": False,
            "question": (
                "Tell me about your experience "
                "with software development."
            ),
            "question_number": 1,
            "total_questions": request.total_questions,
            "error": str(error)
        }


# ============================================================
# NEXT QUESTION
# ============================================================

@router.post("/next-question")
async def next_question(
    request: NextQuestionRequest
):

    try:

        print(
            f"Generating question "
            f"{request.question_number}..."
        )

        question = generate_question(
            role=request.role,
            skills=request.skills,
            difficulty=request.difficulty,
            question_number=request.question_number,
            previous_questions=request.previous_questions,
            previous_answers=request.previous_answers
        )

        return {
            "success": True,
            "question": question,
            "question_number": request.question_number
        }

    except Exception as error:

        print("Next question error:")
        print(error)

        return {
            "success": False,
            "question": (
                "Can you explain one of the "
                "projects you have worked on?"
            ),
            "question_number": request.question_number,
            "error": str(error)
        }


# ============================================================
# AI INTERVIEW / DECEPTION ANALYSIS
# ============================================================

def analyze_answer_with_ai(
    role: str,
    question: str,
    answer: str,
    previous_answers: List[str]
):

    previous_text = (
        "\n".join(
            f"{index + 1}. {item}"
            for index, item in enumerate(previous_answers)
        )
        if previous_answers
        else "No previous answers."
    )

    prompt = f"""
You are an AI interview analysis system.

Analyze the candidate's answer during a technical interview.

IMPORTANT:
Do NOT claim that the candidate is definitely lying.

Instead, identify linguistic and behavioral indicators
that may warrant further review.

ROLE:
{role}

CURRENT QUESTION:
{question}

CURRENT ANSWER:
{answer}

PREVIOUS ANSWERS:
{previous_text}

Analyze these areas:

1. FACIAL BEHAVIOR
If visual/video information is available, consider:
- unusual facial expression changes
- gaze changes
- unusual head movement
- visible discomfort

If no visual information is available, return:
"Not available from text analysis"

2. EYE / GAZE PATTERNS
Consider unusual changes in gaze or attention
only if visual data is available.

3. VOICE SIGNALS
If voice information is available, consider:
- pitch changes
- speaking-rate changes
- pauses
- hesitation

4. SPEECH CONTENT
Analyze:
- contradictions
- vague statements
- unsupported claims
- changes in details

5. RESPONSE TIMING
Consider:
- unusually long pauses
- sudden changes in response timing

6. ANSWER CONSISTENCY
Compare the current answer with previous answers.

7. TECHNICAL RELEVANCE
Determine whether the answer actually addresses
the interview question.

8. DECEPTION INDICATORS
Identify potential indicators only.
Do NOT state that these indicators prove deception.

Return ONLY valid JSON in this format:

{{
    "relevance_score": 0,
    "consistency_score": 0,
    "deception_indicator_score": 0,
    "facial_behavior": [],
    "gaze_patterns": [],
    "voice_signals": [],
    "speech_content": [],
    "response_timing": [],
    "consistency_analysis": [],
    "indicators": [],
    "feedback": ""
}}

Scoring:

relevance_score:
0-100

consistency_score:
0-100

deception_indicator_score:
0-100

The deception_indicator_score is NOT a probability
that the person is lying.

It represents the strength of observable indicators
that should be reviewed.

Be conservative.
Do not label normal nervousness as deception.
"""

    result = ask_gemini(prompt)

    cleaned = clean_json_response(result)

    try:

        return json.loads(cleaned)

    except json.JSONDecodeError:

        print("Gemini returned invalid JSON:")

        print(result)

        return {
            "relevance_score": 0,
            "consistency_score": 0,
            "deception_indicator_score": 0,
            "facial_behavior": [],
            "gaze_patterns": [],
            "voice_signals": [],
            "speech_content": [],
            "response_timing": [],
            "consistency_analysis": [],
            "indicators": [],
            "feedback": (
                "The AI analysis response could not "
                "be parsed."
            )
        }


# ============================================================
# ANALYZE ANSWER API
# ============================================================

@router.post("/analyze-answer")
async def analyze_answer(
    request: AnalyzeAnswerRequest
):

    try:

        print("Analyzing interview answer...")

        analysis = analyze_answer_with_ai(
            role=request.role,
            question=request.question,
            answer=request.answer,
            previous_answers=request.previous_answers
        )

        return {
            "success": True,
            **analysis
        }

    except Exception as error:

        print("Answer analysis error:")
        print(error)

        return {
            "success": False,
            "relevance_score": 0,
            "consistency_score": 0,
            "deception_indicator_score": 0,
            "facial_behavior": [],
            "gaze_patterns": [],
            "voice_signals": [],
            "speech_content": [],
            "response_timing": [],
            "consistency_analysis": [],
            "indicators": [],
            "feedback": (
                "AI analysis could not be completed."
            ),
            "error": str(error)
        }


# ============================================================
# TEST GEMINI
# ============================================================

@router.get("/gemini-test")
async def gemini_test():

    try:

        result = ask_gemini(
            "Reply with exactly: Gemini connection successful."
        )

        return {
            "success": True,
            "message": result
        }

    except Exception as error:

        return {
            "success": False,
            "error": str(error)
        }


# ============================================================
# INTERVIEW STATUS
# ============================================================

@router.get("/status")
async def interview_status():

    return {
        "service": "AI Interview Intelligence",
        "gemini": (
            "connected"
            if gemini_client
            else "not configured"
        ),
        "model": MODEL_NAME,
        "features": [
            "AI interview questions",
            "Answer analysis",
            "Speech content analysis",
            "Answer consistency analysis",
            "Response timing analysis",
            "Voice signal analysis",
            "Deception indicators"
        ]
    }