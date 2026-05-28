from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from app.db.session import get_db
from app.schemas.auth import LoginRequest, Token, RefreshRequest
from app.services import auth as auth_service
from app.core.security import create_access_token, create_refresh_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.authenticate_user(db, login_data)


@router.post("/refresh", response_model=Token)
async def refresh(refresh_data: RefreshRequest):
    try:
        payload = jwt.decode(
            refresh_data.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        sub: str = payload.get("sub")
        role: str = payload.get("role")
        if sub is None or role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        return {
            "access_token": create_access_token(subject=sub, role=role),
            "refresh_token": create_refresh_token(subject=sub, role=role),
            "token_type": "bearer",
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
