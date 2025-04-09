"use client"

import { useRef, useState, useEffect, ReactNode } from "react"
import dynamic from 'next/dynamic'
import { Loader2, Code2 } from "lucide-react"

// Create a fallback component for when Three.js is loading
const OrbFallback = () => (
  <div className="w-48 h-48 flex items-center justify-center">
    <div className="rounded-full w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-700 animate-pulse flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-white animate-spin" />
    </div>
  </div>
)

// Simple fallback when errors occur
const SimpleOrb = () => (
  <div className="w-48 h-48 flex items-center justify-center">
    <div className="rounded-full w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-700 flex items-center justify-center">
      <Code2 className="h-10 w-10 text-white" />
    </div>
  </div>
);

// Dynamically import the Three.js components with SSR disabled
const ThreeOrb = dynamic(
  () => import('./three-orb').then((mod) => mod.ThreeOrb).catch(() => () => <SimpleOrb />),
  { 
    ssr: false,
    loading: OrbFallback
  }
)

// Define props for our error boundary
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

// Simple error boundary component
function CustomErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)
  
  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error('Three.js error caught:', error)
      setHasError(true)
    }
    
    window.addEventListener('error', errorHandler)
    
    return () => {
      window.removeEventListener('error', errorHandler)
    }
  }, [])
  
  if (hasError) {
    return <>{fallback}</>
  }
  
  try {
    return <>{children}</>
  } catch (error) {
    console.error('Error rendering ThreeOrb:', error)
    return <>{fallback}</>
  }
}

// Export a simple wrapper component
export function CodeOrb() {
  return <CustomErrorBoundary fallback={<SimpleOrb />}>
    <ThreeOrb />
  </CustomErrorBoundary>
}