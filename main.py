from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import database
from database import get_db, Pet, Event
import agent
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, timedelta

app = FastAPI()

# Create tables
database.init_db()

# Models for API
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

# API Endpoints
@app.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        content, history = agent.chat_with_agent(db, request.message, request.history)
        return {"content": content, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pets", response_model=List[PetSchema])
async def get_pets(db: Session = Depends(get_db)):
    return db.query(Pet).all()

@app.get("/api/pets/{pet_id}", response_model=PetSchema)
async def get_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet

class PetUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    age: Optional[int] = None
    medical_info: Optional[str] = None

@app.put("/api/pets/{pet_id}", response_model=PetSchema)
async def update_pet(pet_id: int, pet_update: PetUpdate, db: Session = Depends(get_db)):
    db_pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    update_data = pet_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_pet, key, value)
    
    db.commit()
    db.refresh(db_pet)
    return db_pet

@app.delete("/api/pets/{pet_id}")
async def delete_pet(pet_id: int, db: Session = Depends(get_db)):
    db_pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    db.delete(db_pet)
    db.commit()
    return {"message": "Pet deleted successfully"}

@app.get("/api/pets/{pet_id}/events", response_model=List[EventSchema])
async def get_pet_events(pet_id: int, db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.pet_id == pet_id).all()
    # Format date as string
    for e in events:
        e.date = e.date.strftime("%Y-%m-%d")
    return events

@app.get("/api/dashboard")
async def dashboard(db: Session = Depends(get_db)):
    # Notifications for the next 7 days
    today = datetime.now().date()
    next_week = today + timedelta(days=7)
    
    notifications = db.query(Event).filter(Event.date >= today, Event.date <= next_week).all()
    
    res = []
    for n in notifications:
        pet = db.query(Pet).filter(Pet.id == n.pet_id).first()
        res.append({
            "pet_name": pet.name if pet else "Desconocido",
            "type": n.type,
            "date": n.date.strftime("%Y-%m-%d"),
            "notes": n.notes
        })
    return res

# Mounting static files after API routes to avoid conflicts
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
