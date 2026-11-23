from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class OperatingCalendarRule(str, enum.Enum):
    EVERYDAY = "EVERYDAY"
    EXCEPT_PUBLIC_HOLIDAYS = "EXCEPT_PUBLIC_HOLIDAYS"
    EXCEPT_SUNDAYS_AND_HOLIDAYS = "EXCEPT_SUNDAYS_AND_HOLIDAYS"
    CUSTOM = "CUSTOM"


class BrandProcess(Base):
    __tablename__ = "brand_processes"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE", name="fk_bp_brand_id"), nullable=False, index=True)
    process_id = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE", name="fk_bp_process_id"), nullable=False, index=True)

    # Operating Calendar Rules (Task 3)
    operating_calendar = Column(
        SQLEnum(OperatingCalendarRule, name="operating_calendar_rule_enum", native_enum=False),
        default=OperatingCalendarRule.EVERYDAY,
        nullable=False
    )
    # Comma-separated or JSON list of active weekdays for CUSTOM (e.g., "0,1,2,3,4" for Monday-Friday)
    custom_operating_days = Column(String(50), nullable=True, default="0,1,2,3,4")

    # Staffing requirements
    min_headcount_per_shift = Column(Integer, default=1, nullable=False)
    requires_24_7 = Column(Boolean, default=False, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("brand_id", "process_id", name="uq_brand_process"),
    )

    # Relationships
    brand = relationship("Brand", back_populates="brand_processes")
    process = relationship("Process", back_populates="brand_processes")
    assignments = relationship("EmployeeAssignment", back_populates="brand_process", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<BrandProcess(id={self.id}, brand_id={self.brand_id}, process_id={self.process_id}, calendar='{self.operating_calendar}')>"
