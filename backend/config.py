import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # AI Provider: "gemini", "ollama", "echo"
    AI_PROVIDER = os.getenv("AI_PROVIDER", "echo")
    
    # Gemini
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    
    # Ollama
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2")
    
    # TTS
    TTS_VOICE = os.getenv("TTS_VOICE", "en-US-JennyNeural")
    
    # Paths
    AUDIO_OUTPUT_DIR = "static/audio"
