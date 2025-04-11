"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { Medal, Star, Code, GitPullRequest, GitCommit, Flame, Trophy, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LeaderboardUser {
  id: string
  name: string
  image: string | null
  githubUsername: string | null
  points: number
  commits: number
  pullRequests: number
  streak: number
  level: number
  rank?: number
}

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

export default function LeaderboardPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>("points")
  const [timeRange, setTimeRange] = useState<string>("all")
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeaderboard()
    }
  }, [status, sortBy, timeRange])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leaderboard?sortBy=${sortBy}&timeRange=${timeRange}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard")
      }
      
      const data = await response.json()
      
      // Add rank to each user
      const rankedUsers = data.users.map((user: LeaderboardUser, index: number) => ({
        ...user,
        rank: index + 1
      }))
      
      setUsers(rankedUsers)
      
      // Find current user's rank
      if (session?.user?.id) {
        const currentUser = rankedUsers.find((user: LeaderboardUser) => user.id === session.user.id)
        if (currentUser) {
          setCurrentUserRank(currentUser.rank)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load leaderboard. Please try again.",
        variant: "destructive",
      })
      console.error("Error fetching leaderboard:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  const getInitials = (name: string | null | undefined): string => 
    name?.split(' ').map(n => n[0]).join('') || 'U'

  const getUserLevelTitle = (level: number): string => {
    if (level < 3) return "Novice"
    if (level < 5) return "Apprentice" 
    if (level < 10) return "Developer"
    if (level < 15) return "Senior Dev"
    if (level < 20) return "Staff Eng"
    return "Principal"
  }

  const getSortIcon = () => {
    switch (sortBy) {
      case "points": return <Trophy className="h-8 w-8 text-yellow-400" />
      case "commits": return <GitCommit className="h-8 w-8 text-blue-400" />
      case "pullRequests": return <GitPullRequest className="h-8 w-8 text-green-400" />
      case "streak": return <Flame className="h-8 w-8 text-orange-400" />
      default: return <Trophy className="h-8 w-8 text-yellow-400" />
    }
  }
  
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-400" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return null
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
          <p className="text-lg font-medium">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  const hasNoUsers = users.length === 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 lg:pl-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight pixel-font neon-glow">Leaderboard</h1>
        
        <div className="flex gap-4 flex-wrap sm:flex-nowrap">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[150px] bg-black/60">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="today">Today</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[150px] bg-black/60">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="points">Points</SelectItem>
              <SelectItem value="commits">Commits</SelectItem>
              <SelectItem value="pullRequests">Pull Requests</SelectItem>
              <SelectItem value="streak">Streak</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {currentUserRank && (
        <Card className="mb-8 border-2 border-purple-500/30 bg-black/60 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle>Your Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                  {currentUserRank}
                </div>
                <div className="flex items-center gap-3">
                  <CodeAvatar user={session?.user} />
                  <div>
                    <p className="font-medium flex items-center gap-1">
                      {session?.user?.name}
                      {getRankIcon(currentUserRank)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getUserLevelTitle(users.find(u => u.id === session?.user?.id)?.level || 1)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-sm text-muted-foreground">Points</span>
                  <span className="font-bold">{users.find(u => u.id === session?.user?.id)?.points || 0}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm text-muted-foreground">Level</span>
                  <span className="font-bold">{users.find(u => u.id === session?.user?.id)?.level || 1}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm text-muted-foreground">Commits</span>
                  <span className="font-bold">{users.find(u => u.id === session?.user?.id)?.commits || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getSortIcon()}
          <h2 className="text-xl font-semibold">
            Top Users by {
              sortBy === "points" ? "Points" : 
              sortBy === "commits" ? "Commits" : 
              sortBy === "pullRequests" ? "Pull Requests" : 
              "Streak"
            }
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {timeRange === "all" ? "All time" : 
           timeRange === "year" ? "This year" :
           timeRange === "month" ? "This month" :
           timeRange === "week" ? "This week" : "Today"}
        </p>
      </div>

      {hasNoUsers ? (
        <Card className="bg-black/60 backdrop-blur-xl border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-16 w-16 text-yellow-500/30 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Leaderboard Data Yet</h3>
            <p className="text-center text-muted-foreground max-w-md">
              Connect your GitHub account and start coding to appear on the leaderboard.
              Earn points by making commits, opening pull requests, and maintaining streaks.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className="space-y-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {users.slice(0, 20).map((user, index) => (
            <motion.div key={user.id} variants={item}>
              <Card className={`hover:shadow-md transition-all bg-black/60 backdrop-blur-xl border-white/10 ${user.id === session?.user?.id ? 'border-purple-500/30 shadow-md' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold
                        ${user.rank === 1 ? 'bg-yellow-500/20 text-yellow-300' : 
                         user.rank === 2 ? 'bg-gray-500/20 text-gray-300' : 
                         user.rank === 3 ? 'bg-amber-600/20 text-amber-400' : 
                         'bg-slate-500/20 text-slate-300'}`}>
                        {user.rank}
                      </div>
                      <div className="flex items-center gap-3">
                        <CodeAvatar user={user} />
                        <div>
                          <p className="font-medium flex items-center gap-1">
                            {user.name}
                            {getRankIcon(user.rank || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {user.githubUsername && (
                              <>
                                <span>@{user.githubUsername}</span>
                              </>
                            )}
                            {!user.githubUsername && getUserLevelTitle(user.level)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-muted-foreground">Points</span>
                        <span className={`font-bold ${sortBy === 'points' ? 'text-yellow-400' : ''}`}>{user.points}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-muted-foreground">Level</span>
                        <span className="font-bold">
                          {user.level}
                          <Badge variant="outline" className="ml-1 text-xs px-1.5">
                            {getUserLevelTitle(user.level)}
                          </Badge>
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-muted-foreground">Commits</span>
                        <span className={`font-bold ${sortBy === 'commits' ? 'text-blue-400' : ''}`}>{user.commits}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-muted-foreground">PRs</span>
                        <span className={`font-bold ${sortBy === 'pullRequests' ? 'text-green-400' : ''}`}>{user.pullRequests}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-muted-foreground">Streak</span>
                        <span className={`font-bold ${sortBy === 'streak' ? 'text-orange-400' : ''}`}>{user.streak}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
} 