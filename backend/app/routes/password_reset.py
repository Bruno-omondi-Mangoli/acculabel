from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
from app.db.session import get_db
from app.models.user import User
from app.models.password_reset import PasswordReset
from app.schemas.user_schema import PasswordResetRequest, PasswordResetConfirm
from passlib.context import CryptContext

router = APIRouter(prefix="/password-reset", tags=["Password Reset"])
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def send_reset_email(email: str, token: str):
    reset_link = f"http://localhost:5173/reset-password?token={token}"
    print(f"\n=== PASSWORD RESET ===\nEmail: {email}\nLink: {reset_link}\n=====================\n")
    return True

@router.post("/request")
def request_password_reset(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        return {"message": "If email exists, reset link will be sent"}
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    reset = PasswordReset(user_id=user.id, token=token, expires_at=expires_at)
    db.add(reset)
    db.commit()
    
    background_tasks.add_task(send_reset_email, request.email, token)
    return {"message": "If email exists, reset link will be sent"}

@router.post("/confirm")
def confirm_password_reset(
    confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    reset = db.query(PasswordReset).filter(
        PasswordReset.token == confirm.token,
        PasswordReset.used == False,
        PasswordReset.expires_at > datetime.utcnow()
    ).first()
    
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user = db.query(User).filter(User.id == reset.user_id).first()
    user.password_hash = pwd_context.hash(confirm.new_password)
    reset.used = True
    db.commit()
    
    return {"message": "Password reset successful"}