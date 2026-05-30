from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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


@router.get("/")
async def list_recordings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recording).order_by(Recording.created_at.desc()))
    return [
        {
            "id": r.id,
            "title": r.title,
            "duration": r.duration,
            "created_at": r.created_at.isoformat(),
        }
        for r in result.scalars().all()
    ]


@router.get("/{recording_id}")
async def get_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    recording = await db.get(Recording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return {
        "id": recording.id,
        "title": recording.title,
        "duration": recording.duration,
        "created_at": recording.created_at.isoformat(),
    }


@router.get("/{recording_id}/stream")
async def stream_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    recording = await db.get(Recording, recording_id)
    if not recording or not recording.file_path or not Path(recording.file_path).exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(recording.file_path)


@router.delete("/{recording_id}", status_code=204)
async def delete_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    recording = await db.get(Recording, recording_id)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    if recording.file_path:
        Path(recording.file_path).unlink(missing_ok=True)

    await db.delete(recording)
    await db.commit()
