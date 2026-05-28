from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from uuid import UUID
from datetime import datetime, timezone
from app.models.task import Task
from app.models.enums import WorkStatus
from app.schemas.task import TaskCreate, TaskUpdate, TaskSubmit, TaskReview


async def create_task(db: AsyncSession, task_in: TaskCreate, user_id: UUID) -> Task:
    db_task = Task(
        project_id=task_in.project_id,
        team_id=task_in.team_id,
        title=task_in.title,
        description=task_in.description,
        due_date=task_in.due_date,
        created_by=user_id,
    )
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task


async def get_all_tasks(db: AsyncSession):
    result = await db.execute(select(Task))
    return result.scalars().all()


async def get_tasks_by_project(db: AsyncSession, project_id: UUID):
    result = await db.execute(select(Task).where(Task.project_id == project_id))
    return result.scalars().all()


async def get_tasks_by_team(db: AsyncSession, team_id: UUID):
    result = await db.execute(select(Task).where(Task.team_id == team_id))
    return result.scalars().all()


async def get_task_by_id(db: AsyncSession, task_id: UUID) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


async def update_task(db: AsyncSession, task_id: UUID, task_in: TaskUpdate) -> Task:
    task = await get_task_by_id(db, task_id)
    update_data = task_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task_id: UUID):
    task = await get_task_by_id(db, task_id)
    await db.delete(task)
    await db.commit()
    return {"detail": "Task deleted"}


async def submit_task(db: AsyncSession, task_id: UUID, submit_in: TaskSubmit) -> Task:
    task = await get_task_by_id(db, task_id)
    task.submission_link = submit_in.link
    task.submission_note = submit_in.note
    task.submitted_at = datetime.now(timezone.utc)
    task.status = WorkStatus.done
    await db.commit()
    await db.refresh(task)
    return task


async def review_task(db: AsyncSession, task_id: UUID, review_in: TaskReview) -> Task:
    task = await get_task_by_id(db, task_id)
    task.review_comment = review_in.review_comment
    task.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(task)
    return task
