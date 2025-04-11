"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, Suspense } from "react"
import { signOut } from "next-auth/react"
import { 
  BarChart, 
  Code2, 
  History, 
  LogOut, 
  Menu, 
  Star, 
  Trophy 
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodeOrb } from "@/components/code-orb"
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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
    <ReactErrorBoundary fallback={<SimpleOrb />}>
      {children}
    </ReactErrorBoundary>
  );
};

interface MobileNavProps {
  user: any;
  level: number;
}

export function MobileNav({ user, level }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Function to check if a route is active
  const isActive = (route: string) => {
    if (route === "/dashboard" && pathname === "/dashboard") {
      return true;
    }
    return pathname.startsWith(route) && route !== "/dashboard";
  };
  
  const handleNavigation = (route: string) => {
    router.push(route);
    setIsOpen(false);
  };
  
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
              <Menu className="h-6 w-6" />
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
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${isActive("/dashboard") && !pathname.includes("/dashboard/") ? "neon-button" : ""}`}
                  onClick={() => handleNavigation("/dashboard")}
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${isActive("/dashboard/leaderboard") ? "neon-button" : ""}`}
                  onClick={() => handleNavigation("/dashboard/leaderboard")}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Leaderboard
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${isActive("/dashboard/achievements") ? "neon-button" : ""}`}
                  onClick={() => handleNavigation("/dashboard/achievements")}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Achievements
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${isActive("/dashboard/activity") ? "neon-button" : ""}`}
                  onClick={() => handleNavigation("/dashboard/activity")}
                >
                  <History className="mr-2 h-4 w-4" />
                  Activity
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${isActive("/dashboard/timeline") ? "neon-button" : ""}`}
                  onClick={() => handleNavigation("/dashboard/timeline")}
                >
                  <History className="mr-2 h-4 w-4" />
                  Timeline
                </Button>
              </nav>

              <div className="mt-auto border-t border-white/10 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <CodeAvatar user={user} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">Level {level}</p>
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
          Welcome back, {user?.name || "Coder"}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Level {level} Coder
        </p>
      </div>
    </div>
  );
} 