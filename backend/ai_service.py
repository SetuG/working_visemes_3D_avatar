"""
AI Response Generator Module
Supports multiple providers: Gemini, Ollama, or Echo (for testing)
"""

import httpx
from config import Config

# Try to import Gemini
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class AIProvider:
    """Base AI Provider interface."""
    
    async def generate_response(self, user_message: str, conversation_history: list = None) -> str:
        raise NotImplementedError


class EchoProvider(AIProvider):
    """Simple echo provider for testing without API keys."""
    
    async def generate_response(self, user_message: str, conversation_history: list = None) -> str:
        responses = {
            "hello": "Hello! I'm your AI avatar assistant. How can I help you today?",
            "hi": "Hi there! Nice to meet you. What would you like to talk about?",
            "how are you": "I'm doing great, thank you for asking! I'm here to help you with any questions you might have.",
            "what is your name": "I'm an AI avatar assistant, created to help you with information and have conversations.",
            "bye": "Goodbye! It was nice talking with you. Have a great day!",
        }
        
        # Check for keyword matches
        message_lower = user_message.lower()
        for key, response in responses.items():
            if key in message_lower:
                return response
        
        # Default response
        return f"I understand you said: '{user_message}'. I'm currently in demo mode. Connect a real AI provider like Gemini or Ollama for intelligent responses!"


class GeminiProvider(AIProvider):
    """Google Gemini AI provider."""
    
    def __init__(self):
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai package not installed")
        if not Config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")
        
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def generate_response(self, user_message: str, conversation_history: list = None) -> str:
        try:
            # Build conversation context
            system_prompt = """You are a friendly AI avatar assistant. Keep your responses concise and natural, 
            as they will be spoken aloud with lip-sync animation. Aim for 1-3 sentences unless more detail is needed."""
            
            full_prompt = f"{system_prompt}\n\nUser: {user_message}\n\nAssistant:"
            
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            return f"I apologize, but I encountered an error: {str(e)}"


class OllamaProvider(AIProvider):
    """Ollama local LLM provider."""
    
    def __init__(self):
        self.url = f"{Config.OLLAMA_URL}/api/generate"
        self.model = Config.OLLAMA_MODEL
    
    async def generate_response(self, user_message: str, conversation_history: list = None) -> str:
        try:
            system_prompt = """You are a friendly AI avatar assistant. Keep your responses concise and natural, 
            as they will be spoken aloud with lip-sync animation. Aim for 1-3 sentences unless more detail is needed."""
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.url,
                    json={
                        "model": self.model,
                        "prompt": f"{system_prompt}\n\nUser: {user_message}\n\nAssistant:",
                        "stream": False
                    }
                )
                
                if response.status_code == 200:
                    return response.json().get("response", "I couldn't generate a response.")
                else:
                    return f"Error connecting to Ollama: {response.status_code}"
        except Exception as e:
            return f"Ollama is not available. Please ensure Ollama is running. Error: {str(e)}"


def get_ai_provider() -> AIProvider:
    """Factory function to get the configured AI provider."""
    provider = Config.AI_PROVIDER.lower()
    
    if provider == "gemini":
        return GeminiProvider()
    elif provider == "ollama":
        return OllamaProvider()
    else:
        return EchoProvider()
