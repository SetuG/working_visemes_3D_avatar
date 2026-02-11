"""
Viseme Generator Module
Generates viseme timing data from text using phoneme-to-viseme mapping.
Uses standardized viseme IDs (0-21) for improved lip sync accuracy.
"""

import re
from typing import List, Dict, Union
from dataclasses import dataclass, asdict

@dataclass
class Viseme:
    time: float
    viseme: int  # Changed to int for 0-21 mapping
    duration: float

# Standardized Viseme Mapping (0-21)
# 0: silence
# 1: ae_ax_ah (cat, father)
# 2: aa (odd)
# 3: ao (caught)
# 4: ey_eh_uh (ate, bed, but)
# 5: er (bird)
# 6: y_iy_ih_ix (eat, it)
# 7: w_uw (oops, boot)
# 8: ow (boat)
# 9: aw (cow)
# 10: oy (toy)
# 11: ay (eye)
# 12: h (hat)
# 13: r (red)
# 14: l (lid)
# 15: s_z (sit, zap)
# 16: sh_ch_jh_zh (she, church)
# 17: th_dh (thin, then)
# 18: f_v (fork, vase)
# 19: d_t_n (dog, top, nose)
# 20: k_g_ng (cat, got, sing)
# 21: p_b_m (put, bat, mat)

PHONEME_TO_VISEME = {
    # Silence
    ' ': 0, '.': 0, ',': 0, '!': 0, '?': 0, '\n': 0, '\r': 0, '\t': 0, '-': 0, ';': 0, ':': 0,
    
    # Bilabial (lips together) - P, B, M
    'p': 21, 'b': 21, 'm': 21,
    
    # Labiodental (teeth on lip) - F, V
    'f': 18, 'v': 18,
    
    # Dental (tongue between teeth) - TH
    # Handled in digraphs
    
    # Alveolar (tongue on ridge) - T, D, N, L, S, Z
    't': 19, 'd': 19, 'n': 19,
    'l': 14,
    's': 15, 'z': 15,
    
    # Velar - K, G
    'k': 20, 'g': 20, 'c': 20, 'q': 20, 'x': 20,
    
    # Glottal - H
    'h': 12,
    
    # Approximants - R, W, Y
    'r': 13,
    'w': 7,
    'y': 6,
    
    # Vowels - more detailed mapping
    'a': 1,  # ae_ax_ah
    'e': 4,  # ey_eh_uh
    'i': 6,  # y_iy_ih_ix
    'o': 8,  # ow
    'u': 7,  # w_uw
}

# Extended mappings for common letter combinations
DIGRAPH_TO_VISEME = {
    'th': 17,   # th_dh
    'sh': 16,   # sh_ch_jh_zh
    'ch': 16,   # sh_ch_jh_zh
    'zh': 16,   # sh_ch_jh_zh
    'wh': 7,    # w_uw
    'ph': 18,   # f_v
    'ng': 20,   # k_g_ng
    'ee': 6,    # y_iy_ih_ix (eat)
    'ea': 6,    # y_iy_ih_ix
    'oo': 7,    # w_uw (boot)
    'ou': 9,    # aw (cow)
    'ow': 8,    # ow (boat)
    'oy': 10,   # oy (toy)
    'aw': 9,    # aw (cow)
    'ay': 11,   # ay (eye)
    'ai': 11,   # ay
    'ey': 4,    # ey_eh_uh
    'er': 5,    # er (bird)
    'ir': 5,    # er
    'ur': 5,    # er
    'ar': 1,    # ae_ax_ah
    'or': 3,    # ao
    'oa': 8,    # ow (boat)
    'au': 3,    # ao (caught)
}

def text_to_visemes(text: str, audio_duration: float = None) -> List[Dict]:
    """
    Convert text to viseme timing data.
    
    Args:
        text: The text to convert
        audio_duration: Total audio duration in seconds (if known)
    
    Returns:
        List of viseme objects with time, viseme (0-21), and duration
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
        # Check for trigraphs first
        if i < len(text) - 2:
            trigraph = text[i:i+3]
            # No common trigraphs in current mapping
        
        # Check for digraphs
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
            if viseme == 0:
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
        viseme=0,
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


def get_viseme_list() -> List[int]:
    """Return list of all possible viseme codes (0-21)."""
    return list(range(22))  # 0 through 21
