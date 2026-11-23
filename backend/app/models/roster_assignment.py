from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class RosterAssignment(Base):
    __tablename__ = "roster_assignments"

    id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id", ondelete="CASCADE", name="fk_ra_roster_id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE", name="fk_ra_employee_id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="SET NULL", name="fk_ra_shift_id"), nullable=True, index=True)

    is_off = Column(Boolean, default=False, nullable=False)
    off_reason = Column(String(50), nullable=True)  # e.g., "WEEKLY_OFF", "PLANNED_LEAVE", "COMP_OFF", "HOLIDAY"

    # Business rule: Manual assignments must support locking
    is_locked = Column(Boolean, default=False, nullable=False)
    is_manual_override = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("roster_id", "employee_id", "date", name="uq_roster_employee_date"),
    )

    # Relationships
    roster = relationship("Roster", back_populates="assignments")
    employee = relationship("Employee", back_populates="roster_assignments")
    shift = relationship("Shift", back_populates="roster_assignments")
    processes = relationship(
        "RosterAssignmentProcess",
        back_populates="roster_assignment",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<RosterAssignment(id={self.id}, roster_id={self.roster_id}, emp={self.employee_id}, date={self.date}, locked={self.is_locked})>"
