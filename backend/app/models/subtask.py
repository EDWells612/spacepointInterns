import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Table
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.enums import WorkStatus

subtask_assignees = Table(
    "subtask_assignees",
    Base.metadata,
    Column("subtask_id", UUID(as_uuid=True), ForeignKey("subtasks.id"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
)

class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(ENUM(WorkStatus, name="work_status", create_type=False), nullable=False, default=WorkStatus.todo)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    task = relationship("Task", back_populates="subtasks")
    creator = relationship("User", foreign_keys=[created_by])
    assignees = relationship("User", secondary=subtask_assignees)
    submissions = relationship("TaskSubmission", back_populates="subtask")
