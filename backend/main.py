"""
AI Avatar Backend API
FastAPI server for text-to-speech, AI responses, and viseme generation
"""

import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List

from config import Config
from tts_service import generate_speech
from viseme_generator import text_to_visemes, get_viseme_list
from ai_service import get_ai_provider

# Create FastAPI app
app = FastAPI(
    title="AI Avatar Backend",
    description="Backend API for AI avatar with lip-sync and text-to-speech",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create static directory for audio files
static_dir = Path(Config.AUDIO_OUTPUT_DIR)
static_dir.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# Request/Response Models
class ChatRequest(BaseModel):
    text: str
    generate_speech: bool = True


class ChatResponse(BaseModel):
    text: str
    response: str
    audio_url: Optional[str] = None
    visemes: Optional[List[dict]] = None
    duration: Optional[float] = None


class TTSRequest(BaseModel):
    text: str


class TTSResponse(BaseModel):
    audio_url: str
    visemes: List[dict]
    duration: float


class HealthResponse(BaseModel):
    status: str
    ai_provider: str
    tts_voice: str


# API Endpoints
@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        ai_provider=Config.AI_PROVIDER,
        tts_voice=Config.TTS_VOICE
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint.
    1. Receives user text
    2. Generates AI response
    3. Converts response to speech
    4. Generates viseme data for lip-sync
    """
    try:
        # Get AI provider and generate response
        ai_provider = get_ai_provider()
        ai_response = await ai_provider.generate_response(request.text)
        
        response_data = {
            "text": request.text,
            "response": ai_response,
        }
        
        if request.generate_speech:
            # Generate speech from AI response
            speech_result = await generate_speech(ai_response)
            
            # Generate viseme data
            visemes = text_to_visemes(ai_response, speech_result["duration"])
            
            response_data.update({
                "audio_url": speech_result["audio_url"],
                "visemes": visemes,
                "duration": speech_result["duration"]
            })
        
        return ChatResponse(**response_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/text-to-speech", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech and generate viseme data.
    """
    try:
        # Generate speech
        speech_result = await generate_speech(request.text)
        
        # Generate viseme data
        visemes = text_to_visemes(request.text, speech_result["duration"])
        
        return TTSResponse(
            audio_url=speech_result["audio_url"],
            visemes=visemes,
            duration=speech_result["duration"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/visemes")
async def get_visemes():
    """Get list of all viseme codes."""
    return {"visemes": get_viseme_list()}


@app.get("/api/config")
async def get_config():
    """Get current configuration."""
    return {
        "ai_provider": Config.AI_PROVIDER,
        "tts_voice": Config.TTS_VOICE,
        "available_visemes": get_viseme_list()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
