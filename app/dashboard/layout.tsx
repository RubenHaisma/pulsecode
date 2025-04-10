"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { 
  BarChart, 
  Code2, 
  History, 
  LogOut, 
  Settings, 
  Star, 
  Trophy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CodeOrb } from "@/components/code-orb"
import { Suspense } from "react"
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary"

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [stats, setStats] = useState({ level: 1 })
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])
  
  // Load stats from localStorage (only basic display data needed for layout)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('CloutNest_githubData')
        if (cachedData) {
          const parsedData = JSON.parse(cachedData)
          // Only use the cached stats if they exist and have a timestamp that isn't too old
          if (parsedData.stats && parsedData.timestamp) {
            // Check if data is fresh (less than 1 hour old)
            const oneHour = 60 * 60 * 1000
            const isFresh = Date.now() - parsedData.timestamp < oneHour
            
            if (isFresh) {
              setStats(parsedData.stats)
            }
          }
        }
      } catch (error) {
        console.error("Error loading cached stats:", error)
      }
    }
  }, [])
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart },
    { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    { name: 'Achievements', href: '/dashboard/achievements', icon: Star },
    { name: 'Activity', href: '/dashboard/activity', icon: History },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse">
          <Code2 className="h-12 w-12 text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background-start to-background-end">
      {/* Sidebar */}
      <div className="fixed top-0 left-0 w-64 h-screen border-r border-white/10 bg-black/60 backdrop-blur-xl z-10">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <Code2 className="h-8 w-8 text-pink-500" />
            <span className="text-xl font-bold pixel-font">CloutNest</span>
          </div>

          <div className="flex justify-center mb-8">
            <div>
              <ErrorBoundary>
                <Suspense fallback={<ProfileOrb />}>
                  <CodeOrb />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  className={`w-full justify-start ${isActive ? 'neon-button' : ''}`}
                  onClick={() => router.push(item.href)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Button>
              )
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <CodeAvatar user={session?.user} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">Level {stats.level}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start" 
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="pl-64">
        {children}
      </main>
    </div>
  )
} 