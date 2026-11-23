from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Pod(Base):
    __tablename__ = "pods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    lead_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL", name="fk_pods_lead_id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    lead = relationship(
        "Employee",
        foreign_keys=[lead_id],
        back_populates="led_pod",
        post_update=True
    )
    members = relationship(
        "Employee",
        foreign_keys="Employee.pod_id",
        back_populates="pod"
    )

    def __repr__(self) -> str:
        return f"<Pod(id={self.id}, code='{self.code}', name='{self.name}', lead_id={self.lead_id})>"
