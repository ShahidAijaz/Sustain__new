from pydantic import BaseModel, EmailStr
from typing import Optional, Dict


class EmailLogin(BaseModel):
    email: EmailStr


class RoomPlanOut(BaseModel):
    plan_data: Dict
