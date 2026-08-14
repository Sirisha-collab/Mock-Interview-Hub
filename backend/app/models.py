from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True, default="General")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    logs = relationship(
        "PracticeLog", back_populates="question", cascade="all, delete-orphan"
    )


class PracticeLog(Base):
    __tablename__ = "practice_logs"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    status = Column(String(20), nullable=False, default="shown")
    # status one of: "shown", "answered", "skipped"
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    question = relationship("Question", back_populates="logs")


class SessionState(Base):

    __tablename__ = "session_state"

    id = Column(Integer, primary_key=True, index=True)
    remaining_ids = Column(Text, nullable=False, default="")
    current_question_id = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
