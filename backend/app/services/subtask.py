from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from uuid import UUID
from datetime import datetime, timezone
from app.models.subtask import Subtask
from app.models.submission import TaskSubmission
from app.models.task import Task
from app.models.team import Team
from app.models.enums import SubmissionStatus, WorkStatus
from app.schemas.subtask import SubtaskCreate, SubtaskUpdate, SubtaskStatusUpdate, SubtaskAssign
from app.schemas.submission import TaskSubmissionCreate, TaskSubmissionReview
from app.services.user import get_user_by_id
from app.services import notification as notification_service


def _subtask_options():
    from sqlalchemy.orm import joinedload
    return [
        selectinload(Subtask.assignees),
        selectinload(Subtask.submissions).selectinload(TaskSubmission.submitter),
        joinedload(Subtask.task),
    ]


async def create_subtask(db: AsyncSession, task_id: UUID, subtask_in: SubtaskCreate, user_id: UUID) -> Subtask:
    db_subtask = Subtask(
        task_id=task_id,
        created_by=user_id,
        title=subtask_in.title,
        description=subtask_in.description,
        due_date=subtask_in.due_date,
    )
    db.add(db_subtask)
    await db.commit()
    await db.refresh(db_subtask)
    return await get_subtask_by_id(db, db_subtask.id)


async def get_subtasks_by_task(db: AsyncSession, task_id: UUID):
    result = await db.execute(
        select(Subtask).where(Subtask.task_id == task_id).options(*_subtask_options())
    )
    return result.scalars().all()


async def get_subtask_by_id(db: AsyncSession, subtask_id: UUID) -> Subtask:
    result = await db.execute(
        select(Subtask).where(Subtask.id == subtask_id).options(*_subtask_options())
    )
    subtask = result.scalars().first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    return subtask


async def update_subtask(db: AsyncSession, subtask_id: UUID, subtask_in: SubtaskUpdate) -> Subtask:
    subtask = await get_subtask_by_id(db, subtask_id)
    update_data = subtask_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subtask, field, value)
    await db.commit()
    return await get_subtask_by_id(db, subtask_id)


async def update_subtask_status(db: AsyncSession, subtask_id: UUID, status_in: SubtaskStatusUpdate) -> Subtask:
    subtask = await get_subtask_by_id(db, subtask_id)
    subtask.status = status_in.status
    await db.commit()
    return await get_subtask_by_id(db, subtask_id)


async def delete_subtask(db: AsyncSession, subtask_id: UUID):
    subtask = await get_subtask_by_id(db, subtask_id)
    await db.delete(subtask)
    await db.commit()
    return {"detail": "Subtask deleted"}


async def assign_subtask(db: AsyncSession, subtask_id: UUID, assign_in: SubtaskAssign) -> Subtask:
    subtask = await get_subtask_by_id(db, subtask_id)
    for uid in assign_in.user_ids:
        user = await get_user_by_id(db, uid)
        if user not in subtask.assignees:
            subtask.assignees.append(user)
            await notification_service.create_notification(
                db, uid,
                "New subtask assigned",
                f"You've been assigned to: {subtask.title}",
            )
    await db.commit()
    return await get_subtask_by_id(db, subtask_id)


async def submit_subtask_work(
    db: AsyncSession, subtask_id: UUID, submit_in: TaskSubmissionCreate, user_id: UUID
) -> TaskSubmission:
    db_submission = TaskSubmission(
        subtask_id=subtask_id,
        submitted_by=user_id,
        link=submit_in.link,
        note=submit_in.note,
    )
    db.add(db_submission)

    subtask = await get_subtask_by_id(db, subtask_id)
    subtask.status = WorkStatus.done

    # Notify the team leader
    task_result = await db.execute(select(Task).where(Task.id == subtask.task_id))
    task = task_result.scalars().first()
    if task:
        team_result = await db.execute(select(Team).where(Team.id == task.team_id))
        team = team_result.scalars().first()
        if team and team.leader_id:
            await notification_service.create_notification(
                db, team.leader_id,
                "Work submitted for review",
                f'"{subtask.title}" has a new submission ready to review.',
            )

    await db.commit()
    await db.refresh(db_submission)
    return db_submission


async def review_submission(
    db: AsyncSession, submission_id: UUID, review_in: TaskSubmissionReview
) -> TaskSubmission:
    result = await db.execute(select(TaskSubmission).where(TaskSubmission.id == submission_id))
    submission = result.scalars().first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    submission.score = review_in.score
    submission.review_comment = review_in.review_comment
    submission.status = SubmissionStatus.reviewed
    submission.reviewed_at = datetime.now(timezone.utc)

    await notification_service.create_notification(
        db,
        submission.submitted_by,
        "Submission reviewed",
        f"Your submission was reviewed — score: {review_in.score}",
    )

    await db.commit()
    await db.refresh(submission)
    return submission
