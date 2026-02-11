'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface Viseme {
  time: number
  viseme: string
  duration: number
}

interface VideoStyleAvatarProps {
  visemes: Viseme[]
  isPlaying: boolean
  currentTime: number
}

// Mouth shape configurations for each viseme
const MOUTH_SHAPES = {
  sil: { openness: 0, width: 1, roundness: 0, upperLip: 0, lowerLip: 0 },
  PP: { openness: 0, width: 0.8, roundness: 0.2, upperLip: 0.1, lowerLip: 0.1 },
  FF: { openness: 0.15, width: 1.1, roundness: 0, upperLip: -0.1, lowerLip: 0.2 },
  TH: { openness: 0.2, width: 1, roundness: 0, upperLip: 0, lowerLip: 0.15 },
  DD: { openness: 0.25, width: 1, roundness: 0, upperLip: 0, lowerLip: 0.1 },
  kk: { openness: 0.2, width: 0.95, roundness: 0.1, upperLip: 0, lowerLip: 0.1 },
  CH: { openness: 0.15, width: 0.75, roundness: 0.4, upperLip: 0.1, lowerLip: 0.15 },
  SS: { openness: 0.1, width: 1.2, roundness: 0, upperLip: 0, lowerLip: 0 },
  nn: { openness: 0.15, width: 1, roundness: 0, upperLip: 0, lowerLip: 0.05 },
  RR: { openness: 0.3, width: 0.85, roundness: 0.3, upperLip: 0, lowerLip: 0.1 },
  aa: { openness: 0.85, width: 1.2, roundness: 0, upperLip: -0.1, lowerLip: 0.5 },
  E: { openness: 0.45, width: 1.3, roundness: 0, upperLip: -0.05, lowerLip: 0.25 },
  I: { openness: 0.25, width: 1.4, roundness: 0, upperLip: 0, lowerLip: 0.1 },
  O: { openness: 0.6, width: 0.7, roundness: 0.7, upperLip: 0.15, lowerLip: 0.3 },
  U: { openness: 0.4, width: 0.6, roundness: 0.85, upperLip: 0.2, lowerLip: 0.25 },
}

const VideoStyleAvatar: React.FC<VideoStyleAvatarProps> = ({ 
  visemes, 
  isPlaying, 
  currentTime 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentViseme, setCurrentViseme] = useState('sil')
  const animationRef = useRef<number>()
  
  // Animation state with smooth interpolation
  const currentShape = useRef({ ...MOUTH_SHAPES.sil })
  const targetShape = useRef({ ...MOUTH_SHAPES.sil })
  
  // Eye blink state
  const blinkRef = useRef({ value: 0, nextBlink: Date.now() + 2000 })
  
  // Micro-movement state for realism
  const microMovementRef = useRef({ x: 0, y: 0, phase: 0 })

  // Update current viseme based on playback time
  useEffect(() => {
    if (!isPlaying || visemes.length === 0) {
      setCurrentViseme('sil')
      targetShape.current = { ...MOUTH_SHAPES.sil }
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
    targetShape.current = { ...MOUTH_SHAPES[activeViseme as keyof typeof MOUTH_SHAPES] } || { ...MOUTH_SHAPES.sil }
  }, [currentTime, visemes, isPlaying])

  // Smooth interpolation helper
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2 - 20

    // Smooth shape interpolation
    const smoothing = 0.15
    currentShape.current = {
      openness: lerp(currentShape.current.openness, targetShape.current.openness, smoothing),
      width: lerp(currentShape.current.width, targetShape.current.width, smoothing),
      roundness: lerp(currentShape.current.roundness, targetShape.current.roundness, smoothing),
      upperLip: lerp(currentShape.current.upperLip, targetShape.current.upperLip, smoothing),
      lowerLip: lerp(currentShape.current.lowerLip, targetShape.current.lowerLip, smoothing),
    }

    // Update micro-movements for subtle realism
    microMovementRef.current.phase += 0.02
    microMovementRef.current.x = Math.sin(microMovementRef.current.phase) * 0.5
    microMovementRef.current.y = Math.cos(microMovementRef.current.phase * 0.7) * 0.3

    // Update eye blink
    const now = Date.now()
    if (now >= blinkRef.current.nextBlink) {
      blinkRef.current.value = 1
      blinkRef.current.nextBlink = now + 2500 + Math.random() * 3000
    }
    blinkRef.current.value = Math.max(0, blinkRef.current.value - 0.15)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Background with subtle gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
    bgGradient.addColorStop(0, '#1a1a2e')
    bgGradient.addColorStop(0.5, '#16213e')
    bgGradient.addColorStop(1, '#0f0f23')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // Apply micro-movement
    ctx.save()
    ctx.translate(microMovementRef.current.x, microMovementRef.current.y)

    // Draw the realistic face
    drawFace(ctx, centerX, centerY, width, height)
    
    // Draw animated eyes with blink
    drawEyes(ctx, centerX, centerY, blinkRef.current.value)
    
    // Draw animated mouth
    drawAnimatedMouth(ctx, centerX, centerY + 95, currentShape.current)

    ctx.restore()

    animationRef.current = requestAnimationFrame(render)
  }, [])

  // Face drawing function - photorealistic style
  const drawFace = (
    ctx: CanvasRenderingContext2D, 
    cx: number, 
    cy: number,
    width: number,
    height: number
  ) => {
    // Neck shadow
    ctx.beginPath()
    ctx.ellipse(cx, cy + 200, 70, 40, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fill()

    // Neck
    const neckGradient = ctx.createLinearGradient(cx - 50, cy + 150, cx + 50, cy + 150)
    neckGradient.addColorStop(0, '#d4a574')
    neckGradient.addColorStop(0.5, '#e8c4a0')
    neckGradient.addColorStop(1, '#d4a574')
    
    ctx.beginPath()
    ctx.moveTo(cx - 55, cy + 175)
    ctx.quadraticCurveTo(cx - 60, cy + 250, cx - 65, cy + 320)
    ctx.lineTo(cx + 65, cy + 320)
    ctx.quadraticCurveTo(cx + 60, cy + 250, cx + 55, cy + 175)
    ctx.fillStyle = neckGradient
    ctx.fill()

    // Face shape - realistic oval with jaw
    const faceGradient = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy + 20, 200)
    faceGradient.addColorStop(0, '#fce8d5')
    faceGradient.addColorStop(0.4, '#f5d5b8')
    faceGradient.addColorStop(0.7, '#e8c4a0')
    faceGradient.addColorStop(1, '#d4a574')

    ctx.beginPath()
    // Start from forehead
    ctx.moveTo(cx, cy - 165)
    // Right side of face
    ctx.bezierCurveTo(cx + 130, cy - 155, cx + 135, cy - 50, cx + 130, cy + 30)
    // Right jawline
    ctx.bezierCurveTo(cx + 125, cy + 90, cx + 85, cy + 150, cx + 50, cy + 175)
    // Chin
    ctx.bezierCurveTo(cx + 25, cy + 190, cx - 25, cy + 190, cx - 50, cy + 175)
    // Left jawline  
    ctx.bezierCurveTo(cx - 85, cy + 150, cx - 125, cy + 90, cx - 130, cy + 30)
    // Left side of face
    ctx.bezierCurveTo(cx - 135, cy - 50, cx - 130, cy - 155, cx, cy - 165)
    ctx.fillStyle = faceGradient
    ctx.fill()

    // Subtle skin texture overlay
    ctx.globalAlpha = 0.02
    for (let i = 0; i < 500; i++) {
      const tx = cx + (Math.random() - 0.5) * 260
      const ty = cy + (Math.random() - 0.5) * 340
      ctx.beginPath()
      ctx.arc(tx, ty, Math.random() * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = Math.random() > 0.5 ? '#c8a080' : '#fff0e0'
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Hair
    drawHair(ctx, cx, cy)

    // Forehead shading
    const foreheadShade = ctx.createLinearGradient(cx, cy - 165, cx, cy - 90)
    foreheadShade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    foreheadShade.addColorStop(1, 'rgba(0, 0, 0, 0.03)')
    ctx.fillStyle = foreheadShade
    ctx.fillRect(cx - 100, cy - 165, 200, 75)

    // Eyebrows
    drawEyebrow(ctx, cx - 55, cy - 75, 50, false)
    drawEyebrow(ctx, cx + 55, cy - 75, 50, true)

    // Nose
    drawNose(ctx, cx, cy + 25)

    // Cheek blush
    ctx.beginPath()
    ctx.ellipse(cx - 85, cy + 35, 28, 16, 0.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(230, 160, 150, 0.12)'
    ctx.fill()
    
    ctx.beginPath()
    ctx.ellipse(cx + 85, cy + 35, 28, 16, -0.2, 0, Math.PI * 2)
    ctx.fill()

    // Jawline shadows
    ctx.beginPath()
    ctx.moveTo(cx - 110, cy + 70)
    ctx.quadraticCurveTo(cx - 80, cy + 150, cx - 40, cy + 180)
    ctx.strokeStyle = 'rgba(180, 140, 100, 0.15)'
    ctx.lineWidth = 10
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx + 110, cy + 70)
    ctx.quadraticCurveTo(cx + 80, cy + 150, cx + 40, cy + 180)
    ctx.stroke()
  }

  // Hair drawing
  const drawHair = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    // Main hair shape
    const hairGradient = ctx.createLinearGradient(cx - 140, cy - 180, cx + 140, cy)
    hairGradient.addColorStop(0, '#1a0f08')
    hairGradient.addColorStop(0.3, '#2d1810')
    hairGradient.addColorStop(0.7, '#3d2515')
    hairGradient.addColorStop(1, '#1a0f08')

    ctx.beginPath()
    ctx.moveTo(cx - 140, cy - 50)
    ctx.quadraticCurveTo(cx - 150, cy - 150, cx - 80, cy - 190)
    ctx.quadraticCurveTo(cx, cy - 220, cx + 80, cy - 190)
    ctx.quadraticCurveTo(cx + 150, cy - 150, cx + 140, cy - 50)
    ctx.quadraticCurveTo(cx + 130, cy - 100, cx + 100, cy - 145)
    ctx.quadraticCurveTo(cx, cy - 175, cx - 100, cy - 145)
    ctx.quadraticCurveTo(cx - 130, cy - 100, cx - 140, cy - 50)
    ctx.fillStyle = hairGradient
    ctx.fill()

    // Hair strands for texture
    ctx.strokeStyle = 'rgba(50, 30, 20, 0.3)'
    ctx.lineWidth = 1
    for (let i = 0; i < 40; i++) {
      const startX = cx - 120 + i * 6
      const startY = cy - 170 + Math.random() * 20
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(
        startX + (Math.random() - 0.5) * 10,
        startY + 30,
        startX + (Math.random() - 0.5) * 15,
        startY + 50 + Math.random() * 20
      )
      ctx.stroke()
    }

    // Hair highlights
    ctx.strokeStyle = 'rgba(100, 70, 50, 0.2)'
    for (let i = 0; i < 15; i++) {
      const startX = cx - 80 + i * 10
      ctx.beginPath()
      ctx.moveTo(startX, cy - 180 + Math.random() * 10)
      ctx.quadraticCurveTo(
        startX + 5,
        cy - 150,
        startX + 8,
        cy - 120
      )
      ctx.stroke()
    }
  }

  // Eyebrow drawing
  const drawEyebrow = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number,
    flip: boolean
  ) => {
    const dir = flip ? -1 : 1
    
    // Eyebrow shape
    ctx.beginPath()
    ctx.moveTo(x - width * 0.5 * dir, y + 3)
    ctx.quadraticCurveTo(x, y - 8, x + width * 0.5 * dir, y + 5)
    ctx.quadraticCurveTo(x, y + 3, x - width * 0.5 * dir, y + 3)
    
    const browGradient = ctx.createLinearGradient(x - width * 0.5, y, x + width * 0.5, y)
    browGradient.addColorStop(0, flip ? '#3d2515' : '#2d1810')
    browGradient.addColorStop(0.5, '#3d2515')
    browGradient.addColorStop(1, flip ? '#2d1810' : '#3d2515')
    ctx.fillStyle = browGradient
    ctx.fill()

    // Individual brow hairs
    ctx.strokeStyle = '#2d1810'
    ctx.lineWidth = 1
    for (let i = 0; i < 20; i++) {
      const hairX = x - width * 0.4 * dir + i * 2 * dir
      ctx.beginPath()
      ctx.moveTo(hairX, y + 2)
      ctx.lineTo(hairX + dir * 1.5, y - 5 - Math.sin(i * 0.3) * 2)
      ctx.stroke()
    }
  }

  // Eye drawing with blink support
  const drawEyes = (
    ctx: CanvasRenderingContext2D, 
    cx: number, 
    cy: number,
    blink: number
  ) => {
    const eyeY = cy - 45
    const leftEyeX = cx - 48
    const rightEyeX = cx + 48

    // Draw both eyes
    drawSingleEye(ctx, leftEyeX, eyeY, blink, false)
    drawSingleEye(ctx, rightEyeX, eyeY, blink, true)
  }

  const drawSingleEye = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    blink: number,
    isRight: boolean
  ) => {
    const eyeHeight = 14 * (1 - blink * 0.9)
    
    // Eye socket shadow
    ctx.beginPath()
    ctx.ellipse(x, y, 30, 18, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(140, 100, 80, 0.12)'
    ctx.fill()

    // Eye white
    ctx.beginPath()
    ctx.ellipse(x, y, 24, eyeHeight, 0, 0, Math.PI * 2)
    const whiteGradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, 24)
    whiteGradient.addColorStop(0, '#ffffff')
    whiteGradient.addColorStop(0.8, '#f8f6f4')
    whiteGradient.addColorStop(1, '#e8e4e0')
    ctx.fillStyle = whiteGradient
    ctx.fill()

    if (blink < 0.7) {
      // Iris
      const irisGradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 11)
      irisGradient.addColorStop(0, '#7a6040')
      irisGradient.addColorStop(0.5, '#5a4535')
      irisGradient.addColorStop(0.8, '#3a2820')
      irisGradient.addColorStop(1, '#1a0f08')

      ctx.beginPath()
      ctx.arc(x, y, 11, 0, Math.PI * 2)
      ctx.fillStyle = irisGradient
      ctx.fill()

      // Iris detail lines
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, 11, 0, Math.PI * 2)
      ctx.clip()
      
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(angle) * 4, y + Math.sin(angle) * 4)
        ctx.lineTo(x + Math.cos(angle) * 11, y + Math.sin(angle) * 11)
        ctx.strokeStyle = 'rgba(80, 60, 40, 0.3)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      ctx.restore()

      // Pupil
      ctx.beginPath()
      ctx.arc(x, y, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = '#000000'
      ctx.fill()

      // Eye highlights
      ctx.beginPath()
      ctx.arc(x - 4, y - 4, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(x + 2, y + 2, 1, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fill()
    }

    // Upper eyelid
    ctx.beginPath()
    ctx.moveTo(x - 26, y + 2)
    ctx.quadraticCurveTo(x, y - 16 + blink * 14, x + 26, y + 2)
    ctx.strokeStyle = '#5a4030'
    ctx.lineWidth = 2
    ctx.stroke()

    // Eyelid crease
    ctx.beginPath()
    ctx.moveTo(x - 22, y - 10)
    ctx.quadraticCurveTo(x, y - 22, x + 22, y - 10)
    ctx.strokeStyle = 'rgba(140, 100, 80, 0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Eyelashes
    if (blink < 0.5) {
      for (let i = 0; i < 10; i++) {
        const lashX = x - 20 + i * 4
        const lashAngle = (i - 4.5) * 0.12
        ctx.beginPath()
        ctx.moveTo(lashX, y - 12 + blink * 10)
        ctx.quadraticCurveTo(
          lashX + Math.sin(lashAngle) * 4,
          y - 20 + blink * 8,
          lashX + Math.sin(lashAngle) * 6,
          y - 24 + blink * 12
        )
        ctx.strokeStyle = '#1a0f08'
        ctx.lineWidth = 1.2
        ctx.stroke()
      }
    }

    // Lower eyelid
    ctx.beginPath()
    ctx.moveTo(x - 24, y + 6)
    ctx.quadraticCurveTo(x, y + eyeHeight + 2, x + 24, y + 6)
    ctx.strokeStyle = 'rgba(140, 100, 80, 0.4)'
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  // Nose drawing
  const drawNose = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Nose bridge highlight
    ctx.beginPath()
    ctx.moveTo(x, y - 55)
    ctx.quadraticCurveTo(x + 2, y - 25, x, y + 5)
    ctx.strokeStyle = 'rgba(255, 250, 245, 0.3)'
    ctx.lineWidth = 6
    ctx.stroke()

    // Nose sides
    ctx.beginPath()
    ctx.moveTo(x - 4, y - 40)
    ctx.quadraticCurveTo(x - 6, y - 10, x - 18, y + 18)
    ctx.strokeStyle = 'rgba(180, 140, 110, 0.35)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x + 4, y - 40)
    ctx.quadraticCurveTo(x + 6, y - 10, x + 18, y + 18)
    ctx.stroke()

    // Nose tip
    ctx.beginPath()
    ctx.ellipse(x, y + 10, 14, 9, 0, 0, Math.PI)
    ctx.fillStyle = 'rgba(240, 200, 170, 0.4)'
    ctx.fill()

    // Nostrils
    ctx.beginPath()
    ctx.ellipse(x - 9, y + 20, 6, 4, 0.35, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(60, 40, 30, 0.5)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(x + 9, y + 20, 6, 4, -0.35, 0, Math.PI * 2)
    ctx.fill()

    // Nose tip highlight
    ctx.beginPath()
    ctx.ellipse(x, y, 4, 6, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 250, 245, 0.2)'
    ctx.fill()
  }

  // Animated mouth drawing
  const drawAnimatedMouth = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number,
    shape: typeof MOUTH_SHAPES.sil
  ) => {
    const { openness, width, roundness, upperLip, lowerLip } = shape
    
    // Base mouth dimensions
    const mouthWidth = 32 * width
    const mouthOpen = openness * 35
    const lipThickness = 7

    // Mouth area skin patch (to cover base)
    ctx.beginPath()
    ctx.ellipse(x, y, 45, 30, 0, 0, Math.PI * 2)
    const skinPatch = ctx.createRadialGradient(x, y, 0, x, y, 45)
    skinPatch.addColorStop(0, '#f5d5b8')
    skinPatch.addColorStop(1, '#e8c4a0')
    ctx.fillStyle = skinPatch
    ctx.fill()

    // Philtrum (area above lip)
    ctx.beginPath()
    ctx.moveTo(x - 6, y - 30)
    ctx.quadraticCurveTo(x - 4, y - 15, x - 2, y - 5)
    ctx.strokeStyle = 'rgba(180, 140, 120, 0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x + 6, y - 30)
    ctx.quadraticCurveTo(x + 4, y - 15, x + 2, y - 5)
    ctx.stroke()

    // Mouth interior (when open)
    if (openness > 0.05) {
      ctx.beginPath()
      const interiorWidth = mouthWidth * 0.9
      const interiorHeight = mouthOpen * 0.7
      ctx.ellipse(x, y + mouthOpen * 0.2, interiorWidth, interiorHeight, 0, 0, Math.PI * 2)
      
      const darkGradient = ctx.createRadialGradient(x, y, 0, x, y + mouthOpen * 0.3, interiorHeight + 5)
      darkGradient.addColorStop(0, '#1a0505')
      darkGradient.addColorStop(1, '#2a0f0f')
      ctx.fillStyle = darkGradient
      ctx.fill()

      // Teeth (when mouth is open enough)
      if (openness > 0.15) {
        // Upper teeth
        ctx.beginPath()
        const teethWidth = mouthWidth * 0.75
        const teethHeight = Math.min(8, mouthOpen * 0.3)
        ctx.ellipse(x, y - mouthOpen * 0.1, teethWidth, teethHeight, 0, 0, Math.PI)
        ctx.fillStyle = '#f8f8f5'
        ctx.fill()

        // Tooth gaps
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.25)'
        ctx.lineWidth = 0.5
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath()
          ctx.moveTo(x + i * 5.5, y - mouthOpen * 0.1 - teethHeight)
          ctx.lineTo(x + i * 5.5, y - mouthOpen * 0.1 + 2)
          ctx.stroke()
        }
      }

      // Tongue (when mouth is open more)
      if (openness > 0.25) {
        ctx.beginPath()
        ctx.ellipse(
          x, 
          y + mouthOpen * 0.4, 
          mouthWidth * 0.4, 
          mouthOpen * 0.2, 
          0, 0, Math.PI
        )
        const tongueGrad = ctx.createRadialGradient(x, y + mouthOpen * 0.35, 0, x, y + mouthOpen * 0.45, mouthWidth * 0.4)
        tongueGrad.addColorStop(0, '#d47070')
        tongueGrad.addColorStop(1, '#b05050')
        ctx.fillStyle = tongueGrad
        ctx.fill()
      }
    }

    // Upper lip
    const upperLipGrad = ctx.createLinearGradient(x, y - lipThickness - 3, x, y + 3)
    upperLipGrad.addColorStop(0, '#d08080')
    upperLipGrad.addColorStop(0.5, '#c06868')
    upperLipGrad.addColorStop(1, '#a85555')

    ctx.beginPath()
    // Outer edge of upper lip
    ctx.moveTo(x - mouthWidth - 4, y - upperLip * 3)
    ctx.quadraticCurveTo(x - mouthWidth * 0.5, y - lipThickness - 2 - upperLip * 8, x - 4, y - lipThickness - upperLip * 10)
    // Cupid's bow
    ctx.quadraticCurveTo(x, y - lipThickness * 1.4 - upperLip * 10, x + 4, y - lipThickness - upperLip * 10)
    ctx.quadraticCurveTo(x + mouthWidth * 0.5, y - lipThickness - 2 - upperLip * 8, x + mouthWidth + 4, y - upperLip * 3)
    // Inner edge
    ctx.quadraticCurveTo(x + mouthWidth * 0.3, y + 2, x, y + 3)
    ctx.quadraticCurveTo(x - mouthWidth * 0.3, y + 2, x - mouthWidth - 4, y - upperLip * 3)
    ctx.fillStyle = upperLipGrad
    ctx.fill()

    // Lower lip
    const lowerLipGrad = ctx.createLinearGradient(x, y, x, y + lipThickness + mouthOpen + lowerLip * 15 + 6)
    lowerLipGrad.addColorStop(0, '#a85555')
    lowerLipGrad.addColorStop(0.4, '#c06868')
    lowerLipGrad.addColorStop(0.7, '#d08080')
    lowerLipGrad.addColorStop(1, '#d89090')

    ctx.beginPath()
    // Inner edge of lower lip
    ctx.moveTo(x - mouthWidth - 4, y - upperLip * 3)
    ctx.quadraticCurveTo(x - mouthWidth * 0.3, y + 2, x, y + 3)
    ctx.quadraticCurveTo(x + mouthWidth * 0.3, y + 2, x + mouthWidth + 4, y - upperLip * 3)
    // Outer edge
    ctx.quadraticCurveTo(x + mouthWidth * 0.5, y + lipThickness + mouthOpen * 0.6 + lowerLip * 12, x, y + lipThickness + mouthOpen + lowerLip * 15 + 4)
    ctx.quadraticCurveTo(x - mouthWidth * 0.5, y + lipThickness + mouthOpen * 0.6 + lowerLip * 12, x - mouthWidth - 4, y - upperLip * 3)
    ctx.fillStyle = lowerLipGrad
    ctx.fill()

    // Lip highlight
    ctx.beginPath()
    ctx.ellipse(x, y + lipThickness * 0.5 + mouthOpen * 0.15 + lowerLip * 5, mouthWidth * 0.35, 2.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 210, 210, 0.35)'
    ctx.fill()

    // Lip corners
    ctx.beginPath()
    ctx.arc(x - mouthWidth - 4, y, 2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(150, 90, 90, 0.4)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x + mouthWidth + 4, y, 2, 0, Math.PI * 2)
    ctx.fill()

    // Upper lip shadow
    ctx.beginPath()
    ctx.moveTo(x - mouthWidth * 0.8, y - lipThickness - 8)
    ctx.quadraticCurveTo(x, y - lipThickness - 14, x + mouthWidth * 0.8, y - lipThickness - 8)
    ctx.strokeStyle = 'rgba(180, 140, 120, 0.25)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Chin dimple/shadow
    ctx.beginPath()
    ctx.ellipse(x, y + lipThickness + mouthOpen + lowerLip * 15 + 25, 15, 8, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200, 160, 140, 0.15)'
    ctx.fill()
  }

  // Start animation loop
  useEffect(() => {
    render()
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [render])

  return (
    <div className="relative flex flex-col items-center justify-center h-full">
      <canvas
        ref={canvasRef}
        width={400}
        height={520}
        className="rounded-2xl shadow-2xl"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {/* Status display */}
      <div className="absolute top-3 left-3">
        <div className="bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10">
          Viseme: {currentViseme.toUpperCase()}
        </div>
      </div>

      {isPlaying && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-emerald-500/90 text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2.5 backdrop-blur-sm shadow-lg">
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
          Speaking...
        </div>
      )}
    </div>
  )
}

export default VideoStyleAvatar