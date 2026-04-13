from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from PIL import Image as PILImage
from app.db.session import get_db
from app.models.image import Image
from app.models.user import User
from app.routes.auth import get_current_user
import os
import shutil

router = APIRouter(prefix="/images", tags=["Images"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    safe_filename = f"{current_user.id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    img = PILImage.open(file_path)
    width, height = img.size
    
    image_url = f"/uploads/{safe_filename}"
    image = Image(
        url=image_url,
        uploaded_by=current_user.id,
        original_filename=file.filename,
        width=width,
        height=height
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    
    return {
        "id": image.id,
        "url": image_url,
        "width": width,
        "height": height
    }

@router.get("/")
def get_my_images(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Image).filter(Image.uploaded_by == current_user.id).all()

@router.get("/{image_id}")
def get_image(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    image = db.query(Image).filter(
        Image.id == image_id,
        Image.uploaded_by == current_user.id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image