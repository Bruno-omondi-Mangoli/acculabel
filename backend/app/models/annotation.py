from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON, Boolean
from sqlalchemy.sql import func
from app.db.session import Base

class Annotation(Base):
    __tablename__ = "annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    type = Column(String(50), default="rectangle")
    label = Column(String(100), nullable=False)
    
    # Rectangle/Cuboid coordinates
    x = Column(Float, nullable=True)
    y = Column(Float, nullable=True)
    width = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    depth = Column(Float, nullable=True)
    
    # Polygon/Polyline points
    points = Column(JSON, nullable=True)
    
    # Sentiment
    sentiment = Column(String(50), nullable=True)
    sentiment_score = Column(Float, nullable=True)
    
    # Comparison
    comparison_winner = Column(String(50), nullable=True)
    comparison_image_url = Column(String(500), nullable=True)
    
    # Review workflow
    reviewed = Column(Boolean, default=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    quality_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())