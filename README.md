# PetCare Agent - MVP Asistente Virtual para Mascotas 🐾

PetCare Agent es un MVP de asistente conversacional inteligente diseñado para ayudar a los dueños de mascotas a gestionar la salud y el bienestar de sus compañeros. Permite registrar mascotas, perfiles médicos y eventos importantes (vacunas, baños, etc.) a través de una interfaz de chat intuitiva y un dashboard visual.
Es un proyecto simple que integra la API de OpenAI e interactura con servicio de python que permite registrar en BD y presentar datos.

## 🚀 Características

- **Chat Inteligente**: Registra datos de forma natural hablando con la IA.
- **Gestión de Mascotas**: Alta, edición y eliminación (CRUD completo).
- **Dashboard de Recordatorios**: Vista de eventos programados para los próximos 7 días.
- **Historial Persistente**: Conversaciones guardadas localmente en el navegador.
- **Contexto Silencioso**: La IA conoce a tus mascotas pero solo habla de ellas cuando es relevante.

## 📸 Vista Previa

### Asistente Virtual
![Chat View](static/images/chat_view.png)

### Gestión de Mascotas
![Pets View](static/images/pets_view.png)

### Recordatorios Automáticos
![Reminders View](static/images/reminders_view.png)

## 🛠️ Requisitos previos

- Python 3.10 o superior.
- Una cuenta de OpenAI y una API Key activa.

## ⚙️ Configuración

1. **Clonar o descargar el proyecto** en tu carpeta local.
2. **Crear el archivo de entorno**:
   - Renombra el archivo `.example.env` a `.env`.
   - Abre `.env` y coloca tu API Key de OpenAI:
     ```env
     OPENAI_API_KEY=tu_clave_aqui
     ```
3. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

## 🏃 Cómo ejecutar

Para iniciar el servidor, ejecuta el siguiente comando:

```bash
python main.py
```

El servidor se iniciará en `http://localhost:8000`. Abre esa dirección en tu navegador para empezar.

## 📁 Estructura del Proyecto

- `main.py`: Punto de entrada del servidor FastAPI y definición de la API.
- `agent.py`: Lógica del agente de IA y definición de herramientas (function calling).
- `database.py`: Configuración de SQLite y modelos de SQLAlchemy.
- `static/`: Contiene el frontend (HTML, CSS modular y JavaScript).
- `agent-especificaciones.md`: Documentación técnica detallada del MVP.

---
> [!IMPORTANT]
> El archivo de base de datos `pets.db` se crea automáticamente al ejecutar el proyecto por primera vez.
