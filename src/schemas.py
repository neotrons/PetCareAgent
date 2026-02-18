from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str
    history: List[dict]

class PetSchema(BaseModel):
    id: int
    name: str
    breed: str
    age: int
    medical_info: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class EventSchema(BaseModel):
    id: int
    pet_id: int
    type: str
    date: str
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PetUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    age: Optional[int] = None
    medical_info: Optional[str] = None
