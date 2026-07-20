import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/practice", tags=["Practice"])


def _get_or_create_state(db: Session) -> models.SessionState:
    state = db.query(models.SessionState).filter(models.SessionState.id == 1).first()
    if not state:
        state = models.SessionState(id=1, remaining_ids="", current_question_id=None)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


def _parse_ids(raw: str) -> list[int]:
    if not raw:
        return []
    return [int(x) for x in raw.split(",") if x.strip() != ""]


def _serialize_ids(ids: list[int]) -> str:
    return ",".join(str(i) for i in ids)


@router.get("/next", response_model=schemas.NextQuestionOut)
def next_question(db: Session = Depends(get_db)):

    all_questions = db.query(models.Question).all()
    if not all_questions:
        raise HTTPException(
            status_code=404,
            detail="No questions available. Please add some questions before starting a practice session.",
        )

    state = _get_or_create_state(db)
    remaining = _parse_ids(state.remaining_ids)

    valid_ids = {q.id for q in all_questions}
    remaining = [i for i in remaining if i in valid_ids]

    if not remaining:
        remaining = [q.id for q in all_questions]
        random.shuffle(remaining)

    chosen_id = remaining.pop(random.randrange(len(remaining)))

    state.remaining_ids = _serialize_ids(remaining)
    state.current_question_id = chosen_id
    db.commit()

    question = db.query(models.Question).get(chosen_id)

    log = models.PracticeLog(question_id=chosen_id, status="shown")
    db.add(log)
    db.commit()
    db.refresh(log)

    return schemas.NextQuestionOut(
        log_id=log.id,
        question=question,
        remaining_in_cycle=len(remaining),
        total_questions=len(all_questions),
    )


@router.post("/skip/{log_id}", response_model=schemas.SkipResponse)
def skip_question(log_id: int, db: Session = Depends(get_db)):

    log = db.query(models.PracticeLog).get(log_id)
    if not log:
        raise HTTPException(status_code=404, detail=f"Practice log {log_id} not found.")

    log.status = "skipped"
    db.commit()
    return schemas.SkipResponse(message="Question marked as skipped.")


@router.post("/reset", response_model=schemas.SkipResponse)
def reset_cycle(db: Session = Depends(get_db)):

    state = _get_or_create_state(db)
    state.remaining_ids = ""
    state.current_question_id = None
    db.commit()
    return schemas.SkipResponse(message="Practice cycle has been reset.")
