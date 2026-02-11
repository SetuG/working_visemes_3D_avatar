"""
SadTalker Hugging Face Space Integration Service

This service connects to the SadTalker model running on Hugging Face Spaces
to generate realistic talking head videos from a source image and audio.
"""

import httpx
import base64
import asyncio
import os
from pathlib import Path
from typing import Optional
import json
import uuid


class SadTalkerService:
    """Service to interact with SadTalker on Hugging Face Spaces"""
    
    def __init__(self, space_url: str = "https://banao-tech-sadtalker-testing.hf.space"):
        self.space_url = space_url.rstrip("/")
        self.api_url = f"{self.space_url}/api/predict"
        self.timeout = 300.0  # 5 minutes timeout for video generation
        
        # Create videos directory for storing downloaded videos
        self.videos_dir = Path("static/videos")
        self.videos_dir.mkdir(parents=True, exist_ok=True)
        
    async def _image_to_base64(self, image_path: str) -> str:
        """Convert image file to base64 string"""
        with open(image_path, "rb") as f:
            image_data = f.read()
        base64_str = base64.b64encode(image_data).decode("utf-8")
        
        # Determine mime type
        ext = Path(image_path).suffix.lower()
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp"
        }
        mime_type = mime_types.get(ext, "image/jpeg")
        
        return f"data:{mime_type};base64,{base64_str}"
    
    async def _audio_to_base64(self, audio_path: str) -> dict:
        """Convert audio file to base64 format for Gradio API"""
        with open(audio_path, "rb") as f:
            audio_data = f.read()
        base64_str = base64.b64encode(audio_data).decode("utf-8")
        
        # Determine mime type
        ext = Path(audio_path).suffix.lower()
        mime_types = {
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".ogg": "audio/ogg",
            ".m4a": "audio/mp4"
        }
        mime_type = mime_types.get(ext, "audio/wav")
        
        return {
            "name": Path(audio_path).name,
            "data": f"data:{mime_type};base64,{base64_str}",
            "is_file": False
        }
    
    async def generate_talking_video(
        self,
        image_path: str,
        audio_path: str,
        preprocess: str = "crop",
        still_mode: bool = False,
        use_enhancer: bool = False,
        batch_size: int = 1,
        resolution: str = "256",
        pose_style: int = 0,
        facerender: str = "facevid2vid",
        expression_scale: float = 1.0,
        use_ref_video: bool = False,
        ref_video: Optional[str] = None,
        ref_video_type: str = "pose",
        use_idle_animation: bool = False,
        idle_length: int = 5,
        use_eye_blink: bool = True
    ) -> dict:
        """
        Generate a talking head video using SadTalker.
        
        Args:
            image_path: Path to the source face image
            audio_path: Path to the audio file
            preprocess: How to handle input image ("crop", "resize", "full", "extcrop", "extfull")
            still_mode: If True, fewer head motion (only mouth moves)
            use_enhancer: If True, use GFPGAN face enhancement
            batch_size: Batch size for generation (1-10)
            resolution: Face model resolution ("256" or "512")
            pose_style: Pose style (0-45)
            facerender: Face renderer ("facevid2vid" or "pirender")
            expression_scale: Expression intensity (0-3)
            use_ref_video: Whether to use reference video
            ref_video: Path to reference video (if using)
            ref_video_type: Type of reference ("pose", "blink", "pose+blink", "all")
            use_idle_animation: Whether to use idle animation mode
            idle_length: Length of idle animation in seconds
            use_eye_blink: Whether to use eye blink
            
        Returns:
            dict with video_url or error message
        """
        try:
            # Convert image and audio to base64
            image_base64 = await self._image_to_base64(image_path)
            audio_data = await self._audio_to_base64(audio_path)
            
            # Build the request payload for Gradio API
            # Based on the component order from /info endpoint
            payload = {
                "fn_index": 2,  # Main generation function
                "data": [
                    image_base64,           # Source image
                    audio_data,             # Input audio
                    preprocess,             # Preprocess type
                    still_mode,             # Still mode
                    use_enhancer,           # GFPGAN enhancer
                    batch_size,             # Batch size
                    int(resolution),        # Resolution (must be int for OpenCV)
                    pose_style,             # Pose style
                    facerender,             # Face renderer
                    expression_scale,       # Expression scale
                    use_ref_video,          # Use reference video
                    ref_video,              # Reference video
                    ref_video_type,         # Reference video type
                    use_idle_animation,     # Use idle animation
                    idle_length,            # Idle length
                    use_eye_blink           # Use eye blink
                ],
                "session_hash": self._generate_session_hash()
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # First, join the queue
                queue_join_url = f"{self.space_url}/queue/join"
                
                response = await client.post(
                    queue_join_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code != 200:
                    # Try direct API call as fallback
                    return await self._direct_api_call(payload, client)
                
                # Poll for results
                result = await self._poll_for_result(client, payload["session_hash"])
                
                # If successful, download the video
                if result and "video_url" in result:
                    local_video_path = await self._download_video(result["video_url"], client)
                    if local_video_path:
                        result["video_url"] = local_video_path
                
                return result
                
        except httpx.TimeoutException:
            return {"error": "Request timed out. Video generation can take 1-5 minutes."}
        except Exception as e:
            return {"error": f"Failed to generate video: {str(e)}"}
    
    async def _direct_api_call(self, payload: dict, client: httpx.AsyncClient) -> dict:
        """Make a direct API call (fallback method)"""
        try:
            response = await client.post(
                self.api_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                return self._parse_response(result)
            else:
                return {"error": f"API returned status {response.status_code}: {response.text[:500]}"}
        except Exception as e:
            return {"error": f"Direct API call failed: {str(e)}"}
    
    async def _poll_for_result(self, client: httpx.AsyncClient, session_hash: str, max_attempts: int = 120) -> dict:
        """Poll the queue for results"""
        queue_data_url = f"{self.space_url}/queue/data"
        
        for attempt in range(max_attempts):
            try:
                # Use Server-Sent Events (SSE) to get updates
                async with client.stream(
                    "GET",
                    queue_data_url,
                    params={"session_hash": session_hash},
                    timeout=30.0
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            data_str = line[5:].strip()
                            if data_str:
                                try:
                                    data = json.loads(data_str)
                                    print(f"DEBUG SSE: msg={data.get('msg')}, keys={data.keys()}")
                                    
                                    if data.get("msg") == "process_completed":
                                        output = data.get("output")
                                        print(f"DEBUG: process_completed, output type: {type(output)}, value: {output}")
                                        # Output might be a list directly or wrapped in dict
                                        if isinstance(output, dict):
                                            return self._parse_response(output)
                                        elif isinstance(output, list):
                                            # Gradio returns list directly
                                            return self._parse_response({"data": output})
                                        else:
                                            return self._parse_response({"data": [output]})
                                    elif data.get("msg") == "queue_full":
                                        return {"error": "Queue is full. Please try again later."}
                                    elif data.get("msg") == "process_starts":
                                        print("DEBUG: Process started on HF Space")
                                        continue  # Still processing
                                    elif "error" in data:
                                        return {"error": data["error"]}
                                except json.JSONDecodeError:
                                    continue
            except httpx.ReadTimeout:
                continue  # Keep polling
            except Exception as e:
                if attempt >= max_attempts - 1:
                    return {"error": f"Polling failed: {str(e)}"}
            
            await asyncio.sleep(2)  # Wait before next poll
        
        return {"error": "Timeout waiting for video generation"}
    
    def _parse_response(self, result: dict) -> dict:
        """Parse the API response to extract video URL"""
        try:
            print(f"DEBUG: Full result structure: {json.dumps(result, indent=2, default=str)[:1000]}")
            
            # The response should contain a video file path/URL
            if "data" in result and len(result["data"]) > 0:
                video_data = result["data"][0]
                print(f"DEBUG: video_data type: {type(video_data)}, value: {video_data}")
                
                if isinstance(video_data, dict):
                    # Video returned as file object (Gradio format)
                    # Can have "name", "path", "url", "orig_name", etc.
                    print(f"DEBUG: video_data keys: {video_data.keys()}")
                    video_path = video_data.get("name") or video_data.get("path") or video_data.get("url")
                    
                    if video_path:
                        print(f"DEBUG: Found video_path: {video_path}")
                        # Clean up the path
                        if video_path.startswith("http"):
                            return {"video_url": video_path}
                        elif video_path.startswith("/"):
                            # Absolute path from space root
                            return {"video_url": f"{self.space_url}/file={video_path}"}
                        elif video_path.startswith("./"):
                            # Relative path like ./results/...
                            clean_path = video_path.lstrip("./")
                            return {"video_url": f"{self.space_url}/file/{clean_path}"}
                        else:
                            # Just a filename or relative path
                            return {"video_url": f"{self.space_url}/file/{video_path}"}
                    elif "data" in video_data:
                        # Base64 encoded video
                        return {"video_base64": video_data["data"]}
                        
                elif isinstance(video_data, str):
                    # Direct URL or path
                    print(f"DEBUG: video_data is string: {video_data}")
                    if video_data.startswith("http"):
                        return {"video_url": video_data}
                    elif video_data.startswith("/"):
                        return {"video_url": f"{self.space_url}/file={video_data}"}
                    elif video_data.startswith("data:"):
                        return {"video_base64": video_data}
                    elif video_data.startswith("./"):
                        clean_path = video_data.lstrip("./")
                        return {"video_url": f"{self.space_url}/file/{clean_path}"}
                    else:
                        return {"video_url": f"{self.space_url}/file/{video_data}"}
            
            print(f"DEBUG: Failed to parse, result: {result}")
            return {"error": "Could not parse video from response", "raw_response": str(result)[:500]}
        except Exception as e:
            print(f"DEBUG: Exception in parse: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": f"Failed to parse response: {str(e)}"}
    
    def _generate_session_hash(self) -> str:
        """Generate a random session hash"""
        import random
        import string
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=11))
    
    async def _download_video(self, video_url: str, client: httpx.AsyncClient) -> Optional[str]:
        """Download video from HuggingFace Space to local storage"""
        try:
            print(f"Downloading video from: {video_url}")
            
            # Generate unique filename
            video_filename = f"avatar_{uuid.uuid4().hex[:12]}.mp4"
            local_path = self.videos_dir / video_filename
            
            # Download the video
            response = await client.get(video_url, timeout=60.0)
            
            if response.status_code == 200:
                # Save to local file
                with open(local_path, "wb") as f:
                    f.write(response.content)
                
                print(f"Video downloaded successfully to: {local_path}")
                # Return URL path for serving via FastAPI
                return f"/static/videos/{video_filename}"
            else:
                print(f"Failed to download video: HTTP {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error downloading video: {str(e)}")
            return None


# Alternative: Using gradio_client (simpler but requires package install)
class SadTalkerGradioClient:
    """
    Alternative client using gradio_client package.
    Requires: pip install gradio_client
    """
    
    def __init__(self, space_url: str = "banao-tech/SadTalker-testing"):
        self.space_name = space_url
        self._client = None
    
    async def _get_client(self):
        """Lazy load the gradio client"""
        if self._client is None:
            try:
                from gradio_client import Client
                self._client = Client(self.space_name)
            except ImportError:
                raise ImportError("Please install gradio_client: pip install gradio_client")
        return self._client
    
    async def generate_talking_video(
        self,
        image_path: str,
        audio_path: str,
        preprocess: str = "crop",
        still_mode: bool = False,
        use_enhancer: bool = False
    ) -> dict:
        """
        Generate talking video using gradio_client.
        
        This is simpler but runs synchronously.
        """
        try:
            client = await self._get_client()
            
            # Use the predict method with the correct API endpoint
            result = client.predict(
                image_path,                # Source image
                audio_path,                # Input audio  
                preprocess,                # Preprocess
                still_mode,                # Still mode
                use_enhancer,              # GFPGAN
                1,                         # batch_size
                "256",                     # resolution
                0,                         # pose_style
                "facevid2vid",             # facerender
                1.0,                       # expression_scale
                False,                     # use_ref_video
                None,                      # ref_video
                "pose",                    # ref_video_type
                False,                     # use_idle
                5,                         # idle_length
                True,                      # eye_blink
                fn_index=2
            )
            
            if result and isinstance(result, str):
                return {"video_url": result}
            elif result and isinstance(result, dict) and "video" in result:
                return {"video_url": result["video"]}
            else:
                return {"error": "Unexpected response format", "raw": str(result)}
                
        except Exception as e:
            return {"error": f"Gradio client error: {str(e)}"}


# Singleton instance
_sadtalker_service: Optional[SadTalkerService] = None

def get_sadtalker_service() -> SadTalkerService:
    """Get or create the SadTalker service instance"""
    global _sadtalker_service
    if _sadtalker_service is None:
        space_url = os.getenv("SADTALKER_SPACE_URL", "https://banao-tech-sadtalker-testing.hf.space")
        _sadtalker_service = SadTalkerService(space_url)
    return _sadtalker_service
