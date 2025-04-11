"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { Trophy, LucideIcon, Lock, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icons } from "@/components/icons"
import { useToast } from "@/hooks/use-toast"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  unlockedAt: string | null
}

// Available achievement icons
const achievementIcons: Record<string, any> = {
  ...Icons
}

export default function AchievementsPage() {
  const { data: session, status } = useSession()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPoints, setTotalPoints] = useState(0)
  const [unlockedCount, setUnlockedCount] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    if (status === "authenticated") {
      fetchAchievements()
    }
  }, [status])

  const fetchAchievements = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/achievements")
      if (!response.ok) {
        throw new Error("Failed to fetch achievements")
      }
      const data = await response.json()
      setAchievements(data.achievements || [])
      setTotalPoints(data.totalPoints || 0)
      setUnlockedCount(data.unlockedCount || 0)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load achievements. Please try again.",
        variant: "destructive",
      })
      console.error("Error fetching achievements:", error)
      // Set default values on error
      setAchievements([])
      setTotalPoints(0)
      setUnlockedCount(0)
    } finally {
      setLoading(false)
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
          <p className="text-lg font-medium">Loading achievements...</p>
        </div>
      </div>
    )
  }

  // Get achievement count safely
  const achievementCount = achievements?.length || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 lg:pl-0">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight pixel-font neon-glow mb-6">Your Achievements</h1>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Achievement Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPoints}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Achievements Unlocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unlockedCount} / {achievementCount}</div>
            <Progress value={(unlockedCount / Math.max(1, achievementCount)) * 100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">
                {totalPoints < 100 ? "Novice" : 
                 totalPoints < 300 ? "Apprentice" : 
                 totalPoints < 600 ? "Journeyman" : 
                 totalPoints < 1000 ? "Expert" : "Master"}
              </div>
              {totalPoints >= 1000 && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-amber-600">
                  Elite
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
          <TabsTrigger value="locked">Locked</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {achievements.length === 0 ? (
            <Card className="bg-black/60 backdrop-blur-xl border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Trophy className="h-16 w-16 text-yellow-500/30 mb-4" />
                <h3 className="text-xl font-medium mb-2">No Achievements Yet</h3>
                <p className="text-center text-muted-foreground max-w-md">
                  Connect your GitHub account and start coding to unlock achievements.
                  Earn points by making commits, opening pull requests, and maintaining streaks.
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div 
              className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {achievements.map((achievement) => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                  variants={item}
                />
              ))}
            </motion.div>
          )}
        </TabsContent>
        
        <TabsContent value="unlocked">
          <motion.div 
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {achievements
              .filter(a => a.unlockedAt)
              .map((achievement) => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                  variants={item}
                />
              ))}
          </motion.div>
        </TabsContent>
        
        <TabsContent value="locked">
          <motion.div 
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {achievements
              .filter(a => !a.unlockedAt)
              .map((achievement) => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                  variants={item}
                />
              ))}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const AchievementCard = ({ achievement, variants }: { achievement: Achievement, variants: any }) => {
  const Icon = achievementIcons[achievement.icon] || Trophy
  const isUnlocked = !!achievement.unlockedAt
  const unlockedDate = isUnlocked ? new Date(achievement.unlockedAt as string) : null

  return (
    <motion.div variants={variants}>
      <Card className={`hover:shadow-md transition-all h-full ${!isUnlocked ? 'opacity-70 grayscale' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className={`p-2 rounded-full ${isUnlocked ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
              {isUnlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </div>
            <Badge className="bg-purple-600" variant="secondary">
              {achievement.points} points
            </Badge>
          </div>
          <CardTitle className="text-lg mt-2">{achievement.name}</CardTitle>
          <CardDescription>{achievement.description}</CardDescription>
        </CardHeader>
        <CardFooter className="pt-1 text-xs text-muted-foreground flex justify-between">
          <div>
            {isUnlocked ? (
              <span>Unlocked: {unlockedDate?.toLocaleDateString()}</span>
            ) : (
              <span>Not yet unlocked</span>
            )}
          </div>
          <div>
            {isUnlocked && (
              <Badge variant="outline" className="text-xs">
                🏆 Earned
              </Badge>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
} 