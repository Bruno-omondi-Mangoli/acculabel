from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.session import engine, Base
from app.routes import auth, images, annotations, password_reset, admin
from app.routes import ai_annotation, export, video, pointcloud
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Data Annotation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
       "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",

         "https://acculabel.vercel.app", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(images.router)
app.include_router(annotations.router)
app.include_router(password_reset.router)
app.include_router(admin.router)
app.include_router(ai_annotation.router)
app.include_router(export.router)
app.include_router(video.router)
app.include_router(pointcloud.router)

@app.get("/")
def root():
    return {"message": "API is running"}