"""
Viseme Generator Module
Generates viseme timing data from text using phoneme-to-viseme mapping.
This is a simplified approach that works without external tools like Rhubarb.
"""

import re
from typing import List, Dict
from dataclasses import dataclass, asdict

@dataclass
class Viseme:
    time: float
    viseme: str
    duration: float

# Phoneme to Viseme mapping (based on Microsoft's viseme standard)
# Viseme IDs: https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/how-to-speech-synthesis-viseme
PHONEME_TO_VISEME = {
    # Silence
    ' ': 'sil', '.': 'sil', ',': 'sil', '!': 'sil', '?': 'sil',
    
    # Bilabial (lips together) - P, B, M
    'p': 'PP', 'b': 'PP', 'm': 'PP',
    
    # Labiodental (teeth on lip) - F, V
    'f': 'FF', 'v': 'FF',
    
    # Dental (tongue between teeth) - TH
    
    # Alveolar (tongue on ridge) - T, D, N, L, S, Z
    't': 'DD', 'd': 'DD', 'n': 'nn', 'l': 'nn',
    's': 'SS', 'z': 'SS',
    
    # Postalveolar - SH, CH, J
    
    # Velar - K, G, NG
    'k': 'kk', 'g': 'kk', 'c': 'kk', 'q': 'kk', 'x': 'kk',
    
    # Glottal - H
    'h': 'kk',
    
    # Approximants - R, W, Y
    'r': 'RR', 'w': 'O', 'y': 'I',
    
    # Vowels
    'a': 'aa', 'e': 'E', 'i': 'I', 'o': 'O', 'u': 'U',
}

# Extended mappings for common letter combinations
DIGRAPH_TO_VISEME = {
    'th': 'TH',
    'sh': 'CH',
    'ch': 'CH',
    'wh': 'O',
    'ph': 'FF',
    'ng': 'kk',
    'ee': 'I',
    'oo': 'U',
    'ou': 'O',
    'ai': 'aa',
    'ea': 'I',
    'oa': 'O',
}

def text_to_visemes(text: str, audio_duration: float = None) -> List[Dict]:
    """
    Convert text to viseme timing data.
    
    Args:
        text: The text to convert
        audio_duration: Total audio duration in seconds (if known)
    
    Returns:
        List of viseme objects with time, viseme, and duration
    """
    text = text.lower()
    visemes = []
    
    # Estimate timing based on text length
    # Average speaking rate: ~150 words per minute = ~12 chars per second
    if audio_duration:
        char_duration = audio_duration / max(len(text), 1)
    else:
        char_duration = 0.08  # ~80ms per character average
    
    current_time = 0.0
    i = 0
    
    while i < len(text):
        # Check for digraphs first
        if i < len(text) - 1:
            digraph = text[i:i+2]
            if digraph in DIGRAPH_TO_VISEME:
                viseme = DIGRAPH_TO_VISEME[digraph]
                duration = char_duration * 1.5  # Digraphs take slightly longer
                visemes.append(Viseme(
                    time=round(current_time, 3),
                    viseme=viseme,
                    duration=round(duration, 3)
                ))
                current_time += duration
                i += 2
                continue
        
        # Single character
        char = text[i]
        if char in PHONEME_TO_VISEME:
            viseme = PHONEME_TO_VISEME[char]
            
            # Silence characters are longer
            if viseme == 'sil':
                duration = char_duration * 2
            else:
                duration = char_duration
            
            visemes.append(Viseme(
                time=round(current_time, 3),
                viseme=viseme,
                duration=round(duration, 3)
            ))
            current_time += duration
        
        i += 1
    
    # Add final silence
    visemes.append(Viseme(
        time=round(current_time, 3),
        viseme='sil',
        duration=0.5
    ))
    
    # Merge consecutive same visemes for smoother animation
    merged_visemes = merge_consecutive_visemes(visemes)
    
    return [asdict(v) for v in merged_visemes]


def merge_consecutive_visemes(visemes: List[Viseme]) -> List[Viseme]:
    """Merge consecutive visemes of the same type."""
    if not visemes:
        return []
    
    merged = []
    current = visemes[0]
    
    for next_viseme in visemes[1:]:
        if next_viseme.viseme == current.viseme:
            # Merge: extend duration
            current = Viseme(
                time=current.time,
                viseme=current.viseme,
                duration=round(current.duration + next_viseme.duration, 3)
            )
        else:
            merged.append(current)
            current = next_viseme
    
    merged.append(current)
    return merged


def get_viseme_list() -> List[str]:
    """Return list of all possible viseme codes."""
    return ['sil', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR', 'aa', 'E', 'I', 'O', 'U']
