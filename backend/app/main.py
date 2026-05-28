from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.leader import router as leader_router
from app.routers.intern import router as intern_router
from app.routers.shared import router as shared_router
from app.routers.notifications import router as notifications_router

app = FastAPI(title=settings.PROJECT_NAME, openapi_url="/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(leader_router)
app.include_router(intern_router)
app.include_router(shared_router)
app.include_router(notifications_router)


@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
