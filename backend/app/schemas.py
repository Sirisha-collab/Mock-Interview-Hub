from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ---------- Question schemas ----------

class QuestionBase(BaseModel):
    text: str = Field(..., min_length=1, description="The interview question text")
    category: str = Field(default="General", min_length=1, max_length=100)


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    text: Optional[str] = Field(default=None, min_length=1)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)


class QuestionOut(QuestionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------- Practice / PracticeLog schemas ----------

class PracticeLogOut(BaseModel):
    id: int
    question_id: int
    status: str
    transcript: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReviewItem(BaseModel):
    log_id: int
    question_id: int
    question_text: str
    category: str
    status: str
    transcript: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NextQuestionOut(BaseModel):
    log_id: int
    question: QuestionOut
    remaining_in_cycle: int
    total_questions: int


class SkipResponse(BaseModel):
    message: str


class TranscribeResponse(BaseModel):
    log_id: int
    transcript: str
    message: str


# ---------- Statistics schemas ----------

class CategoryStat(BaseModel):
    category: str
    total_questions: int
    times_practiced: int


class StatisticsOut(BaseModel):
    total_questions: int
    answered_count: int
    skipped_count: int
    unanswered_count: int
    most_practiced_category: Optional[str] = None
    least_practiced_category: Optional[str] = None
    category_breakdown: List[CategoryStat]
    current_streak_days: int
    longest_streak_days: int
    practice_days: List[str]
