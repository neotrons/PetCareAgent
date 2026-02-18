from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from .database import get_db, Pet, Event, Config
from .schemas import ChatRequest, PetSchema, EventSchema, PetUpdate, SettingsResponse, KeyUpdate
from . import agent
import os

router = APIRouter()

@router.get("/api/settings", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    has_key = False
    source = "none"
    masked_key = None
    
    # Check ENV
    env_key = os.getenv("OPENAI_API_KEY")
    if env_key:
        has_key = True
        source = "env"
        masked_key = f"{env_key[:7]}...{env_key[-4:]}" if len(env_key) > 11 else "***"
    else:
        # Check DB
        config = db.query(Config).filter(Config.key == "openai_api_key").first()
        if config:
            has_key = True
            source = "db"
            db_key = config.value
            masked_key = f"{db_key[:7]}...{db_key[-4:]}" if len(db_key) > 11 else "***"
            
    return SettingsResponse(has_key=has_key, source=source, masked_key=masked_key)

@router.post("/api/settings/key")
async def update_key(data: KeyUpdate, db: Session = Depends(get_db)):
    config = db.query(Config).filter(Config.key == "openai_api_key").first()
    if config:
        config.value = data.openai_api_key
    else:
        config = Config(key="openai_api_key", value=data.openai_api_key)
        db.add(config)
    
    db.commit()
    return {"message": "API Key guardada correctamente"}

@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        content, history = agent.chat_with_agent(db, request.message, request.history)
        return {"content": content, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/pets", response_model=List[PetSchema])
async def get_pets(db: Session = Depends(get_db)):
    return db.query(Pet).all()

@router.get("/api/pets/{pet_id}", response_model=PetSchema)
async def get_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet

@router.put("/api/pets/{pet_id}", response_model=PetSchema)
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

@router.delete("/api/pets/{pet_id}")
async def delete_pet(pet_id: int, db: Session = Depends(get_db)):
    db_pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    db.delete(db_pet)
    db.commit()
    return {"message": "Pet deleted successfully"}

@router.get("/api/pets/{pet_id}/events", response_model=List[EventSchema])
async def get_pet_events(pet_id: int, db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.pet_id == pet_id).all()
    for e in events:
        e.date = e.date.strftime("%Y-%m-%d") if hasattr(e.date, 'strftime') else e.date
    return events

@router.get("/api/dashboard")
async def dashboard(db: Session = Depends(get_db)):
    today = datetime.now().date()
    next_week = today + timedelta(days=7)
    
    notifications = db.query(Event).filter(Event.date >= today, Event.date <= next_week).all()
    
    res = []
    for n in notifications:
        pet = db.query(Pet).filter(Pet.id == n.pet_id).first()
        res.append({
            "pet_name": pet.name if pet else "Desconocido",
            "type": n.type,
            "date": n.date.strftime("%Y-%m-%d") if hasattr(n.date, 'strftime') else n.date,
            "notes": n.notes
        })
    return res
