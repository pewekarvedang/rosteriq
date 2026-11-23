from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Date, Time, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class AvailabilityType(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    LEAVE = "LEAVE"
    COMP_OFF = "COMP_OFF"
    UNAVAILABLE = "UNAVAILABLE"
    WEEKLY_OFF = "WEEKLY_OFF"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class EmployeeAvailability(Base):
    __tablename__ = "employee_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE", name="fk_eavail_employee_id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)

    availability_type = Column(
        SQLEnum(AvailabilityType, name="availability_type_enum", native_enum=False),
        nullable=False,
        default=AvailabilityType.AVAILABLE
    )
    leave_type = Column(String(50), nullable=True)  # e.g., "PLANNED_LEAVE", "SICK_LEAVE", "COMP_OFF"
    status = Column(
        SQLEnum(ApprovalStatus, name="approval_status_enum", native_enum=False),
        nullable=False,
        default=ApprovalStatus.APPROVED
    )
    reason = Column(Text, nullable=True)
    is_full_day = Column(Boolean, default=True, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_employee_availability_date"),
    )

    # Relationships
    employee = relationship("Employee", back_populates="availabilities")

    def __repr__(self) -> str:
        return f"<EmployeeAvailability(id={self.id}, employee_id={self.employee_id}, date={self.date}, type='{self.availability_type}')>"
