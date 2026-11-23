from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base


class ConflictSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"   # Mandatory constraint violation (e.g. 0 coverage on required day, double booked)
    WARNING = "WARNING"     # Overtime, consecutive workdays approaching threshold
    INFO = "INFO"           # Preference violations (e.g. non-preferred weekly off)


class SchedulingConflict(Base):
    __tablename__ = "scheduling_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id", ondelete="CASCADE", name="fk_sc_roster_id"), nullable=False, index=True)

    conflict_type = Column(String(50), nullable=False, index=True)
    severity = Column(
        SQLEnum(ConflictSeverity, name="conflict_severity_enum", native_enum=False),
        default=ConflictSeverity.CRITICAL,
        nullable=False,
        index=True
    )
    date = Column(Date, nullable=False, index=True)

    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL", name="fk_sc_employee_id"), nullable=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="SET NULL", name="fk_sc_brand_id"), nullable=True, index=True)
    process_id = Column(Integer, ForeignKey("processes.id", ondelete="SET NULL", name="fk_sc_process_id"), nullable=True, index=True)

    description = Column(Text, nullable=False)
    resolution_suggestion = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    roster = relationship("Roster", back_populates="conflicts")
    employee = relationship("Employee")
    brand = relationship("Brand")
    process = relationship("Process")

    def __repr__(self) -> str:
        return f"<SchedulingConflict(id={self.id}, roster_id={self.roster_id}, type='{self.conflict_type}', sev='{self.severity}')>"
