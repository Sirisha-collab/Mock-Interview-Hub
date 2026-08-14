from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/retry", tags=["Retry"])

class RetryQuestionOut(BaseModel):
    id: int
    text: str
    category: str
    reason: Optional[str] = None
    marked_at: Optional[datetime] = None


class RetryListOut(BaseModel):
    total: int
    questions: list[RetryQuestionOut]


class RetryIdsOut(BaseModel):
    ids: list[int]


class RetryCreate(BaseModel):
    reason: Optional[str] = None


class RetryMarkOut(BaseModel):
    question_id: int
    already_in_pool: bool


class RetryRemoveOut(BaseModel):
    message: str
    removed: int


class QuestionBrief(BaseModel):
    id: int
    text: str
    category: str


class RetryAttemptOut(BaseModel):
    log_id: int
    question: QuestionBrief


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _pool_query(db: Session):
    # Inner join, so a retry row whose question was deleted outside the ORM
    # just drops out of the pool instead of breaking the response.
    return db.query(models.RetryQuestion, models.Question).join(
        models.Question, models.Question.id == models.RetryQuestion.question_id
    )


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@router.get("", response_model=RetryListOut)
def list_retry(db: Session = Depends(get_db)):
    rows = _pool_query(db).order_by(models.RetryQuestion.created_at.desc()).all()
    return RetryListOut(
        total=len(rows),
        questions=[
            RetryQuestionOut(
                id=question.id,
                text=question.text,
                category=question.category,
                reason=entry.reason,
                marked_at=entry.created_at,
            )
            for entry, question in rows
        ],
    )


@router.get("/ids", response_model=RetryIdsOut)
def retry_ids(db: Session = Depends(get_db)):
    rows = _pool_query(db).all()
    return RetryIdsOut(ids=[question.id for _entry, question in rows])


@router.post("/{question_id}", response_model=RetryMarkOut, status_code=201)
def mark_for_retry(
    question_id: int,
    payload: Optional[RetryCreate] = None,
    db: Session = Depends(get_db),
):
    question = db.query(models.Question).get(question_id)
    if not question:
        raise HTTPException(status_code=404, detail=f"Question {question_id} not found.")

    existing = (
        db.query(models.RetryQuestion)
        .filter(models.RetryQuestion.question_id == question_id)
        .first()
    )
    if existing:
        # Idempotent: marking twice is not an error, it just refreshes the note.
        if payload and payload.reason is not None:
            existing.reason = payload.reason
            db.commit()
        return RetryMarkOut(question_id=question_id, already_in_pool=True)

    db.add(
        models.RetryQuestion(
            question_id=question_id,
            reason=(payload.reason if payload else None),
        )
    )
    db.commit()
    return RetryMarkOut(question_id=question_id, already_in_pool=False)


@router.delete("/{question_id}", response_model=RetryRemoveOut)
def unmark_retry(question_id: int, db: Session = Depends(get_db)):
    entry = (
        db.query(models.RetryQuestion)
        .filter(models.RetryQuestion.question_id == question_id)
        .first()
    )
    if not entry:
        raise HTTPException(
            status_code=404, detail=f"Question {question_id} is not in the revision list."
        )
    db.delete(entry)
    db.commit()
    return RetryRemoveOut(message="Question removed from the revision list.", removed=1)


@router.delete("", response_model=RetryRemoveOut)
def clear_retry(db: Session = Depends(get_db)):
    removed = db.query(models.RetryQuestion).delete()
    db.commit()
    return RetryRemoveOut(message="Revision list cleared.", removed=removed)


@router.post("/{question_id}/attempt", response_model=RetryAttemptOut)
def start_retry_attempt(question_id: int, db: Session = Depends(get_db)):
    """
    Open a practice_logs row for a revision question.

    Revision reuses the normal recording pipeline, and /api/transcribe keys off
    `log_id`, so each attempt needs its own log row — exactly what
    practice.next_question does. Note that this deliberately does NOT touch
    SessionState: revising a question must not consume it from your main
    practice cycle.

    The frontend calls this only when you press record, so a question you look
    at and move past never leaves a stray "shown" row behind.
    """
    row = _pool_query(db).filter(models.RetryQuestion.question_id == question_id).first()
    if not row:
        raise HTTPException(
            status_code=404, detail=f"Question {question_id} is not in the revision list."
        )

    _entry, question = row

    log = models.PracticeLog(question_id=question_id, status="shown")
    db.add(log)
    db.commit()
    db.refresh(log)

    return RetryAttemptOut(
        log_id=log.id,
        question=QuestionBrief(id=question.id, text=question.text, category=question.category),
    )
