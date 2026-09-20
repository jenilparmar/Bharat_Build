from pydantic import BaseModel
from typing import Optional

class GoogleToken(BaseModel):
    token: str

class Note(BaseModel):
    user_id: str
    subject: Optional[str] = None
    title: Optional[str] = None
    content: str
