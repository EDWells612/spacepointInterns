from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.enums import WorkStatus

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    project_id: UUID
    team_id: UUID

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[WorkStatus] = None

class TaskSubmit(BaseModel):
    link: str
    note: Optional[str] = None

class TaskReview(BaseModel):
    review_comment: str

class TaskOut(TaskBase):
    id: UUID
    project_id: UUID
    team_id: UUID
    status: WorkStatus
    created_by: UUID
    
    submission_link: Optional[str] = None
    submission_note: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
