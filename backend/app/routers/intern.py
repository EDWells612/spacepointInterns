from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.models.subtask import Subtask
from app.models.submission import TaskSubmission
from app.core.dependencies import require_intern
from app.schemas.subtask import SubtaskOut, SubtaskStatusUpdate
from app.schemas.submission import TaskSubmissionCreate, TaskSubmissionOut
from app.schemas.project import ProjectOut

from app.services import subtask as subtask_service
from app.services import project as project_service

router = APIRouter(prefix="/intern", tags=["intern"])


@router.get("/projects", response_model=List[ProjectOut])
async def read_projects(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_intern)):
    return await project_service.get_projects(db)


async def verify_intern_subtask_access(db: AsyncSession, user: User, subtask_id: UUID) -> Subtask:
    subtask = await subtask_service.get_subtask_by_id(db, subtask_id)
    if user not in subtask.assignees:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not assigned to this subtask")
    return subtask


@router.get("/subtasks", response_model=List[SubtaskOut])
async def read_my_subtasks(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_intern)):
    result = await db.execute(
        select(Subtask)
        .filter(Subtask.assignees.any(id=current_user.id))
        .options(
            selectinload(Subtask.assignees),
            selectinload(Subtask.submissions).selectinload(TaskSubmission.submitter),
            selectinload(Subtask.task),
        )
    )
    return result.scalars().all()


@router.get("/subtasks/{id}", response_model=SubtaskOut)
async def read_subtask(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_intern)):
    return await verify_intern_subtask_access(db, current_user, id)


@router.patch("/subtasks/{id}/status", response_model=SubtaskOut)
async def update_status(id: UUID, status_in: SubtaskStatusUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_intern)):
    await verify_intern_subtask_access(db, current_user, id)
    return await subtask_service.update_subtask_status(db, id, status_in)


@router.post("/subtasks/{id}/submit", response_model=TaskSubmissionOut)
async def submit_work(id: UUID, submit_in: TaskSubmissionCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_intern)):
    await verify_intern_subtask_access(db, current_user, id)
    return await subtask_service.submit_subtask_work(db, id, submit_in, current_user.id)
