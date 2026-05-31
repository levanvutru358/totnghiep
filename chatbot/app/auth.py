from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import jwt
from fastapi import Depends, Header, HTTPException

from app.config import settings

import logging

logger = logging.getLogger(__name__)


def validate_auth_config() -> list[str]:
    """Trả về danh sách cảnh báo cấu hình (không chặn khởi động)."""
    warnings: list[str] = []
    if settings.chatbot_require_auth and not settings.jwt_access_secret.strip():
        warnings.append("CHATBOT_REQUIRE_AUTH=true nhưng JWT_ACCESS_SECRET đang trống")
    if settings.chatbot_require_auth and settings.jwt_access_secret.strip() == "change-me-access":
        warnings.append("JWT_ACCESS_SECRET đang dùng giá trị mặc định — đổi trong production")
    if not settings.gemini_api_key.strip():
        warnings.append("Chưa cấu hình GEMINI_API_KEY — chỉ trả lời rule-based")
    return warnings


@dataclass
class AuthUser:
    user_id: str
    email: str
    role: str


def _decode_access_token(token: str) -> AuthUser:
    if not settings.jwt_access_secret:
        raise HTTPException(
            status_code=500,
            detail={"errorCode": "CHATBOT_AUTH_MISCONFIG", "message": "JWT_ACCESS_SECRET is required"},
        )
    try:
        payload = jwt.decode(token, settings.jwt_access_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=401,
            detail={"errorCode": "INVALID_TOKEN", "message": "Invalid or expired token"},
        ) from exc

    sub = str(payload.get("sub", "")).strip()
    email = str(payload.get("email", "")).strip()
    role = str(payload.get("role", "")).strip()
    if not sub or not role:
        raise HTTPException(
            status_code=401,
            detail={"errorCode": "INVALID_TOKEN_PAYLOAD", "message": "Invalid token payload"},
        )
    return AuthUser(user_id=sub, email=email, role=role)


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    return token or None


def require_auth(authorization: str | None = Header(default=None)) -> AuthUser:
    token = _bearer_token(authorization)
    if token and settings.jwt_access_secret.strip():
        try:
            return _decode_access_token(token)
        except HTTPException:
            if settings.chatbot_require_auth:
                raise
            logger.debug("Optional bearer token invalid — treating as guest")

    if settings.chatbot_require_auth:
        raise HTTPException(
            status_code=401,
            detail={"errorCode": "UNAUTHORIZED", "message": "Missing bearer token"},
        )

    return AuthUser(user_id="anonymous", email="", role="ANON")


def require_roles(*allowed_roles: str) -> Callable[[AuthUser], AuthUser]:
    allowed = {r.upper() for r in allowed_roles}

    def checker(user: AuthUser = Depends(require_auth)) -> AuthUser:
        # In dev mode with auth disabled, allow all.
        if user.role == "ANON":
            return user
        if user.role.upper() not in allowed:
            raise HTTPException(
                status_code=403,
                detail={"errorCode": "FORBIDDEN", "message": "Insufficient role"},
            )
        return user

    return checker
