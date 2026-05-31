"""EMP Shop — Chatbot API (Python / FastAPI)."""

from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import build_router
from app.auth import AuthUser, require_auth, validate_auth_config
from app.chat_actor import ChatActor
from app.bot.engine import chat
from app.bot.gemini_client import ping_gemini
from app.config import settings
from app.db import get_connection
from app.models import ChatRequest, ChatResponse
from app.bot.faq_data import FAQ_ITEMS, iter_faq_entries
from app.chat_service import new_id
from app.store import ChatStore

logger = logging.getLogger("chatbot")
store = ChatStore(settings.local_store_path)


def _seed_faq_knowledge() -> None:
    """Đồng bộ FAQ vào SQLite knowledge (thêm mục mới nếu thiếu)."""
    existing = store.list_knowledge()
    seeded_ids: set[str] = set()
    for item in existing:
        if item.get("source_type") != "faq_seed":
            continue
        meta = item.get("metadata") or {}
        if isinstance(meta, dict) and meta.get("faq_id"):
            seeded_ids.add(str(meta["faq_id"]))

    added = 0
    for faq_id, content in iter_faq_entries():
        if faq_id in seeded_ids:
            continue
        store.add_knowledge(
            knowledge_id=new_id("kb"),
            source_type="faq_seed",
            title=f"FAQ: {faq_id}",
            content=content,
            metadata={"faq_id": faq_id},
        )
        added += 1
    if added:
        logger.info("Seeded %s new FAQ entries into knowledge base", added)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    for msg in validate_auth_config():
        logger.warning("Config: %s", msg)
    try:
        _seed_faq_knowledge()
    except Exception as exc:
        logger.warning("FAQ knowledge seed skipped: %s", exc)
    yield


app = FastAPI(
    title="EMP Chatbot",
    description="Trợ lý AI cho cửa hàng EMP — tìm sản phẩm, tra đơn, FAQ.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    try:
        conn = get_connection()
        conn.close()
        db_ok = True
        db_error = None
    except Exception as exc:
        db_ok = False
        db_error = str(exc)
        logger.warning("MySQL health check failed: %s", exc)

    local_ok = True
    local_error: str | None = None
    try:
        db_path = Path(settings.local_store_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with store.conn():
            pass
    except Exception as exc:
        local_ok = False
        local_error = str(exc)
        logger.warning("Local store health check failed: %s", exc)

    gemini_ok: bool | None = None
    gemini_error: str | None = None
    if settings.llm_enabled:
        gemini_ok, gemini_error = ping_gemini()

    status = "ok"
    if not db_ok or not local_ok or (gemini_ok is False):
        status = "degraded"

    return {
        "status": status,
        "database": db_ok,
        "databaseError": db_error,
        "localStore": local_ok,
        "localStoreError": local_error,
        "llmEnabled": settings.llm_enabled,
        "llmProvider": settings.llm_provider,
        "geminiModel": settings.gemini_model if settings.gemini_api_key.strip() else None,
        "geminiReachable": gemini_ok,
        "geminiError": gemini_error,
        "authRequired": settings.chatbot_require_auth,
        "jwtConfigured": bool(settings.jwt_access_secret.strip()),
        "configWarnings": validate_auth_config(),
    }


@app.post("/chat", response_model=ChatResponse)
def post_chat(body: ChatRequest, user: AuthUser = Depends(require_auth)):
    result = chat(body.message, body.session_id, ChatActor.from_auth_user(user), None, store)
    return ChatResponse(**result)


app.include_router(build_router(store))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.chatbot_host,
        port=settings.chatbot_port,
        reload=True,
    )
