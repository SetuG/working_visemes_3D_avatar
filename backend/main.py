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
from sadtalker_service import get_sadtalker_service

# Create FastAPI app
app = FastAPI(
    title="AI Avatar Backend",
    description="Backend API for AI avatar with lip-sync and text-to-speech",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories
static_dir = Path(Config.AUDIO_OUTPUT_DIR)
static_dir.mkdir(parents=True, exist_ok=True)

# Images directory for avatar source images
images_dir = Path("images")
images_dir.mkdir(parents=True, exist_ok=True)

# Videos directory for downloaded avatar videos
videos_dir = Path("static/videos")
videos_dir.mkdir(parents=True, exist_ok=True)

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


class VideoGenerationRequest(BaseModel):
    text: str
    image_path: Optional[str] = None  # Path to source image, defaults to person_image.jpg
    still_mode: bool = True  # Less head motion, more natural for chat
    use_enhancer: bool = False  # GFPGAN face enhancement


class VideoGenerationResponse(BaseModel):
    text: str
    response: str
    video_url: Optional[str] = None
    video_base64: Optional[str] = None
    error: Optional[str] = None
    audio_url: Optional[str] = None


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


@app.post("/api/generate-video", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    """
    Generate a realistic talking head video.
    1. Receives user text
    2. Generates AI response
    3. Converts response to speech (audio file)
    4. Sends image + audio to SadTalker
    5. Returns video URL for playback
    """
    print(f"\n=== Video Generation Request ===")
    print(f"Text: {request.text}")
    print(f"Image path: {request.image_path}")
    
    try:
        # Get AI provider and generate response
        print("Generating AI response...")
        ai_provider = get_ai_provider()
        ai_response = await ai_provider.generate_response(request.text)
        print(f"AI response: {ai_response}")
        
        # Determine image path
        print("Checking for image...")
        if request.image_path:
            image_path = Path(request.image_path)
        else:
            # Default to person_image.jpg in images folder
            image_path = Path("images/person_image.jpg")
        
        print(f"Looking for image at: {image_path.absolute()}")
        
        if not image_path.exists():
            # Try alternate locations
            alt_paths = [
                Path("person_image.jpg"),
                Path("static/person_image.jpg"),
                Path("../person_image.jpg")
            ]
            for alt in alt_paths:
                print(f"Trying alternate: {alt.absolute()}")
                if alt.exists():
                    image_path = alt
                    break
            else:
                error_msg = f"Source image not found. Please place 'person_image.jpg' in the 'images' folder. Looked at: {image_path.absolute()}"
                print(f"ERROR: {error_msg}")
                return VideoGenerationResponse(
                    text=request.text,
                    response=ai_response,
                    error=error_msg
                )
        
        print(f"Image found at: {image_path.absolute()}")
        
        # Generate speech from AI response
        print("Generating speech...")
        speech_result = await generate_speech(ai_response)
        print(f"Speech generated: {speech_result['audio_url']}")
        
        # Get the actual file path of the generated audio
        # The audio_url is like "/static/speech_xxxxx.mp3"
        audio_filename = speech_result["audio_url"].split("/")[-1]
        audio_path = static_dir / audio_filename
        
        print(f"Audio path: {audio_path.absolute()}")
        
        if not audio_path.exists():
            error_msg = "Failed to generate audio file"
            print(f"ERROR: {error_msg}")
            return VideoGenerationResponse(
                text=request.text,
                response=ai_response,
                error=error_msg
            )
        
        # Call SadTalker to generate video
        print("Calling SadTalker API...")
        sadtalker = get_sadtalker_service()
        result = await sadtalker.generate_talking_video(
            image_path=str(image_path),
            audio_path=str(audio_path),
            still_mode=request.still_mode,
            use_enhancer=request.use_enhancer,
            preprocess="crop"
        )
        
        print(f"SadTalker result: {result}")
        
        if "error" in result:
            print(f"SadTalker error: {result['error']}")
            return VideoGenerationResponse(
                text=request.text,
                response=ai_response,
                audio_url=speech_result["audio_url"],
                error=result["error"]
            )
        
        print(f"Video generated successfully!")
        return VideoGenerationResponse(
            text=request.text,
            response=ai_response,
            video_url=result.get("video_url"),
            video_base64=result.get("video_base64"),
            audio_url=speech_result["audio_url"]
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in generate_video: {error_details}")
        return VideoGenerationResponse(
            text=request.text if 'request' in locals() else "",
            response=ai_response if 'ai_response' in locals() else "",
            error=f"Video generation failed: {str(e)}"
        )


@app.get("/api/check-avatar-image")
async def check_avatar_image():
    """Check if the avatar source image exists."""
    image_paths = [
        Path("images/person_image.jpg"),
        Path("person_image.jpg"),
        Path("static/person_image.jpg")
    ]
    
    for path in image_paths:
        if path.exists():
            return {
                "exists": True,
                "path": str(path),
                "message": "Avatar image found"
            }
    
    return {
        "exists": False,
        "path": None,
        "message": "Please upload or place 'person_image.jpg' in the 'images' folder"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
