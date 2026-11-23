from datetime import datetime
from sqlalchemy import Column, Integer, Date, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class EmployeeAssignment(Base):
    __tablename__ = "employee_assignments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE", name="fk_ea_employee_id"), nullable=False, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE", name="fk_ea_brand_id"), nullable=False, index=True)
    process_id = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE", name="fk_ea_process_id"), nullable=True, index=True)
    brand_process_id = Column(Integer, ForeignKey("brand_processes.id", ondelete="SET NULL", name="fk_ea_brand_process_id"), nullable=True, index=True)

    # Date range support (business rule: must support start and end dates)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True, index=True)

    is_primary = Column(Boolean, default=True, nullable=False)
    allocation_percentage = Column(Float, default=100.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="assignments")
    brand = relationship("Brand", back_populates="assignments")
    process = relationship("Process", back_populates="assignments")
    brand_process = relationship("BrandProcess", back_populates="assignments")

    def __repr__(self) -> str:
        return (
            f"<EmployeeAssignment(id={self.id}, employee_id={self.employee_id}, "
            f"brand_id={self.brand_id}, process_id={self.process_id}, start={self.start_date}, end={self.end_date})>"
        )
