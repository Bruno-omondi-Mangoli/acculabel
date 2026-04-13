from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
from app.db.session import get_db
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/pointcloud", tags=["3D Point Cloud"])

UPLOAD_DIR = "pointcloud_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_pointcloud(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    safe_filename = f"{current_user.id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {"message": "Point cloud uploaded", "filename": safe_filename}

@router.post("/3d-bounding-box")
async def create_3d_bounding_box(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    return {"message": "3D bounding box created", "annotation": data}