from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import TYPE_CHECKING, Any
from zipfile import ZIP_DEFLATED, ZipFile

from app.bot.engine import chat
from app.bot.gemini_client import ChatTurn, GeminiError, ask_gemini, is_gemini_enabled
from app.bot.intents import detect_intent
from app.chat_actor import ChatActor
from app.config import settings

if TYPE_CHECKING:
    from app.store import ChatStore


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def build_chat_history(
    messages: list[dict],
    *,
    exclude_message_id: str | None = None,
) -> list[ChatTurn]:
    limit = max(1, settings.gemini_history_limit)
    active = [
        m
        for m in messages
        if m.get("status", "active") == "active" and m.get("id") != exclude_message_id
    ]
    recent = active[-(limit * 2) :]
    turns: list[ChatTurn] = []
    for msg in recent:
        role = msg.get("role")
        content = str(msg.get("content", "")).strip()
        if not content:
            continue
        if role == "user":
            turns.append(("user", content))
        elif role == "assistant":
            turns.append(("model", content))
    return turns


def ai_generate(
    prompt: str,
    session_id: str | None = None,
    actor: ChatActor | None = None,
    history: list[ChatTurn] | None = None,
    store: ChatStore | None = None,
) -> dict[str, Any]:
    return chat(prompt, session_id, actor or ChatActor.anonymous(), history, store)


def ai_summarize(text: str) -> str:
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return ""
    if is_gemini_enabled() and len(clean) > 80:
        try:
            return ask_gemini(
                f"Tóm tắt ngắn gọn (tối đa 2 câu, tiếng Việt):\n{clean}",
                intent_hint="summarize",
                context_block="(không có dữ liệu bổ sung)",
                history=None,
            )
        except GeminiError:
            pass
    if len(clean) <= 220:
        return clean
    return f"{clean[:220].rstrip()}..."


def ai_classify(text: str) -> dict[str, str]:
    intent = detect_intent(text).value
    sentiment = "neutral"
    lower = text.lower()
    if any(x in lower for x in ("tệ", "lỗi", "chậm", "không hài lòng", "that vong")):
        sentiment = "negative"
    elif any(x in lower for x in ("tốt", "ok", "hài lòng", "tuyệt", "thanks", "cam on")):
        sentiment = "positive"
    return {"intent": intent, "sentiment": sentiment}


def export_messages_zip(conversation_id: str, messages: list[dict[str, Any]]) -> bytes:
    payload = {
        "conversation_id": conversation_id,
        "exported_at": now_iso(),
        "messages": messages,
    }
    content = json.dumps(payload, ensure_ascii=False, indent=2)
    memory = BytesIO()
    with ZipFile(memory, "w", compression=ZIP_DEFLATED) as zf:
        zf.writestr(f"{conversation_id}.json", content)
    return memory.getvalue()
