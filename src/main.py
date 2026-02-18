import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from . import database
from .api import router as api_router

app = FastAPI(title="PetCare API MVP")

# Initialize database
database.init_db()

# Include API routes
app.include_router(api_router)

# Serve static files
# Since main.py is in src/, static/ is one level up
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
