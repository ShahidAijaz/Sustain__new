from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from uuid import uuid4
import time
import jwt
import re

from app.database import get_db
from app.models import User

# =========================
# ROUTER
# =========================
router = APIRouter(prefix="/auth", tags=["auth"])

# =========================
# CONFIG
# =========================
SECRET = "dev-secret-key"          # ⚠️ move to env in prod
TOKEN_EXPIRY = 3600                # 1 hour
MAGIC_LINK_EXPIRY = 300            # 5 minutes

# =========================
# IN-MEMORY MAGIC LINKS (DEV ONLY)
# =========================
MAGIC_LINKS = {}

# =========================
# EMAIL VALIDATION
# =========================
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)

# =========================
# SEND MAGIC LINK
# =========================


@router.post("/magic-link")
def send_magic_link(payload: dict):
    email = payload.get("email")

    # ✅ BLOCK INVALID EMAILS
    if not email or not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address"
        )

    token = str(uuid4())

    MAGIC_LINKS[token] = {
        "email": email,
        "expires": time.time() + MAGIC_LINK_EXPIRY,
    }

    magic_link = f"http://localhost:3000/verify?token={token}"
    print("🔐 MAGIC LINK:", magic_link)

    # 🔥 FORCE JSON RESPONSE (FIXES EMPTY RESPONSE BUG)
    return JSONResponse(
        status_code=200,
        content={"magic_link": magic_link},
    )

# =========================
# VERIFY MAGIC LINK
# =========================


@router.post("/verify")
def verify_magic_link(payload: dict, db: Session = Depends(get_db)):
    token = payload.get("token")

    if not token:
        raise HTTPException(status_code=400, detail="Token missing")

    record = MAGIC_LINKS.get(token)

    if not record or record["expires"] < time.time():
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = record["email"]

    # GET OR CREATE USER
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)

    # ISSUE JWT
    jwt_token = jwt.encode(
        {
            "user_id": user.id,
            "email": user.email,
            "iat": int(time.time()),
            "exp": int(time.time()) + TOKEN_EXPIRY,
        },
        SECRET,
        algorithm="HS256",
    )

    MAGIC_LINKS.pop(token, None)

    return JSONResponse(
        status_code=200,
        content={"token": jwt_token},
    )

# =========================
# VERIFY SESSION (USED ON REFRESH)
# =========================


@router.get("/me")
def get_me(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return JSONResponse(
        status_code=200,
        content={
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active,
        },
    )
