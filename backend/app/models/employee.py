from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    phone = Column(String(30), nullable=True)
    pod_id = Column(Integer, ForeignKey("pods.id", ondelete="SET NULL", name="fk_employees_pod_id"), nullable=True, index=True)

    # Configurable workload limits
    max_weekly_hours = Column(Float, default=40.0, nullable=False)
    max_daily_hours = Column(Float, default=8.0, nullable=False)
    max_consecutive_days = Column(Integer, default=6, nullable=False)
    default_weekly_off_days = Column(String(50), default="6", nullable=False)  # 0=Monday, ..., 6=Sunday

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    pod = relationship(
        "Pod",
        foreign_keys=[pod_id],
        back_populates="members"
    )
    led_pod = relationship(
        "Pod",
        foreign_keys="Pod.lead_id",
        back_populates="lead",
        uselist=False
    )
    assignments = relationship(
        "EmployeeAssignment",
        back_populates="employee",
        cascade="all, delete-orphan"
    )
    availabilities = relationship(
        "EmployeeAvailability",
        back_populates="employee",
        cascade="all, delete-orphan"
    )
    roster_assignments = relationship(
        "RosterAssignment",
        back_populates="employee",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Employee(id={self.id}, code='{self.employee_code}', name='{self.full_name}')>"
