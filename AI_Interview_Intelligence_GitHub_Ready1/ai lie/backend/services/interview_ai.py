import os
import json
from typing import List

from dotenv import load_dotenv
from google import genai


# =========================================================
# LOAD ENVIRONMENT
# =========================================================

load_dotenv()


# =========================================================
# GEMINI API KEY
# =========================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY is missing.")
else:
    print("Gemini API key loaded successfully.")


# =========================================================
# GEMINI CLIENT
# =========================================================

client = None

if GEMINI_API_KEY:

    try:

        client = genai.Client(
            api_key=GEMINI_API_KEY
        )

        print("Gemini client initialized successfully.")

    except Exception as error:

        print("Gemini client initialization failed:")
        print(error)

        client = None


# =========================================================
# MODEL
# =========================================================

MODEL_NAME = "gemini-3.6-flash"


# =========================================================
# TEST GEMINI
# =========================================================

def test_gemini():

    if client is None:

        return {
            "success": False,
            "message": "Gemini client is not initialized."
        }

    try:

        response = client.models.generate_content(

            model=MODEL_NAME,

            contents="Reply with exactly: Gemini connection successful"

        )

        return {
            "success": True,
            "model": MODEL_NAME,
            "response": response.text.strip()
        }

    except Exception as error:

        print("Gemini test error:")
        print(error)

        return {
            "success": False,
            "model": MODEL_NAME,
            "error": str(error)
        }


# =========================================================
# GENERATE INTERVIEW QUESTION
# =========================================================

def generate_question(
    role: str,
    skills: List[str],
    difficulty: str,
    question_number: int,
    previous_questions: List[str],
    previous_answers: List[str]
):

    # -----------------------------------------------------
    # FALLBACK
    # -----------------------------------------------------

    if client is None:

        primary_skill = (
            skills[0]
            if skills
            else "programming"
        )

        return (
            f"Tell me about a challenging "
            f"problem you solved using "
            f"{primary_skill}."
        )

    skills_text = ", ".join(skills)

    previous_context = ""

    if previous_questions:

        previous_context += (
            "\nPrevious questions:\n"
            + "\n".join(previous_questions)
        )

    if previous_answers:

        previous_context += (
            "\n\nPrevious answers:\n"
            + "\n".join(previous_answers)
        )

    prompt = f"""
You are an expert technical interviewer.

Conduct a realistic technical interview.

Candidate role:
{role}

Candidate skills:
{skills_text}

Interview difficulty:
{difficulty}

Current question number:
{question_number}

{previous_context}

Generate exactly ONE interview question.

Requirements:

- Relevant to the candidate's role.
- Relevant to the candidate's skills.
- Do not repeat previous questions.
- If a previous answer exists, create a meaningful follow-up when appropriate.
- Gradually increase difficulty.
- Keep the question concise.
- Do not provide an answer.
- Do not provide explanations.
- Return only the question.
"""

    try:

        print(
            f"Generating question using {MODEL_NAME}..."
        )

        response = client.models.generate_content(

            model=MODEL_NAME,

            contents=prompt

        )

        question = response.text.strip()

        print(
            "Gemini question generated:"
        )

        print(question)

        return question

    except Exception as error:

        print(
            "Gemini question generation error:"
        )

        print(error)

        primary_skill = (
            skills[0]
            if skills
            else "programming"
        )

        return (
            f"Can you explain a practical "
            f"problem you solved using "
            f"{primary_skill}?"
        )


# =========================================================
# ANALYZE ANSWER
# =========================================================

def analyze_answer(
    role: str,
    question: str,
    answer: str,
    previous_answers: List[str]
):

    if not answer.strip():

        return {

            "relevance_score": 0,

            "consistency_score": 0,

            "deception_indicator_score": 0,

            "indicators": [
                "No answer detected"
            ],

            "feedback":
                "The candidate did not provide an answer."

        }

    if client is None:

        return {

            "relevance_score": 0,

            "consistency_score": 0,

            "deception_indicator_score": 0,

            "indicators": [
                "Gemini AI unavailable"
            ],

            "feedback":
                "Gemini API is not configured."

        }

    previous_context = ""

    if previous_answers:

        previous_context = (
            "\nPrevious candidate answers:\n"
            + "\n".join(previous_answers)
        )

    prompt = f"""
You are an AI interview analysis assistant.

Analyze the candidate's answer.

Candidate role:
{role}

Interview question:
{question}

Candidate answer:
{answer}

{previous_context}

Analyze:

1. Relevance to the question.
2. Technical quality.
3. Internal consistency.
4. Potential contradictions with previous answers.
5. Uncertainty or evasive language.
6. Information that should be reviewed by the interviewer.

IMPORTANT:

Do NOT conclude that the candidate is definitely lying.

Do not claim that facial expressions,
voice patterns, hesitation, or language patterns
can prove deception.

Use terms such as:

- potential deception indicator
- potential inconsistency
- interviewer review recommended

Return ONLY valid JSON.

Use exactly:

{{
    "relevance_score": 0,
    "consistency_score": 0,
    "deception_indicator_score": 0,
    "indicators": [],
    "feedback": ""
}}

All scores must be integers from 0 to 100.
"""

    try:

        print(
            f"Analyzing answer using {MODEL_NAME}..."
        )

        response = client.models.generate_content(

            model=MODEL_NAME,

            contents=prompt

        )

        text = response.text.strip()

        print("Gemini analysis response:")
        print(text)

        # Remove markdown fences

        if text.startswith("```json"):

            text = text[7:]

        elif text.startswith("```"):

            text = text[3:]

        if text.endswith("```"):

            text = text[:-3]

        text = text.strip()

        result = json.loads(text)

        return {

            "relevance_score":
                int(
                    result.get(
                        "relevance_score",
                        0
                    )
                ),

            "consistency_score":
                int(
                    result.get(
                        "consistency_score",
                        0
                    )
                ),

            "deception_indicator_score":
                int(
                    result.get(
                        "deception_indicator_score",
                        0
                    )
                ),

            "indicators":
                result.get(
                    "indicators",
                    []
                ),

            "feedback":
                result.get(
                    "feedback",
                    ""
                )

        }

    except json.JSONDecodeError as error:

        print(
            "Gemini returned invalid JSON:"
        )

        print(error)

        return {

            "relevance_score": 0,

            "consistency_score": 0,

            "deception_indicator_score": 0,

            "indicators": [
                "AI response format error"
            ],

            "feedback":
                "Gemini returned an invalid analysis format."

        }

    except Exception as error:

        print(
            "Gemini answer analysis error:"
        )

        print(error)

        return {

            "relevance_score": 0,

            "consistency_score": 0,

            "deception_indicator_score": 0,

            "indicators": [
                "AI analysis failed"
            ],

            "feedback":
                f"Gemini analysis failed: {str(error)}"

        }