'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2, RefreshCw, User } from 'lucide-react';

interface VideoAvatarProps {
  videoUrl?: string | null;
  videoBase64?: string | null;
  isLoading?: boolean;
  placeholderImage?: string;
  onVideoEnd?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
}

export default function VideoAvatar({
  videoUrl,
  videoBase64,
  isLoading = false,
  placeholderImage,
  onVideoEnd,
  autoPlay = true,
  showControls = true,
}: VideoAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  // Compute video source
  const videoSrc = videoBase64 || videoUrl || null;

  // Auto-play when video source changes
  useEffect(() => {
    if (videoSrc && videoRef.current && autoPlay) {
      setHasError(false);
      setVideoReady(false);
      videoRef.current.load();
    }
  }, [videoSrc, autoPlay]);

  // Handle video ready to play
  const handleCanPlay = () => {
    setVideoReady(true);
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch((e) => {
        console.log('Auto-play prevented:', e);
      });
    }
  };

  // Handle play/pause
  const togglePlay = () => {
    if (!videoRef.current || !videoSrc) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  // Track playing state
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  
  // Track progress
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(progress || 0);
  };

  // Handle video end
  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    onVideoEnd?.();
  };

  // Handle video error
  const handleError = () => {
    setHasError(true);
    setVideoReady(false);
    console.error('Video failed to load');
  };

  // Retry loading
  const handleRetry = () => {
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-20">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-white text-sm">Generating avatar video...</p>
          <p className="text-gray-400 text-xs mt-1">This may take 1-2 minutes</p>
        </div>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-20">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-white text-sm mb-4">Failed to load video</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Placeholder when no video */}
      {!videoSrc && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          {placeholderImage ? (
            <img
              src={placeholderImage}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">Send a message to see the avatar</p>
            </div>
          )}
        </div>
      )}

      {/* Video Element */}
      {videoSrc && (
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            videoReady && !hasError ? 'opacity-100' : 'opacity-0'
          }`}
          src={videoSrc}
          playsInline
          onCanPlay={handleCanPlay}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
          onError={handleError}
        />
      )}

      {/* Video Controls */}
      {showControls && videoSrc && videoReady && !hasError && !isLoading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="w-full h-1 bg-gray-600 rounded-full mb-3 cursor-pointer">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>

              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-white text-xs">
                {isPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
