import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1 import recordings, chords
from .core.config import get_settings
from .core.deps import Base, engine
# Importa los modelos para que queden registrados en Base.metadata antes de create_all.
from .models import recording as _models  # noqa: F401

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:  # noqa: BLE001
        # No tumbamos el proceso si la DB no está disponible: la API arranca
        # y /health responde; los endpoints que usan DB fallarán de forma explícita.
        logger.warning("No se pudieron crear las tablas al arrancar: %s", exc)
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recordings.router, prefix="/api/v1/recordings", tags=["recordings"])
app.include_router(chords.router, prefix="/api/v1", tags=["chords"])


@app.get("/health")
async def health():
    return {"status": "healthy"}
