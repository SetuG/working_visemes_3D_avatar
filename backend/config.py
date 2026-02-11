import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # AI Provider: "groq", "ollama", "echo"
    AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")
    
    # Groq
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
    GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    # Ollama
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2")
    
    # TTS
    TTS_VOICE = os.getenv("TTS_VOICE", "en-US-JennyNeural")
    
    # Paths
    AUDIO_OUTPUT_DIR = "static/audio"
