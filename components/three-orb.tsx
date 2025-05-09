"use client"

import { useRef } from "react"
import { Canvas, useFrame, extend } from "@react-three/fiber"
import { Sphere, MeshDistortMaterial } from "@react-three/drei"
import * as THREE from "three"

function OrbMesh() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3
    }
  })

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <MeshDistortMaterial
        color="#ff0099"
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0}
        metalness={1}
      />
    </Sphere>
  )
}

// Use a cleaner approach to handle errors with try-catch
const CanvasWrapper = ({ children }: { children: React.ReactNode }) => {
  try {
    return (
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {children}
      </Canvas>
    )
  } catch (e) {
    console.error("Canvas error:", e)
    return null
  }
}

OrbMesh.displayName = 'OrbMesh'
CanvasWrapper.displayName = 'CanvasWrapper'

export function ThreeOrb() {
  return (
    <div className="w-48 h-48">
      <CanvasWrapper>
        <OrbMesh />
      </CanvasWrapper>
    </div>
  )
}

ThreeOrb.displayName = 'ThreeOrb' 