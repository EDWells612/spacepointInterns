from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.models.team import Team
from app.models.task import Task
from app.models.subtask import Subtask
from app.core.dependencies import require_leader
from app.schemas.task import TaskOut, TaskSubmit, TaskUpdate
from app.schemas.subtask import SubtaskCreate, SubtaskOut, SubtaskUpdate, SubtaskAssign
from app.schemas.submission import TaskSubmissionOut, TaskSubmissionReview
from app.schemas.project import ProjectOut

from app.services import task as task_service
from app.services import subtask as subtask_service
from app.services import project as project_service
from app.models.submission import TaskSubmission

router = APIRouter(prefix="/leader", tags=["leader"])


async def verify_leader_task_access(db: AsyncSession, user: User, task_id: UUID) -> Task:
    task = await task_service.get_task_by_id(db, task_id)
    team = await db.execute(select(Team).where(Team.id == task.team_id))
    team = team.scalars().first()
    if not team or team.leader_id != user.id:
        if user.role.value != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this task")
    return task


async def verify_leader_subtask_access(db: AsyncSession, user: User, subtask_id: UUID) -> Subtask:
    subtask = await subtask_service.get_subtask_by_id(db, subtask_id)
    await verify_leader_task_access(db, user, subtask.task_id)
    return subtask


# --- Projects ---

@router.get("/projects", response_model=List[ProjectOut])
async def read_projects(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    return await project_service.get_projects(db)


# --- Tasks ---

@router.get("/tasks", response_model=List[TaskOut])
async def read_my_team_tasks(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    team_result = await db.execute(select(Team).where(Team.leader_id == current_user.id))
    team = team_result.scalars().first()
    if not team:
        return []
    return await task_service.get_tasks_by_team(db, team.id)


@router.get("/tasks/{id}", response_model=TaskOut)
async def read_task(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    return await verify_leader_task_access(db, current_user, id)


@router.patch("/tasks/{id}", response_model=TaskOut)
async def update_task_status(id: UUID, task_in: TaskUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    await verify_leader_task_access(db, current_user, id)
    return await task_service.update_task(db, id, task_in)


@router.patch("/tasks/{id}/submit", response_model=TaskOut)
async def submit_task_to_admin(id: UUID, submit_in: TaskSubmit, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    await verify_leader_task_access(db, current_user, id)
    return await task_service.submit_task(db, id, submit_in)


# --- All subtasks for leader's team (for kanban) ---

@router.get("/subtasks", response_model=List[SubtaskOut])
async def read_all_team_subtasks(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    team_result = await db.execute(select(Team).where(Team.leader_id == current_user.id))
    team = team_result.scalars().first()
    if not team:
        return []
    query = (
        select(Subtask)
        .join(Task, Subtask.task_id == Task.id)
        .where(Task.team_id == team.id)
        .options(
            selectinload(Subtask.assignees),
            selectinload(Subtask.submissions).selectinload(TaskSubmission.submitter),
            selectinload(Subtask.task),
        )
    )
    result = await db.execute(query)
    return result.scalars().all()


# --- Subtasks ---

@router.post("/tasks/{id}/subtasks", response_model=SubtaskOut)
async def create_subtask(id: UUID, subtask_in: SubtaskCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    await verify_leader_task_access(db, current_user, id)
    return await subtask_service.create_subtask(db, id, subtask_in, current_user.id)


@router.get("/tasks/{id}/subtasks", response_model=List[SubtaskOut])
async def read_subtasks(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    await verify_leader_task_access(db, current_user, id)
    return await subtask_service.get_subtasks_by_task(db, id)


@router.patch("/subtasks/{id}", response_model=SubtaskOut)
async def update_subtask(id: UUID, subtask_in: SubtaskUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    await verify_leader_subtask_access(db, current_user, id)
    return await subtask_service.update_subtask(db, id, subtask_in)


@router.delete("/subtasks/{id}")
async def delete_subtask(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    await verify_leader_subtask_access(db, current_user, id)
    return await subtask_service.delete_subtask(db, id)


@router.post("/subtasks/{id}/assign", response_model=SubtaskOut)
async def assign_interns(id: UUID, assign_in: SubtaskAssign, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    await verify_leader_subtask_access(db, current_user, id)
    return await subtask_service.assign_subtask(db, id, assign_in)


# --- Submissions ---

@router.get("/subtasks/review-queue", response_model=List[TaskSubmissionOut])
async def read_review_queue(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    team_result = await db.execute(select(Team).where(Team.leader_id == current_user.id))
    team = team_result.scalars().first()
    if not team:
        return []
    query = (
        select(TaskSubmission)
        .join(Subtask, TaskSubmission.subtask_id == Subtask.id)
        .join(Task, Subtask.task_id == Task.id)
        .where(Task.team_id == team.id)
        .where(TaskSubmission.status == "submitted")
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/submissions/{id}/review", response_model=TaskSubmissionOut)
async def review_intern_submission(id: UUID, review_in: TaskSubmissionReview, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_leader)):
    submission_result = await db.execute(select(TaskSubmission).where(TaskSubmission.id == id))
    submission = submission_result.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    await verify_leader_subtask_access(db, current_user, submission.subtask_id)
    return await subtask_service.review_submission(db, id, review_in)
