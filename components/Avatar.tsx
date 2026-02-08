'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Viseme to mouth shape mapping
const VISEME_SHAPES = {
  sil: { mouthWidth: 0.3, mouthHeight: 0.05, mouthOpen: 0 },
  PP: { mouthWidth: 0.15, mouthHeight: 0.02, mouthOpen: 0 },  // Lips pressed
  FF: { mouthWidth: 0.35, mouthHeight: 0.1, mouthOpen: 0.1 },  // Teeth on lip
  TH: { mouthWidth: 0.3, mouthHeight: 0.15, mouthOpen: 0.2 },  // Tongue out
  DD: { mouthWidth: 0.25, mouthHeight: 0.12, mouthOpen: 0.15 }, // Tongue tap
  kk: { mouthWidth: 0.28, mouthHeight: 0.18, mouthOpen: 0.2 },  // Back of mouth
  CH: { mouthWidth: 0.2, mouthHeight: 0.2, mouthOpen: 0.15 },   // Sh sound
  SS: { mouthWidth: 0.22, mouthHeight: 0.08, mouthOpen: 0.1 },  // S sound
  nn: { mouthWidth: 0.25, mouthHeight: 0.1, mouthOpen: 0.1 },   // N sound
  RR: { mouthWidth: 0.28, mouthHeight: 0.2, mouthOpen: 0.25 },  // R sound
  aa: { mouthWidth: 0.35, mouthHeight: 0.4, mouthOpen: 0.5 },   // Ah sound
  E: { mouthWidth: 0.38, mouthHeight: 0.25, mouthOpen: 0.3 },   // Eh sound
  I: { mouthWidth: 0.35, mouthHeight: 0.15, mouthOpen: 0.2 },   // Ee sound
  O: { mouthWidth: 0.25, mouthHeight: 0.35, mouthOpen: 0.4 },   // Oh sound
  U: { mouthWidth: 0.18, mouthHeight: 0.28, mouthOpen: 0.35 },  // Oo sound
}

interface Viseme {
  time: number
  viseme: string
  duration: number
}

interface AvatarProps {
  visemes: Viseme[]
  isPlaying: boolean
  currentTime: number
}

const Avatar: React.FC<AvatarProps> = ({ visemes, isPlaying, currentTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentViseme, setCurrentViseme] = useState('sil')
  const animationFrameRef = useRef<number>()

  // Find current viseme based on audio time
  useEffect(() => {
    if (!isPlaying || visemes.length === 0) {
      setCurrentViseme('sil')
      return
    }

    // Find the viseme that should be displayed at current time
    let activeViseme = 'sil'
    for (const v of visemes) {
      if (currentTime >= v.time && currentTime < v.time + v.duration) {
        activeViseme = v.viseme
        break
      }
    }
    setCurrentViseme(activeViseme)
  }, [currentTime, visemes, isPlaying])

  // Draw avatar
  const drawAvatar = useCallback((visemeKey: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Get mouth shape for current viseme
    const mouthShape = VISEME_SHAPES[visemeKey as keyof typeof VISEME_SHAPES] || VISEME_SHAPES.sil

    // Draw face background (gradient)
    const faceGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150)
    faceGradient.addColorStop(0, '#FFE0BD')
    faceGradient.addColorStop(1, '#FFCD94')
    
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, 140, 170, 0, 0, 2 * Math.PI)
    ctx.fillStyle = faceGradient
    ctx.fill()
    ctx.strokeStyle = '#E8B87D'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw hair
    ctx.fillStyle = '#4A3728'
    ctx.beginPath()
    ctx.ellipse(centerX, centerY - 80, 145, 100, 0, Math.PI, 2 * Math.PI)
    ctx.fill()

    // Draw eyes
    const eyeY = centerY - 30
    const eyeSpacing = 50

    // Left eye white
    ctx.beginPath()
    ctx.ellipse(centerX - eyeSpacing, eyeY, 25, 18, 0, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.stroke()

    // Left eye iris
    ctx.beginPath()
    ctx.ellipse(centerX - eyeSpacing, eyeY, 12, 14, 0, 0, 2 * Math.PI)
    ctx.fillStyle = '#6B4423'
    ctx.fill()

    // Left eye pupil
    ctx.beginPath()
    ctx.arc(centerX - eyeSpacing, eyeY, 6, 0, 2 * Math.PI)
    ctx.fillStyle = '#000'
    ctx.fill()

    // Left eye highlight
    ctx.beginPath()
    ctx.arc(centerX - eyeSpacing - 3, eyeY - 4, 3, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFF'
    ctx.fill()

    // Right eye white
    ctx.beginPath()
    ctx.ellipse(centerX + eyeSpacing, eyeY, 25, 18, 0, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.stroke()

    // Right eye iris
    ctx.beginPath()
    ctx.ellipse(centerX + eyeSpacing, eyeY, 12, 14, 0, 0, 2 * Math.PI)
    ctx.fillStyle = '#6B4423'
    ctx.fill()

    // Right eye pupil
    ctx.beginPath()
    ctx.arc(centerX + eyeSpacing, eyeY, 6, 0, 2 * Math.PI)
    ctx.fillStyle = '#000'
    ctx.fill()

    // Right eye highlight
    ctx.beginPath()
    ctx.arc(centerX + eyeSpacing - 3, eyeY - 4, 3, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFF'
    ctx.fill()

    // Draw eyebrows
    ctx.beginPath()
    ctx.strokeStyle = '#4A3728'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.moveTo(centerX - eyeSpacing - 20, eyeY - 30)
    ctx.quadraticCurveTo(centerX - eyeSpacing, eyeY - 38, centerX - eyeSpacing + 20, eyeY - 30)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX + eyeSpacing - 20, eyeY - 30)
    ctx.quadraticCurveTo(centerX + eyeSpacing, eyeY - 38, centerX + eyeSpacing + 20, eyeY - 30)
    ctx.stroke()

    // Draw nose
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - 10)
    ctx.lineTo(centerX - 10, centerY + 30)
    ctx.quadraticCurveTo(centerX, centerY + 35, centerX + 10, centerY + 30)
    ctx.strokeStyle = '#D4A574'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw mouth based on viseme
    const mouthY = centerY + 70
    const mouthWidthPx = mouthShape.mouthWidth * 200
    const mouthHeightPx = mouthShape.mouthHeight * 100
    const mouthOpenPx = mouthShape.mouthOpen * 50

    // Outer lips
    ctx.beginPath()
    ctx.ellipse(centerX, mouthY, mouthWidthPx, mouthHeightPx + mouthOpenPx, 0, 0, 2 * Math.PI)
    ctx.fillStyle = '#CC7777'
    ctx.fill()

    // Inner mouth (dark)
    if (mouthOpenPx > 5) {
      ctx.beginPath()
      ctx.ellipse(centerX, mouthY + 2, mouthWidthPx * 0.7, mouthHeightPx * 0.6 + mouthOpenPx * 0.8, 0, 0, 2 * Math.PI)
      ctx.fillStyle = '#4A1A1A'
      ctx.fill()

      // Teeth (only visible when mouth is open enough)
      if (mouthOpenPx > 15) {
        ctx.beginPath()
        ctx.ellipse(centerX, mouthY - mouthOpenPx * 0.3, mouthWidthPx * 0.5, 8, 0, 0, Math.PI)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
      }

      // Tongue hint
      if (mouthOpenPx > 20) {
        ctx.beginPath()
        ctx.ellipse(centerX, mouthY + mouthOpenPx * 0.4, mouthWidthPx * 0.4, 10, 0, 0, Math.PI)
        ctx.fillStyle = '#B85555'
        ctx.fill()
      }
    }

    // Lip line
    ctx.beginPath()
    ctx.moveTo(centerX - mouthWidthPx, mouthY)
    ctx.quadraticCurveTo(centerX, mouthY - 5, centerX + mouthWidthPx, mouthY)
    ctx.strokeStyle = '#AA5555'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw blush
    ctx.beginPath()
    ctx.ellipse(centerX - 80, centerY + 20, 25, 15, 0, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255, 150, 150, 0.3)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(centerX + 80, centerY + 20, 25, 15, 0, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255, 150, 150, 0.3)'
    ctx.fill()

  }, [])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawAvatar(currentViseme)
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [currentViseme, drawAvatar])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {isPlaying && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
          Speaking...
        </div>
      )}
    </div>
  )
}

export default Avatar
