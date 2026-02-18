# Especificaciones Técnicas: PetCare Agent (MVP Actual)

Este documento detalla la arquitectura, herramientas y lógica del sistema tal como está implementado en esta versión funcional.

## 1. Stack Tecnológico Actual
| Capa                   | Tecnología                               |
| :--------------------- | :--------------------------------------- |
| **Backend**            | FastAPI (Python 3.10+)                   |
| **IA / Agente**        | OpenAI GPT-4o (Function Calling)         |
| **Base de Datos**      | SQLite con SQLAlchemy (ORM)              |
| **Frontend**           | HTML5, Tailwind CSS, Vanilla JavaScript  |
| **Persistencia local** | LocalStorage (para el historial de chat) |

## 2. Modelo de Datos
- **Mascotas (`pets`)**: `id`, `name`, `breed`, `age`, `medical_info`.
- **Eventos (`events`)**: `id`, `pet_id` (FK), `type`, `date`, `notes`.
- **Relación**: 1 Mascota -> N Eventos (Borrado en cascada habilitado).

## 3. Capacidades del Agente (Tools)
El agente tiene acceso a las siguientes funciones registradas en `src/agent.py`:
- `register_pet`: Guarda una nueva mascota.
- `register_event`: Asocia una vacuna, limpieza o cualquier actividad a una mascota por su nombre.

## 4. Prompt del Sistema (Actual)
Este es el prompt exacto que recibe el asistente en cada interacción:

```text
Eres un asistente virtual experto en el cuidado de mascotas exclusivo para la plataforma PetCare. 
Tu objetivo es ayudar al usuario a registrar sus mascotas y gestionar sus eventos de salud (vacunas, baños, etc.).

{db_summary}

REGLAS DE COMPORTAMIENTO:
1. Cuando el usuario quiera registrar una mascota, pide nombre, raza, edad e info médica.
2. Cuando el usuario quiera registrar un evento, pide mascota, tipo de evento y fecha.
3. IMPORTANTE: El resumen de la DB es interno. No lo listes todo al inicio si no te lo piden.
4. RESTRICCIÓN DE ALCANCE: Eres un asistente especializado en mascotas. NO respondas preguntas sobre temas ajenos (cocina, política, deportes, programación general, etc.). Si el usuario pregunta algo fuera de este contexto, declina amablemente explicando que solo puedes ayudar con temas relacionados a mascotas y el uso de PetCare.

La fecha actual es {current_date}.
```

## 5. Lógica de Persistencia y Contexto
- **Resumen de DB**: Antes de cada mensaje, el backend consulta la base de datos y genera una cadena de texto con el estado actual de todas las mascotas y eventos (`db_summary`) que se inyecta en el prompt.
- **Historial**: El frontend envía el array completo de `chat_history`. El backend lo procesa para que la IA mantenga la coherencia del diálogo.

## 6. Funcionalidades de Gestión (UI)
- **Historial de Chat**: Persistente entre recargas de página.
- **Botón Limpiar**: Vacía el historial local.
- **Edición/Eliminación**: CRUD completo desde la pestaña de "Mis Mascotas".
- **Dashboard**: Vista de próximos eventos (rango de 7 días).
