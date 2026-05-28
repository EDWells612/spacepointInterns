from pydantic import BaseModel, model_validator
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from app.models.enums import WorkStatus
from app.schemas.user import UserOut
from app.schemas.submission import TaskSubmissionOut


class SubtaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class SubtaskCreate(SubtaskBase):
    pass


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[WorkStatus] = None


class SubtaskStatusUpdate(BaseModel):
    status: WorkStatus


class SubtaskAssign(BaseModel):
    user_ids: List[UUID]


class SubtaskOut(SubtaskBase):
    id: UUID
    task_id: UUID
    task_title: Optional[str] = None
    project_id: Optional[UUID] = None
    created_by: UUID
    status: WorkStatus
    created_at: datetime
    assignees: List[UserOut] = []
    submissions: List[TaskSubmissionOut] = []

    @model_validator(mode="before")
    @classmethod
    def populate_task_fields(cls, data: Any) -> Any:
        # Only touch ORM objects — plain dicts pass through unchanged
        if not hasattr(data, "_sa_instance_state"):
            return data
        # Read from SQLAlchemy's already-loaded state dict to avoid
        # triggering a lazy load (which fails in async sessions)
        loaded = data._sa_instance_state.dict
        task = loaded.get("task")
        obj = {k: v for k, v in data.__dict__.items() if not k.startswith("_")}
        obj["task_title"] = task.title if task is not None else None
        obj["project_id"] = task.project_id if task is not None else None
        return obj

    class Config:
        from_attributes = True
