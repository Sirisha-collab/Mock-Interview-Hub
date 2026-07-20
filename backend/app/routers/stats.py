from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/stats", tags=["Statistics"])


@router.get("", response_model=schemas.StatisticsOut)
def get_statistics(db: Session = Depends(get_db)):
    questions = db.query(models.Question).all()
    logs = db.query(models.PracticeLog).all()

    total_questions = len(questions)

    # Group logs per question to classify each question's overall status.
    logs_by_question = defaultdict(list)
    for log in logs:
        logs_by_question[log.question_id].append(log)

    answered_count = 0
    skipped_count = 0
    unanswered_count = 0

    for q in questions:
        q_logs = logs_by_question.get(q.id, [])
        if any(l.status == "answered" for l in q_logs):
            answered_count += 1
        elif any(l.status == "skipped" for l in q_logs):
            skipped_count += 1
        else:
            unanswered_count += 1

    # Category breakdown: number of questions and total practice attempts
    # (answered + skipped logs) per category.
    questions_per_category = defaultdict(int)
    practices_per_category = defaultdict(int)

    category_of_question = {q.id: q.category for q in questions}
    for q in questions:
        questions_per_category[q.category] += 1

    for log in logs:
        if log.status in ("answered", "skipped"):
            category = category_of_question.get(log.question_id)
            if category:
                practices_per_category[category] += 1

    category_breakdown = [
        schemas.CategoryStat(
            category=cat,
            total_questions=questions_per_category[cat],
            times_practiced=practices_per_category.get(cat, 0),
        )
        for cat in sorted(questions_per_category.keys())
    ]

    most_practiced_category = None
    least_practiced_category = None
    if category_breakdown:
        practiced_categories = [c for c in category_breakdown if c.times_practiced > 0]
        if practiced_categories:
            most_practiced_category = max(practiced_categories, key=lambda c: c.times_practiced).category
            least_practiced_category = min(practiced_categories, key=lambda c: c.times_practiced).category

    # ---- Streak calculation ----
    # A "practice day" is any calendar day (UTC) with at least one answered log.
    practice_dates = sorted({
        log.created_at.date() for log in logs if log.status == "answered" and log.created_at
    })

    current_streak, longest_streak = _calculate_streaks(practice_dates)

    return schemas.StatisticsOut(
        total_questions=total_questions,
        answered_count=answered_count,
        skipped_count=skipped_count,
        unanswered_count=unanswered_count,
        most_practiced_category=most_practiced_category,
        least_practiced_category=least_practiced_category,
        category_breakdown=category_breakdown,
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        practice_days=[d.isoformat() for d in practice_dates],
    )


def _calculate_streaks(practice_dates: list) -> tuple[int, int]:

    if not practice_dates:
        return 0, 0

    longest_streak = 1
    run = 1
    for i in range(1, len(practice_dates)):
        if (practice_dates[i] - practice_dates[i - 1]).days == 1:
            run += 1
        else:
            run = 1
        longest_streak = max(longest_streak, run)

    today = datetime.now(timezone.utc).date()
    date_set = set(practice_dates)

    if today in date_set:
        anchor = today
    elif (today - timedelta(days=1)) in date_set:
        anchor = today - timedelta(days=1)
    else:
        return 0, longest_streak

    current_streak = 0
    cursor = anchor
    while cursor in date_set:
        current_streak += 1
        cursor -= timedelta(days=1)

    return current_streak, longest_streak
