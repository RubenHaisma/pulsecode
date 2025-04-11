"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { 
  GitCommit, 
  GitPullRequest, 
  GitMerge, 
  Star, 
  History, 
  CalendarClock, 
  Code, 
  Github, 
  Loader2 
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimeRangeSelector } from "@/components/time-range-selector"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

interface Activity {
  id: string
  type: 'commit' | 'pr' | 'star' | 'fork' | 'issue' | 'release' | 'review'
  title: string
  repo: string
  date: string
  url: string
  state?: string
  sha?: string
  prNumber?: number
}

export default function ActivityPage() {
  const { data: session, status } = useSession()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<string>("month")
  const { toast } = useToast()

  useEffect(() => {
    if (status === "authenticated") {
      fetchActivities()
    }
  }, [status, timeRange])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/github/activity?timeRange=${timeRange}&limit=50`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch activity")
      }
      
      const data = await response.json()
      setActivities(data.activities || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load GitHub activity. Please try again.",
        variant: "destructive",
      })
      console.error("Error fetching activity:", error)
      setActivities([])
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit': return <GitCommit className="h-5 w-5 text-blue-500" />
      case 'pr': return <GitPullRequest className="h-5 w-5 text-green-500" />
      case 'star': return <Star className="h-5 w-5 text-yellow-500" />
      case 'fork': return <GitMerge className="h-5 w-5 text-purple-500" />
      case 'review': return <Code className="h-5 w-5 text-orange-500" />
      default: return <History className="h-5 w-5 text-gray-500" />
    }
  }

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'commit': return 'Committed'
      case 'pr': return 'Opened Pull Request'
      case 'star': return 'Starred'
      case 'fork': return 'Forked'
      case 'review': return 'Reviewed'
      default: return 'Activity'
    }
  }

  const getStateColor = (type: string, state?: string) => {
    if (type === 'pr') {
      if (state === 'open') return 'bg-green-100 text-green-800'
      if (state === 'closed') return 'bg-red-100 text-red-800'
      if (state === 'merged') return 'bg-purple-100 text-purple-800'
    }
    return 'bg-blue-100 text-blue-800'
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return "Unknown date"
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Loading activity...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 lg:pl-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight pixel-font neon-glow">GitHub Activity</h1>
        
        <div>
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Github className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        <Button onClick={fetchActivities} size="sm" variant="outline">
          Refresh
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <CalendarClock className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No activity found</h3>
              <p className="text-muted-foreground mt-1">
                No GitHub activity found for the selected time range.
              </p>
              <Button 
                variant="secondary" 
                className="mt-4"
                onClick={() => setTimeRange('all')}
              >
                View all-time activity
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Activity</TabsTrigger>
            <TabsTrigger value="commits">Commits</TabsTrigger>
            <TabsTrigger value="prs">Pull Requests</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <ActivityList 
              activities={activities} 
              container={container} 
              item={item}
              getActivityIcon={getActivityIcon}
              getActivityTypeLabel={getActivityTypeLabel}
              getStateColor={getStateColor}
              formatTimeAgo={formatTimeAgo}
            />
          </TabsContent>
          
          <TabsContent value="commits">
            <ActivityList 
              activities={activities.filter(a => a.type === 'commit')} 
              container={container} 
              item={item}
              getActivityIcon={getActivityIcon}
              getActivityTypeLabel={getActivityTypeLabel}
              getStateColor={getStateColor}
              formatTimeAgo={formatTimeAgo}
            />
          </TabsContent>
          
          <TabsContent value="prs">
            <ActivityList 
              activities={activities.filter(a => a.type === 'pr')} 
              container={container} 
              item={item}
              getActivityIcon={getActivityIcon}
              getActivityTypeLabel={getActivityTypeLabel}
              getStateColor={getStateColor}
              formatTimeAgo={formatTimeAgo}
            />
          </TabsContent>
          
          <TabsContent value="reviews">
            <ActivityList 
              activities={activities.filter(a => a.type === 'review')} 
              container={container} 
              item={item}
              getActivityIcon={getActivityIcon}
              getActivityTypeLabel={getActivityTypeLabel}
              getStateColor={getStateColor}
              formatTimeAgo={formatTimeAgo}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

interface ActivityListProps {
  activities: Activity[]
  container: any
  item: any
  getActivityIcon: (type: string) => JSX.Element
  getActivityTypeLabel: (type: string) => string
  getStateColor: (type: string, state?: string) => string
  formatTimeAgo: (dateString: string) => string
}

function ActivityList({
  activities,
  container,
  item,
  getActivityIcon,
  getActivityTypeLabel,
  getStateColor,
  formatTimeAgo
}: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <CalendarClock className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No activity found</h3>
            <p className="text-muted-foreground mt-1">
              No activity of this type found for the selected time range.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Group activities by day
  const activityGroups: Record<string, Activity[]> = {}
  
  activities.forEach(activity => {
    const date = new Date(activity.date)
    const dateString = date.toDateString()
    
    if (!activityGroups[dateString]) {
      activityGroups[dateString] = []
    }
    
    activityGroups[dateString].push(activity)
  })
  
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {Object.entries(activityGroups).map(([date, groupActivities]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
            {new Date(date).toLocaleDateString(undefined, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          <div className="space-y-4">
            {groupActivities.map(activity => (
              <motion.div key={activity.id} variants={item}>
                <Card className="hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="font-normal">
                            {getActivityTypeLabel(activity.type)}
                          </Badge>
                          {activity.state && (
                            <Badge className={getStateColor(activity.type, activity.state)}>
                              {activity.state}
                            </Badge>
                          )}
                        </div>
                        
                        <a 
                          href={activity.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-lg font-medium hover:underline line-clamp-1"
                        >
                          {activity.title}
                        </a>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <span>in</span>
                          <a 
                            href={`https://github.com/${activity.repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                          >
                            {activity.repo}
                          </a>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(activity.date)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  )
} 