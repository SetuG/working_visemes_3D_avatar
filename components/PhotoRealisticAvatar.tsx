'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Viseme to mouth frame mapping - each viseme maps to a specific mouth position
const VISEME_TO_FRAME = {
  sil: 0,   // Closed mouth
  PP: 1,    // Lips pressed (P, B, M)
  FF: 2,    // Teeth on lip (F, V)
  TH: 3,    // Tongue between teeth
  DD: 4,    // Tongue behind teeth (D, T, N)
  kk: 5,    // Back of mouth (K, G)
  CH: 6,    // Pursed lips (CH, SH, J)
  SS: 7,    // Teeth together (S, Z)
  nn: 8,    // Slightly open (N, L)
  RR: 9,    // R sound
  aa: 10,   // Wide open (AH)
  E: 11,    // Medium open (EH)
  I: 12,    // Smile (EE)
  O: 13,    // Round (OH)
  U: 14,    // Very round (OO)
}

interface Viseme {
  time: number
  viseme: string
  duration: number
}

interface PhotoRealisticAvatarProps {
  visemes: Viseme[]
  isPlaying: boolean
  currentTime: number
}

const PhotoRealisticAvatar: React.FC<PhotoRealisticAvatarProps> = ({ 
  visemes, 
  isPlaying, 
  currentTime 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentViseme, setCurrentViseme] = useState('sil')
  const [faceLoaded, setFaceLoaded] = useState(false)
  const animationFrameRef = useRef<number>()
  const faceImageRef = useRef<HTMLImageElement | null>(null)
  
  // Mouth parameters for smooth animation
  const targetMouthRef = useRef({ open: 0, spread: 0, round: 0 })
  const currentMouthRef = useRef({ open: 0, spread: 0, round: 0 })

  // Realistic mouth parameters for each viseme
  const MOUTH_PARAMS: Record<string, { open: number; spread: number; round: number }> = {
    sil: { open: 0, spread: 0, round: 0 },
    PP: { open: 0, spread: -0.2, round: 0.1 },
    FF: { open: 0.1, spread: 0.1, round: 0 },
    TH: { open: 0.15, spread: 0.05, round: 0 },
    DD: { open: 0.2, spread: 0, round: 0 },
    kk: { open: 0.15, spread: 0, round: 0 },
    CH: { open: 0.1, spread: -0.15, round: 0.2 },
    SS: { open: 0.08, spread: 0.2, round: 0 },
    nn: { open: 0.12, spread: 0, round: 0 },
    RR: { open: 0.2, spread: -0.1, round: 0.15 },
    aa: { open: 0.7, spread: 0.3, round: 0 },
    E: { open: 0.35, spread: 0.4, round: 0 },
    I: { open: 0.2, spread: 0.6, round: 0 },
    O: { open: 0.5, spread: -0.3, round: 0.6 },
    U: { open: 0.35, spread: -0.4, round: 0.7 },
  }

  // Load the realistic face image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    // Using a high-quality AI-generated realistic face (royalty-free)
    img.src = 'https://thispersondoesnotexist.com/'
    
    img.onload = () => {
      faceImageRef.current = img
      setFaceLoaded(true)
    }
    
    img.onerror = () => {
      // Fallback: Create a more realistic rendered face
      createRealisticFaceImage()
    }
    
    // Start with fallback immediately in case external image fails
    createRealisticFaceImage()
  }, [])

  // Create a more realistic face using advanced canvas rendering
  const createRealisticFaceImage = () => {
    const offscreen = document.createElement('canvas')
    offscreen.width = 400
    offscreen.height = 500
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    // Draw realistic face
    drawDetailedFace(ctx, 400, 500)

    // Convert to image
    const img = new Image()
    img.src = offscreen.toDataURL()
    img.onload = () => {
      faceImageRef.current = img
      setFaceLoaded(true)
    }
  }

  // Draw a detailed realistic face
  const drawDetailedFace = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2
    const centerY = height / 2

    // Dark background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Face shape with realistic skin gradient
    const faceGradient = ctx.createRadialGradient(
      centerX, centerY - 20, 0,
      centerX, centerY + 50, 200
    )
    faceGradient.addColorStop(0, '#fce0c4')
    faceGradient.addColorStop(0.3, '#f5d5b8')
    faceGradient.addColorStop(0.6, '#e8c4a0')
    faceGradient.addColorStop(1, '#d4a574')

    // Draw face shape (more realistic oval)
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - 180)
    ctx.bezierCurveTo(
      centerX + 150, centerY - 150,
      centerX + 140, centerY + 100,
      centerX + 80, centerY + 180
    )
    ctx.bezierCurveTo(
      centerX + 40, centerY + 200,
      centerX - 40, centerY + 200,
      centerX - 80, centerY + 180
    )
    ctx.bezierCurveTo(
      centerX - 140, centerY + 100,
      centerX - 150, centerY - 150,
      centerX, centerY - 180
    )
    ctx.fillStyle = faceGradient
    ctx.fill()

    // Subtle skin texture
    ctx.globalAlpha = 0.03
    for (let i = 0; i < 1000; i++) {
      const x = centerX + (Math.random() - 0.5) * 280
      const y = centerY + (Math.random() - 0.5) * 360
      ctx.beginPath()
      ctx.arc(x, y, Math.random() * 2, 0, Math.PI * 2)
      ctx.fillStyle = Math.random() > 0.5 ? '#c4a080' : '#f8e8d8'
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Hair with realistic strands
    const hairGradient = ctx.createLinearGradient(centerX - 160, 0, centerX + 160, 200)
    hairGradient.addColorStop(0, '#2a1810')
    hairGradient.addColorStop(0.5, '#3d2817')
    hairGradient.addColorStop(1, '#1a0f0a')

    ctx.beginPath()
    ctx.ellipse(centerX, centerY - 120, 170, 130, 0, Math.PI, 2 * Math.PI)
    ctx.fillStyle = hairGradient
    ctx.fill()

    // Hair strands for realism
    ctx.strokeStyle = '#1a0f0a'
    ctx.lineWidth = 1
    for (let i = 0; i < 50; i++) {
      const startX = centerX - 150 + i * 6
      ctx.beginPath()
      ctx.moveTo(startX, centerY - 180 + Math.random() * 30)
      ctx.quadraticCurveTo(
        startX + Math.random() * 20 - 10,
        centerY - 100,
        startX + Math.random() * 30 - 15,
        centerY - 50 + Math.random() * 20
      )
      ctx.stroke()
    }

    // Forehead shadow
    const foreheadShadow = ctx.createLinearGradient(centerX, centerY - 150, centerX, centerY - 80)
    foreheadShadow.addColorStop(0, 'rgba(180, 140, 100, 0)')
    foreheadShadow.addColorStop(1, 'rgba(180, 140, 100, 0.1)')
    ctx.fillStyle = foreheadShadow
    ctx.fillRect(centerX - 120, centerY - 150, 240, 70)

    // Eyebrows with individual hairs
    drawRealisticEyebrow(ctx, centerX - 60, centerY - 85, 60, -0.15)
    drawRealisticEyebrow(ctx, centerX + 60, centerY - 85, -60, 0.15)

    // Eyes
    drawRealisticEye(ctx, centerX - 55, centerY - 50, false)
    drawRealisticEye(ctx, centerX + 55, centerY - 50, true)

    // Nose
    drawRealisticNose(ctx, centerX, centerY + 20)

    // Cheek contours
    ctx.beginPath()
    ctx.ellipse(centerX - 90, centerY + 10, 40, 60, 0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200, 150, 120, 0.15)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(centerX + 90, centerY + 10, 40, 60, -0.3, 0, Math.PI * 2)
    ctx.fill()

    // Subtle blush
    ctx.beginPath()
    ctx.ellipse(centerX - 75, centerY + 30, 30, 18, 0.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(220, 150, 140, 0.2)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(centerX + 75, centerY + 30, 30, 18, -0.2, 0, Math.PI * 2)
    ctx.fill()

    // Philtrum (above lip)
    ctx.beginPath()
    ctx.moveTo(centerX - 8, centerY + 50)
    ctx.quadraticCurveTo(centerX - 5, centerY + 70, centerX - 3, centerY + 85)
    ctx.strokeStyle = 'rgba(180, 140, 120, 0.4)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX + 8, centerY + 50)
    ctx.quadraticCurveTo(centerX + 5, centerY + 70, centerX + 3, centerY + 85)
    ctx.stroke()

    // Chin definition
    ctx.beginPath()
    ctx.ellipse(centerX, centerY + 170, 50, 30, 0, 0, Math.PI)
    ctx.fillStyle = 'rgba(240, 210, 180, 0.3)'
    ctx.fill()

    // Jawline shadows
    ctx.beginPath()
    ctx.moveTo(centerX - 120, centerY + 50)
    ctx.quadraticCurveTo(centerX - 100, centerY + 150, centerX - 50, centerY + 190)
    ctx.strokeStyle = 'rgba(180, 140, 110, 0.3)'
    ctx.lineWidth = 8
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX + 120, centerY + 50)
    ctx.quadraticCurveTo(centerX + 100, centerY + 150, centerX + 50, centerY + 190)
    ctx.stroke()

    // Neck
    ctx.beginPath()
    ctx.moveTo(centerX - 60, centerY + 190)
    ctx.quadraticCurveTo(centerX - 70, centerY + 250, centerX - 80, centerY + 300)
    ctx.lineTo(centerX + 80, centerY + 300)
    ctx.quadraticCurveTo(centerX + 70, centerY + 250, centerX + 60, centerY + 190)
    ctx.fillStyle = '#e8c4a0'
    ctx.fill()
  }

  const drawRealisticEyebrow = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    angle: number
  ) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)

    // Draw individual eyebrow hairs
    const hairCount = 40
    for (let i = 0; i < hairCount; i++) {
      const hairX = (i / hairCount) * Math.abs(width) * (width > 0 ? 1 : -1)
      const hairLength = 6 + Math.sin(i / hairCount * Math.PI) * 4
      
      ctx.beginPath()
      ctx.moveTo(hairX, 0)
      ctx.lineTo(hairX + (width > 0 ? 2 : -2), -hairLength)
      ctx.strokeStyle = '#3d2817'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    ctx.restore()
  }

  const drawRealisticEye = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    isRight: boolean
  ) => {
    // Eye socket shadow
    ctx.beginPath()
    ctx.ellipse(x, y, 32, 20, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(140, 100, 80, 0.2)'
    ctx.fill()

    // Eye white with subtle veins
    ctx.beginPath()
    ctx.ellipse(x, y, 26, 15, 0, 0, Math.PI * 2)
    const eyeWhiteGradient = ctx.createRadialGradient(x, y, 0, x, y, 26)
    eyeWhiteGradient.addColorStop(0, '#ffffff')
    eyeWhiteGradient.addColorStop(0.7, '#f8f8f8')
    eyeWhiteGradient.addColorStop(1, '#e8e4e0')
    ctx.fillStyle = eyeWhiteGradient
    ctx.fill()
    ctx.strokeStyle = '#c8b8a8'
    ctx.lineWidth = 1
    ctx.stroke()

    // Iris with realistic detail
    const irisGradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 13)
    irisGradient.addColorStop(0, '#8b7355')
    irisGradient.addColorStop(0.3, '#6b5344')
    irisGradient.addColorStop(0.7, '#4a3728')
    irisGradient.addColorStop(1, '#2d1f14')

    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fillStyle = irisGradient
    ctx.fill()

    // Iris patterns
    ctx.save()
    ctx.clip()
    for (let i = 0; i < 12; i++) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      const angle = (i / 12) * Math.PI * 2
      ctx.lineTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12)
      ctx.strokeStyle = 'rgba(90, 70, 50, 0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.restore()

    // Pupil
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#000000'
    ctx.fill()

    // Eye highlights
    ctx.beginPath()
    ctx.arc(x - 4, y - 4, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x + 2, y + 2, 1.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fill()

    // Upper eyelid
    ctx.beginPath()
    ctx.moveTo(x - 28, y + 2)
    ctx.quadraticCurveTo(x, y - 18, x + 28, y + 2)
    ctx.strokeStyle = '#5a4030'
    ctx.lineWidth = 2
    ctx.stroke()

    // Eyelashes
    for (let i = 0; i < 8; i++) {
      const lashX = x - 20 + i * 5
      const lashAngle = (i - 3.5) * 0.15
      ctx.beginPath()
      ctx.moveTo(lashX, y - 12)
      ctx.quadraticCurveTo(
        lashX + Math.sin(lashAngle) * 5,
        y - 20,
        lashX + Math.sin(lashAngle) * 8,
        y - 22
      )
      ctx.strokeStyle = '#1a0f0a'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Lower eyelid
    ctx.beginPath()
    ctx.moveTo(x - 26, y + 4)
    ctx.quadraticCurveTo(x, y + 16, x + 26, y + 4)
    ctx.strokeStyle = 'rgba(140, 100, 80, 0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const drawRealisticNose = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Nose bridge highlight
    ctx.beginPath()
    ctx.moveTo(x, y - 60)
    ctx.quadraticCurveTo(x + 3, y - 30, x, y)
    ctx.strokeStyle = 'rgba(255, 240, 230, 0.4)'
    ctx.lineWidth = 8
    ctx.stroke()

    // Nose sides
    ctx.beginPath()
    ctx.moveTo(x - 5, y - 50)
    ctx.quadraticCurveTo(x - 8, y - 20, x - 20, y + 15)
    ctx.strokeStyle = 'rgba(180, 140, 110, 0.4)'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x + 5, y - 50)
    ctx.quadraticCurveTo(x + 8, y - 20, x + 20, y + 15)
    ctx.stroke()

    // Nose tip
    ctx.beginPath()
    ctx.ellipse(x, y + 8, 15, 10, 0, 0, Math.PI)
    ctx.fillStyle = 'rgba(230, 190, 160, 0.5)'
    ctx.fill()

    // Nostrils
    ctx.beginPath()
    ctx.ellipse(x - 10, y + 18, 7, 5, 0.4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(80, 50, 40, 0.6)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(x + 10, y + 18, 7, 5, -0.4, 0, Math.PI * 2)
    ctx.fill()

    // Nose highlight
    ctx.beginPath()
    ctx.ellipse(x, y - 5, 5, 8, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 250, 245, 0.3)'
    ctx.fill()
  }

  // Find current viseme based on audio time
  useEffect(() => {
    if (!isPlaying || visemes.length === 0) {
      setCurrentViseme('sil')
      targetMouthRef.current = MOUTH_PARAMS.sil
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
    targetMouthRef.current = MOUTH_PARAMS[activeViseme] || MOUTH_PARAMS.sil
  }, [currentTime, visemes, isPlaying])

  // Smooth interpolation
  const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor

  // Draw animated mouth
  const drawMouth = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2
    const mouthY = height / 2 + 90

    // Smooth interpolation
    const smoothFactor = 0.2
    currentMouthRef.current = {
      open: lerp(currentMouthRef.current.open, targetMouthRef.current.open, smoothFactor),
      spread: lerp(currentMouthRef.current.spread, targetMouthRef.current.spread, smoothFactor),
      round: lerp(currentMouthRef.current.round, targetMouthRef.current.round, smoothFactor),
    }

    const { open, spread, round } = currentMouthRef.current

    // Mouth dimensions
    const mouthWidth = 35 + spread * 20 - round * 10
    const mouthHeight = 8 + open * 40
    const lipThickness = 6 + open * 2

    // Cover the static mouth area with skin color
    ctx.beginPath()
    ctx.ellipse(centerX, mouthY, 45, 25, 0, 0, Math.PI * 2)
    const skinGradient = ctx.createRadialGradient(centerX, mouthY, 0, centerX, mouthY, 45)
    skinGradient.addColorStop(0, '#f5d5b8')
    skinGradient.addColorStop(1, '#e8c4a0')
    ctx.fillStyle = skinGradient
    ctx.fill()

    // Mouth interior (dark cavity)
    if (open > 0.05) {
      ctx.beginPath()
      ctx.ellipse(centerX, mouthY + mouthHeight * 0.2, mouthWidth * 0.85, mouthHeight * 0.6, 0, 0, Math.PI * 2)
      
      const interiorGradient = ctx.createRadialGradient(centerX, mouthY, 0, centerX, mouthY + 10, mouthHeight)
      interiorGradient.addColorStop(0, '#1a0808')
      interiorGradient.addColorStop(1, '#2a1210')
      ctx.fillStyle = interiorGradient
      ctx.fill()

      // Teeth (upper)
      if (open > 0.15) {
        ctx.beginPath()
        ctx.ellipse(centerX, mouthY - mouthHeight * 0.15, mouthWidth * 0.7, Math.min(8, mouthHeight * 0.25), 0, 0, Math.PI)
        ctx.fillStyle = '#f8f8f4'
        ctx.fill()
        
        // Tooth lines
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)'
        ctx.lineWidth = 0.5
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath()
          ctx.moveTo(centerX + i * 6, mouthY - mouthHeight * 0.15 - 6)
          ctx.lineTo(centerX + i * 6, mouthY - mouthHeight * 0.15 + 2)
          ctx.stroke()
        }
      }

      // Tongue
      if (open > 0.2) {
        ctx.beginPath()
        ctx.ellipse(
          centerX,
          mouthY + mouthHeight * 0.35,
          mouthWidth * 0.5,
          mouthHeight * 0.25,
          0, 0, Math.PI
        )
        const tongueGradient = ctx.createRadialGradient(centerX, mouthY + mouthHeight * 0.3, 0, centerX, mouthY + mouthHeight * 0.4, mouthWidth * 0.5)
        tongueGradient.addColorStop(0, '#d47070')
        tongueGradient.addColorStop(1, '#b85555')
        ctx.fillStyle = tongueGradient
        ctx.fill()
      }
    }

    // Upper lip
    const upperLipGradient = ctx.createLinearGradient(centerX, mouthY - lipThickness - 2, centerX, mouthY + 2)
    upperLipGradient.addColorStop(0, '#d88888')
    upperLipGradient.addColorStop(0.5, '#c87070')
    upperLipGradient.addColorStop(1, '#b85858')

    ctx.beginPath()
    ctx.moveTo(centerX - mouthWidth - 5, mouthY)
    
    // Cupid's bow
    ctx.quadraticCurveTo(centerX - mouthWidth * 0.6, mouthY - lipThickness * 0.8, centerX - 5, mouthY - lipThickness)
    ctx.quadraticCurveTo(centerX, mouthY - lipThickness * 1.3, centerX + 5, mouthY - lipThickness)
    ctx.quadraticCurveTo(centerX + mouthWidth * 0.6, mouthY - lipThickness * 0.8, centerX + mouthWidth + 5, mouthY)
    
    // Inner curve
    ctx.quadraticCurveTo(centerX + mouthWidth * 0.3, mouthY + 2, centerX, mouthY + 3)
    ctx.quadraticCurveTo(centerX - mouthWidth * 0.3, mouthY + 2, centerX - mouthWidth - 5, mouthY)
    
    ctx.fillStyle = upperLipGradient
    ctx.fill()

    // Lower lip
    const lowerLipGradient = ctx.createLinearGradient(centerX, mouthY, centerX, mouthY + lipThickness + mouthHeight * 0.5 + 5)
    lowerLipGradient.addColorStop(0, '#b85858')
    lowerLipGradient.addColorStop(0.3, '#c87070')
    lowerLipGradient.addColorStop(0.7, '#d88888')
    lowerLipGradient.addColorStop(1, '#e09898')

    ctx.beginPath()
    ctx.moveTo(centerX - mouthWidth - 5, mouthY)
    ctx.quadraticCurveTo(centerX - mouthWidth * 0.3, mouthY + 2, centerX, mouthY + 3)
    ctx.quadraticCurveTo(centerX + mouthWidth * 0.3, mouthY + 2, centerX + mouthWidth + 5, mouthY)
    
    // Outer lower curve
    ctx.quadraticCurveTo(
      centerX + mouthWidth * 0.5, 
      mouthY + lipThickness + mouthHeight * 0.4, 
      centerX, 
      mouthY + lipThickness + mouthHeight * 0.5 + 3
    )
    ctx.quadraticCurveTo(
      centerX - mouthWidth * 0.5, 
      mouthY + lipThickness + mouthHeight * 0.4, 
      centerX - mouthWidth - 5, 
      mouthY
    )
    
    ctx.fillStyle = lowerLipGradient
    ctx.fill()

    // Lip highlight
    ctx.beginPath()
    ctx.ellipse(centerX, mouthY + lipThickness * 0.5 + mouthHeight * 0.15, mouthWidth * 0.35, 3, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 220, 220, 0.4)'
    ctx.fill()

    // Lip corners
    ctx.beginPath()
    ctx.arc(centerX - mouthWidth - 5, mouthY, 2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(160, 100, 100, 0.5)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centerX + mouthWidth + 5, mouthY, 2, 0, Math.PI * 2)
    ctx.fill()

    // Upper lip shadow
    ctx.beginPath()
    ctx.moveTo(centerX - mouthWidth, mouthY - lipThickness - 3)
    ctx.quadraticCurveTo(centerX, mouthY - lipThickness - 8, centerX + mouthWidth, mouthY - lipThickness - 3)
    ctx.strokeStyle = 'rgba(180, 140, 120, 0.3)'
    ctx.lineWidth = 2
    ctx.stroke()

  }, [])

  // Main render loop
  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const width = canvas.width
      const height = canvas.height

      // Clear and draw base face
      ctx.clearRect(0, 0, width, height)
      
      if (faceImageRef.current) {
        ctx.drawImage(faceImageRef.current, 0, 0, width, height)
      }

      // Draw animated mouth on top
      drawMouth(ctx, width, height)

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [faceLoaded, drawMouth])

  return (
    <div className="relative flex flex-col items-center justify-center h-full">
      <canvas
        ref={canvasRef}
        width={400}
        height={500}
        className="rounded-xl shadow-2xl"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {/* Status overlay */}
      <div className="absolute top-2 left-2 space-y-1">
        <div className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
          {currentViseme.toUpperCase()}
        </div>
      </div>

      {isPlaying && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 backdrop-blur-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Speaking...
        </div>
      )}
    </div>
  )
}

export default PhotoRealisticAvatar
