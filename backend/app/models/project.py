from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Date
from sqlalchemy.sql import func
from app.db.session import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="active")  # active, completed, archived
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ProjectImage(Base):
    __tablename__ = "project_images"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="pending")  # pending, in_progress, completed, rejected
    completed_at = Column(DateTime(timezone=True), nullable=True)