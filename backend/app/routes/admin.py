from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.user import User
from app.models.image import Image
from app.models.annotation import Annotation
from app.routes.auth import get_current_user
from app.schemas.user_schema import UserResponse, UserUpdate
from typing import List

router = APIRouter(prefix="/admin", tags=["Admin"])

def check_admin(current_user: User):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    users = db.query(User).all()
    return users

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.role:
        user.role = user_update.role
    
    db.commit()
    return {"message": f"User {user.email} role updated to {user.role}"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": f"User {user.email} deleted"}

@router.get("/analytics")
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    
    # Count total users
    total_users = db.query(User).count()
    print(f"Total users: {total_users}")
    
    # Count total images
    total_images = db.query(Image).count()
    print(f"Total images: {total_images}")
    
    # Count total annotations
    total_annotations = db.query(Annotation).count()
    print(f"Total annotations: {total_annotations}")
    
    # Count reviewed annotations
    reviewed_annotations = db.query(Annotation).filter(Annotation.reviewed == True).count()
    print(f"Reviewed annotations: {reviewed_annotations}")
    
    # Calculate average quality score
    avg_quality_result = db.query(func.avg(Annotation.quality_score)).scalar()
    avg_quality = float(avg_quality_result) if avg_quality_result else 0
    print(f"Average quality: {avg_quality}")
    
    # Annotations per user with proper join
    annotations_per_user = db.query(
        User.email,
        func.count(Annotation.id).label('count')
    ).outerjoin(Annotation, User.id == Annotation.user_id).group_by(User.id, User.email).all()
    
    print(f"Annotations per user: {annotations_per_user}")
    
    return {
        "total_users": total_users,
        "total_images": total_images,
        "total_annotations": total_annotations,
        "reviewed_annotations": reviewed_annotations,
        "average_quality_score": round(avg_quality * 100, 2),
        "annotations_per_user": [
            {"email": u.email, "count": u.count} for u in annotations_per_user
        ]
    }