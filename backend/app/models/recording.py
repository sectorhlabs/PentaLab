import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import String, Float, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.deps import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled")
    # Ruta relativa del audio en disco (no URL de S3).
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    chord_analysis: Mapped["ChordAnalysis | None"] = relationship(
        back_populates="recording", uselist=False, cascade="all, delete-orphan"
    )


class ChordAnalysis(Base):
    __tablename__ = "chord_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    recording_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("recordings.id", ondelete="CASCADE"), unique=True
    )
    chords: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON serializado
    tempo: Mapped[float | None] = mapped_column(Float, nullable=True)
    key: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[AnalysisStatus] = mapped_column(
        SQLEnum(AnalysisStatus), default=AnalysisStatus.PENDING
    )

    recording: Mapped["Recording"] = relationship(back_populates="chord_analysis")
