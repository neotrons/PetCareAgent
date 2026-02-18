import os
import json
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from .database import Pet, Event

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_db_summary(db: Session):
    pets = db.query(Pet).all()
    if not pets:
        return "No hay mascotas registradas actualmente."
    
    summary = "AQUÍ TIENES LA INFORMACIÓN ACTUAL DE LA BASE DE DATOS:\n"
    summary += "Mascotas registradas:\n"
    for pet in pets:
        summary += f"- {pet.name} ({pet.breed}, {pet.age} años)"
        if pet.medical_info:
            summary += f": {pet.medical_info}"
        
        events = pet.events
        if events:
            summary += "\n  Eventos registrados:\n"
            for e in events:
                summary += f"    * {e.type} el {e.date}"
                if e.notes: summary += f" ({e.notes})"
                summary += "\n"
        summary += "\n"
    return summary

def register_pet(db: Session, name: str, breed: str, age: int, medical_info: str = None):
    pet = Pet(name=name, breed=breed, age=age, medical_info=medical_info)
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return {"status": "success", "pet_id": pet.id, "name": pet.name}

def register_event(db: Session, pet_name: str, type: str, date_str: str, notes: str = None):
    # Find pet by name (simplified for demo, in production we'd use ID or selection)
    pet = db.query(Pet).filter(Pet.name.ilike(pet_name)).first()
    if not pet:
        return {"status": "error", "message": f"Pet named '{pet_name}' not found."}
    
    try:
        event_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return {"status": "error", "message": "Invalid date format. Please use YYYY-MM-DD."}

    event = Event(pet_id=pet.id, type=type, date=event_date, notes=notes)
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"status": "success", "event_id": event.id, "type": event.type}

tools = [
    {
        "type": "function",
        "function": {
            "name": "register_pet",
            "description": "Registra una nueva mascota con su nombre, raza, edad e información médica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nombre de la mascota"},
                    "breed": {"type": "string", "description": "Raza de la mascota"},
                    "age": {"type": "integer", "description": "Edad de la mascota en años"},
                    "medical_info": {"type": "string", "description": "Cualquier dato relevante de enfermedad o salud"}
                },
                "required": ["name", "breed", "age"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "register_event",
            "description": "Registra un evento médico o de cuidado para una mascota específica (vacunas, desparasitación, baño, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "pet_name": {"type": "string", "description": "Nombre de la mascota a la que se le asigna el evento"},
                    "type": {"type": "string", "description": "Tipo de evento (ej: vacuna, desparasitación, baño)"},
                    "date_str": {"type": "string", "description": "Fecha del evento en formato YYYY-MM-DD"},
                    "notes": {"type": "string", "description": "Notas adicionales sobre el evento"}
                },
                "required": ["pet_name", "type", "date_str"]
            }
        }
    }
]

SYSTEM_PROMPT = """Eres un asistente virtual experto en el cuidado de mascotas exclusivo para la plataforma PetCare. 
Tu objetivo es ayudar al usuario a registrar sus mascotas y gestionar sus eventos de salud (vacunas, baños, etc.).

{db_summary}

REGLAS DE COMPORTAMIENTO:
1. Cuando el usuario quiera registrar una mascota, pide nombre, raza, edad e info médica.
2. Cuando el usuario quiera registrar un evento, pide mascota, tipo de evento y fecha.
3. IMPORTANTE: El resumen de la DB es interno. No lo listes todo al inicio si no te lo piden.
4. RESTRICCIÓN DE ALCANCE: Eres un asistente especializado en mascotas. NO respondas preguntas sobre temas ajenos (cocina, política, deportes, programación general, etc.). Si el usuario pregunta algo fuera de este contexto, declina amablemente explicando que solo puedes ayudar con temas relacionados a mascotas y el uso de PetCare.

La fecha actual es {current_date}.
"""

def chat_with_agent(db: Session, user_message: str, chat_history: list):
    current_date = datetime.now().strftime("%Y-%m-%d")
    db_summary = get_db_summary(db)
    messages = [{"role": "system", "content": SYSTEM_PROMPT.format(db_summary=db_summary, current_date=current_date)}]
    messages.extend(chat_history)
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="gpt-4o", # O el modelo que prefieras
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )

    response_message = response.choices[0].message
    tool_calls = response_message.tool_calls

    if tool_calls:
        messages.append(response_message)
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            if function_name == "register_pet":
                result = register_pet(db, **function_args)
            elif function_name == "register_event":
                result = register_event(db, **function_args)
            
            messages.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": function_name,
                "content": json.dumps(result)
            })
        
        # Second call to get final response
        final_response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )
        final_message = final_response.choices[0].message
        messages.append(final_message)
        return final_message.content, messages[1:] # Return content and updated history
    
    messages.append(response_message)
    return response_message.content, messages[1:]
