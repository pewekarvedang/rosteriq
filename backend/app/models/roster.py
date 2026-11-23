from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class RosterStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    VALIDATED = "VALIDATED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class Roster(Base):
    __tablename__ = "rosters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # Status support: draft, validated and published states
    status = Column(
        SQLEnum(RosterStatus, name="roster_status_enum", native_enum=False),
        default=RosterStatus.DRAFT,
        nullable=False,
        index=True
    )

    # Version history support
    version = Column(Integer, default=1, nullable=False)
    parent_roster_id = Column(Integer, ForeignKey("rosters.id", ondelete="SET NULL", name="fk_roster_parent_id"), nullable=True, index=True)

    created_by = Column(String(100), default="Operations Manager", nullable=False)
    validated_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("month", "year", "version", name="uq_roster_month_year_version"),
    )

    # Relationships
    parent_roster = relationship("Roster", remote_side=[id], backref="child_versions")
    assignments = relationship("RosterAssignment", back_populates="roster", cascade="all, delete-orphan")
    conflicts = relationship("SchedulingConflict", back_populates="roster", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Roster(id={self.id}, '{self.name}', v{self.version}, status='{self.status}')>"
