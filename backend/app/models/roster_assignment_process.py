from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class RosterAssignmentProcess(Base):
    __tablename__ = "roster_assignment_processes"

    id = Column(Integer, primary_key=True, index=True)
    roster_assignment_id = Column(
        Integer,
        ForeignKey("roster_assignments.id", ondelete="CASCADE", name="fk_rap_roster_assignment_id"),
        nullable=False,
        index=True
    )
    brand_id = Column(
        Integer,
        ForeignKey("brands.id", ondelete="CASCADE", name="fk_rap_brand_id"),
        nullable=False,
        index=True
    )
    process_id = Column(
        Integer,
        ForeignKey("processes.id", ondelete="CASCADE", name="fk_rap_process_id"),
        nullable=False,
        index=True
    )

    # Multi-process allocation within one shift
    allocated_hours = Column(Float, default=8.0, nullable=False)
    is_primary = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("roster_assignment_id", "brand_id", "process_id", name="uq_roster_assign_proc"),
    )

    # Relationships
    roster_assignment = relationship("RosterAssignment", back_populates="processes")
    brand = relationship("Brand", back_populates="roster_assignment_processes")
    process = relationship("Process", back_populates="roster_assignment_processes")

    def __repr__(self) -> str:
        return (
            f"<RosterAssignmentProcess(id={self.id}, assignment={self.roster_assignment_id}, "
            f"brand={self.brand_id}, process={self.process_id}, hours={self.allocated_hours})>"
        )
