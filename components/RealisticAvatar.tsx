'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { FaceMesh } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'

// Realistic viseme parameters for natural mouth movement
const REALISTIC_VISEME_PARAMS = {
  sil: { mouthOpen: 0, lipSpread: 0, jawDrop: 0, tongueOut: 0 },
  PP: { mouthOpen: 0, lipSpread: -0.3, jawDrop: 0, tongueOut: 0 },      // Lips together
  FF: { mouthOpen: 0.1, lipSpread: 0.2, jawDrop: 0.05, tongueOut: 0 },   // F,V - lip-teeth
  TH: { mouthOpen: 0.15, lipSpread: 0.1, jawDrop: 0.08, tongueOut: 0.2 }, // Tongue between teeth
  DD: { mouthOpen: 0.2, lipSpread: 0, jawDrop: 0.1, tongueOut: 0.1 },     // D,T - tongue tip
  kk: { mouthOpen: 0.15, lipSpread: 0, jawDrop: 0.12, tongueOut: 0 },     // K,G - back of mouth
  CH: { mouthOpen: 0.1, lipSpread: -0.2, jawDrop: 0.05, tongueOut: 0 },   // Ch,Sh - pursed
  SS: { mouthOpen: 0.08, lipSpread: 0.3, jawDrop: 0.02, tongueOut: 0.05 }, // S,Z - teeth together
  nn: { mouthOpen: 0.12, lipSpread: 0.1, jawDrop: 0.06, tongueOut: 0.1 },  // N,L - neutral
  RR: { mouthOpen: 0.25, lipSpread: -0.1, jawDrop: 0.15, tongueOut: 0.05 }, // R - slight pucker
  aa: { mouthOpen: 0.6, lipSpread: 0.4, jawDrop: 0.4, tongueOut: 0 },      // AH - wide open
  E: { mouthOpen: 0.3, lipSpread: 0.5, jawDrop: 0.2, tongueOut: 0 },       // EH - medium smile
  I: { mouthOpen: 0.15, lipSpread: 0.7, jawDrop: 0.1, tongueOut: 0 },      // EE - big smile
  O: { mouthOpen: 0.4, lipSpread: -0.4, jawDrop: 0.25, tongueOut: 0 },     // OH - round
  U: { mouthOpen: 0.3, lipSpread: -0.5, jawDrop: 0.2, tongueOut: 0 },      // OO - very round
}

interface Viseme {
  time: number
  viseme: string
  duration: number
}

interface RealisticAvatarProps {
  visemes: Viseme[]
  isPlaying: boolean
  currentTime: number
}

const RealisticAvatar: React.FC<RealisticAvatarProps> = ({ visemes, isPlaying, currentTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentViseme, setCurrentViseme] = useState('sil')
  const [faceMesh, setFaceMesh] = useState<FaceMesh | null>(null)
  const [camera, setCamera] = useState<Camera | null>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const animationFrameRef = useRef<number>()
  const targetParamsRef = useRef(REALISTIC_VISEME_PARAMS.sil)
  const currentParamsRef = useRef({ ...REALISTIC_VISEME_PARAMS.sil })
  const baseImageRef = useRef<HTMLImageElement | null>(null)

  // Find current viseme
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
    const params = REALISTIC_VISEME_PARAMS[currentViseme as keyof typeof REALISTIC_VISEME_PARAMS] || REALISTIC_VISEME_PARAMS.sil
    targetParamsRef.current = params
  }, [currentViseme])

  // Initialize base face image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    // Using a placeholder realistic face - you can replace this with your preferred image
    img.src = 'data:image/svg+xml;base64,' + btoa(`
      <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="face" cx="50%" cy="40%" r="60%">
            <stop offset="0%" style="stop-color:#f5dcc8"/>
            <stop offset="70%" style="stop-color:#e8c4a8"/>
            <stop offset="100%" style="stop-color:#d4a982"/>
          </radialGradient>
          <radialGradient id="eye" cx="30%" cy="30%" r="50%">
            <stop offset="0%" style="stop-color:#8b7355"/>
            <stop offset="50%" style="stop-color:#5a4a3a"/>
            <stop offset="100%" style="stop-color:#2d1f14"/>
          </radialGradient>
        </defs>
        
        <!-- Face -->
        <ellipse cx="200" cy="250" rx="160" ry="200" fill="url(#face)" stroke="#d4a982" stroke-width="2"/>
        
        <!-- Hair -->
        <ellipse cx="200" cy="180" rx="180" ry="120" fill="#4a3728"/>
        
        <!-- Eyes -->
        <!-- Left Eye -->
        <ellipse cx="145" cy="210" rx="26" ry="16" fill="white" stroke="#c9b8a8"/>
        <circle cx="145" cy="210" r="12" fill="url(#eye)"/>
        <circle cx="145" cy="210" r="5" fill="black"/>
        <circle cx="142" cy="206" r="3" fill="white"/>
        
        <!-- Right Eye -->
        <ellipse cx="255" cy="210" rx="26" ry="16" fill="white" stroke="#c9b8a8"/>
        <circle cx="255" cy="210" r="12" fill="url(#eye)"/>
        <circle cx="255" cy="210" r="5" fill="black"/>
        <circle cx="252" cy="206" r="3" fill="white"/>
        
        <!-- Eyebrows -->
        <path d="M 115 185 Q 145 175 175 180" stroke="#3d2817" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M 225 180 Q 255 175 285 185" stroke="#3d2817" stroke-width="4" fill="none" stroke-linecap="round"/>
        
        <!-- Nose -->
        <path d="M 200 230 L 190 270 Q 200 275 210 270 Z" fill="none" stroke="#d4a982" stroke-width="2"/>
        <ellipse cx="195" cy="275" rx="4" ry="3" fill="#b8956f"/>
        <ellipse cx="205" cy="275" rx="4" ry="3" fill="#b8956f"/>
        
        <!-- Base Mouth (will be animated) -->
        <ellipse cx="200" cy="335" rx="25" ry="8" fill="#b86868" id="baseMouth"/>
        
        <!-- Philtrum -->
        <path d="M 195 285 Q 198 310 197 325" stroke="#e0b898" stroke-width="1" fill="none"/>
        <path d="M 205 285 Q 202 310 203 325" stroke="#e0b898" stroke-width="1" fill="none"/>
        
        <!-- Cheek highlights -->
        <ellipse cx="120" cy="280" rx="25" ry="15" fill="rgba(220,160,150,0.3)"/>
        <ellipse cx="280" cy="280" rx="25" ry="15" fill="rgba(220,160,150,0.3)"/>
        
        <!-- Jawline shadow -->
        <path d="M 100 320 Q 200 400 300 320" stroke="rgba(180,140,120,0.3)" stroke-width="8" fill="none"/>
      </svg>
    `)
    
    img.onload = () => {
      baseImageRef.current = img
    }
  }, [])

  // Initialize MediaPipe FaceMesh
  useEffect(() => {
    const initializeFaceMesh = async () => {
      const mesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        }
      })

      mesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      mesh.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          drawRealisticFace(results.multiFaceLandmarks[0])
        } else {
          drawStaticRealisticFace()
        }
      })

      setFaceMesh(mesh)
    }

    initializeFaceMesh()
  }, [])

  // Initialize camera
  const startCamera = useCallback(async () => {
    if (!faceMesh || !videoRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 300 } 
      })
      
      videoRef.current.srcObject = stream
      videoRef.current.play()

      const cam = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMesh && videoRef.current) {
            await faceMesh.send({ image: videoRef.current })
          }
        },
        width: 400,
        height: 300
      })
      
      cam.start()
      setCamera(cam)
      setHasCamera(true)
    } catch (err) {
      console.warn('Camera not available, using static face:', err)
      setHasCamera(false)
      // Fall back to static realistic face
      drawStaticRealisticFace()
    }
  }, [faceMesh])

  // Smooth interpolation
  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor
  }

  // Draw realistic face with MediaPipe landmarks
  const drawRealisticFace = useCallback((landmarks: any) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw base face if available
    if (baseImageRef.current) {
      ctx.drawImage(baseImageRef.current, 0, 0, width, height)
    }

    // Smooth interpolation towards target mouth params
    const smoothFactor = 0.2
    currentParamsRef.current = {
      mouthOpen: lerp(currentParamsRef.current.mouthOpen, targetParamsRef.current.mouthOpen, smoothFactor),
      lipSpread: lerp(currentParamsRef.current.lipSpread, targetParamsRef.current.lipSpread, smoothFactor),
      jawDrop: lerp(currentParamsRef.current.jawDrop, targetParamsRef.current.jawDrop, smoothFactor),
      tongueOut: lerp(currentParamsRef.current.tongueOut, targetParamsRef.current.tongueOut, smoothFactor),
    }

    const { mouthOpen, lipSpread, jawDrop, tongueOut } = currentParamsRef.current

    // Get mouth landmarks (MediaPipe indices)
    const upperLip = [13, 82, 81, 80, 78, 191, 267, 269, 270, 271, 272]
    const lowerLip = [14, 17, 18, 200, 199, 175, 0, 11, 12, 15, 16]

    // Calculate realistic mouth position and shape
    const mouthCenterX = width / 2
    const mouthCenterY = height * 0.67

    // Draw realistic animated mouth
    ctx.save()

    // Mouth interior (when open)
    if (mouthOpen > 0.05) {
      const interiorWidth = 35 + lipSpread * 20
      const interiorHeight = mouthOpen * 25 + jawDrop * 15

      ctx.beginPath()
      ctx.ellipse(mouthCenterX, mouthCenterY + jawDrop * 10, interiorWidth * 0.8, interiorHeight * 0.7, 0, 0, 2 * Math.PI)
      ctx.fillStyle = '#2a1510'
      ctx.fill()

      // Teeth (when mouth is open enough)
      if (mouthOpen > 0.15) {
        ctx.beginPath()
        ctx.ellipse(mouthCenterX, mouthCenterY - interiorHeight * 0.3, interiorWidth * 0.6, 6, 0, 0, Math.PI)
        ctx.fillStyle = '#f8f8f0'
        ctx.fill()
      }

      // Tongue
      if (mouthOpen > 0.2 || tongueOut > 0) {
        ctx.beginPath()
        ctx.ellipse(
          mouthCenterX, 
          mouthCenterY + interiorHeight * 0.3 + tongueOut * 8, 
          interiorWidth * 0.4, 
          interiorHeight * 0.3 + tongueOut * 5, 
          0, 0, Math.PI
        )
        ctx.fillStyle = '#c46a6a'
        ctx.fill()
      }
    }

    // Upper lip
    const upperLipWidth = 30 + lipSpread * 15
    const upperLipHeight = 6 + mouthOpen * 3

    const upperGradient = ctx.createLinearGradient(
      mouthCenterX, mouthCenterY - upperLipHeight, 
      mouthCenterX, mouthCenterY + 3
    )
    upperGradient.addColorStop(0, '#d88080')
    upperGradient.addColorStop(0.5, '#c86868')
    upperGradient.addColorStop(1, '#b85555')

    ctx.beginPath()
    ctx.moveTo(mouthCenterX - upperLipWidth, mouthCenterY)
    ctx.quadraticCurveTo(mouthCenterX - upperLipWidth * 0.3, mouthCenterY - upperLipHeight, mouthCenterX, mouthCenterY - upperLipHeight * 1.2)
    ctx.quadraticCurveTo(mouthCenterX + upperLipWidth * 0.3, mouthCenterY - upperLipHeight, mouthCenterX + upperLipWidth, mouthCenterY)
    ctx.quadraticCurveTo(mouthCenterX, mouthCenterY + 2, mouthCenterX - upperLipWidth, mouthCenterY)
    ctx.fillStyle = upperGradient
    ctx.fill()

    // Lower lip
    const lowerLipWidth = 30 + lipSpread * 15
    const lowerLipHeight = 8 + mouthOpen * 4 + jawDrop * 8

    const lowerGradient = ctx.createLinearGradient(
      mouthCenterX, mouthCenterY, 
      mouthCenterX, mouthCenterY + lowerLipHeight
    )
    lowerGradient.addColorStop(0, '#b85555')
    lowerGradient.addColorStop(0.5, '#d87070')
    lowerGradient.addColorStop(1, '#e88888')

    ctx.beginPath()
    ctx.moveTo(mouthCenterX - lowerLipWidth, mouthCenterY)
    ctx.quadraticCurveTo(mouthCenterX, mouthCenterY + lowerLipHeight, mouthCenterX + lowerLipWidth, mouthCenterY)
    ctx.quadraticCurveTo(mouthCenterX, mouthCenterY + 2, mouthCenterX - lowerLipWidth, mouthCenterY)
    ctx.fillStyle = lowerGradient
    ctx.fill()

    // Lip highlight
    ctx.beginPath()
    ctx.ellipse(mouthCenterX, mouthCenterY + lowerLipHeight * 0.3, lowerLipWidth * 0.4, 3, 0, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255, 200, 200, 0.4)'
    ctx.fill()

    ctx.restore()
  }, [])

  // Draw static realistic face (fallback when no camera)
  const drawStaticRealisticFace = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear and draw base
    ctx.clearRect(0, 0, width, height)
    
    if (baseImageRef.current) {
      ctx.drawImage(baseImageRef.current, 0, 0, width, height)
    }

    // Smooth interpolation towards target mouth params
    const smoothFactor = 0.15
    currentParamsRef.current = {
      mouthOpen: lerp(currentParamsRef.current.mouthOpen, targetParamsRef.current.mouthOpen, smoothFactor),
      lipSpread: lerp(currentParamsRef.current.lipSpread, targetParamsRef.current.lipSpread, smoothFactor),
      jawDrop: lerp(currentParamsRef.current.jawDrop, targetParamsRef.current.jawDrop, smoothFactor),
      tongueOut: lerp(currentParamsRef.current.tongueOut, targetParamsRef.current.tongueOut, smoothFactor),
    }

    const { mouthOpen, lipSpread, jawDrop, tongueOut } = currentParamsRef.current

    // Draw animated mouth over the base face
    const mouthX = width / 2
    const mouthY = height * 0.67

    ctx.save()

    // Clear the base mouth area
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#e8c4a8' // Match face color
    ctx.beginPath()
    ctx.ellipse(mouthX, mouthY, 35, 15, 0, 0, 2 * Math.PI)
    ctx.fill()

    // Draw realistic animated mouth (same as above)
    const mouthWidth = 30 + lipSpread * 15
    const openHeight = mouthOpen * 25 + jawDrop * 15

    // Interior when open
    if (mouthOpen > 0.05) {
      ctx.beginPath()
      ctx.ellipse(mouthX, mouthY + jawDrop * 8, mouthWidth * 0.8, openHeight * 0.7, 0, 0, 2 * Math.PI)
      ctx.fillStyle = '#2a1510'
      ctx.fill()

      // Teeth
      if (mouthOpen > 0.15) {
        ctx.beginPath()
        ctx.ellipse(mouthX, mouthY - openHeight * 0.3, mouthWidth * 0.6, 6, 0, 0, Math.PI)
        ctx.fillStyle = '#f8f8f0'
        ctx.fill()
      }

      // Tongue
      if (mouthOpen > 0.2 || tongueOut > 0) {
        ctx.beginPath()
        ctx.ellipse(mouthX, mouthY + openHeight * 0.3 + tongueOut * 8, mouthWidth * 0.4, openHeight * 0.3, 0, 0, Math.PI)
        ctx.fillStyle = '#c46a6a'
        ctx.fill()
      }
    }

    // Lips
    const upperGradient = ctx.createLinearGradient(mouthX, mouthY - 8, mouthX, mouthY + 3)
    upperGradient.addColorStop(0, '#d88080')
    upperGradient.addColorStop(1, '#b85555')

    const lowerGradient = ctx.createLinearGradient(mouthX, mouthY, mouthX, mouthY + 12 + openHeight)
    lowerGradient.addColorStop(0, '#b85555')
    lowerGradient.addColorStop(1, '#e88888')

    // Upper lip
    ctx.beginPath()
    ctx.moveTo(mouthX - mouthWidth, mouthY)
    ctx.quadraticCurveTo(mouthX, mouthY - 8 - mouthOpen * 2, mouthX + mouthWidth, mouthY)
    ctx.quadraticCurveTo(mouthX, mouthY + 2, mouthX - mouthWidth, mouthY)
    ctx.fillStyle = upperGradient
    ctx.fill()

    // Lower lip
    ctx.beginPath()
    ctx.moveTo(mouthX - mouthWidth, mouthY)
    ctx.quadraticCurveTo(mouthX, mouthY + 12 + openHeight, mouthX + mouthWidth, mouthY)
    ctx.quadraticCurveTo(mouthX, mouthY + 2, mouthX - mouthWidth, mouthY)
    ctx.fillStyle = lowerGradient
    ctx.fill()

    ctx.restore()
  }, [])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (hasCamera) {
        // MediaPipe will handle the drawing
      } else {
        drawStaticRealisticFace()
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [hasCamera, drawStaticRealisticFace])

  // Start camera when component mounts
  useEffect(() => {
    if (faceMesh) {
      startCamera()
    }
  }, [faceMesh, startCamera])

  return (
    <div className="relative flex flex-col items-center justify-center h-full">
      <canvas
        ref={canvasRef}
        width={400}
        height={500}
        className="rounded-xl shadow-2xl"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {/* Hidden video element for camera */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        width={400}
        height={300}
      />

      {/* Camera permission button */}
      {!hasCamera && (
        <button
          onClick={startCamera}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Enable Camera for Real Face Tracking
        </button>
      )}

      {/* Status indicators */}
      <div className="absolute top-2 left-2 space-y-1">
        <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
          Mode: {hasCamera ? 'Camera' : 'Static'}
        </div>
        <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
          Viseme: {currentViseme}
        </div>
      </div>

      {isPlaying && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500/80 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Speaking...
        </div>
      )}
    </div>
  )
}

export default RealisticAvatar