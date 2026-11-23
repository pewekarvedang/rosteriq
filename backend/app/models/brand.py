from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    client_name = Column(String(120), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    brand_processes = relationship(
        "BrandProcess",
        back_populates="brand",
        cascade="all, delete-orphan"
    )
    assignments = relationship(
        "EmployeeAssignment",
        back_populates="brand",
        cascade="all, delete-orphan"
    )
    roster_assignment_processes = relationship(
        "RosterAssignmentProcess",
        back_populates="brand"
    )

    def __repr__(self) -> str:
        return f"<Brand(id={self.id}, code='{self.code}', name='{self.name}')>"
