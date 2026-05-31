from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import AsyncIterator

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse

from app.auth import AuthUser, require_auth, require_roles
from app.chat_access import assert_conversation_access
from app.chat_actor import ChatActor
from app.chat_service import (
    ai_classify,
    ai_generate,
    ai_summarize,
    build_chat_history,
    export_messages_zip,
    new_id,
)
from app.schemas import (
    AIClassifyRequest,
    AIGenerateRequest,
    AISummarizeRequest,
    ConversationCreateRequest,
    ConversationPatchRequest,
    HandoffRequest,
    IntegrationRequest,
    MessageCreateRequest,
    MessagePatchRequest,
    AgentAssignRequest,
    ToolRequest,
)
from app.store import ChatStore


def _not_found(code: str, message: str) -> HTTPException:
    return HTTPException(status_code=404, detail={"errorCode": code, "message": message})


def _forbidden(message: str = "Forbidden") -> HTTPException:
    return HTTPException(status_code=403, detail={"errorCode": "FORBIDDEN", "message": message})


def _actor(user: AuthUser) -> ChatActor:
    return ChatActor.from_auth_user(user)


def _owner_id(user: AuthUser) -> str | None:
    actor = _actor(user)
    return actor.user_id if actor.is_authenticated else None


def _get_conversation_or_404(store: ChatStore, conversation_id: str) -> dict:
    try:
        return store.get_conversation(conversation_id)
    except ValueError:
        raise _not_found("CONVERSATION_NOT_FOUND", "Conversation not found")


def _check_conversation_access(conv: dict, user: AuthUser) -> None:
    try:
        assert_conversation_access(conv, _actor(user))
    except PermissionError:
        raise _forbidden("Conversation access denied")


def _get_message_conversation(store: ChatStore, message_id: str) -> tuple[dict, dict]:
    try:
        message = store.get_message(message_id)
    except ValueError:
        raise _not_found("MESSAGE_NOT_FOUND", "Message not found")
    conv = _get_conversation_or_404(store, message["conversation_id"])
    return message, conv


def build_router(store: ChatStore) -> APIRouter:
    router = APIRouter(dependencies=[Depends(require_auth)])

    # 1) Conversations
    @router.post("/chat/conversations")
    def create_conversation(body: ConversationCreateRequest, user: AuthUser = Depends(require_auth)):
        conversation_id = new_id("conv")
        data = store.create_conversation(
            conversation_id,
            body.title.strip(),
            user_id=_owner_id(user),
        )
        return data

    @router.get("/chat/conversations")
    def list_conversations(
        q: str | None = Query(default=None),
        archived: bool | None = Query(default=None),
        user: AuthUser = Depends(require_auth),
    ):
        actor = _actor(user)
        return {
            "items": store.list_conversations(
                q,
                archived,
                user_id=actor.user_id if actor.is_authenticated else None,
                staff_view=actor.is_staff,
            )
        }

    @router.get("/chat/conversations/{conversation_id}")
    def get_conversation(conversation_id: str, user: AuthUser = Depends(require_auth)):
        conv = _get_conversation_or_404(store, conversation_id)
        _check_conversation_access(conv, user)
        messages = [m for m in store.list_messages(conversation_id) if m.get("status") != "revoked"]
        return {**conv, "messages": messages}

    @router.patch("/chat/conversations/{conversation_id}")
    def patch_conversation(
        conversation_id: str,
        body: ConversationPatchRequest,
        user: AuthUser = Depends(require_auth),
    ):
        conv = _get_conversation_or_404(store, conversation_id)
        _check_conversation_access(conv, user)
        try:
            return store.update_conversation(conversation_id, body.model_dump(exclude_none=True))
        except ValueError:
            raise _not_found("CONVERSATION_NOT_FOUND", "Conversation not found")

    @router.delete("/chat/conversations/{conversation_id}")
    def delete_conversation(conversation_id: str, user: AuthUser = Depends(require_auth)):
        conv = _get_conversation_or_404(store, conversation_id)
        _check_conversation_access(conv, user)
        try:
            store.delete_conversation(conversation_id)
        except ValueError:
            raise _not_found("CONVERSATION_NOT_FOUND", "Conversation not found")
        return {"deleted": True}

    # 2) Messaging
    @router.get("/chat/messages")
    def list_messages(conversation_id: str = Query(...), user: AuthUser = Depends(require_auth)):
        conv = _get_conversation_or_404(store, conversation_id)
        _check_conversation_access(conv, user)
        items = [
            m
            for m in store.list_messages(conversation_id)
            if m.get("status") != "revoked"
        ]
        return {"items": items}

    @router.post("/chat/messages")
    def send_message(body: MessageCreateRequest, user: AuthUser = Depends(require_auth)):
        conversation_id = body.conversation_id
        actor = _actor(user)
        if not conversation_id:
            conversation_id = new_id("conv")
            store.create_conversation(
                conversation_id,
                "Cuộc hội thoại mới",
                user_id=_owner_id(user),
            )
        else:
            conv = _get_conversation_or_404(store, conversation_id)
            if actor.is_authenticated and actor.user_id:
                try:
                    store.claim_conversation(conversation_id, actor.user_id)
                    conv = store.get_conversation(conversation_id)
                except PermissionError:
                    raise _forbidden("Conversation access denied")
            _check_conversation_access(conv, user)

        user_msg = store.create_message(
            message_id=new_id("msg"),
            conversation_id=conversation_id,
            role="user",
            content=body.content.strip(),
        )
        history = build_chat_history(
            store.list_messages(conversation_id),
            exclude_message_id=user_msg["id"],
        )
        ai_result = ai_generate(
            body.content,
            conversation_id,
            actor,
            history,
            store,
        )
        assistant_msg = store.create_message(
            message_id=new_id("msg"),
            conversation_id=conversation_id,
            role="assistant",
            content=ai_result["reply"],
            metadata={"intent": ai_result["intent"], "suggestions": ai_result["suggestions"]},
        )
        return {
            "conversation_id": conversation_id,
            "messages": [user_msg, assistant_msg],
            "intent": ai_result["intent"],
            "suggestions": ai_result["suggestions"],
            "copy": assistant_msg["content"],
        }

    @router.put("/chat/messages/{message_id}")
    def edit_message(message_id: str, body: MessagePatchRequest, user: AuthUser = Depends(require_auth)):
        _, conv = _get_message_conversation(store, message_id)
        _check_conversation_access(conv, user)
        try:
            return store.update_message(message_id, body.content.strip())
        except ValueError:
            raise _not_found("MESSAGE_NOT_FOUND", "Message not found")

    @router.delete("/chat/messages/{message_id}")
    def revoke_message(message_id: str, user: AuthUser = Depends(require_auth)):
        _, conv = _get_message_conversation(store, message_id)
        _check_conversation_access(conv, user)
        try:
            return store.revoke_message(message_id)
        except ValueError:
            raise _not_found("MESSAGE_NOT_FOUND", "Message not found")

    @router.post("/chat/messages/{message_id}/regenerate")
    def regenerate_message(message_id: str, user: AuthUser = Depends(require_auth)):
        try:
            source = store.get_message(message_id)
        except ValueError:
            raise _not_found("MESSAGE_NOT_FOUND", "Message not found")
        if source["role"] != "user":
            raise HTTPException(status_code=400, detail={"errorCode": "INVALID_ROLE", "message": "Message must be role=user"})
        conv = _get_conversation_or_404(store, source["conversation_id"])
        try:
            assert_conversation_access(conv, _actor(user))
        except PermissionError:
            raise _forbidden("Conversation access denied")
        history = build_chat_history(store.list_messages(source["conversation_id"]))
        result = ai_generate(
            source["content"],
            source["conversation_id"],
            _actor(user),
            history,
            store,
        )
        regenerated = store.create_message(
            message_id=new_id("msg"),
            conversation_id=source["conversation_id"],
            role="assistant",
            content=result["reply"],
            metadata={"intent": result["intent"], "regenerated_from": message_id},
        )
        return regenerated

    @router.get("/chat/messages/stream")
    async def stream_message(
        prompt: str = Query(...),
        conversation_id: str | None = Query(default=None),
        user: AuthUser = Depends(require_auth),
    ):
        history = (
            build_chat_history(store.list_messages(conversation_id))
            if conversation_id
            else []
        )
        if conversation_id:
            conv = _get_conversation_or_404(store, conversation_id)
            try:
                assert_conversation_access(conv, _actor(user))
            except PermissionError:
                raise _forbidden("Conversation access denied")
        result = ai_generate(
            prompt,
            conversation_id,
            _actor(user),
            history,
            store,
        )
        text = result["reply"]

        async def event_stream() -> AsyncIterator[str]:
            for token in text.split(" "):
                payload = {"type": "token", "delta": token + " "}
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.01)
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    @router.get("/chat/messages/export")
    def export_messages(conversation_id: str = Query(...), user: AuthUser = Depends(require_auth)):
        conv = _get_conversation_or_404(store, conversation_id)
        _check_conversation_access(conv, user)
        blob = export_messages_zip(conversation_id, store.list_messages(conversation_id))
        headers = {"Content-Disposition": f'attachment; filename="{conversation_id}.zip"'}
        return Response(content=blob, media_type="application/zip", headers=headers)

    # 3) AI engine
    @router.post("/ai/generate")
    def generate(body: AIGenerateRequest, user: AuthUser = Depends(require_auth)):
        history: list = []
        if body.conversation_id:
            conv = _get_conversation_or_404(store, body.conversation_id)
            try:
                assert_conversation_access(conv, _actor(user))
            except PermissionError:
                raise _forbidden("Conversation access denied")
            history = build_chat_history(store.list_messages(body.conversation_id))
        return ai_generate(
            body.prompt,
            body.conversation_id,
            _actor(user),
            history,
            store,
        )

    @router.post("/ai/summarize")
    def summarize(body: AISummarizeRequest, _user: AuthUser = Depends(require_auth)):
        return {"summary": ai_summarize(body.text)}

    @router.post("/ai/classify")
    def classify(body: AIClassifyRequest, _user: AuthUser = Depends(require_auth)):
        return ai_classify(body.text)

    # 4) Knowledge base
    @router.post("/knowledge/files", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    async def upload_knowledge(
        source_type: str = Query("faq"),
        file: UploadFile = File(...),
        _user: AuthUser = Depends(require_auth),
    ):
        content = (await file.read()).decode("utf-8", errors="ignore")
        knowledge_id = new_id("kb")
        item = store.add_knowledge(
            knowledge_id=knowledge_id,
            source_type=source_type,
            title=file.filename or knowledge_id,
            content=content,
            metadata={"filename": file.filename, "content_type": file.content_type},
        )
        return item

    @router.get("/knowledge", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    def list_knowledge(q: str | None = Query(default=None), _user: AuthUser = Depends(require_auth)):
        return {"items": store.list_knowledge(q)}

    @router.delete("/knowledge/{knowledge_id}", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    def delete_knowledge(knowledge_id: str, _user: AuthUser = Depends(require_auth)):
        try:
            store.delete_knowledge(knowledge_id)
        except ValueError:
            raise _not_found("KNOWLEDGE_NOT_FOUND", "Knowledge not found")
        return {"deleted": True}

    @router.post("/knowledge/index", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    def index_knowledge(_user: AuthUser = Depends(require_auth)):
        # Lightweight local indexer: returns count as "synced/indexed".
        items = store.list_knowledge()
        return {"indexed": len(items), "status": "ok"}

    # 5) Tool calling
    @router.post("/tools/orders", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    def tool_orders(body: ToolRequest, _user: AuthUser = Depends(require_auth)):
        return {"tool": "orders", "accepted": True, "payload": body.payload}

    @router.post("/tools/payment", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    def tool_payment(body: ToolRequest, _user: AuthUser = Depends(require_auth)):
        return {"tool": "payment", "accepted": True, "payload": body.payload}

    @router.post("/tools/email", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    def tool_email(body: ToolRequest, _user: AuthUser = Depends(require_auth)):
        return {"tool": "email", "accepted": True, "payload": body.payload}

    # 7) Human handoff
    @router.post("/chat/handoff", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    def create_handoff(body: HandoffRequest, _user: AuthUser = Depends(require_auth)):
        try:
            store.get_conversation(body.conversation_id)
        except ValueError:
            raise _not_found("CONVERSATION_NOT_FOUND", "Conversation not found")
        item = store.create_handoff(
            handoff_id=new_id("handoff"),
            conversation_id=body.conversation_id,
            reason=body.reason.strip(),
            priority=body.priority.strip().lower() or "normal",
        )
        return item

    @router.post("/agents/assign", dependencies=[Depends(require_roles("STAFF", "ADMIN", "SUPER_ADMIN"))])
    def assign_agent(body: AgentAssignRequest, _user: AuthUser = Depends(require_auth)):
        try:
            store.get_conversation(body.conversation_id)
        except ValueError:
            raise _not_found("CONVERSATION_NOT_FOUND", "Conversation not found")
        item = store.create_agent_assignment(
            assignment_id=new_id("assign"),
            conversation_id=body.conversation_id,
            agent_id=body.agent_id.strip(),
            agent_name=(body.agent_name or "").strip() or None,
            note=(body.note or "").strip() or None,
        )
        return item

    # 8) Omnichannel integrations
    @router.post("/integrations", dependencies=[Depends(require_roles("ADMIN", "SUPER_ADMIN"))])
    def create_integration(body: IntegrationRequest, _user: AuthUser = Depends(require_auth)):
        provider = body.provider.strip().lower()
        if provider not in {"facebook", "zalo", "email"}:
            raise HTTPException(
                status_code=400,
                detail={"errorCode": "INVALID_PROVIDER", "message": "provider must be facebook|zalo|email"},
            )
        return store.add_integration(
            integration_id=new_id("integration"),
            provider=provider,
            display_name=body.display_name.strip(),
            config=body.config,
        )

    return router
