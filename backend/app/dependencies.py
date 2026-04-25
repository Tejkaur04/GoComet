import fastapi
from fastapi import Header, HTTPException
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    id: str
    role: str

async def get_current_user(x_user_role: Optional[str] = Header(None), x_user_id: Optional[str] = Header(None)) -> User:
    if not x_user_role or not x_user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-Role or X-User-Id headers")
    if x_user_role not in ["BUYER", "SUPPLIER"]:
        raise HTTPException(status_code=403, detail="Invalid role")
    return User(id=x_user_id, role=x_user_role)

async def require_buyer(user: User = fastapi.Depends(get_current_user)) -> User:
    if user.role != "BUYER":
        raise HTTPException(status_code=403, detail="Only buyers can perform this action")
    return user

async def require_supplier(user: User = fastapi.Depends(get_current_user)) -> User:
    if user.role != "SUPPLIER":
        raise HTTPException(status_code=403, detail="Only suppliers can perform this action")
    return user
