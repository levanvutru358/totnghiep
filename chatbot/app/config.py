import os
import re

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DO_UNRESOLVED = re.compile(r"^\$\{[^}]+\}$")


def _reject_unresolved_do_ref(value: object, field: str) -> object:
    if isinstance(value, str) and _DO_UNRESOLVED.match(value.strip()):
        raise ValueError(
            f"{field}={value!r} chưa được DigitalOcean gán giá trị thật. "
            "Vào component → Environment → Add from database (không gõ ${...} tay)."
        )
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env" if os.getenv("NODE_ENV") != "production" else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    chatbot_host: str = "0.0.0.0"
    chatbot_port: int = 8090

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = ""
    db_password: str = ""
    db_name: str = "ecommerce_db"

    cors_origins: str = "http://localhost:5173"

    # Google Gemini (ưu tiên khi có GEMINI_API_KEY)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_temperature: float = 0.4
    gemini_max_output_tokens: int = 1024
    gemini_timeout_seconds: float = 45.0
    gemini_history_limit: int = 10

    chatbot_require_auth: bool = False
    jwt_access_secret: str = ""

    shop_url: str = "http://localhost:5173"
    local_store_path: str = "data/chatbot.db"

    @field_validator("db_host", "db_user", "db_password", "db_name", mode="before")
    @classmethod
    def _check_db_str(cls, value: object) -> object:
        return _reject_unresolved_do_ref(value, "DB_*")

    @field_validator("db_port", mode="before")
    @classmethod
    def _check_db_port(cls, value: object) -> object:
        return _reject_unresolved_do_ref(value, "DB_PORT")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def client_base_url(self) -> str:
        """URL để gọi API từ máy local (0.0.0.0 chỉ dùng khi bind server)."""
        host = self.chatbot_host.strip()
        if host in ("0.0.0.0", "::", ""):
            host = "127.0.0.1"
        return f"http://{host}:{self.chatbot_port}"

    @property
    def llm_enabled(self) -> bool:
        return bool(self.gemini_api_key.strip())

    @property
    def llm_provider(self) -> str:
        return "gemini" if self.gemini_api_key.strip() else "none"


settings = Settings()
