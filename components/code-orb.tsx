"use client"

import { useRef, useState, useEffect, ReactNode } from "react"
import dynamic from 'next/dynamic'
import { Loader2, Code2 } from "lucide-react"
import { useSession } from "next-auth/react"

// Create a fallback component for when Three.js is loading
const OrbFallback = () => (
  <div className="w-48 h-48 flex items-center justify-center">
    <div className="rounded-full w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-700 animate-pulse flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-white animate-spin" />
    </div>
  </div>
)
OrbFallback.displayName = 'OrbFallback';

// Profile orb that uses the user's avatar
const ProfileOrb = () => {
  const { data: session } = useSession();
  
  const getInitials = (name: string | null | undefined): string => 
    name?.split(' ').map(n => n[0]).join('') || 'U';
  
  return (
    <div className="w-48 h-48 flex items-center justify-center">
      <div className="rounded-full w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-700 animate-pulse p-1">
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black/20 backdrop-blur-sm">
          {session?.user?.image ? (
            <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-2xl font-bold">{getInitials(session?.user?.name)}</span>
          )}
        </div>
      </div>
    </div>
  );
};
ProfileOrb.displayName = 'ProfileOrb';

// Dynamically import the Three.js components with SSR disabled
const ThreeOrb = dynamic(
  () => import('./three-orb').then((mod) => mod.ThreeOrb).catch(() => () => <ProfileOrb />),
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
CustomErrorBoundary.displayName = 'CustomErrorBoundary';

// Export a simple wrapper component
export function CodeOrb() {
  return <CustomErrorBoundary fallback={<ProfileOrb />}>
    <ThreeOrb />
  </CustomErrorBoundary>
}