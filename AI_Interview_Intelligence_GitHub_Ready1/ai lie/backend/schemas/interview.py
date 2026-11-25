from pydantic import BaseModel, Field
from typing import List, Optional


class InterviewStartRequest(BaseModel):

    role: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    skills: List[str]

    difficulty: str = "medium"

    total_questions: int = Field(
        default=5,
        ge=1,
        le=20
    )


class InterviewQuestionRequest(BaseModel):

    role: str

    skills: List[str]

    difficulty: str

    question_number: int

    previous_questions: List[str] = []

    previous_answers: List[str] = []


class AnswerAnalysisRequest(BaseModel):

    role: str

    question: str

    answer: str

    previous_answers: List[str] = []


class InterviewQuestionResponse(BaseModel):

    question: str

    question_number: int

    total_questions: int


class AnswerAnalysisResponse(BaseModel):

    relevance_score: int

    consistency_score: int

    indicators: List[str]

    feedback: str