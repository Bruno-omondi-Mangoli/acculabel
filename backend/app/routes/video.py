from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil
from app.db.session import get_db
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/video", tags=["Video Annotation"])

UPLOAD_DIR = "video_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    safe_filename = f"{current_user.id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "message": "Video uploaded successfully",
        "filename": safe_filename
    }

@router.get("/frames/{video_id}")
async def get_video_frames(
    video_id: str,
    current_user: User = Depends(get_current_user)
):
    return {"frames": [], "frame_count": 0}