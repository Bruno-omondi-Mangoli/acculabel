from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
import csv
from io import StringIO
from datetime import datetime
from app.db.session import get_db
from app.models.image import Image
from app.models.annotation import Annotation
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/coco/{image_id}")
def export_as_coco(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    image = db.query(Image).filter(Image.id == image_id, Image.uploaded_by == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    annotations = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    
    coco_format = {
        "info": {
            "description": "Exported from Annotation Platform",
            "version": "1.0",
            "year": 2024,
            "contributor": current_user.email,
            "date_created": str(datetime.utcnow())
        },
        "images": [{
            "id": image.id,
            "file_name": image.original_filename,
            "width": image.width,
            "height": image.height
        }],
        "annotations": [],
        "categories": []
    }
    
    categories = {}
    cat_id = 1
    for ann in annotations:
        if ann.label not in categories:
            categories[ann.label] = cat_id
            coco_format["categories"].append({
                "id": cat_id,
                "name": ann.label,
                "supercategory": "object"
            })
            cat_id += 1
        
        coco_format["annotations"].append({
            "id": ann.id,
            "image_id": image.id,
            "category_id": categories[ann.label],
            "bbox": [ann.x, ann.y, ann.width, ann.height],
            "area": ann.width * ann.height,
            "iscrowd": 0
        })
    
    return JSONResponse(content=coco_format)

@router.get("/yolo/{image_id}")
def export_as_yolo(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    image = db.query(Image).filter(Image.id == image_id, Image.uploaded_by == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    annotations = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    
    labels = {}
    for idx, label in enumerate(set(a.label for a in annotations)):
        labels[label] = idx
    
    yolo_lines = []
    for ann in annotations:
        x_center = (ann.x + ann.width/2) / image.width
        y_center = (ann.y + ann.height/2) / image.height
        width_norm = ann.width / image.width
        height_norm = ann.height / image.height
        
        yolo_lines.append(f"{labels[ann.label]} {x_center:.6f} {y_center:.6f} {width_norm:.6f} {height_norm:.6f}")
    
    return Response(
        content="\n".join(yolo_lines),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=annotations_{image_id}.txt"}
    )

@router.get("/csv/{image_id}")
def export_as_csv(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    image = db.query(Image).filter(Image.id == image_id, Image.uploaded_by == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    annotations = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "label", "x", "y", "width", "height", "type", "created_at"])
    
    for ann in annotations:
        writer.writerow([ann.id, ann.label, ann.x, ann.y, ann.width, ann.height, ann.type, ann.created_at])
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=annotations_{image_id}.csv"}
    )