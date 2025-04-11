"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Image from "next/image"
import { 
  BarChart, 
  Code2, 
  History, 
  LogOut, 
  Menu,
  Settings,
  Star, 
  Trophy,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CodeOrb } from "@/components/code-orb"
import { Suspense } from "react"
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Metadata } from "next"
import "@/styles/globals.css"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Providers } from "@/components/providers"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { Toaster } from "@/components/ui/toaster"

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
            <Image src={session.user.image} alt="Profile" className="w-full h-full object-cover" width={100} height={100} />
          ) : (
            <span className="text-white text-2xl font-bold">{getInitials(session?.user?.name)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// User avatar with consistent fallback
const CodeAvatar = ({ user }: { user: any }) => {
  const getInitials = (name: string | null | undefined): string => 
    name?.split(' ').map(n => n[0]).join('') || 'U';
    
  return (
    <Avatar>
      <AvatarImage src={user?.image || undefined} />
      <AvatarFallback>
        <div className="bg-gradient-to-br from-pink-500 to-purple-700 w-full h-full flex items-center justify-center">
          {getInitials(user?.name)}
        </div>
      </AvatarFallback>
    </Avatar>
  );
};

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ReactErrorBoundary fallback={<ProfileOrb />}>
      {children}
    </ReactErrorBoundary>
  );
};

interface Stats {
  level: number;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  // If not authenticated, redirect to login
  if (!session) {
    redirect("/login")
  }
  
  // Default stats with level 1
  const defaultStats: Stats = { level: 1 }
  
  // Try to get cached stats from API
  let userStats = defaultStats
  try {
    const statsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/github/stats`, {
      cache: 'no-store',
    })
    
    if (statsResponse.ok) {
      const data = await statsResponse.json()
      if (data?.stats?.level) {
        userStats = { level: data.stats.level }
      }
    }
  } catch (error) {
    console.error("Error fetching user stats for layout:", error)
  }

  return (
    <Providers>
      <div className="min-h-screen bg-gradient-to-b from-background-start to-background-end">
        {/* Desktop sidebar - used across all dashboard pages */}
        <DashboardSidebar user={session.user} level={userStats.level} />
        
        {/* Mobile Navigation - used across all dashboard pages */}
        <MobileNav user={session.user} level={userStats.level} />
        
        {/* Main content with proper spacing to account for sidebar */}
        <main className="lg:pl-64 mt-0">
          {children}
        </main>
        
        {/* Toast notifications */}
        <Toaster />
      </div>
    </Providers>
  )
} 