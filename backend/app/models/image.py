from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class Image(Base):
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String(255))
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())