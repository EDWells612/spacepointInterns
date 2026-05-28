from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import require_admin
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.schemas.team import TeamCreate, TeamOut, TeamUpdate
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate, TaskReview

from app.services import user as user_service
from app.services import team as team_service
from app.services import project as project_service
from app.services import task as task_service

router = APIRouter(prefix="/admin", tags=["admin"])


# --- Users ---

@router.post("/users", response_model=UserOut)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await user_service.create_user(db, user_in)


@router.get("/users", response_model=List[UserOut])
async def read_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await user_service.get_users(db)


@router.patch("/users/{id}", response_model=UserOut)
async def update_user(id: UUID, user_in: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await user_service.update_user(db, id, user_in)


@router.delete("/users/{id}")
async def delete_user(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await user_service.delete_user(db, id)


# --- Teams ---

@router.post("/teams", response_model=TeamOut)
async def create_team(team_in: TeamCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await team_service.create_team(db, team_in)


@router.get("/teams", response_model=List[TeamOut])
async def read_teams(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await team_service.get_teams(db)


@router.patch("/teams/{id}", response_model=TeamOut)
async def update_team(id: UUID, team_in: TeamUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await team_service.update_team(db, id, team_in)


@router.delete("/teams/{id}")
async def delete_team(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await team_service.delete_team(db, id)


@router.post("/teams/{id}/members", response_model=TeamOut)
async def add_team_member(id: UUID, user_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await team_service.add_member(db, id, user_id)


@router.delete("/teams/{id}/members/{user_id}", response_model=TeamOut)
async def remove_team_member(id: UUID, user_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await team_service.remove_member(db, id, user_id)


# --- Projects ---

@router.post("/projects", response_model=ProjectOut)
async def create_project(project_in: ProjectCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await project_service.create_project(db, project_in, current_user.id)


@router.get("/projects", response_model=List[ProjectOut])
async def read_projects(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await project_service.get_projects(db)


@router.get("/projects/{id}", response_model=ProjectOut)
async def read_project(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await project_service.get_project_by_id(db, id)


@router.patch("/projects/{id}", response_model=ProjectOut)
async def update_project(id: UUID, project_in: ProjectUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await project_service.update_project(db, id, project_in)


@router.delete("/projects/{id}")
async def delete_project(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await project_service.delete_project(db, id)


@router.post("/projects/{id}/teams", response_model=ProjectOut)
async def assign_team(id: UUID, team_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await project_service.assign_team_to_project(db, id, team_id)


@router.delete("/projects/{id}/teams/{team_id}", response_model=ProjectOut)
async def unassign_team(id: UUID, team_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await project_service.remove_team_from_project(db, id, team_id)


# --- Tasks ---

@router.get("/tasks", response_model=List[TaskOut])
async def read_all_tasks(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await task_service.get_all_tasks(db)


@router.post("/projects/{id}/tasks", response_model=TaskOut)
async def create_task(id: UUID, task_in: TaskCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    task_in.project_id = id
    return await task_service.create_task(db, task_in, current_user.id)


@router.get("/projects/{id}/tasks", response_model=List[TaskOut])
async def read_project_tasks(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await task_service.get_tasks_by_project(db, id)


@router.patch("/tasks/{id}", response_model=TaskOut)
async def update_task(id: UUID, task_in: TaskUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await task_service.update_task(db, id, task_in)


@router.delete("/tasks/{id}")
async def delete_task(id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await task_service.delete_task(db, id)


@router.patch("/tasks/{id}/review", response_model=TaskOut)
async def review_task(id: UUID, review_in: TaskReview, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    return await task_service.review_task(db, id, review_in)
