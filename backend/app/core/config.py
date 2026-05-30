from pathlib import Path

from pydantic_settings import BaseSettings
from functools import lru_cache


# Raíz del backend (carpeta `backend/`).
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "MyMusic API"
    debug: bool = True

    # Orígenes permitidos por CORS. Con allow_credentials=True no se puede usar "*".
    # Para el túnel/móvil basta con permitir cualquier origen sin credenciales.
    cors_origins: list[str] = ["*"]

    # SQLite local por defecto: cero infraestructura.
    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR / 'mymusic.db'}"

    # Carpeta donde se guardan los audios subidos.
    data_dir: Path = BASE_DIR / "data" / "recordings"

    # Frecuencia de análisis (librosa). 22050 es buen equilibrio precisión/coste.
    analysis_sample_rate: int = 22050

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings
