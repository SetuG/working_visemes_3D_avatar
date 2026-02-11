import edge_tts
import asyncio
import os
import uuid
from pathlib import Path
from config import Config


async def generate_speech(text: str, output_dir: str = None) -> dict:
    
    if output_dir is None:
        output_dir = Config.AUDIO_OUTPUT_DIR
    
    
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    filename = f"speech_{uuid.uuid4().hex[:8]}.mp3"
    output_path = os.path.join(output_dir, filename)
 
    communicate = edge_tts.Communicate(text, Config.TTS_VOICE)
    await communicate.save(output_path)
    
    word_count = len(text.split())
    estimated_duration = (word_count / 150) * 60  
    
    return {
        "audio_path": output_path,
        "audio_url": f"/static/audio/{filename}",
        "duration": estimated_duration,
        "voice": Config.TTS_VOICE
    }


async def get_available_voices() -> list:
    voices = await edge_tts.list_voices()
    return [
        {
            "name": voice["Name"],
            "short_name": voice["ShortName"],
            "gender": voice["Gender"],
            "locale": voice["Locale"]
        }
        for voice in voices
        if voice["Locale"].startswith("en-") 
    ]


def generate_speech_sync(text: str, output_dir: str = None) -> dict:
    return asyncio.run(generate_speech(text, output_dir))
