from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.image import Image
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/ai-annotation", tags=["AI Annotation"])

# Common object labels for AI suggestions
COMMON_LABELS = [
    "car", "person", "dog", "cat", "truck", "bus", "bicycle", "motorcycle",
    "bird", "horse", "sheep", "cow", "elephant", "bear", "backpack", "umbrella",
    "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "bottle",
    "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
    "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster",
    "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear"
]

@router.get("/suggest-labels/{image_id}")
async def suggest_labels(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI suggested labels based on common objects"""
    
    # Verify user owns the image
    image = db.query(Image).filter(Image.id == image_id, Image.uploaded_by == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Return random 10 common labels as suggestions
    import random
    suggestions = random.sample(COMMON_LABELS, 10)
    
    return {
        "suggested_labels": suggestions,
        "message": "AI suggestions based on common objects"
    }

@router.post("/auto-detect/{image_id}")
async def auto_detect_objects(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Auto-detect objects in image (simplified version)"""
    
    image = db.query(Image).filter(Image.id == image_id, Image.uploaded_by == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # For demo, return common objects that might be in the image
    # In production, integrate with a real AI model like YOLO or OpenAI Vision
    return {
        "message": "AI detection ready. For full AI integration, add your API key.",
        "detections": [],
        "suggested_labels": COMMON_LABELS[:15]
    }