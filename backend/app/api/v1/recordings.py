from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.deps import get_db
from ...core.config import get_settings
from ...models.recording import Recording, ChordAnalysis, AnalysisStatus

router = APIRouter()
settings = get_settings()

# Extensiones aceptadas según el formato que grabe cada navegador.
_EXT_BY_MIME = {
    "audio/webm": ".webm",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
}


@router.post("/", status_code=201)
async def create_recording(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    ext = _EXT_BY_MIME.get(file.content_type or "", Path(file.filename or "").suffix or ".webm")

    recording = Recording(title=file.filename or "Untitled")
    file_path = settings.data_dir / f"{recording.id}{ext}"

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    file_path.write_bytes(content)

    recording.file_path = str(file_path)
    analysis = ChordAnalysis(recording_id=recording.id, status=AnalysisStatus.PENDING)

    db.add(recording)
    db.add(analysis)
    await db.commit()

    return {
        "id": recording.id,
        "filename": file.filename,
        "created_at": recording.created_at.isoformat(),
    }
