from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


def _utc_now() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


class ChatStore:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def conn(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def _init_db(self) -> None:
        with self.conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    pinned INTEGER NOT NULL DEFAULT 0,
                    archived INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active',
                    metadata_json TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
                ON messages(conversation_id, created_at);

                CREATE TABLE IF NOT EXISTS knowledge_files (
                    id TEXT PRIMARY KEY,
                    source_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata_json TEXT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS handoffs (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    priority TEXT NOT NULL DEFAULT 'normal',
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS agent_assignments (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    agent_id TEXT NOT NULL,
                    agent_name TEXT NULL,
                    note TEXT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS integrations (
                    id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'connected',
                    config_json TEXT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            self._migrate_schema(conn)

    def _migrate_schema(self, conn: sqlite3.Connection) -> None:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(conversations)").fetchall()}
        if "user_id" not in cols:
            conn.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT NULL")
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)"
            )

    def create_conversation(
        self,
        conversation_id: str,
        title: str,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        now = _utc_now()
        with self.conn() as conn:
            conn.execute(
                """
                INSERT INTO conversations(id, title, pinned, archived, user_id, created_at, updated_at)
                VALUES (?, ?, 0, 0, ?, ?, ?)
                """,
                (conversation_id, title, user_id, now, now),
            )
        return self.get_conversation(conversation_id)

    def get_conversation(self, conversation_id: str) -> dict[str, Any]:
        with self.conn() as conn:
            row = conn.execute(
                "SELECT * FROM conversations WHERE id = ? LIMIT 1",
                (conversation_id,),
            ).fetchone()
        if not row:
            raise ValueError("CONVERSATION_NOT_FOUND")
        return dict(row)

    def list_conversations(
        self,
        search: str | None = None,
        archived: bool | None = None,
        user_id: str | None = None,
        *,
        staff_view: bool = False,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if search:
            clauses.append("title LIKE ?")
            params.append(f"%{search.strip()}%")
        if archived is not None:
            clauses.append("archived = ?")
            params.append(1 if archived else 0)
        if not staff_view:
            if user_id:
                clauses.append("user_id = ?")
                params.append(user_id)
            else:
                clauses.append("user_id IS NULL")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with self.conn() as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM conversations
                {where}
                ORDER BY pinned DESC, updated_at DESC
                """
                ,
                params,
            ).fetchall()
        return [dict(r) for r in rows]

    def claim_conversation(self, conversation_id: str, user_id: str) -> dict[str, Any]:
        """Gán hội thoại khách (user_id NULL) cho tài khoản sau khi đăng nhập."""
        with self.conn() as conn:
            row = conn.execute(
                "SELECT user_id FROM conversations WHERE id = ? LIMIT 1",
                (conversation_id,),
            ).fetchone()
            if not row:
                raise ValueError("CONVERSATION_NOT_FOUND")
            owner = row["user_id"]
            if owner is not None and str(owner).strip() != str(user_id).strip():
                raise PermissionError("FORBIDDEN_CONVERSATION")
            if owner is None:
                now = _utc_now()
                conn.execute(
                    "UPDATE conversations SET user_id = ?, updated_at = ? WHERE id = ?",
                    (str(user_id).strip(), now, conversation_id),
                )
        return self.get_conversation(conversation_id)

    def update_conversation(self, conversation_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        fields: list[str] = []
        params: list[Any] = []
        for key in ("title", "pinned", "archived"):
            if key in patch:
                fields.append(f"{key} = ?")
                value = patch[key]
                if key in ("pinned", "archived"):
                    value = 1 if bool(value) else 0
                params.append(value)
        if not fields:
            return self.get_conversation(conversation_id)
        fields.append("updated_at = ?")
        params.append(_utc_now())
        params.append(conversation_id)
        with self.conn() as conn:
            cursor = conn.execute(
                f"UPDATE conversations SET {', '.join(fields)} WHERE id = ?",
                params,
            )
            if cursor.rowcount == 0:
                raise ValueError("CONVERSATION_NOT_FOUND")
        return self.get_conversation(conversation_id)

    def delete_conversation(self, conversation_id: str) -> None:
        with self.conn() as conn:
            conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
            cursor = conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
            if cursor.rowcount == 0:
                raise ValueError("CONVERSATION_NOT_FOUND")

    def create_message(
        self,
        message_id: str,
        conversation_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        now = _utc_now()
        metadata_json = json.dumps(metadata or {}, ensure_ascii=False)
        with self.conn() as conn:
            conn.execute(
                """
                INSERT INTO messages(id, conversation_id, role, content, status, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
                """,
                (message_id, conversation_id, role, content, metadata_json, now, now),
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conversation_id),
            )
        return self.get_message(message_id)

    def get_message(self, message_id: str) -> dict[str, Any]:
        with self.conn() as conn:
            row = conn.execute("SELECT * FROM messages WHERE id = ? LIMIT 1", (message_id,)).fetchone()
        if not row:
            raise ValueError("MESSAGE_NOT_FOUND")
        data = dict(row)
        data["metadata"] = json.loads(data.pop("metadata_json") or "{}")
        return data

    def list_messages(self, conversation_id: str) -> list[dict[str, Any]]:
        with self.conn() as conn:
            rows = conn.execute(
                """
                SELECT * FROM messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                """,
                (conversation_id,),
            ).fetchall()
        items: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["metadata"] = json.loads(item.pop("metadata_json") or "{}")
            items.append(item)
        return items

    def update_message(self, message_id: str, content: str) -> dict[str, Any]:
        now = _utc_now()
        with self.conn() as conn:
            cursor = conn.execute(
                """
                UPDATE messages
                SET content = ?, updated_at = ?
                WHERE id = ? AND status = 'active'
                """,
                (content, now, message_id),
            )
            if cursor.rowcount == 0:
                raise ValueError("MESSAGE_NOT_FOUND")
        return self.get_message(message_id)

    def revoke_message(self, message_id: str) -> dict[str, Any]:
        now = _utc_now()
        with self.conn() as conn:
            cursor = conn.execute(
                "UPDATE messages SET status = 'revoked', updated_at = ? WHERE id = ?",
                (now, message_id),
            )
            if cursor.rowcount == 0:
                raise ValueError("MESSAGE_NOT_FOUND")
        return self.get_message(message_id)

    def add_knowledge(
        self,
        knowledge_id: str,
        source_type: str,
        title: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        with self.conn() as conn:
            conn.execute(
                """
                INSERT INTO knowledge_files(id, source_type, title, content, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    knowledge_id,
                    source_type,
                    title,
                    content,
                    json.dumps(metadata or {}, ensure_ascii=False),
                    _utc_now(),
                ),
            )
        return self.get_knowledge(knowledge_id)

    def get_knowledge(self, knowledge_id: str) -> dict[str, Any]:
        with self.conn() as conn:
            row = conn.execute(
                "SELECT * FROM knowledge_files WHERE id = ? LIMIT 1",
                (knowledge_id,),
            ).fetchone()
        if not row:
            raise ValueError("KNOWLEDGE_NOT_FOUND")
        data = dict(row)
        data["metadata"] = json.loads(data.pop("metadata_json") or "{}")
        return data

    def search_knowledge(self, query: str, limit: int = 3) -> list[dict[str, Any]]:
        q = query.strip()[:80]
        if len(q) < 2:
            return []
        params: list[Any] = [f"%{q}%", f"%{q}%", limit]
        with self.conn() as conn:
            rows = conn.execute(
                """
                SELECT * FROM knowledge_files
                WHERE title LIKE ? OR content LIKE ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
        out: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["metadata"] = json.loads(item.pop("metadata_json") or "{}")
            out.append(item)
        return out

    def list_knowledge(self, search: str | None = None) -> list[dict[str, Any]]:
        if search:
            return self.search_knowledge(search, limit=50)
        params: list[Any] = []
        where = ""
        with self.conn() as conn:
            rows = conn.execute(
                f"SELECT * FROM knowledge_files {where} ORDER BY created_at DESC",
                params,
            ).fetchall()
        out: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["metadata"] = json.loads(item.pop("metadata_json") or "{}")
            out.append(item)
        return out

    def delete_knowledge(self, knowledge_id: str) -> None:
        with self.conn() as conn:
            cursor = conn.execute("DELETE FROM knowledge_files WHERE id = ?", (knowledge_id,))
            if cursor.rowcount == 0:
                raise ValueError("KNOWLEDGE_NOT_FOUND")

    def create_handoff(
        self,
        handoff_id: str,
        conversation_id: str,
        reason: str,
        priority: str = "normal",
    ) -> dict[str, Any]:
        now = _utc_now()
        with self.conn() as conn:
            conn.execute(
                """
                INSERT INTO handoffs(id, conversation_id, reason, priority, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'pending', ?, ?)
                """,
                (handoff_id, conversation_id, reason, priority, now, now),
            )
        return self.get_handoff(handoff_id)

    def get_handoff(self, handoff_id: str) -> dict[str, Any]:
        with self.conn() as conn:
            row = conn.execute("SELECT * FROM handoffs WHERE id = ? LIMIT 1", (handoff_id,)).fetchone()
        if not row:
            raise ValueError("HANDOFF_NOT_FOUND")
        return dict(row)

    def create_agent_assignment(
        self,
        assignment_id: str,
        conversation_id: str,
        agent_id: str,
        agent_name: str | None,
        note: str | None = None,
    ) -> dict[str, Any]:
        now = _utc_now()
        with self.conn() as conn:
            conn.execute(
                """
                INSERT INTO agent_assignments(id, conversation_id, agent_id, agent_name, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (assignment_id, conversation_id, agent_id, agent_name, note, now),
            )
            conn.execute(
                "UPDATE handoffs SET status = 'assigned', updated_at = ? WHERE conversation_id = ? AND status = 'pending'",
                (now, conversation_id),
            )
        return self.get_agent_assignment(assignment_id)

    def get_agent_assignment(self, assignment_id: str) -> dict[str, Any]:
        with self.conn() as conn:
            row = conn.execute(
                "SELECT * FROM agent_assignments WHERE id = ? LIMIT 1",
                (assignment_id,),
            ).fetchone()
        if not row:
            raise ValueError("ASSIGNMENT_NOT_FOUND")
        return dict(row)

    def add_integration(
        self,
        integration_id: str,
        provider: str,
        display_name: str,
        config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        with self.conn() as conn:
            conn.execute(
                """
                INSERT INTO integrations(id, provider, display_name, status, config_json, created_at)
                VALUES (?, ?, ?, 'connected', ?, ?)
                """,
                (
                    integration_id,
                    provider,
                    display_name,
                    json.dumps(config or {}, ensure_ascii=False),
                    _utc_now(),
                ),
            )
        return self.get_integration(integration_id)

    def get_integration(self, integration_id: str) -> dict[str, Any]:
        with self.conn() as conn:
            row = conn.execute(
                "SELECT * FROM integrations WHERE id = ? LIMIT 1",
                (integration_id,),
            ).fetchone()
        if not row:
            raise ValueError("INTEGRATION_NOT_FOUND")
        data = dict(row)
        data["config"] = json.loads(data.pop("config_json") or "{}")
        return data
