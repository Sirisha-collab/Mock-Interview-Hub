from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/review", tags=["Review"])


@router.get("", response_model=List[schemas.ReviewItem])
def list_review_items(
    status: Optional[str] = Query(default=None, description="Filter by status: answered, skipped, shown"),
    category: Optional[str] = Query(default=None, description="Filter by question category"),
    db: Session = Depends(get_db),
):

    query = db.query(models.PracticeLog).options(joinedload(models.PracticeLog.question))

    if status:
        query = query.filter(models.PracticeLog.status == status)

    logs = query.order_by(models.PracticeLog.created_at.desc()).all()

    items = []
    for log in logs:
        if category and log.question.category != category:
            continue
        items.append(
            schemas.ReviewItem(
                log_id=log.id,
                question_id=log.question_id,
                question_text=log.question.text,
                category=log.question.category,
                status=log.status,
                transcript=log.transcript,
                created_at=log.created_at,
            )
        )
    return items


@router.delete("/{log_id}", status_code=204)
def delete_review_item(log_id: int, db: Session = Depends(get_db)):

    log = db.query(models.PracticeLog).get(log_id)
    if not log:
        raise HTTPException(status_code=404, detail=f"Practice log {log_id} not found.")
    db.delete(log)
    db.commit()
    return None
