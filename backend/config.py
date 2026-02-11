import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")

    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2")
    
    
    TTS_VOICE = os.getenv("TTS_VOICE", "en-US-JennyNeural")
    
    AUDIO_OUTPUT_DIR = "static/audio"
