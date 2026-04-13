from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class AnnotationCreate(BaseModel):
    image_id: int
    type: str = "rectangle"
    label: str
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    depth: Optional[float] = None
    points: Optional[List[dict]] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    comparison_winner: Optional[str] = None
    comparison_image_url: Optional[str] = None

class AnnotationUpdate(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    reviewed: Optional[bool] = None
    quality_score: Optional[float] = None

class AnnotationResponse(BaseModel):
    id: int
    image_id: int
    user_id: int
    type: str
    label: str
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    depth: Optional[float] = None
    points: Optional[List[dict]] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    comparison_winner: Optional[str] = None
    reviewed: bool
    quality_score: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True