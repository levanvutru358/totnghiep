"""Ngữ cảnh người dùng cho engine chatbot."""

from __future__ import annotations

from dataclasses import dataclass

from app.auth import AuthUser

STAFF_ROLES = frozenset({"STAFF", "ADMIN", "SUPER_ADMIN"})


@dataclass(frozen=True)
class ChatActor:
    user_id: str | None
    role: str

    @classmethod
    def anonymous(cls) -> ChatActor:
        return cls(user_id=None, role="ANON")

    @classmethod
    def from_auth_user(cls, user: AuthUser) -> ChatActor:
        if user.role == "ANON":
            return cls.anonymous()
        return cls(user_id=user.user_id, role=user.role.upper())

    @property
    def is_authenticated(self) -> bool:
        return self.role != "ANON" and bool(self.user_id)

    @property
    def is_staff(self) -> bool:
        return self.role in STAFF_ROLES

    def numeric_user_id(self) -> int | None:
        if not self.user_id:
            return None
        try:
            return int(self.user_id)
        except ValueError:
            return None
