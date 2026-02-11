"""
AI Response Generator Module
Supports multiple providers: Groq, Ollama, or Echo (for testing)
"""

import httpx
from config import Config


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
        return f"I understand you said: '{user_message}'. I'm currently in demo mode. Connect a real AI provider like Groq or Ollama for intelligent responses!"


class GroqProvider(AIProvider):
    """Groq API provider using direct HTTP calls."""
    
    def __init__(self):
        if not Config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not configured")
        
        self.api_key = Config.GROQ_API_KEY
        self.api_url = Config.GROQ_API_URL
        self.model = Config.GROQ_MODEL
    
    async def generate_response(self, user_message: str, conversation_history: list = None) -> str:
        try:
            # Build messages array
            messages = [
                {
                    "role": "system",
                    "content": "You are a friendly AI avatar assistant. Keep your responses concise and natural, as they will be spoken aloud with lip-sync animation. Aim for 1-3 sentences unless more detail is needed."
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ]
            
            # Make direct API call to Grok
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 150
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    error_text = response.text
                    return f"Error from Groq API: {response.status_code} - {error_text}"
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
    
    if provider == "groq":
        return GroqProvider()
    elif provider == "ollama":
        return OllamaProvider()
    else:
        return EchoProvider()
