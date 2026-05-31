from __future__ import annotations

from pydantic import BaseModel, Field


class ConversationCreateRequest(BaseModel):
    title: str = Field(default="Cuoc hoi thoai moi", min_length=1, max_length=200)


class ConversationPatchRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    pinned: bool | None = None
    archived: bool | None = None


class MessageCreateRequest(BaseModel):
    conversation_id: str | None = None
    content: str = Field(..., min_length=1, max_length=4000)
    stream: bool = False


class MessagePatchRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class AIGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    conversation_id: str | None = None


class AISummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class AIClassifyRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


class ToolRequest(BaseModel):
    payload: dict = {}


class HandoffRequest(BaseModel):
    conversation_id: str = Field(..., min_length=1, max_length=128)
    reason: str = Field(..., min_length=2, max_length=500)
    priority: str = Field(default="normal", max_length=20)


class AgentAssignRequest(BaseModel):
    conversation_id: str = Field(..., min_length=1, max_length=128)
    agent_id: str = Field(..., min_length=1, max_length=128)
    agent_name: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=500)


class IntegrationRequest(BaseModel):
    provider: str = Field(..., min_length=2, max_length=30)
    display_name: str = Field(..., min_length=2, max_length=120)
    config: dict = {}
