'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX, User, Video, Layers, Box } from 'lucide-react'
import VideoStyleAvatar from '@/components/VideoStyleAvatar'
import ImageBasedAvatar from '@/components/ImageBasedAvatar'
import VideoAvatar from '@/components/VideoAvatar'
import dynamic from 'next/dynamic'

// Dynamically import 3D avatar to avoid SSR issues with Three.js
const Face3DAvatar = dynamic(() => import('@/components/Face3DAvatar'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-800">
      <div className="text-white">Loading 3D Model...</div>
    </div>
  ),
})

type AvatarStyle = '3d' | 'video' | 'realistic' | 'detailed'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Viseme {
  time: number
  viseme: string
  duration: number
}

interface ChatResponse {
  text: string
  response: string
  audio_url: string | null
  visemes: Viseme[] | null
  duration: number | null
}

interface VideoResponse {
  text: string
  response: string
  video_url: string | null
  video_base64: string | null
  audio_url: string | null
  error: string | null
}

const BACKEND_URL = 'http://localhost:8000'

export default function Home() {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentVisemes, setCurrentVisemes] = useState<Viseme[]>([])
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('3d')  // Default to 3D avatar
  
  // Video avatar state
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null)
  const [currentVideoBase64, setCurrentVideoBase64] = useState<string | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [avatarImageExists, setAvatarImageExists] = useState<boolean | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/`)
        if (response.ok) {
          setBackendStatus('online')
          // Also check if avatar image exists
          const imageCheck = await fetch(`${BACKEND_URL}/api/check-avatar-image`)
          if (imageCheck.ok) {
            const data = await imageCheck.json()
            setAvatarImageExists(data.exists)
          }
        } else {
          setBackendStatus('offline')
        }
      } catch {
        setBackendStatus('offline')
      }
    }
    checkBackend()
  }, [])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Audio time update handler
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleAudioEnd = () => {
    setIsPlaying(false)
    setAudioCurrentTime(0)
    setCurrentVisemes([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputText.trim() || isProcessing) return

    const userMessage = inputText.trim()
    setInputText('')
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsProcessing(true)
    setVideoError(null)
    
    try {
      // Use video generation only for 'video' avatar style
      if (avatarStyle === 'video') {
        setIsGeneratingVideo(true)
        setCurrentVideoUrl(null)
        setCurrentVideoBase64(null)
        
        const response = await fetch(`${BACKEND_URL}/api/generate-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: userMessage,
            still_mode: true,
            use_enhancer: false
          }),
        })

        if (response.ok) {
          const data: VideoResponse = await response.json()
          
          // Add assistant message
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.response 
          }])

          if (data.error) {
            setVideoError(data.error)
            // Fall back to audio if video failed
            if (data.audio_url && !isMuted) {
              const audio = new Audio(`${BACKEND_URL}${data.audio_url}`)
              audioRef.current = audio
              audio.addEventListener('timeupdate', handleTimeUpdate)
              audio.addEventListener('ended', handleAudioEnd)
              audio.addEventListener('play', () => setIsPlaying(true))
              try {
                await audio.play()
              } catch (err) {
                console.error('Audio play error:', err)
              }
            }
          } else {
            // Set video URL for playback
            if (data.video_url) {
              setCurrentVideoUrl(data.video_url)
            } else if (data.video_base64) {
              setCurrentVideoBase64(data.video_base64)
            }
          }
        } else {
          throw new Error('Backend request failed')
        }
        
        setIsGeneratingVideo(false)
      } else {
        // Original chat flow for canvas-based avatars
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: userMessage,
            generate_speech: true 
          }),
        })

        if (response.ok) {
          const data: ChatResponse = await response.json()
          
          // Add assistant message
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.response 
          }])

          // Play audio and animate if available
          if (data.audio_url && data.visemes && !isMuted) {
            setCurrentVisemes(data.visemes)
            
            // Create and play audio
            const audio = new Audio(`${BACKEND_URL}${data.audio_url}`)
            audioRef.current = audio
            
            audio.addEventListener('timeupdate', handleTimeUpdate)
            audio.addEventListener('ended', handleAudioEnd)
            audio.addEventListener('play', () => setIsPlaying(true))
            
            try {
              await audio.play()
            } catch (err) {
              console.error('Audio play error:', err)
              setIsPlaying(false)
            }
          }
        } else {
          throw new Error('Backend request failed')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I could not connect to the backend. Please ensure the Python server is running.' 
      }])
      setIsGeneratingVideo(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleListening = () => {
    setIsListening(!isListening)
    console.log('Voice input toggled:', !isListening)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">AI Avatar Platform</h1>
          <p className="text-gray-300">Interact with your intelligent avatar assistant</p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              backendStatus === 'online' 
                ? 'bg-green-500/20 text-green-400' 
                : backendStatus === 'offline'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                backendStatus === 'online' 
                  ? 'bg-green-400' 
                  : backendStatus === 'offline'
                  ? 'bg-red-400'
                  : 'bg-yellow-400 animate-pulse'
              }`}></span>
              Backend: {backendStatus}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 overflow-hidden">
          {/* Avatar Display Window */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">AI Avatar</h2>
              <div className="flex items-center gap-2">
                {/* Avatar Style Selector */}
                <select
                  value={avatarStyle}
                  onChange={(e) => setAvatarStyle(e.target.value as AvatarStyle)}
                  className="bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
                >
                  <option value="3d">3D Face Model</option>
                  <option value="video">Realistic Video (SadTalker)</option>
                  <option value="realistic"> Canvas Realistic</option>
                  <option value="detailed">Canvas Detailed</option>
                </select>
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-lg transition-colors ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>
            
            {/* Avatar Image Warning */}
            {avatarStyle === 'video' && avatarImageExists === false && (
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
                <p className="font-medium"> Avatar image not found</p>
                <p className="mt-1">Please place <code className="bg-black/30 px-1 rounded">person_image.jpg</code> in the <code className="bg-black/30 px-1 rounded">backend/images/</code> folder</p>
              </div>
            )}
            
            {/* Video Error Display */}
            {videoError && avatarStyle === 'video' && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                <p className="font-medium">Video generation error:</p>
                <p className="mt-1">{videoError}</p>
              </div>
            )}
            
            <div className="flex-1 bg-gradient-to-b from-slate-700/50 to-slate-800/50 rounded-xl flex items-center justify-center relative overflow-hidden border-2 border-purple-500/20 min-h-[400px]">
              {avatarStyle === '3d' ? (
                <Face3DAvatar 
                  visemes={currentVisemes}
                  isPlaying={isPlaying}
                  currentTime={audioCurrentTime}
                />
              ) : avatarStyle === 'video' ? (
                <VideoAvatar 
                  videoUrl={currentVideoUrl}
                  videoBase64={currentVideoBase64}
                  isLoading={isGeneratingVideo}
                  autoPlay={true}
                  showControls={true}
                  onVideoEnd={() => {
                    // Optional: Clear video after playing
                  }}
                />
              ) : avatarStyle === 'realistic' ? (
                <VideoStyleAvatar 
                  visemes={currentVisemes}
                  isPlaying={isPlaying}
                  currentTime={audioCurrentTime}
                />
              ) : (
                <ImageBasedAvatar 
                  visemes={currentVisemes}
                  isPlaying={isPlaying}
                  currentTime={audioCurrentTime}
                />
              )}
              
              {/* Processing indicator */}
              {isProcessing && !isGeneratingVideo && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat & Input Area */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30 p-6 flex flex-col overflow-hidden">
            <h2 className="text-2xl font-semibold text-white mb-4">Conversation</h2>
            
            {/* Messages Display */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 bg-black/20 rounded-xl p-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-lg">Start a conversation with your AI avatar</p>
                  <p className="text-sm mt-2">Type your message below</p>
                  {backendStatus === 'offline' && (
                    <div className="mt-4 p-3 bg-red-500/20 rounded-lg text-red-300 text-sm">
                      <p className="font-semibold">Backend is offline</p>
                      <p className="mt-1">Run <code className="bg-black/30 px-1 rounded">python main.py</code> in the backend folder</p>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-gray-100'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {message.role === 'user' ? 'You' : 'AI Avatar'}
                      </p>
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-3 rounded-xl transition-colors ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl border border-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                disabled={isProcessing}
              />
              
              <button
                type="submit"
                disabled={isProcessing || !inputText.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 font-medium"
              >
                <Send size={20} />
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-400 text-sm">
          <p>AI Avatar Platform </p>
        </footer>
      </div>
    </main>
  )
}
