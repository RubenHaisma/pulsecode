"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { 
  BarChart, 
  Code2, 
  History, 
  LogOut,
  Star, 
  Trophy,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CodeOrb } from "@/components/code-orb"
import { Suspense } from "react"
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary"
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// User avatar with consistent fallback
export const CodeAvatar = ({ user }: { user: any }) => {
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

// Simple orb placeholder in case the 3D component fails
const SimpleOrb = () => (
  <div className="w-48 h-48 flex items-center justify-center">
    <div className="rounded-full w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-700 animate-pulse flex items-center justify-center">
      <Code2 className="h-10 w-10 text-white" />
    </div>
  </div>
);

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ReactErrorBoundary fallback={<ProfileOrb />}>
      {children}
    </ReactErrorBoundary>
  );
};

// Main Dashboard Sidebar Component
export const DashboardSidebar = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState({ level: 1 });
  
  // Load stats from localStorage for the sidebar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('CloutNest_githubData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData.stats && parsedData.stats.level) {
            setStats({ level: parsedData.stats.level });
          }
        }
      } catch (error) {
        console.error("Error loading cached stats for sidebar:", error);
      }
    }
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart },
    { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    { name: 'Achievements', href: '/dashboard/achievements', icon: Star },
    { name: 'Activity', href: '/dashboard/activity', icon: History },
    { name: 'Timeline', href: '/dashboard/timeline', icon: Calendar },
  ];

  return (
    <div className="hidden lg:block fixed top-0 left-0 w-64 h-screen border-r border-white/10 bg-black/60 backdrop-blur-xl z-10">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-8">
          <Code2 className="h-8 w-8 text-pink-500" />
          <span className="text-xl font-bold pixel-font">CloutNest</span>
        </div>

        <div className="flex justify-center mb-8">
          <ErrorBoundary>
            <Suspense fallback={<SimpleOrb />}>
              <CodeOrb />
            </Suspense>
          </ErrorBoundary>
        </div>

        <nav className="space-y-2 flex-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
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
            );
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
  );
};

// Mobile Navigation Component
export const MobileDashboardNav = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({ level: 1 });
  
  // Load stats from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('CloutNest_githubData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData.stats && parsedData.stats.level) {
            setStats({ level: parsedData.stats.level });
          }
        }
      } catch (error) {
        console.error("Error loading cached stats for mobile nav:", error);
      }
    }
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart },
    { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    { name: 'Achievements', href: '/dashboard/achievements', icon: Star },
    { name: 'Activity', href: '/dashboard/activity', icon: History },
    { name: 'Timeline', href: '/dashboard/timeline', icon: Calendar },
  ];

  return (
    <div className="lg:hidden w-full z-20 sticky top-0">
      <div className="flex items-center justify-between w-full p-4 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Code2 className="h-6 w-6 text-pink-500" />
          <span className="text-lg font-bold pixel-font">CloutNest</span>
        </div>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Code2 className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[80vw] sm:w-[350px] bg-black/95 border-r border-white/10 p-0">
            <SheetHeader className="p-6 border-b border-white/10">
              <SheetTitle className="flex items-center gap-3">
                <Code2 className="h-8 w-8 text-pink-500" />
                <span className="text-xl font-bold pixel-font">CloutNest</span>
              </SheetTitle>
            </SheetHeader>
            
            <div className="p-6 flex flex-col h-[calc(100%-80px)]">
              <div className="flex justify-center mb-8">
                <ErrorBoundary>
                  <Suspense fallback={<SimpleOrb />}>
                    <CodeOrb />
                  </Suspense>
                </ErrorBoundary>
              </div>

              <nav className="space-y-2 flex-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Button
                      key={item.name}
                      variant="ghost"
                      className={`w-full justify-start ${isActive ? 'neon-button' : ''}`}
                      onClick={() => {
                        router.push(item.href);
                        setIsOpen(false);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Button>
                  );
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
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Add welcome message for mobile */}
      <div className="p-4 bg-black/60 border-b border-white/10 lg:hidden">
        <h1 className="text-xl font-bold pixel-font neon-glow">
          Welcome back, {session?.user?.name || "Coder"}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Level {stats.level} Coder
        </p>
      </div>
    </div>
  );
}; 