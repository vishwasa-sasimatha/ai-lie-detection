# ============================================================
# AI INTERVIEW INTELLIGENCE
# services/interview_service.py
# ============================================================

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId

from database import interviews_collection


# ============================================================
# HELPER
# ============================================================

def utc_now():
    return datetime.now(timezone.utc)


def serialize_id(document):
    """
    Convert MongoDB ObjectId into a string so it can
    safely be returned to the frontend.
    """

    if not document:
        return document

    if "_id" in document:
        document["_id"] = str(document["_id"])

    return document


# ============================================================
# CREATE INTERVIEW
# ============================================================

def create_interview(
    role: str,
    skills: list,
    difficulty: str,
    total_questions: int,
    candidate: Optional[dict] = None,
    resume_summary: str = "",
    interview_focus: Optional[list] = None,
    experience: Optional[list] = None,
    projects: Optional[list] = None
):

    if interviews_collection is None:
        print("MongoDB is not connected.")
        return None

    interview_document = {
        "candidate": candidate or {},

        "role": role,

        "skills": skills or [],

        "difficulty": difficulty,

        "total_questions": total_questions,

        "resume_summary": resume_summary or "",

        "interview_focus": interview_focus or [],

        "experience": experience or [],

        "projects": projects or [],

        "questions": [],

        "answers": [],

        "analysis": [],

        "expression_summary": {},

        "status": "started",

        "started_at": utc_now(),

        "completed_at": None,

        "created_at": utc_now(),

        "updated_at": utc_now()
    }

    result = interviews_collection.insert_one(
        interview_document
    )

    print(
        f"Interview created: {result.inserted_id}"
    )

    return str(result.inserted_id)


# ============================================================
# ADD QUESTION
# ============================================================

def add_question(
    interview_id: str,
    question: str,
    question_number: int
):

    if interviews_collection is None:
        return False

    try:

        result = interviews_collection.update_one(
            {
                "_id": ObjectId(interview_id)
            },
            {
                "$push": {
                    "questions": {
                        "question_number": question_number,
                        "question": question,
                        "asked_at": utc_now()
                    }
                },

                "$set": {
                    "updated_at": utc_now()
                }
            }
        )

        return result.modified_count > 0

    except Exception as error:

        print(
            "MongoDB add question error:"
        )

        print(error)

        return False


# ============================================================
# ADD ANSWER
# ============================================================

def add_answer(
    interview_id: str,
    question_number: int,
    question: str,
    answer: str,
    response_time_seconds: Optional[float] = None
):

    if interviews_collection is None:
        return False

    answer_document = {
        "question_number": question_number,

        "question": question,

        "answer": answer,

        "response_time_seconds": (
            response_time_seconds
        ),

        "answered_at": utc_now()
    }

    try:

        result = interviews_collection.update_one(
            {
                "_id": ObjectId(interview_id)
            },
            {
                "$push": {
                    "answers": answer_document
                },

                "$set": {
                    "updated_at": utc_now()
                }
            }
        )

        return result.modified_count > 0

    except Exception as error:

        print(
            "MongoDB add answer error:"
        )

        print(error)

        return False


# ============================================================
# ADD AI ANALYSIS
# ============================================================

def add_analysis(
    interview_id: str,
    question_number: int,
    analysis: dict
):

    if interviews_collection is None:
        return False

    analysis_document = {
        "question_number": question_number,

        "relevance_score": analysis.get(
            "relevance_score",
            0
        ),

        "consistency_score": analysis.get(
            "consistency_score",
            0
        ),

        "deception_indicator_score": analysis.get(
            "deception_indicator_score",
            0
        ),

        "facial_behavior": analysis.get(
            "facial_behavior",
            []
        ),

        "gaze_patterns": analysis.get(
            "gaze_patterns",
            []
        ),

        "voice_signals": analysis.get(
            "voice_signals",
            []
        ),

        "speech_content": analysis.get(
            "speech_content",
            []
        ),

        "response_timing": analysis.get(
            "response_timing",
            []
        ),

        "consistency_analysis": analysis.get(
            "consistency_analysis",
            []
        ),

        "indicators": analysis.get(
            "indicators",
            []
        ),

        "feedback": analysis.get(
            "feedback",
            ""
        ),

        "analyzed_at": utc_now()
    }

    try:

        result = interviews_collection.update_one(
            {
                "_id": ObjectId(interview_id)
            },
            {
                "$push": {
                    "analysis": analysis_document
                },

                "$set": {
                    "updated_at": utc_now()
                }
            }
        )

        return result.modified_count > 0

    except Exception as error:

        print(
            "MongoDB add analysis error:"
        )

        print(error)

        return False


# ============================================================
# SAVE EXPRESSION SUMMARY
# ============================================================

def save_expression_summary(
    interview_id: str,
    expression_summary: dict
):

    if interviews_collection is None:
        return False

    try:

        result = interviews_collection.update_one(
            {
                "_id": ObjectId(interview_id)
            },
            {
                "$set": {
                    "expression_summary":
                        expression_summary,

                    "updated_at":
                        utc_now()
                }
            }
        )

        return result.modified_count > 0

    except Exception as error:

        print(
            "MongoDB expression summary error:"
        )

        print(error)

        return False


# ============================================================
# COMPLETE INTERVIEW
# ============================================================

def complete_interview(
    interview_id: str,
    expression_summary: Optional[dict] = None
):

    if interviews_collection is None:
        return False

    update_data = {
        "status": "completed",

        "completed_at": utc_now(),

        "updated_at": utc_now()
    }

    if expression_summary is not None:

        update_data[
            "expression_summary"
        ] = expression_summary

    try:

        result = interviews_collection.update_one(
            {
                "_id": ObjectId(interview_id)
            },
            {
                "$set": update_data
            }
        )

        return result.modified_count > 0

    except Exception as error:

        print(
            "MongoDB complete interview error:"
        )

        print(error)

        return False


# ============================================================
# GET INTERVIEW
# ============================================================

def get_interview(
    interview_id: str
):

    if interviews_collection is None:
        return None

    try:

        document = interviews_collection.find_one(
            {
                "_id": ObjectId(interview_id)
            }
        )

        return serialize_id(document)

    except Exception as error:

        print(
            "MongoDB get interview error:"
        )

        print(error)

        return None


# ============================================================
# GET CANDIDATE INTERVIEWS
# ============================================================

def get_candidate_interviews(
    email: str
):

    if interviews_collection is None:
        return []

    try:

        cursor = interviews_collection.find(
            {
                "candidate.email": email
            }
        ).sort(
            "created_at",
            -1
        )

        interviews = []

        for document in cursor:

            interviews.append(
                serialize_id(document)
            )

        return interviews

    except Exception as error:

        print(
            "MongoDB candidate interviews error:"
        )

        print(error)

        return []