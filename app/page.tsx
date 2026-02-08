'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import Avatar from '@/components/Avatar'

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
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/`)
        if (response.ok) {
          setBackendStatus('online')
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
    
    try {
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
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I could not connect to the backend. Please ensure the Python server is running.' 
      }])
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
            
            <div className="flex-1 bg-gradient-to-b from-slate-700/50 to-slate-800/50 rounded-xl flex items-center justify-center relative overflow-hidden border-2 border-purple-500/20">
              <Avatar 
                visemes={currentVisemes}
                isPlaying={isPlaying}
                currentTime={audioCurrentTime}
              />
              
              {/* Processing indicator */}
              {isProcessing && (
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
          <p>AI Avatar Platform with Lip-Sync • Backend: FastAPI + Edge TTS</p>
        </footer>
      </div>
    </main>
  )
}
