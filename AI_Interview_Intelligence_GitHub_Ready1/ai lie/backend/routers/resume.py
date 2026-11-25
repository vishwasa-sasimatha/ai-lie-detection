from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import io
import json
import re

from dotenv import load_dotenv
from google import genai


# =========================================================
# LOAD ENVIRONMENT
# =========================================================

# resume.py is inside:
# backend/routers/resume.py
#
# .env is inside:
# backend/.env

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

ENV_FILE = os.path.join(
    BASE_DIR,
    ".env"
)

load_dotenv(ENV_FILE)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter()


# =========================================================
# GEMINI CONFIGURATION
# =========================================================

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)

if not GEMINI_API_KEY:

    raise RuntimeError(
        "GEMINI_API_KEY is missing. "
        "Add GEMINI_API_KEY=your_key to backend/.env"
    )


client = genai.Client(
    api_key=GEMINI_API_KEY
)


MODEL_NAME = "gemini-3.6-flash"


print("========================================")
print("Resume AI service initialized")
print("Gemini API key loaded")
print(f"Gemini model: {MODEL_NAME}")
print("========================================")


# =========================================================
# PDF TEXT EXTRACTION
# =========================================================

def extract_text_from_pdf(
    data: bytes
) -> str:

    try:

        from pypdf import PdfReader

        reader = PdfReader(
            io.BytesIO(data)
        )

        pages = []

        print(
            f"PDF pages detected: {len(reader.pages)}"
        )

        for index, page in enumerate(
            reader.pages
        ):

            text = page.extract_text()

            if text:

                pages.append(
                    text
                )

                print(
                    f"Page {index + 1}: "
                    f"{len(text)} characters"
                )

            else:

                print(
                    f"Page {index + 1}: "
                    "No text detected"
                )

        return "\n".join(pages)

    except Exception as error:

        print(
            "PDF extraction error:",
            error
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unable to read PDF: {error}"
            )
        )


# =========================================================
# DOCX TEXT EXTRACTION
# =========================================================

def extract_text_from_docx(
    data: bytes
) -> str:

    try:

        from docx import Document

        document = Document(
            io.BytesIO(data)
        )

        paragraphs = []

        for paragraph in document.paragraphs:

            text = paragraph.text.strip()

            if text:

                paragraphs.append(
                    text
                )

        return "\n".join(
            paragraphs
        )

    except Exception as error:

        print(
            "DOCX extraction error:",
            error
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unable to read DOCX: {error}"
            )
        )


# =========================================================
# TXT TEXT EXTRACTION
# =========================================================

def extract_text_from_txt(
    data: bytes
) -> str:

    try:

        return data.decode(
            "utf-8",
            errors="ignore"
        )

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unable to read TXT: {error}"
            )
        )


# =========================================================
# GENERAL RESUME TEXT EXTRACTION
# =========================================================

def extract_resume_text(
    filename: str,
    data: bytes
) -> str:

    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):

        return extract_text_from_pdf(
            data
        )

    if lower_name.endswith(".docx"):

        return extract_text_from_docx(
            data
        )

    if lower_name.endswith(".txt"):

        return extract_text_from_txt(
            data
        )

    if lower_name.endswith(".doc"):

        raise HTTPException(
            status_code=400,
            detail=(
                "Old .doc files are not supported. "
                "Please save the resume as PDF or DOCX."
            )
        )

    raise HTTPException(
        status_code=400,
        detail=(
            "Unsupported file format. "
            "Upload PDF, DOCX, or TXT."
        )
    )


# =========================================================
# CLEAN GEMINI RESPONSE
# =========================================================

def clean_json_response(
    text: str
):

    if not text:

        raise ValueError(
            "Empty Gemini response."
        )

    text = text.strip()

    # Remove markdown code blocks
    text = re.sub(
        r"^```json\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"^```\s*",
        "",
        text
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    text = text.strip()

    # Find JSON object if Gemini added extra text
    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:

        text = text[
            start:end + 1
        ]

    return json.loads(
        text
    )


# =========================================================
# GEMINI RESUME ANALYSIS
# =========================================================

def analyze_resume_with_gemini(
    resume_text: str
):

    prompt = f"""
You are an AI resume analysis engine
for an automated technical interview platform.

Analyze ONLY the resume provided below.

Do NOT invent information.

Your most important task is to determine
what programming languages and technologies
the candidate actually knows or has mentioned.

Analyze:

- Candidate name
- Email
- Phone
- Programming languages
- Frameworks
- Libraries
- Databases
- AI/ML
- Developer tools
- Cloud
- Experience
- Projects
- Education
- Certifications
- Technical strengths
- Interview focus

For programming languages, only include
languages explicitly mentioned in the resume.

For frameworks, include technologies such as
React, FastAPI, Node.js, Django, Flask, etc.
only when actually present.

For databases, include MongoDB, MySQL,
PostgreSQL, Firebase, etc. only when present.

For AI/ML, include things such as
Machine Learning, Deep Learning,
Generative AI, NLP, OpenAI, Gemini, etc.
only when supported by the resume.

Create interview_focus from the candidate's
actual technical background.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "success": true,

    "candidate": {{
        "name": "",
        "email": "",
        "phone": ""
    }},

    "skills": {{
        "programming_languages": [],
        "frameworks": [],
        "databases": [],
        "ai_ml": [],
        "tools": [],
        "cloud": []
    }},

    "experience": [],

    "projects": [],

    "education": [],

    "certifications": [],

    "strengths": [],

    "interview_focus": [],

    "summary": ""
}}

Experience format:

{{
    "title": "",
    "company": "",
    "duration": "",
    "description": ""
}}

Project format:

{{
    "title": "",
    "description": "",
    "technologies": []
}}

Education format:

{{
    "degree": "",
    "institution": "",
    "year": ""
}}

Certification format:

{{
    "name": "",
    "issuer": "",
    "year": ""
}}

Resume:

==================================================

{resume_text}

==================================================
"""

    try:

        print(
            "Sending resume to Gemini..."
        )

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        if not response:

            raise Exception(
                "Gemini returned no response."
            )

        if not response.text:

            raise Exception(
                "Gemini returned an empty response."
            )

        print(
            "Gemini response received."
        )

        result = clean_json_response(
            response.text
        )

        return result

    except json.JSONDecodeError as error:

        print(
            "Gemini JSON parsing error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini returned invalid JSON."
            )
        )

    except Exception as error:

        print(
            "Gemini resume analysis error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Resume analysis failed: {error}"
            )
        )


# =========================================================
# RESUME ANALYZE API
# =========================================================

@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...)
):

    print("")
    print("========================================")
    print("NEW RESUME ANALYSIS REQUEST")
    print("========================================")


    # -----------------------------------------------------
    # FILE CHECK
    # -----------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No resume file selected."
        )


    filename = file.filename

    print(
        f"File received: {filename}"
    )


    # -----------------------------------------------------
    # EXTENSION CHECK
    # -----------------------------------------------------

    allowed_extensions = (
        ".pdf",
        ".docx",
        ".txt"
    )

    lower_filename = filename.lower()

    if not lower_filename.endswith(
        allowed_extensions
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload a PDF, DOCX, "
                "or TXT resume."
            )
        )


    # -----------------------------------------------------
    # READ FILE
    # -----------------------------------------------------

    data = await file.read()

    print(
        f"File size: {len(data)} bytes"
    )


    if not data:

        raise HTTPException(
            status_code=400,
            detail="The uploaded resume is empty."
        )


    # -----------------------------------------------------
    # SIZE CHECK
    # -----------------------------------------------------

    max_size = 10 * 1024 * 1024

    if len(data) > max_size:

        raise HTTPException(
            status_code=400,
            detail=(
                "Resume must be smaller than 10 MB."
            )
        )


    # -----------------------------------------------------
    # EXTRACT TEXT
    # -----------------------------------------------------

    print(
        "Extracting resume text..."
    )

    resume_text = extract_resume_text(
        filename,
        data
    )


    print(
        f"Extracted characters: "
        f"{len(resume_text)}"
    )


    # -----------------------------------------------------
    # TEXT CHECK
    # -----------------------------------------------------

    if not resume_text.strip():

        raise HTTPException(
            status_code=400,
            detail=(
                "No readable text was found "
                "in this resume."
            )
        )


    # -----------------------------------------------------
    # DEBUG PREVIEW
    # -----------------------------------------------------

    print("----------------------------------------")
    print("RESUME TEXT PREVIEW")
    print("----------------------------------------")
    print(
        resume_text[:1500]
    )
    print("----------------------------------------")


    # -----------------------------------------------------
    # GEMINI ANALYSIS
    # -----------------------------------------------------

    result = analyze_resume_with_gemini(
        resume_text
    )


    # -----------------------------------------------------
    # GUARANTEE RESPONSE STRUCTURE
    # -----------------------------------------------------

    result.setdefault(
        "success",
        True
    )

    result.setdefault(
        "candidate",
        {}
    )

    result.setdefault(
        "skills",
        {}
    )

    result.setdefault(
        "experience",
        []
    )

    result.setdefault(
        "projects",
        []
    )

    result.setdefault(
        "education",
        []
    )

    result.setdefault(
        "certifications",
        []
    )

    result.setdefault(
        "strengths",
        []
    )

    result.setdefault(
        "interview_focus",
        []
    )

    result.setdefault(
        "summary",
        ""
    )


    # -----------------------------------------------------
    # GUARANTEE SKILL CATEGORIES
    # -----------------------------------------------------

    skills = result["skills"]

    skills.setdefault(
        "programming_languages",
        []
    )

    skills.setdefault(
        "frameworks",
        []
    )

    skills.setdefault(
        "databases",
        []
    )

    skills.setdefault(
        "ai_ml",
        []
    )

    skills.setdefault(
        "tools",
        []
    )

    skills.setdefault(
        "cloud",
        []
    )


    # -----------------------------------------------------
    # FINAL LOG
    # -----------------------------------------------------

    print("----------------------------------------")
    print("RESUME ANALYSIS COMPLETE")
    print("----------------------------------------")

    print(
        "Programming languages:",
        skills["programming_languages"]
    )

    print(
        "Frameworks:",
        skills["frameworks"]
    )

    print(
        "Databases:",
        skills["databases"]
    )

    print(
        "AI/ML:",
        skills["ai_ml"]
    )

    print(
        "Tools:",
        skills["tools"]
    )

    print(
        "Interview focus:",
        result["interview_focus"]
    )

    print("========================================")
    print("")

    return result