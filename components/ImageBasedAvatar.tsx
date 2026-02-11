'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface Viseme {
  time: number
  viseme: string
  duration: number
}

interface ImageBasedAvatarProps {
  visemes: Viseme[]
  isPlaying: boolean
  currentTime: number
}

// Viseme parameters for mouth animation
const VISEME_CONFIG = {
  sil: { jaw: 0, lips: 0, open: 0 },
  PP: { jaw: 0, lips: 0.3, open: 0 },
  FF: { jaw: 0.1, lips: 0.1, open: 0.15 },
  TH: { jaw: 0.15, lips: 0, open: 0.2 },
  DD: { jaw: 0.2, lips: 0, open: 0.25 },
  kk: { jaw: 0.15, lips: 0, open: 0.2 },
  CH: { jaw: 0.1, lips: 0.4, open: 0.15 },
  SS: { jaw: 0.05, lips: 0.2, open: 0.1 },
  nn: { jaw: 0.1, lips: 0, open: 0.15 },
  RR: { jaw: 0.2, lips: 0.35, open: 0.3 },
  aa: { jaw: 0.8, lips: 0, open: 0.85 },
  E: { jaw: 0.4, lips: 0.1, open: 0.45 },
  I: { jaw: 0.2, lips: 0.5, open: 0.25 },
  O: { jaw: 0.55, lips: 0.6, open: 0.6 },
  U: { jaw: 0.35, lips: 0.7, open: 0.4 },
}

/**
 * This avatar uses a real photograph with the mouth region 
 * dynamically animated using canvas compositing.
 * 
 * The approach:
 * 1. Display a base face image (real photograph)
 * 2. Mask/replace only the mouth region
 * 3. Draw animated mouth in that region
 * 4. Blend smoothly with the photo
 */
const ImageBasedAvatar: React.FC<ImageBasedAvatarProps> = ({ 
  visemes, 
  isPlaying, 
  currentTime 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [currentViseme, setCurrentViseme] = useState('sil')
  const [imageLoaded, setImageLoaded] = useState(false)
  const animationRef = useRef<number>()
  const faceImageRef = useRef<HTMLImageElement | null>(null)
  
  // Animation interpolation
  const currentParams = useRef({ jaw: 0, lips: 0, open: 0 })
  const targetParams = useRef({ jaw: 0, lips: 0, open: 0 })
  
  // Blink animation
  const blinkState = useRef({ value: 0, nextBlink: Date.now() + 2000 })

  // Load face image (this would be a real photograph in production)
  useEffect(() => {
    // Create a realistic face using advanced canvas techniques
    // In production, this would load an actual photograph
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 500
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      generateRealisticFace(ctx, 400, 500)
      
      const img = new Image()
      img.src = canvas.toDataURL('image/png')
      img.onload = () => {
        faceImageRef.current = img
        setImageLoaded(true)
      }
    }
  }, [])

  // Generate a detailed realistic face
  const generateRealisticFace = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const cx = w / 2
    const cy = h / 2 - 20

    // Background
    ctx.fillStyle = '#16213e'
    ctx.fillRect(0, 0, w, h)

    // Neck
    ctx.beginPath()
    ctx.moveTo(cx - 55, cy + 175)
    ctx.quadraticCurveTo(cx - 60, cy + 250, cx - 70, h)
    ctx.lineTo(cx + 70, h)
    ctx.quadraticCurveTo(cx + 60, cy + 250, cx + 55, cy + 175)
    const neckGrad = ctx.createLinearGradient(cx - 55, cy + 175, cx + 55, cy + 175)
    neckGrad.addColorStop(0, '#d4a574')
    neckGrad.addColorStop(0.5, '#e8c4a0')
    neckGrad.addColorStop(1, '#d4a574')
    ctx.fillStyle = neckGrad
    ctx.fill()

    // Face shape
    const faceGrad = ctx.createRadialGradient(cx, cy - 20, 20, cx, cy + 30, 200)
    faceGrad.addColorStop(0, '#fce8d5')
    faceGrad.addColorStop(0.3, '#f8dcc8')
    faceGrad.addColorStop(0.6, '#e8c4a0')
    faceGrad.addColorStop(1, '#d4a574')

    ctx.beginPath()
    ctx.moveTo(cx, cy - 160)
    ctx.bezierCurveTo(cx + 125, cy - 145, cx + 130, cy - 30, cx + 125, cy + 40)
    ctx.bezierCurveTo(cx + 120, cy + 100, cx + 80, cy + 155, cx + 45, cy + 180)
    ctx.bezierCurveTo(cx + 20, cy + 195, cx - 20, cy + 195, cx - 45, cy + 180)
    ctx.bezierCurveTo(cx - 80, cy + 155, cx - 120, cy + 100, cx - 125, cy + 40)
    ctx.bezierCurveTo(cx - 130, cy - 30, cx - 125, cy - 145, cx, cy - 160)
    ctx.fillStyle = faceGrad
    ctx.fill()

    // Add skin texture
    addSkinTexture(ctx, cx, cy)

    // Hair
    drawDetailedHair(ctx, cx, cy)

    // Facial features (except mouth - that's animated)
    drawEyebrows(ctx, cx, cy)
    drawStaticEyes(ctx, cx, cy)
    drawNose(ctx, cx, cy)
    drawCheekContours(ctx, cx, cy)

    // Static closed mouth (will be overlaid with animation)
    drawStaticMouth(ctx, cx, cy + 95)
  }

  const addSkinTexture = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    ctx.globalAlpha = 0.015
    for (let i = 0; i < 400; i++) {
      const x = cx + (Math.random() - 0.5) * 250
      const y = cy + (Math.random() - 0.5) * 340
      const r = Math.random() * 1.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = Math.random() > 0.5 ? '#c8a080' : '#fff5ea'
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  const drawDetailedHair = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    const hairGrad = ctx.createLinearGradient(cx - 140, cy - 180, cx + 140, cy - 50)
    hairGrad.addColorStop(0, '#15100a')
    hairGrad.addColorStop(0.4, '#2a1a10')
    hairGrad.addColorStop(0.7, '#3a2515')
    hairGrad.addColorStop(1, '#15100a')

    ctx.beginPath()
    ctx.moveTo(cx - 135, cy - 40)
    ctx.quadraticCurveTo(cx - 150, cy - 140, cx - 80, cy - 185)
    ctx.quadraticCurveTo(cx, cy - 210, cx + 80, cy - 185)
    ctx.quadraticCurveTo(cx + 150, cy - 140, cx + 135, cy - 40)
    ctx.quadraticCurveTo(cx + 125, cy - 95, cx + 95, cy - 140)
    ctx.quadraticCurveTo(cx, cy - 165, cx - 95, cy - 140)
    ctx.quadraticCurveTo(cx - 125, cy - 95, cx - 135, cy - 40)
    ctx.fillStyle = hairGrad
    ctx.fill()

    // Hair strands
    ctx.strokeStyle = 'rgba(40, 25, 15, 0.4)'
    ctx.lineWidth = 0.8
    for (let i = 0; i < 50; i++) {
      const sx = cx - 115 + i * 4.5
      const sy = cy - 165 + Math.sin(i * 0.5) * 15
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(
        sx + (Math.random() - 0.5) * 8,
        sy + 35,
        sx + (Math.random() - 0.5) * 12,
        sy + 60 + Math.random() * 25
      )
      ctx.stroke()
    }
  }

  const drawEyebrows = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    // Left eyebrow
    const browGrad = ctx.createLinearGradient(cx - 80, cy - 75, cx - 30, cy - 75)
    browGrad.addColorStop(0, '#2a1a10')
    browGrad.addColorStop(0.5, '#3a2515')
    browGrad.addColorStop(1, '#2a1a10')

    ctx.beginPath()
    ctx.moveTo(cx - 80, cy - 72)
    ctx.quadraticCurveTo(cx - 55, cy - 85, cx - 30, cy - 70)
    ctx.quadraticCurveTo(cx - 55, cy - 75, cx - 80, cy - 72)
    ctx.fillStyle = browGrad
    ctx.fill()

    // Right eyebrow
    ctx.beginPath()
    ctx.moveTo(cx + 80, cy - 72)
    ctx.quadraticCurveTo(cx + 55, cy - 85, cx + 30, cy - 70)
    ctx.quadraticCurveTo(cx + 55, cy - 75, cx + 80, cy - 72)
    ctx.fill()

    // Eyebrow hairs
    ctx.strokeStyle = '#2a1a10'
    ctx.lineWidth = 0.8
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 18; i++) {
        const x = cx + side * (35 + i * 2.5)
        ctx.beginPath()
        ctx.moveTo(x, cy - 74)
        ctx.lineTo(x + side * 1.5, cy - 82)
        ctx.stroke()
      }
    }
  }

  const drawStaticEyes = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    const eyeY = cy - 45

    for (let side = -1; side <= 1; side += 2) {
      const eyeX = cx + side * 48

      // Eye socket shadow
      ctx.beginPath()
      ctx.ellipse(eyeX, eyeY, 28, 16, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(140, 100, 80, 0.12)'
      ctx.fill()

      // Eye white
      const whiteGrad = ctx.createRadialGradient(eyeX - 2, eyeY - 2, 0, eyeX, eyeY, 22)
      whiteGrad.addColorStop(0, '#ffffff')
      whiteGrad.addColorStop(0.8, '#f5f5f3')
      whiteGrad.addColorStop(1, '#e0dcd8')
      
      ctx.beginPath()
      ctx.ellipse(eyeX, eyeY, 22, 13, 0, 0, Math.PI * 2)
      ctx.fillStyle = whiteGrad
      ctx.fill()

      // Iris
      const irisGrad = ctx.createRadialGradient(eyeX - 1, eyeY - 1, 0, eyeX, eyeY, 10)
      irisGrad.addColorStop(0, '#6a5040')
      irisGrad.addColorStop(0.4, '#4a3530')
      irisGrad.addColorStop(0.8, '#2a1815')
      irisGrad.addColorStop(1, '#15100a')

      ctx.beginPath()
      ctx.arc(eyeX, eyeY, 10, 0, Math.PI * 2)
      ctx.fillStyle = irisGrad
      ctx.fill()

      // Iris detail
      ctx.save()
      ctx.beginPath()
      ctx.arc(eyeX, eyeY, 10, 0, Math.PI * 2)
      ctx.clip()
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(eyeX + Math.cos(angle) * 3.5, eyeY + Math.sin(angle) * 3.5)
        ctx.lineTo(eyeX + Math.cos(angle) * 10, eyeY + Math.sin(angle) * 10)
        ctx.strokeStyle = 'rgba(70, 50, 35, 0.3)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      ctx.restore()

      // Pupil
      ctx.beginPath()
      ctx.arc(eyeX, eyeY, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()

      // Eye highlights
      ctx.beginPath()
      ctx.arc(eyeX - 3, eyeY - 3, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(eyeX + 1.5, eyeY + 1.5, 1, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fill()

      // Upper eyelid
      ctx.beginPath()
      ctx.moveTo(eyeX - 24, eyeY + 1)
      ctx.quadraticCurveTo(eyeX, eyeY - 15, eyeX + 24, eyeY + 1)
      ctx.strokeStyle = '#4a3530'
      ctx.lineWidth = 1.8
      ctx.stroke()

      // Eyelashes
      for (let i = 0; i < 9; i++) {
        const lashX = eyeX - 18 + i * 4
        const lashAngle = (i - 4) * 0.1
        ctx.beginPath()
        ctx.moveTo(lashX, eyeY - 11)
        ctx.quadraticCurveTo(
          lashX + Math.sin(lashAngle) * 3,
          eyeY - 18,
          lashX + Math.sin(lashAngle) * 5,
          eyeY - 21
        )
        ctx.strokeStyle = '#15100a'
        ctx.lineWidth = 1.1
        ctx.stroke()
      }

      // Lower eyelid
      ctx.beginPath()
      ctx.moveTo(eyeX - 22, eyeY + 5)
      ctx.quadraticCurveTo(eyeX, eyeY + 14, eyeX + 22, eyeY + 5)
      ctx.strokeStyle = 'rgba(140, 100, 80, 0.35)'
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }

  const drawNose = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    const noseY = cy + 20

    // Bridge highlight
    ctx.beginPath()
    ctx.moveTo(cx, noseY - 50)
    ctx.quadraticCurveTo(cx + 1.5, noseY - 20, cx, noseY + 10)
    ctx.strokeStyle = 'rgba(255, 250, 240, 0.25)'
    ctx.lineWidth = 5
    ctx.stroke()

    // Nose sides
    ctx.strokeStyle = 'rgba(180, 140, 110, 0.3)'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(cx - 3, noseY - 35)
    ctx.quadraticCurveTo(cx - 5, noseY - 5, cx - 16, noseY + 18)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx + 3, noseY - 35)
    ctx.quadraticCurveTo(cx + 5, noseY - 5, cx + 16, noseY + 18)
    ctx.stroke()

    // Nose tip
    ctx.beginPath()
    ctx.ellipse(cx, noseY + 12, 12, 8, 0, 0, Math.PI)
    ctx.fillStyle = 'rgba(235, 195, 165, 0.35)'
    ctx.fill()

    // Nostrils
    ctx.beginPath()
    ctx.ellipse(cx - 8, noseY + 20, 5.5, 3.5, 0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(50, 35, 25, 0.45)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(cx + 8, noseY + 20, 5.5, 3.5, -0.3, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawCheekContours = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    // Cheek highlights
    ctx.beginPath()
    ctx.ellipse(cx - 80, cy + 20, 35, 50, 0.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200, 150, 120, 0.1)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(cx + 80, cy + 20, 35, 50, -0.2, 0, Math.PI * 2)
    ctx.fill()

    // Subtle blush
    ctx.beginPath()
    ctx.ellipse(cx - 70, cy + 35, 25, 14, 0.15, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(220, 150, 140, 0.15)'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(cx + 70, cy + 35, 25, 14, -0.15, 0, Math.PI * 2)
    ctx.fill()

    // Jawline shadows
    ctx.strokeStyle = 'rgba(180, 140, 100, 0.12)'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(cx - 105, cy + 60)
    ctx.quadraticCurveTo(cx - 75, cy + 145, cx - 35, cy + 180)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx + 105, cy + 60)
    ctx.quadraticCurveTo(cx + 75, cy + 145, cx + 35, cy + 180)
    ctx.stroke()
  }

  const drawStaticMouth = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // This draws a closed/neutral mouth for the base image
    // The animation will overlay this

    // Upper lip
    const upperGrad = ctx.createLinearGradient(x, y - 8, x, y + 2)
    upperGrad.addColorStop(0, '#c87070')
    upperGrad.addColorStop(1, '#a85555')

    ctx.beginPath()
    ctx.moveTo(x - 32, y)
    ctx.quadraticCurveTo(x - 18, y - 7, x - 3, y - 7)
    ctx.quadraticCurveTo(x, y - 9, x + 3, y - 7)
    ctx.quadraticCurveTo(x + 18, y - 7, x + 32, y)
    ctx.quadraticCurveTo(x + 10, y + 2, x, y + 2)
    ctx.quadraticCurveTo(x - 10, y + 2, x - 32, y)
    ctx.fillStyle = upperGrad
    ctx.fill()

    // Lower lip
    const lowerGrad = ctx.createLinearGradient(x, y, x, y + 12)
    lowerGrad.addColorStop(0, '#a85555')
    lowerGrad.addColorStop(0.6, '#c87070')
    lowerGrad.addColorStop(1, '#d88888')

    ctx.beginPath()
    ctx.moveTo(x - 32, y)
    ctx.quadraticCurveTo(x - 10, y + 2, x, y + 2)
    ctx.quadraticCurveTo(x + 10, y + 2, x + 32, y)
    ctx.quadraticCurveTo(x + 15, y + 10, x, y + 12)
    ctx.quadraticCurveTo(x - 15, y + 10, x - 32, y)
    ctx.fillStyle = lowerGrad
    ctx.fill()

    // Lip highlight
    ctx.beginPath()
    ctx.ellipse(x, y + 5, 10, 2, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 210, 210, 0.3)'
    ctx.fill()
  }

  // Update viseme target
  useEffect(() => {
    if (!isPlaying || visemes.length === 0) {
      setCurrentViseme('sil')
      targetParams.current = { ...VISEME_CONFIG.sil }
      return
    }

    let active = 'sil'
    for (const v of visemes) {
      if (currentTime >= v.time && currentTime < v.time + v.duration) {
        active = v.viseme
        break
      }
    }
    
    setCurrentViseme(active)
    targetParams.current = { ...(VISEME_CONFIG[active as keyof typeof VISEME_CONFIG] || VISEME_CONFIG.sil) }
  }, [currentTime, visemes, isPlaying])

  // Interpolation helper
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  // Main render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !faceImageRef.current) {
      animationRef.current = requestAnimationFrame(render)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      animationRef.current = requestAnimationFrame(render)
      return
    }

    const w = canvas.width
    const h = canvas.height
    const cx = w / 2
    const mouthY = h / 2 - 20 + 95

    // Smooth parameter interpolation
    const smooth = 0.18
    currentParams.current = {
      jaw: lerp(currentParams.current.jaw, targetParams.current.jaw, smooth),
      lips: lerp(currentParams.current.lips, targetParams.current.lips, smooth),
      open: lerp(currentParams.current.open, targetParams.current.open, smooth),
    }

    // Update blink
    const now = Date.now()
    if (now >= blinkState.current.nextBlink) {
      blinkState.current.value = 1
      blinkState.current.nextBlink = now + 2500 + Math.random() * 3000
    }
    blinkState.current.value = Math.max(0, blinkState.current.value - 0.12)

    // Clear and draw base face
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(faceImageRef.current, 0, 0, w, h)

    // Draw animated eye blink overlay
    if (blinkState.current.value > 0.01) {
      drawEyeBlink(ctx, cx, h / 2 - 20 - 45, blinkState.current.value)
    }

    // Cover mouth area with skin and draw animated mouth
    const { jaw, lips, open } = currentParams.current
    drawAnimatedMouthOverlay(ctx, cx, mouthY, jaw, lips, open)

    animationRef.current = requestAnimationFrame(render)
  }, [imageLoaded])

  // Draw eye blink overlay
  const drawEyeBlink = (ctx: CanvasRenderingContext2D, cx: number, eyeY: number, blink: number) => {
    for (let side = -1; side <= 1; side += 2) {
      const eyeX = cx + side * 48
      
      // Eyelid covering eye
      ctx.beginPath()
      ctx.ellipse(eyeX, eyeY + blink * 3, 26, 15 * blink, 0, 0, Math.PI * 2)
      
      const lidGrad = ctx.createLinearGradient(eyeX, eyeY - 10, eyeX, eyeY + 10)
      lidGrad.addColorStop(0, '#e8c4a0')
      lidGrad.addColorStop(1, '#f5d5b8')
      ctx.fillStyle = lidGrad
      ctx.fill()

      // Eyelid crease
      ctx.beginPath()
      ctx.moveTo(eyeX - 22, eyeY - 3 + blink * 8)
      ctx.quadraticCurveTo(eyeX, eyeY - 10 + blink * 12, eyeX + 22, eyeY - 3 + blink * 8)
      ctx.strokeStyle = 'rgba(180, 140, 110, 0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  // Draw animated mouth overlay
  const drawAnimatedMouthOverlay = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    jaw: number,
    lips: number,
    open: number
  ) => {
    const mouthOpen = open * 32
    const mouthWidth = 30 - lips * 8
    const lipPucker = lips * 0.3

    // Skin patch to cover static mouth
    ctx.beginPath()
    ctx.ellipse(x, y + mouthOpen * 0.3, 42, 28 + mouthOpen * 0.4, 0, 0, Math.PI * 2)
    const skinGrad = ctx.createRadialGradient(x, y, 0, x, y + 10, 45)
    skinGrad.addColorStop(0, '#f5d5b8')
    skinGrad.addColorStop(1, '#e8c4a0')
    ctx.fillStyle = skinGrad
    ctx.fill()

    // Philtrum
    ctx.strokeStyle = 'rgba(180, 140, 120, 0.3)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x - 5, y - 28)
    ctx.quadraticCurveTo(x - 3, y - 15, x - 2, y - 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 5, y - 28)
    ctx.quadraticCurveTo(x + 3, y - 15, x + 2, y - 4)
    ctx.stroke()

    // Mouth interior
    if (open > 0.05) {
      ctx.beginPath()
      ctx.ellipse(x, y + mouthOpen * 0.25, mouthWidth * 0.85, mouthOpen * 0.65, 0, 0, Math.PI * 2)
      const interiorGrad = ctx.createRadialGradient(x, y + mouthOpen * 0.2, 0, x, y + mouthOpen * 0.3, mouthOpen * 0.7)
      interiorGrad.addColorStop(0, '#180505')
      interiorGrad.addColorStop(1, '#280a0a')
      ctx.fillStyle = interiorGrad
      ctx.fill()

      // Teeth
      if (open > 0.15) {
        ctx.beginPath()
        const teethW = mouthWidth * 0.7
        const teethH = Math.min(7, mouthOpen * 0.25)
        ctx.ellipse(x, y - mouthOpen * 0.08, teethW, teethH, 0, 0, Math.PI)
        ctx.fillStyle = '#f5f5f2'
        ctx.fill()

        // Tooth lines
        ctx.strokeStyle = 'rgba(200, 200, 195, 0.22)'
        ctx.lineWidth = 0.4
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath()
          ctx.moveTo(x + i * 5, y - mouthOpen * 0.08 - teethH)
          ctx.lineTo(x + i * 5, y - mouthOpen * 0.08 + 1)
          ctx.stroke()
        }
      }

      // Tongue
      if (open > 0.25) {
        ctx.beginPath()
        ctx.ellipse(x, y + mouthOpen * 0.4, mouthWidth * 0.4, mouthOpen * 0.18, 0, 0, Math.PI)
        const tongueGrad = ctx.createRadialGradient(x, y + mouthOpen * 0.35, 0, x, y + mouthOpen * 0.45, mouthWidth * 0.4)
        tongueGrad.addColorStop(0, '#d06868')
        tongueGrad.addColorStop(1, '#a85050')
        ctx.fillStyle = tongueGrad
        ctx.fill()
      }
    }

    // Upper lip
    const upperGrad = ctx.createLinearGradient(x, y - 8, x, y + 3)
    upperGrad.addColorStop(0, '#c87070')
    upperGrad.addColorStop(0.6, '#b56060')
    upperGrad.addColorStop(1, '#a85555')

    ctx.beginPath()
    ctx.moveTo(x - mouthWidth - 4, y - lipPucker * 5)
    ctx.quadraticCurveTo(x - mouthWidth * 0.5, y - 7 - lipPucker * 8, x - 3, y - 7 - lipPucker * 10)
    ctx.quadraticCurveTo(x, y - 9 - lipPucker * 12, x + 3, y - 7 - lipPucker * 10)
    ctx.quadraticCurveTo(x + mouthWidth * 0.5, y - 7 - lipPucker * 8, x + mouthWidth + 4, y - lipPucker * 5)
    ctx.quadraticCurveTo(x + mouthWidth * 0.3, y + 2, x, y + 2)
    ctx.quadraticCurveTo(x - mouthWidth * 0.3, y + 2, x - mouthWidth - 4, y - lipPucker * 5)
    ctx.fillStyle = upperGrad
    ctx.fill()

    // Lower lip
    const lowerGrad = ctx.createLinearGradient(x, y, x, y + 12 + mouthOpen + jaw * 10)
    lowerGrad.addColorStop(0, '#a85555')
    lowerGrad.addColorStop(0.5, '#c06868')
    lowerGrad.addColorStop(0.8, '#d08080')
    lowerGrad.addColorStop(1, '#d89090')

    ctx.beginPath()
    ctx.moveTo(x - mouthWidth - 4, y - lipPucker * 5)
    ctx.quadraticCurveTo(x - mouthWidth * 0.3, y + 2, x, y + 2)
    ctx.quadraticCurveTo(x + mouthWidth * 0.3, y + 2, x + mouthWidth + 4, y - lipPucker * 5)
    ctx.quadraticCurveTo(x + mouthWidth * 0.5, y + 10 + mouthOpen * 0.5 + jaw * 8, x, y + 12 + mouthOpen + jaw * 10)
    ctx.quadraticCurveTo(x - mouthWidth * 0.5, y + 10 + mouthOpen * 0.5 + jaw * 8, x - mouthWidth - 4, y - lipPucker * 5)
    ctx.fillStyle = lowerGrad
    ctx.fill()

    // Lip highlight
    ctx.beginPath()
    ctx.ellipse(x, y + 5 + mouthOpen * 0.15 + jaw * 3, mouthWidth * 0.35, 2.2, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 210, 210, 0.32)'
    ctx.fill()

    // Lip corners
    ctx.beginPath()
    ctx.arc(x - mouthWidth - 4, y - lipPucker * 3, 1.8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(150, 90, 90, 0.35)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + mouthWidth + 4, y - lipPucker * 3, 1.8, 0, Math.PI * 2)
    ctx.fill()

    // Shadow above upper lip
    ctx.beginPath()
    ctx.moveTo(x - mouthWidth * 0.75, y - 12)
    ctx.quadraticCurveTo(x, y - 18, x + mouthWidth * 0.75, y - 12)
    ctx.strokeStyle = 'rgba(180, 140, 120, 0.22)'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Chin shadow
    ctx.beginPath()
    ctx.ellipse(x, y + 15 + mouthOpen + jaw * 10 + 18, 14, 6, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200, 160, 140, 0.12)'
    ctx.fill()
  }

  // Start animation
  useEffect(() => {
    if (imageLoaded) {
      render()
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [imageLoaded, render])

  return (
    <div className="relative flex flex-col items-center justify-center h-full">
      <canvas
        ref={canvasRef}
        width={400}
        height={500}
        className="rounded-2xl shadow-2xl"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {/* Hidden overlay canvas for compositing */}
      <canvas
        ref={overlayCanvasRef}
        width={400}
        height={500}
        style={{ display: 'none' }}
      />

      {/* Status indicator */}
      <div className="absolute top-3 left-3">
        <div className="bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10">
          {currentViseme.toUpperCase()}
        </div>
      </div>

      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 rounded-2xl">
          <div className="text-white">Loading avatar...</div>
        </div>
      )}

      {isPlaying && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-emerald-500/90 text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2.5 backdrop-blur-sm shadow-lg">
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
          Speaking...
        </div>
      )}
    </div>
  )
}

export default ImageBasedAvatar