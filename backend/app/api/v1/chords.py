import json

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from starlette.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...core.deps import get_db, async_session_maker
from ...core.config import get_settings
from ...models.recording import Recording, ChordAnalysis, AnalysisStatus
from ...services.chord_detector import ChordDetectionService

router = APIRouter()
settings = get_settings()
detector = ChordDetectionService(sample_rate=settings.analysis_sample_rate)


async def _run_analysis(recording_id: str) -> None:
    """Tarea en segundo plano: analiza el audio y guarda el resultado."""
    async with async_session_maker() as db:
        recording = await db.get(Recording, recording_id)
        analysis = (
            await db.execute(
                select(ChordAnalysis).where(ChordAnalysis.recording_id == recording_id)
            )
        ).scalar_one_or_none()
        if not recording or not analysis or not recording.file_path:
            return

        try:
            # librosa es síncrono y pesado: corre en un hilo aparte.
            result = await run_in_threadpool(detector.detect, recording.file_path)
            analysis.chords = json.dumps(result["chords"])
            analysis.tempo = result.get("tempo")
            analysis.key = result.get("key")
            analysis.status = AnalysisStatus.COMPLETED
            if result["chords"]:
                recording.duration = result["chords"][-1]["end"]
        except Exception as exc:  # pragma: no cover
            print(f"Analysis failed for {recording_id}: {exc}")
            analysis.status = AnalysisStatus.FAILED

        await db.commit()


@router.post("/recordings/{recording_id}/analyze", status_code=202)
async def analyze_recording(
    recording_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    analysis = (
        await db.execute(
            select(ChordAnalysis).where(ChordAnalysis.recording_id == recording_id)
        )
    ).scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Recording not found")

    analysis.status = AnalysisStatus.PROCESSING
    await db.commit()

    background_tasks.add_task(_run_analysis, recording_id)
    return {"job_id": analysis.id, "status": "processing"}


@router.get("/recordings/{recording_id}/status")
async def get_analysis_status(recording_id: str, db: AsyncSession = Depends(get_db)):
    analysis = (
        await db.execute(
            select(ChordAnalysis).where(ChordAnalysis.recording_id == recording_id)
        )
    ).scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    completed = analysis.status == AnalysisStatus.COMPLETED
    return {
        "status": analysis.status.value,
        "progress": 1.0 if completed else (0.5 if analysis.status == AnalysisStatus.PROCESSING else 0.0),
        "result": {
            "chords": json.loads(analysis.chords) if analysis.chords else [],
            "tempo": analysis.tempo,
            "key": analysis.key,
        }
        if completed
        else None,
        "error": "Analysis failed" if analysis.status == AnalysisStatus.FAILED else None,
    }
