'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Viseme to mouth shape parameters
// These control how the mouth is drawn for each viseme
const VISEME_MOUTH_PARAMS = {
  sil: { openness: 0.0, width: 0.5, lipRound: 0.5 },      // Silence - closed
  PP: { openness: 0.02, width: 0.3, lipRound: 0.2 },      // P, B, M - lips pressed
  FF: { openness: 0.1, width: 0.6, lipRound: 0.3 },       // F, V - teeth on lip
  TH: { openness: 0.15, width: 0.55, lipRound: 0.4 },     // TH - tongue out
  DD: { openness: 0.2, width: 0.5, lipRound: 0.5 },       // D, T - tongue tap
  kk: { openness: 0.25, width: 0.5, lipRound: 0.5 },      // K, G - back mouth
  CH: { openness: 0.2, width: 0.4, lipRound: 0.3 },       // CH, SH - pursed
  SS: { openness: 0.1, width: 0.55, lipRound: 0.4 },      // S, Z - teeth close
  nn: { openness: 0.15, width: 0.5, lipRound: 0.5 },      // N, L - neutral open
  RR: { openness: 0.3, width: 0.45, lipRound: 0.4 },      // R - slightly pursed
  aa: { openness: 0.7, width: 0.6, lipRound: 0.6 },       // AH - wide open
  E: { openness: 0.4, width: 0.65, lipRound: 0.7 },       // EH - medium open wide
  I: { openness: 0.25, width: 0.7, lipRound: 0.8 },       // EE - smile
  O: { openness: 0.5, width: 0.35, lipRound: 0.2 },       // OH - round
  U: { openness: 0.35, width: 0.25, lipRound: 0.1 },      // OO - very round
}

interface Viseme {
  time: number
  viseme: string
  duration: number
}

interface HumanAvatarProps {
  visemes: Viseme[]
  isPlaying: boolean
  currentTime: number
}

// Face landmark indices for mouth (MediaPipe compatible)
const UPPER_LIP_INDICES = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]
const LOWER_LIP_INDICES = [146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
const OUTER_LIP_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]

const HumanAvatar: React.FC<HumanAvatarProps> = ({ visemes, isPlaying, currentTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentViseme, setCurrentViseme] = useState('sil')
  const animationFrameRef = useRef<number>()
  const targetParamsRef = useRef(VISEME_MOUTH_PARAMS.sil)
  const currentParamsRef = useRef({ ...VISEME_MOUTH_PARAMS.sil })

  // Find current viseme based on audio time
  useEffect(() => {
    if (!isPlaying || visemes.length === 0) {
      setCurrentViseme('sil')
      return
    }

    let activeViseme = 'sil'
    for (const v of visemes) {
      if (currentTime >= v.time && currentTime < v.time + v.duration) {
        activeViseme = v.viseme
        break
      }
    }
    setCurrentViseme(activeViseme)
  }, [currentTime, visemes, isPlaying])

  // Update target params when viseme changes
  useEffect(() => {
    const params = VISEME_MOUTH_PARAMS[currentViseme as keyof typeof VISEME_MOUTH_PARAMS] || VISEME_MOUTH_PARAMS.sil
    targetParamsRef.current = params
  }, [currentViseme])

  // Smooth interpolation function
  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor
  }

  // Draw realistic human face
  const drawFace = useCallback(() => {
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

    // Smooth interpolation towards target mouth params
    const smoothFactor = 0.15
    currentParamsRef.current = {
      openness: lerp(currentParamsRef.current.openness, targetParamsRef.current.openness, smoothFactor),
      width: lerp(currentParamsRef.current.width, targetParamsRef.current.width, smoothFactor),
      lipRound: lerp(currentParamsRef.current.lipRound, targetParamsRef.current.lipRound, smoothFactor),
    }

    const { openness, width: mouthWidth, lipRound } = currentParamsRef.current

    // Background gradient (skin tone base)
    const bgGradient = ctx.createRadialGradient(centerX, centerY - 20, 0, centerX, centerY, 280)
    bgGradient.addColorStop(0, '#2a1810')
    bgGradient.addColorStop(1, '#1a0f0a')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // Face shape with realistic proportions
    const faceWidth = 160
    const faceHeight = 200

    // Draw hair (background)
    ctx.beginPath()
    ctx.ellipse(centerX, centerY - 70, faceWidth + 30, 100, 0, Math.PI, 2 * Math.PI)
    ctx.fillStyle = '#1a0f05'
    ctx.fill()

    // Face outline with gradient
    const faceGradient = ctx.createRadialGradient(centerX, centerY - 30, 20, centerX, centerY + 20, faceHeight)
    faceGradient.addColorStop(0, '#f5dcc8')
    faceGradient.addColorStop(0.5, '#e8c4a8')
    faceGradient.addColorStop(1, '#d4a982')
    
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, faceWidth, faceHeight, 0, 0, 2 * Math.PI)
    ctx.fillStyle = faceGradient
    ctx.fill()

    // Subtle face contour shadows
    ctx.beginPath()
    ctx.ellipse(centerX - 90, centerY + 20, 30, 80, 0.2, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(180, 140, 110, 0.3)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(centerX + 90, centerY + 20, 30, 80, -0.2, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(180, 140, 110, 0.3)'
    ctx.fill()

    // Forehead highlight
    ctx.beginPath()
    ctx.ellipse(centerX, centerY - 100, 60, 40, 0, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255, 245, 235, 0.3)'
    ctx.fill()

    // Draw eyebrows
    const eyebrowY = centerY - 70
    const eyeSpacing = 55

    // Left eyebrow
    ctx.beginPath()
    ctx.moveTo(centerX - eyeSpacing - 35, eyebrowY + 5)
    ctx.quadraticCurveTo(centerX - eyeSpacing, eyebrowY - 10, centerX - eyeSpacing + 35, eyebrowY)
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#3d2817'
    ctx.stroke()

    // Right eyebrow
    ctx.beginPath()
    ctx.moveTo(centerX + eyeSpacing - 35, eyebrowY)
    ctx.quadraticCurveTo(centerX + eyeSpacing, eyebrowY - 10, centerX + eyeSpacing + 35, eyebrowY + 5)
    ctx.stroke()

    // Draw eyes
    const eyeY = centerY - 40

    // Eye sockets (shadow)
    ctx.beginPath()
    ctx.ellipse(centerX - eyeSpacing, eyeY, 32, 22, 0, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(180, 150, 130, 0.4)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(centerX + eyeSpacing, eyeY, 32, 22, 0, 0, 2 * Math.PI)
    ctx.fill()

    // Eye whites
    ctx.beginPath()
    ctx.ellipse(centerX - eyeSpacing, eyeY, 26, 16, 0, 0, 2 * Math.PI)
    ctx.fillStyle = '#fefefe'
    ctx.fill()
    ctx.strokeStyle = '#c9b8a8'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.beginPath()
    ctx.ellipse(centerX + eyeSpacing, eyeY, 26, 16, 0, 0, 2 * Math.PI)
    ctx.fillStyle = '#fefefe'
    ctx.fill()
    ctx.stroke()

    // Irises
    const irisGradient = ctx.createRadialGradient(
      centerX - eyeSpacing - 2, eyeY - 2, 0,
      centerX - eyeSpacing, eyeY, 14
    )
    irisGradient.addColorStop(0, '#6b5344')
    irisGradient.addColorStop(0.5, '#4a3728')
    irisGradient.addColorStop(1, '#2d1f14')

    ctx.beginPath()
    ctx.arc(centerX - eyeSpacing, eyeY, 12, 0, 2 * Math.PI)
    ctx.fillStyle = irisGradient
    ctx.fill()

    const irisGradient2 = ctx.createRadialGradient(
      centerX + eyeSpacing - 2, eyeY - 2, 0,
      centerX + eyeSpacing, eyeY, 14
    )
    irisGradient2.addColorStop(0, '#6b5344')
    irisGradient2.addColorStop(0.5, '#4a3728')
    irisGradient2.addColorStop(1, '#2d1f14')

    ctx.beginPath()
    ctx.arc(centerX + eyeSpacing, eyeY, 12, 0, 2 * Math.PI)
    ctx.fillStyle = irisGradient2
    ctx.fill()

    // Pupils
    ctx.beginPath()
    ctx.arc(centerX - eyeSpacing, eyeY, 5, 0, 2 * Math.PI)
    ctx.fillStyle = '#000'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centerX + eyeSpacing, eyeY, 5, 0, 2 * Math.PI)
    ctx.fill()

    // Eye highlights
    ctx.beginPath()
    ctx.arc(centerX - eyeSpacing - 4, eyeY - 4, 3, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centerX + eyeSpacing - 4, eyeY - 4, 3, 0, 2 * Math.PI)
    ctx.fill()

    // Eyelids (upper)
    ctx.beginPath()
    ctx.moveTo(centerX - eyeSpacing - 28, eyeY)
    ctx.quadraticCurveTo(centerX - eyeSpacing, eyeY - 18, centerX - eyeSpacing + 28, eyeY)
    ctx.strokeStyle = '#8b7355'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX + eyeSpacing - 28, eyeY)
    ctx.quadraticCurveTo(centerX + eyeSpacing, eyeY - 18, centerX + eyeSpacing + 28, eyeY)
    ctx.stroke()

    // Eyelashes
    ctx.strokeStyle = '#2d1f14'
    ctx.lineWidth = 1.5
    for (let i = -2; i <= 2; i++) {
      const lashX = centerX - eyeSpacing + i * 8
      ctx.beginPath()
      ctx.moveTo(lashX, eyeY - 14)
      ctx.lineTo(lashX + i * 0.5, eyeY - 20)
      ctx.stroke()
    }
    for (let i = -2; i <= 2; i++) {
      const lashX = centerX + eyeSpacing + i * 8
      ctx.beginPath()
      ctx.moveTo(lashX, eyeY - 14)
      ctx.lineTo(lashX + i * 0.5, eyeY - 20)
      ctx.stroke()
    }

    // Nose
    const noseY = centerY + 20
    
    // Nose bridge shadow
    ctx.beginPath()
    ctx.moveTo(centerX - 8, centerY - 30)
    ctx.quadraticCurveTo(centerX - 6, noseY - 20, centerX - 15, noseY + 15)
    ctx.strokeStyle = 'rgba(180, 140, 110, 0.5)'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX + 8, centerY - 30)
    ctx.quadraticCurveTo(centerX + 6, noseY - 20, centerX + 15, noseY + 15)
    ctx.stroke()

    // Nose tip
    ctx.beginPath()
    ctx.ellipse(centerX, noseY + 10, 18, 12, 0, 0, Math.PI)
    ctx.fillStyle = 'rgba(220, 180, 150, 0.5)'
    ctx.fill()

    // Nostrils
    ctx.beginPath()
    ctx.ellipse(centerX - 12, noseY + 15, 6, 4, 0.3, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(140, 100, 80, 0.6)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(centerX + 12, noseY + 15, 6, 4, -0.3, 0, 2 * Math.PI)
    ctx.fill()

    // Nose highlight
    ctx.beginPath()
    ctx.ellipse(centerX, noseY, 6, 8, 0, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255, 245, 235, 0.4)'
    ctx.fill()

    // ===== MOUTH (Animated based on visemes) =====
    const mouthY = centerY + 85
    const mouthBaseWidth = 45 * mouthWidth + 25
    const mouthOpenAmount = openness * 35
    const lipThickness = 8 + openness * 4

    // Mouth shadow/depth
    ctx.beginPath()
    ctx.ellipse(centerX, mouthY + 5, mouthBaseWidth + 5, mouthOpenAmount + 10, 0, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(120, 80, 60, 0.3)'
    ctx.fill()

    // Mouth interior (dark)
    if (openness > 0.05) {
      ctx.beginPath()
      ctx.ellipse(centerX, mouthY + mouthOpenAmount * 0.3, mouthBaseWidth * 0.85, mouthOpenAmount * 0.8, 0, 0, 2 * Math.PI)
      ctx.fillStyle = '#2a1510'
      ctx.fill()

      // Teeth (upper)
      if (openness > 0.15) {
        ctx.beginPath()
        ctx.ellipse(centerX, mouthY - mouthOpenAmount * 0.2, mouthBaseWidth * 0.65, 8, 0, 0, Math.PI)
        ctx.fillStyle = '#f8f8f0'
        ctx.fill()
      }

      // Tongue
      if (openness > 0.25) {
        ctx.beginPath()
        ctx.ellipse(centerX, mouthY + mouthOpenAmount * 0.5, mouthBaseWidth * 0.5, mouthOpenAmount * 0.4, 0, 0, Math.PI)
        ctx.fillStyle = '#c46a6a'
        ctx.fill()
      }
    }

    // Upper lip
    const upperLipGradient = ctx.createLinearGradient(centerX, mouthY - lipThickness, centerX, mouthY + 5)
    upperLipGradient.addColorStop(0, '#c98080')
    upperLipGradient.addColorStop(0.5, '#b86868')
    upperLipGradient.addColorStop(1, '#a05555')

    ctx.beginPath()
    ctx.moveTo(centerX - mouthBaseWidth, mouthY)
    ctx.quadraticCurveTo(centerX - mouthBaseWidth * 0.5, mouthY - lipThickness * (1 - openness * 0.5), centerX - 5, mouthY - lipThickness * 0.8)
    ctx.quadraticCurveTo(centerX, mouthY - lipThickness * 1.2, centerX + 5, mouthY - lipThickness * 0.8)
    ctx.quadraticCurveTo(centerX + mouthBaseWidth * 0.5, mouthY - lipThickness * (1 - openness * 0.5), centerX + mouthBaseWidth, mouthY)
    ctx.quadraticCurveTo(centerX + mouthBaseWidth * 0.5, mouthY + 2, centerX, mouthY + 3)
    ctx.quadraticCurveTo(centerX - mouthBaseWidth * 0.5, mouthY + 2, centerX - mouthBaseWidth, mouthY)
    ctx.fillStyle = upperLipGradient
    ctx.fill()

    // Lower lip
    const lowerLipGradient = ctx.createLinearGradient(centerX, mouthY, centerX, mouthY + lipThickness + mouthOpenAmount)
    lowerLipGradient.addColorStop(0, '#a05555')
    lowerLipGradient.addColorStop(0.5, '#c87070')
    lowerLipGradient.addColorStop(1, '#d88888')

    ctx.beginPath()
    ctx.moveTo(centerX - mouthBaseWidth, mouthY)
    ctx.quadraticCurveTo(centerX - mouthBaseWidth * 0.5, mouthY + mouthOpenAmount * 0.5, centerX, mouthY + lipThickness + mouthOpenAmount)
    ctx.quadraticCurveTo(centerX + mouthBaseWidth * 0.5, mouthY + mouthOpenAmount * 0.5, centerX + mouthBaseWidth, mouthY)
    ctx.quadraticCurveTo(centerX + mouthBaseWidth * 0.5, mouthY + 2, centerX, mouthY + 3)
    ctx.quadraticCurveTo(centerX - mouthBaseWidth * 0.5, mouthY + 2, centerX - mouthBaseWidth, mouthY)
    ctx.fillStyle = lowerLipGradient
    ctx.fill()

    // Lip highlight
    ctx.beginPath()
    ctx.ellipse(centerX, mouthY + lipThickness * 0.5 + mouthOpenAmount * 0.3, mouthBaseWidth * 0.4, lipThickness * 0.3, 0, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255, 200, 200, 0.3)'
    ctx.fill()

    // Lip corners
    ctx.beginPath()
    ctx.arc(centerX - mouthBaseWidth, mouthY, 3, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(160, 100, 80, 0.5)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centerX + mouthBaseWidth, mouthY, 3, 0, 2 * Math.PI)
    ctx.fill()

    // Philtrum (above upper lip)
    ctx.beginPath()
    ctx.moveTo(centerX - 8, noseY + 20)
    ctx.quadraticCurveTo(centerX - 6, mouthY - lipThickness - 5, centerX - 3, mouthY - lipThickness)
    ctx.strokeStyle = 'rgba(180, 140, 120, 0.4)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX + 8, noseY + 20)
    ctx.quadraticCurveTo(centerX + 6, mouthY - lipThickness - 5, centerX + 3, mouthY - lipThickness)
    ctx.stroke()

    // Cheek blush
    ctx.beginPath()
    ctx.ellipse(centerX - 85, centerY + 30, 30, 20, 0.2, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(220, 160, 150, 0.25)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(centerX + 85, centerY + 30, 30, 20, -0.2, 0, 2 * Math.PI)
    ctx.fill()

    // Chin
    ctx.beginPath()
    ctx.ellipse(centerX, centerY + 160, 35, 25, 0, 0, Math.PI)
    ctx.fillStyle = 'rgba(230, 200, 180, 0.3)'
    ctx.fill()

    // Jawline highlights
    ctx.beginPath()
    ctx.moveTo(centerX - 100, centerY + 60)
    ctx.quadraticCurveTo(centerX - 60, centerY + 160, centerX, centerY + 180)
    ctx.quadraticCurveTo(centerX + 60, centerY + 160, centerX + 100, centerY + 60)
    ctx.strokeStyle = 'rgba(200, 170, 150, 0.2)'
    ctx.lineWidth = 3
    ctx.stroke()

  }, [])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawFace()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [drawFace])

  return (
    <div className="relative flex items-center justify-center h-full">
      <canvas
        ref={canvasRef}
        width={400}
        height={450}
        className="rounded-xl"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {isPlaying && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500/80 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Speaking...
        </div>
      )}
      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        Viseme: {currentViseme}
      </div>
    </div>
  )
}

export default HumanAvatar
