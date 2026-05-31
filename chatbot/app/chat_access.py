"""Conversation access control."""

from __future__ import annotations

from typing import Any

from app.chat_actor import ChatActor


def conversation_owner_id(conversation: dict[str, Any]) -> str | None:
    raw = conversation.get("user_id")
    if raw is None:
        return None
    text = str(raw).strip()
    return text or None


def can_access_conversation(conversation: dict[str, Any], actor: ChatActor) -> bool:
    if actor.is_staff:
        return True
    owner = conversation_owner_id(conversation)
    if actor.is_authenticated:
        return owner == actor.user_id
    return owner is None


def assert_conversation_access(conversation: dict[str, Any], actor: ChatActor) -> None:
    if not can_access_conversation(conversation, actor):
        raise PermissionError("FORBIDDEN_CONVERSATION")
