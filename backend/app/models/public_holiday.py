from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, Text, Boolean, DateTime
from app.database import Base


class PublicHoliday(Base):
    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_optional = Column(Boolean, default=False, nullable=False)
    applicable_region = Column(String(50), default="ALL", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<PublicHoliday(id={self.id}, name='{self.name}', date={self.date})>"
