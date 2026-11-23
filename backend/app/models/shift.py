from datetime import datetime
from sqlalchemy import Column, Integer, String, Time, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration_hours = Column(Float, default=8.0, nullable=False)
    is_overnight = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    roster_assignments = relationship("RosterAssignment", back_populates="shift")

    def __repr__(self) -> str:
        return f"<Shift(id={self.id}, code='{self.code}', {self.start_time}-{self.end_time})>"
