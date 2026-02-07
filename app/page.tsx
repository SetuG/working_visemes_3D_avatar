'use client'

import { useState, useRef } from 'react'
import { Send, Mic, MicOff } from 'lucide-react'

export default function Home() {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])
  const [isListening, setIsListening] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputText.trim()) return

    // Add user message to chat
    const userMessage = { role: 'user' as const, content: inputText }
    setMessages(prev => [...prev, userMessage])
    
    setIsProcessing(true)
    
    try {
      // TODO: Connect to Python backend API
      // This is where you'll send the text to your Python model
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      })

      if (response.ok) {
        const data = await response.json()
        // TODO: Handle the audio response and trigger avatar lip-sync
        console.log('Response from backend:', data)
        
        // Add assistant message (placeholder)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Response to: "${inputText}"` 
        }])
      }
    } catch (error) {
      console.error('Error connecting to backend:', error)
      // For now, just add a placeholder response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I received your message: "${inputText}". Backend connection pending.` 
      }])
    } finally {
      setIsProcessing(false)
      setInputText('')
    }
  }

  const toggleListening = () => {
    // TODO: Implement voice input functionality
    setIsListening(!isListening)
    console.log('Voice input toggled:', !isListening)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AI Avatar Platform</h1>
          <p className="text-gray-300">Interact with your intelligent avatar assistant</p>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Avatar Display Window */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30 p-6 flex flex-col">
            <h2 className="text-2xl font-semibold text-white mb-4">Avatar Display</h2>
            <div className="flex-1 bg-black/40 rounded-xl flex items-center justify-center relative overflow-hidden border-2 border-purple-500/20">
              {/* Placeholder for avatar video/animation */}
              <div className="text-center">
                <div className="w-48 h-48 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                  <div className="w-44 h-44 rounded-full bg-slate-900 flex items-center justify-center">
                    <svg className="w-24 h-24 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-lg">Avatar will appear here</p>
                <p className="text-gray-500 text-sm mt-2">Video/3D model integration pending</p>
              </div>
              
              {/* Processing indicator */}
              {isProcessing && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                  Processing...
                </div>
              )}
            </div>
          </div>

          {/* Chat & Input Area */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30 p-6 flex flex-col">
            <h2 className="text-2xl font-semibold text-white mb-4">Conversation</h2>
            
            {/* Messages Display */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 bg-black/20 rounded-xl p-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-lg">Start a conversation with your AI avatar</p>
                  <p className="text-sm mt-2">Type your message below or use voice input</p>
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
                      <p className="text-sm font-medium mb-1">
                        {message.role === 'user' ? 'You' : 'AI Avatar'}
                      </p>
                      <p>{message.content}</p>
                    </div>
                  </div>
                ))
              )}
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
                className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl border border-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

            {/* API Connection Note */}
            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-yellow-500/30">
              <p className="text-yellow-400 text-xs">
                <span className="font-semibold">Note:</span> Python backend API connection pending. 
                The structure is ready for integration at <code className="bg-black/30 px-1 rounded">/api/text-to-speech</code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-400 text-sm">
          <p>AI Avatar Platform • Ready for Python backend integration</p>
        </footer>
      </div>
    </main>
  )
}
