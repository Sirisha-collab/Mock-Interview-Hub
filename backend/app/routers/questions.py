from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/questions", tags=["Questions"])


@router.get("", response_model=List[schemas.QuestionOut])
def list_questions(
    search: Optional[str] = Query(default=None, description="Search text within question content"),
    category: Optional[str] = Query(default=None, description="Filter by exact category name"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Question)

    if search:
        like = f"%{search}%"
        query = query.filter(models.Question.text.ilike(like))

    if category:
        query = query.filter(models.Question.category == category)

    return query.order_by(models.Question.created_at.desc()).all()


@router.get("/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):

    rows = db.query(models.Question.category).distinct().all()
    return sorted({row[0] for row in rows})


@router.get("/{question_id}", response_model=schemas.QuestionOut)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(models.Question).get(question_id)
    if not question:
        raise HTTPException(status_code=404, detail=f"Question with id {question_id} not found.")
    return question


@router.post("", response_model=schemas.QuestionOut, status_code=201)
def create_question(payload: schemas.QuestionCreate, db: Session = Depends(get_db)):

    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Question text cannot be empty.")

    question = models.Question(text=payload.text.strip(), category=payload.category.strip() or "General")
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.put("/{question_id}", response_model=schemas.QuestionOut)
def update_question(question_id: int, payload: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    question = db.query(models.Question).get(question_id)
    if not question:
        raise HTTPException(status_code=404, detail=f"Question with id {question_id} not found.")

    if payload.text is not None:
        if not payload.text.strip():
            raise HTTPException(status_code=400, detail="Question text cannot be empty.")
        question.text = payload.text.strip()

    if payload.category is not None:
        if not payload.category.strip():
            raise HTTPException(status_code=400, detail="Category cannot be empty.")
        question.category = payload.category.strip()

    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=204)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(models.Question).get(question_id)
    if not question:
        raise HTTPException(status_code=404, detail=f"Question with id {question_id} not found.")

    db.delete(question)
    db.commit()
    return None
