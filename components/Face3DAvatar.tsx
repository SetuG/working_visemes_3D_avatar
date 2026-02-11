'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

interface Viseme {
  time: number;
  viseme: number;  
  duration: number;
}

interface FaceModelProps {
  visemes: Viseme[];
  isPlaying: boolean;
  currentTime: number;
}


const VISEME_TO_BLENDSHAPE: Record<number, Array<{name: string, weight: number}>> = {
  0: [], // silence - neutral face
  
  // 1: ae_ax_ah (cat, father) - open vowel
  1: [
    { name: 'jawOpen', weight: 0.3 },
    { name: 'mouthOpen', weight: 0.4 },
    { name: 'mouthLowerDownLeft', weight: 0.15 },
    { name: 'mouthLowerDownRight', weight: 0.15 }
  ],
  
  // 2: aa (odd) - open back vowel
  2: [
    { name: 'jawOpen', weight: 0.35 },
    { name: 'mouthOpen', weight: 0.5 },
  ],
  
  // 3: ao (caught) - rounded open vowel
  3: [
    { name: 'jawOpen', weight: 0.25 },
    { name: 'mouthFunnel', weight: 0.3 },
    { name: 'mouthPucker', weight: 0.2 }
  ],
  
  // 4: ey_eh_uh (ate, bed, but) - mid vowel
  4: [
    { name: 'jawOpen', weight: 0.2 },
    { name: 'mouthSmileLeft', weight: 0.3 },
    { name: 'mouthSmileRight', weight: 0.3 }
  ],
  
  // 5: er (bird) - r-colored vowel
  5: [
    { name: 'jawOpen', weight: 0.15 },
    { name: 'mouthFunnel', weight: 0.25 },
    { name: 'mouthPucker', weight: 0.15 }
  ],
  
  // 6: y_iy_ih_ix (eat, it) - close front vowel
  6: [
    { name: 'jawOpen', weight: 0.1 },
    { name: 'mouthSmileLeft', weight: 0.4 },
    { name: 'mouthSmileRight', weight: 0.4 }
  ],
  
  // 7: w_uw (oops, boot) - close back rounded vowel
  7: [
    { name: 'jawOpen', weight: 0.1 },
    { name: 'mouthFunnel', weight: 0.35 },
    { name: 'mouthPucker', weight: 0.35 }
  ],
  
  // 8: ow (boat) - diphthong
  8: [
    { name: 'jawOpen', weight: 0.2 },
    { name: 'mouthFunnel', weight: 0.3 },
    { name: 'mouthPucker', weight: 0.25 }
  ],
  
  // 9: aw (cow) - open diphthong
  9: [
    { name: 'jawOpen', weight: 0.35 },
    { name: 'mouthOpen', weight: 0.4 },
    { name: 'mouthFunnel', weight: 0.15 }
  ],
  
  // 10: oy (toy) - diphthong
  10: [
    { name: 'jawOpen', weight: 0.25 },
    { name: 'mouthFunnel', weight: 0.2 },
    { name: 'mouthSmileLeft', weight: 0.2 },
    { name: 'mouthSmileRight', weight: 0.2 }
  ],
  
  // 11: ay (eye) - diphthong
  11: [
    { name: 'jawOpen', weight: 0.3 },
    { name: 'mouthOpen', weight: 0.35 },
    { name: 'mouthSmileLeft', weight: 0.15 },
    { name: 'mouthSmileRight', weight: 0.15 }
  ],
  
  // 12: h (hat) - glottal
  12: [
    { name: 'jawOpen', weight: 0.15 },
    { name: 'mouthOpen', weight: 0.2 }
  ],
  
  // 13: r (red) - approximant
  13: [
    { name: 'jawOpen', weight: 0.15 },
    { name: 'mouthPucker', weight: 0.25 },
    { name: 'mouthFunnel', weight: 0.2 }
  ],
  
  // 14: l (lid) - lateral
  14: [
    { name: 'jawOpen', weight: 0.1 },
    { name: 'tongueOut', weight: 0.15 },
    { name: 'mouthOpen', weight: 0.15 }
  ],
  
  // 15: s_z (sit, zap) - alveolar fricative
  15: [
    { name: 'mouthSmileLeft', weight: 0.25 },
    { name: 'mouthSmileRight', weight: 0.25 },
    { name: 'jawOpen', weight: 0.05 }
  ],
  
  // 16: sh_ch_jh_zh (she, church) - postalveolar
  16: [
    { name: 'mouthFunnel', weight: 0.3 },
    { name: 'mouthPucker', weight: 0.2 },
    { name: 'jawOpen', weight: 0.1 }
  ],
  
  // 17: th_dh (thin, then) - dental fricative
  17: [
    { name: 'tongueOut', weight: 0.25 },
    { name: 'jawOpen', weight: 0.1 },
    { name: 'mouthOpen', weight: 0.15 }
  ],
  
  // 18: f_v (fork, vase) - labiodental
  18: [
    { name: 'mouthLowerDownLeft', weight: 0.3 },
    { name: 'mouthLowerDownRight', weight: 0.3 },
    { name: 'mouthRollLower', weight: 0.2 }
  ],
  
  // 19: d_t_n (dog, top, nose) - alveolar stop/nasal
  19: [
    { name: 'jawOpen', weight: 0.15 },
    { name: 'mouthClose', weight: 0.15 },
    { name: 'tongueOut', weight: 0.1 }
  ],
  
  // 20: k_g_ng (cat, got, sing) - velar
  20: [
    { name: 'jawOpen', weight: 0.2 },
    { name: 'mouthOpen', weight: 0.2 }
  ],
  
  // 21: p_b_m (put, bat, mat) - bilabial
  21: [
    { name: 'mouthClose', weight: 0.5 },
    { name: 'mouthPucker', weight: 0.3 },
    { name: 'mouthPressLeft', weight: 0.2 },
    { name: 'mouthPressRight', weight: 0.2 }
  ]
};

function FaceModel({ visemes, isPlaying, currentTime }: FaceModelProps) {
  const { gl } = useThree();
  const [scene, setScene] = React.useState<THREE.Group | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState<string>('Loading...');
  const [error, setError] = React.useState<string | null>(null);
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const morphTargetNamesRef = useRef<string[]>([]);
  const targetWeights = useRef<number[]>([]);
  const currentWeights = useRef<number[]>([]);

  
  useEffect(() => {
    const loader = new GLTFLoader();
    
    
    loader.setMeshoptDecoder(MeshoptDecoder);
    
   
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);
    
    
    try {
      const ktx2Loader = new KTX2Loader();
      ktx2Loader.setTranscoderPath('https://www.gstatic.com/basis-universal/versioned/2021-04-15-ba1c3e4/');
      ktx2Loader.detectSupport(gl);
      loader.setKTX2Loader(ktx2Loader);
    } catch (e) {
      console.warn('KTX2 loader not available, textures may not load correctly');
    }
    
    console.log('Starting to load GLB from /facecap.glb');
    setLoadingStatus('Initializing loader.');
    
    loader.load(
      '/facecap.glb',
      (gltf) => {
        console.log('GLB loaded successfully!', gltf);
        console.log('Scene children:', gltf.scene.children);
        setLoadingStatus('Processing model.');
        setScene(gltf.scene);
        
       
        gltf.scene.traverse((child) => {
          console.log('Found object:', child.type, child.name);
          
          if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
            const mesh = child as THREE.SkinnedMesh;
            console.log('SkinnedMesh found:', mesh.name);
            if (mesh.morphTargetDictionary) {
              meshRef.current = mesh;
              morphTargetNamesRef.current = Object.keys(mesh.morphTargetDictionary);
              const numTargets = morphTargetNamesRef.current.length;
              targetWeights.current = new Array(numTargets).fill(0);
              currentWeights.current = new Array(numTargets).fill(0);
              console.log('Found morph targets:', morphTargetNamesRef.current);
            }
          } else if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            console.log('Mesh found:', mesh.name);
            if (mesh.morphTargetDictionary) {
              meshRef.current = mesh as any;
              morphTargetNamesRef.current = Object.keys(mesh.morphTargetDictionary);
              const numTargets = morphTargetNamesRef.current.length;
              targetWeights.current = new Array(numTargets).fill(0);
              currentWeights.current = new Array(numTargets).fill(0);
              console.log('Found morph targets on Mesh:', morphTargetNamesRef.current);
            }
          }
        });
        setLoadingStatus('Ready');
      },
      (progress) => {
        const percent = progress.total > 0 ? (progress.loaded / progress.total * 100).toFixed(0) : '?';
        console.log('Loading progress:', percent + '%');
        setLoadingStatus(`Loading: ${percent}%`);
      },
      (error) => {
        console.error('Error loading GLB:', error);
        setError(error instanceof Error ? error.message : String(error));
        setLoadingStatus('Error');
      }
    );
    
    return () => {
      dracoLoader.dispose();
    };
  }, [gl]);

  
  const getCurrentViseme = (time: number): number => {
    if (!visemes.length) return 0;
    
    for (let i = visemes.length - 1; i >= 0; i--) {
      if (time >= visemes[i].time) {
        return visemes[i].viseme;
      }
    }
    return 0;
  };

  
  const findMorphTargetIndex = (targetName: string): number => {
    const mesh = meshRef.current;
    if (!mesh?.morphTargetDictionary) return -1;
    
    
    if (mesh.morphTargetDictionary[targetName] !== undefined) {
      return mesh.morphTargetDictionary[targetName];
    }
    
    
    const lowerTarget = targetName.toLowerCase();
    for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
      if (name.toLowerCase() === lowerTarget) {
        return index as number;
      }
      
      if (name.toLowerCase().includes(lowerTarget) || lowerTarget.includes(name.toLowerCase())) {
        return index as number;
      }
    }
    
    return -1;
  };

  
  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh?.morphTargetInfluences) return;

  
    targetWeights.current.fill(0);

    if (isPlaying) {
      const currentViseme = getCurrentViseme(currentTime);
      
     
      const blendShapes = VISEME_TO_BLENDSHAPE[currentViseme] || [];
      
      
      for (const shape of blendShapes) {
        const idx = findMorphTargetIndex(shape.name);
        if (idx >= 0 && idx < targetWeights.current.length) {
          targetWeights.current[idx] = shape.weight;
        }
      }
    }

    
    const smoothing = 8; 
    for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
      currentWeights.current[i] = THREE.MathUtils.lerp(
        currentWeights.current[i] || 0,
        targetWeights.current[i] || 0,
        1 - Math.exp(-smoothing * delta)
      );
      mesh.morphTargetInfluences[i] = currentWeights.current[i];
    }
  });

  if (!scene) {
    return null; 
  }

  return (
    <primitive 
      object={scene} 
      scale={1.5}
      position={[0, -0.2, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

interface Face3DAvatarProps {
  visemes: Viseme[];
  isPlaying: boolean;
  currentTime: number;
}

export default function Face3DAvatar({ visemes, isPlaying, currentTime }: Face3DAvatarProps) {
  const [status, setStatus] = React.useState('Initializing...');
  
  
  const getCurrentVisemeId = (): number => {
    if (!visemes.length) return 0;
    for (let i = visemes.length - 1; i >= 0; i--) {
      if (currentTime >= visemes[i].time) {
        return visemes[i].viseme;
      }
    }
    return 0;
  };
  
  const visemeNames = [
    'silence', 'ae_ax_ah', 'aa', 'ao', 'ey_eh_uh', 'er', 
    'y_iy_ih_ix', 'w_uw', 'ow', 'aw', 'oy', 'ay',
    'h', 'r', 'l', 's_z', 'sh_ch_jh_zh', 'th_dh',
    'f_v', 'd_t_n', 'k_g_ng', 'p_b_m'
  ];
  
  const currentVisemeId = getCurrentVisemeId();
  const currentVisemeName = visemeNames[currentVisemeId] || 'unknown';

  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-b from-slate-700 to-slate-900 rounded-xl relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={() => setStatus('Canvas ready')}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, 5]} intensity={0.5} />
        <pointLight position={[0, 2, 3]} intensity={0.5} />
        
        <React.Suspense fallback={null}>
          <FaceModel 
            visemes={visemes} 
            isPlaying={isPlaying} 
            currentTime={currentTime} 
          />
        </React.Suspense>
        
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={8}
          target={[0, 0, 0]}
        />
      </Canvas>
      
      
      <div className="absolute bottom-2 left-2 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded space-y-1">
        <div>Status: {status}</div>
        {isPlaying && (
          <div>Viseme: {currentVisemeId} ({currentVisemeName})</div>
        )}
      </div>
    </div>
  );
}
