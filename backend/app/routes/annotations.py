from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.models.annotation import Annotation
from app.models.image import Image
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.annotation_schema import AnnotationCreate, AnnotationUpdate, AnnotationResponse

router = APIRouter(prefix="/annotations", tags=["Annotations"])

@router.post("/", response_model=AnnotationResponse)
def create_annotation(
    annotation: AnnotationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    image = db.query(Image).filter(
        Image.id == annotation.image_id,
        Image.uploaded_by == current_user.id
    ).first()
    if not image:
        raise HTTPException(status_code=403, detail="You don't own this image")
    
    new_annotation = Annotation(
        image_id=annotation.image_id,
        user_id=current_user.id,
        type=annotation.type,
        label=annotation.label,
        x=annotation.x,
        y=annotation.y,
        width=annotation.width,
        height=annotation.height,
        depth=annotation.depth,
        points=annotation.points,
        sentiment=annotation.sentiment,
        sentiment_score=annotation.sentiment_score,
        comparison_winner=annotation.comparison_winner,
        comparison_image_url=annotation.comparison_image_url
    )
    db.add(new_annotation)
    db.commit()
    db.refresh(new_annotation)
    return new_annotation

@router.put("/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: int,
    annotation_update: AnnotationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    image = db.query(Image).filter(Image.id == annotation.image_id).first()
    if image.uploaded_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in annotation_update.dict(exclude_unset=True).items():
        setattr(annotation, key, value)
    
    db.commit()
    db.refresh(annotation)
    return annotation

@router.get("/image/{image_id}")
def get_annotations_for_image(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    image = db.query(Image).filter(Image.id == image_id).first()
    if image.uploaded_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return db.query(Annotation).filter(Annotation.image_id == image_id).all()

@router.delete("/{annotation_id}")
def delete_annotation(
    annotation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    image = db.query(Image).filter(Image.id == annotation.image_id).first()
    if image.uploaded_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(annotation)
    db.commit()
    return {"message": "Annotation deleted"}

@router.post("/{annotation_id}/review")
def review_annotation(
    annotation_id: int,
    review_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    annotation.reviewed = True
    annotation.reviewed_by = current_user.id
    annotation.reviewed_at = datetime.utcnow()
    annotation.quality_score = review_data.get("quality_score", 0.5)
    
    db.commit()
    return {"message": "Annotation reviewed", "quality_score": annotation.quality_score}

@router.post("/submit-review/{image_id}")
def submit_for_review(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    image = db.query(Image).filter(Image.id == image_id, Image.uploaded_by == current_user.id).first()
    if not image:
        raise HTTPException(status_code=403, detail="You don't own this image")
    
    annotations = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    
    if not annotations:
        raise HTTPException(status_code=400, detail="No annotations to review")
    
    for ann in annotations:
        ann.reviewed = False
    
    db.commit()
    
    return {
        "message": f"Submitted {len(annotations)} annotations for review",
        "image_id": image_id,
        "annotation_count": len(annotations)
    }