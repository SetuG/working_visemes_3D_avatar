"""
Text-to-Speech Module using Edge TTS (Microsoft's free neural TTS)
"""

import edge_tts
import asyncio
import os
import uuid
from pathlib import Path
from config import Config


async def generate_speech(text: str, output_dir: str = None) -> dict:
    """
    Generate speech audio from text using Edge TTS.
    
    Args:
        text: The text to convert to speech
        output_dir: Directory to save the audio file
    
    Returns:
        Dictionary with audio file path and metadata
    """
    if output_dir is None:
        output_dir = Config.AUDIO_OUTPUT_DIR
    
    # Ensure output directory exists
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    filename = f"speech_{uuid.uuid4().hex[:8]}.mp3"
    output_path = os.path.join(output_dir, filename)
    
    # Create TTS communicate object
    communicate = edge_tts.Communicate(text, Config.TTS_VOICE)
    
    # Save audio file
    await communicate.save(output_path)
    
    # Get audio duration (approximate based on text length)
    # More accurate would require audio file analysis
    # Average speaking rate: ~150 words per minute
    word_count = len(text.split())
    estimated_duration = (word_count / 150) * 60  # in seconds
    
    return {
        "audio_path": output_path,
        "audio_url": f"/static/audio/{filename}",
        "duration": estimated_duration,
        "voice": Config.TTS_VOICE
    }


async def get_available_voices() -> list:
    """Get list of available TTS voices."""
    voices = await edge_tts.list_voices()
    return [
        {
            "name": voice["Name"],
            "short_name": voice["ShortName"],
            "gender": voice["Gender"],
            "locale": voice["Locale"]
        }
        for voice in voices
        if voice["Locale"].startswith("en-")  # English voices only
    ]


def generate_speech_sync(text: str, output_dir: str = None) -> dict:
    """Synchronous wrapper for generate_speech."""
    return asyncio.run(generate_speech(text, output_dir))
