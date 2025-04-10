"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  BarChart,
  Calendar,
  Code2,
  GitCommit,
  History,
  ChevronLeft,
  Flame,
  ArrowLeft,
  RefreshCw,
  Loader2
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimeRangeSelector } from "@/components/time-range-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define types for activity data
interface Activity {
  date: string
  type: string
  repo?: string
  [key: string]: any
}

interface DailyActivity {
  date: string
  count: number
  details: Activity[]
}

interface WeeklyActivity {
  week: string
  count: number
  details: Activity[]
}

interface MonthlyActivity {
  month: string
  count: number
  details: Activity[]
}

interface ActivityData {
  daily: DailyActivity[]
  weekly: WeeklyActivity[]
  monthly: MonthlyActivity[]
  earliestDate: Date | null
  latestDate: Date | null
  maxDailyCount: number
  maxWeeklyCount: number
  maxMonthlyCount: number
  totalActivities: number
  avgActivitiesPerDay: number
  avgActivitiesPerWeek: number
  mostActiveDay: DailyActivity | null
  mostActiveWeek: WeeklyActivity | null
  mostActiveMonth: MonthlyActivity | null
}

export default function TimelinePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("all")
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month")
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Set the default time range from localStorage if exists
      const savedTimeRange = localStorage.getItem("CloutNest_timeRange")
      if (savedTimeRange) {
        setTimeRange(savedTimeRange)
      }
      
      // Load activities from cache
      try {
        const cachedData = localStorage.getItem("CloutNest_githubData")
        if (cachedData) {
          const parsedData = JSON.parse(cachedData)
          if (parsedData.activities && Array.isArray(parsedData.activities)) {
            setActivities(parsedData.activities)
            setLoading(false)
          } else {
            // Fetch activities if not in cache or invalid
            refreshData()
          }
        } else {
          // No cached data, fetch fresh data
          refreshData()
        }
      } catch (error) {
        console.error("Error loading cached activities:", error)
        // Attempt to fetch fresh data on error
        refreshData()
      }
    }
  }, [])
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])
  
  // Function to refresh data from the API
  const refreshData = async () => {
    setIsRefreshing(true)
    setLoading(true)
    try {
      // Fetch fresh activities data
      const activitiesResponse = await fetch(`/api/github/activity?timeRange=${timeRange}`)
      const activitiesData = await activitiesResponse.json()
      
      if (activitiesResponse.ok && activitiesData.activities) {
        setActivities(activitiesData.activities)
        
        // Update localStorage with new data
        try {
          let cachedData = localStorage.getItem("CloutNest_githubData")
          let parsedData = {}
          
          if (cachedData) {
            parsedData = JSON.parse(cachedData)
          }
          
          localStorage.setItem("CloutNest_githubData", JSON.stringify({
            ...parsedData,
            activities: activitiesData.activities,
            timestamp: Date.now()
          }))
        } catch (error) {
          console.error("Error updating cached activities:", error)
        }
      } else {
        console.error("Failed to fetch activities data", activitiesData)
      }
    } catch (error) {
      console.error("Error refreshing activity data:", error)
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }
  
  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
    localStorage.setItem("CloutNest_timeRange", value)
    refreshData()
  }
  
  // Process the activity data to get counts by date
  const processActivities = (): ActivityData => {
    if (!activities.length) return {
      daily: [], weekly: [], monthly: [], 
      earliestDate: null, latestDate: null,
      maxDailyCount: 0, maxWeeklyCount: 0, maxMonthlyCount: 0,
      totalActivities: 0, avgActivitiesPerDay: 0, avgActivitiesPerWeek: 0,
      mostActiveDay: null, mostActiveWeek: null, mostActiveMonth: null
    }
    
    const activityByDate = new Map<string, { count: number, details: Activity[] }>()
    const activityByWeek = new Map<string, { count: number, details: Activity[] }>()
    const activityByMonth = new Map<string, { count: number, details: Activity[] }>()
    
    // Track the earliest and latest dates for the range
    let earliestDate: Date | null = null
    let latestDate: Date | null = null
    
    // Sort activities by date
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Prepare data structures for each view
    sortedActivities.forEach(activity => {
      const date = new Date(activity.date)
      const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
      
      // Calculate week (Sunday-based)
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
      const pastDaysOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000)
      const weekNum = Math.floor((pastDaysOfYear + firstDayOfYear.getDay()) / 7) + 1
      const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
      
      // Calculate month
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      // Update date tracking
      if (!earliestDate || date < earliestDate) {
        earliestDate = date
      }
      if (!latestDate || date > latestDate) {
        latestDate = date
      }
      
      // Update daily count
      if (!activityByDate.has(dateKey)) {
        activityByDate.set(dateKey, { count: 0, details: [] })
      }
      activityByDate.get(dateKey)!.count += 1
      activityByDate.get(dateKey)!.details.push(activity)
      
      // Update weekly count
      if (!activityByWeek.has(weekKey)) {
        activityByWeek.set(weekKey, { count: 0, details: [] })
      }
      activityByWeek.get(weekKey)!.count += 1
      activityByWeek.get(weekKey)!.details.push(activity)
      
      // Update monthly count
      if (!activityByMonth.has(monthKey)) {
        activityByMonth.set(monthKey, { count: 0, details: [] })
      }
      activityByMonth.get(monthKey)!.count += 1
      activityByMonth.get(monthKey)!.details.push(activity)
    })
    
    // Convert maps to arrays for easier rendering
    const dailyData = Array.from(activityByDate.entries())
      .map(([date, data]) => ({ date, count: data.count, details: data.details }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    const weeklyData = Array.from(activityByWeek.entries())
      .map(([week, data]) => ({ week, count: data.count, details: data.details }))
      .sort((a, b) => a.week.localeCompare(b.week))
    
    const monthlyData = Array.from(activityByMonth.entries())
      .map(([month, data]) => ({ month, count: data.count, details: data.details }))
      .sort((a, b) => a.month.localeCompare(b.month))
    
    // Find most active periods
    const mostActiveDay = dailyData.length ? 
      dailyData.reduce((max, curr) => curr.count > max.count ? curr : max, dailyData[0]) : null
      
    const mostActiveWeek = weeklyData.length ? 
      weeklyData.reduce((max, curr) => curr.count > max.count ? curr : max, weeklyData[0]) : null
      
    const mostActiveMonth = monthlyData.length ? 
      monthlyData.reduce((max, curr) => curr.count > max.count ? curr : max, monthlyData[0]) : null
    
    // Calculate averages
    const daySpan = earliestDate && latestDate ? 
      Math.max(1, Math.ceil(((latestDate as Date).getTime() - (earliestDate as Date).getTime()) / (1000 * 60 * 60 * 24))) : 1
    
    const weekSpan = Math.max(1, Math.ceil(daySpan / 7))
    
    const totalActivities = sortedActivities.length
    const avgActivitiesPerDay = totalActivities / daySpan
    const avgActivitiesPerWeek = totalActivities / weekSpan
    
    return {
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
      earliestDate,
      latestDate,
      maxDailyCount: Math.max(...(dailyData.length ? dailyData.map(d => d.count) : [0])),
      maxWeeklyCount: Math.max(...(weeklyData.length ? weeklyData.map(w => w.count) : [0])),
      maxMonthlyCount: Math.max(...(monthlyData.length ? monthlyData.map(m => m.count) : [0])),
      totalActivities,
      avgActivitiesPerDay,
      avgActivitiesPerWeek,
      mostActiveDay,
      mostActiveWeek,
      mostActiveMonth
    }
  }
  
  const activityData = processActivities()
  
  // Render the timeline visualization based on the selected view mode
  const renderTimelineVisualization = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      )
    }
    
    if (!activities.length) {
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No activity data available for the selected time range</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4 bg-black/60 border-white/20 hover:bg-purple-900/30 transition-colors"
            onClick={refreshData}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Refresh Data</span>
          </Button>
        </div>
      )
    }
    
    // Handle daily view
    if (viewMode === "day") {
      return renderDailyView()
    }
    
    // Handle weekly view
    if (viewMode === "week") {
      return renderWeeklyView()
    }
    
    // Handle monthly view (default)
    return renderMonthlyView()
  }
  
  // Render daily view
  const renderDailyView = () => {
    const { daily, maxDailyCount } = activityData
    
    return (
      <div className="mt-6">
        <div className="grid grid-cols-1 gap-1">
          {daily.map(({ date, count, details }) => {
            const heightPercentage = Math.max(5, (count / maxDailyCount) * 100)
            const formattedDate = new Date(date).toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })
            
            return (
              <div key={date} className="flex items-center gap-4 group hover:bg-white/5 p-2 rounded transition-colors">
                <div className="w-36 flex-shrink-0 text-sm">{formattedDate}</div>
                <div className="flex-1 h-8 bg-black/40 rounded-sm overflow-hidden flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-sm transition-all duration-200 group-hover:from-purple-500 group-hover:to-pink-500"
                          style={{ width: `${heightPercentage}%` }}
                        >
                          <div className="h-full w-full opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]"></div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="text-xs">
                          <p className="font-medium">{count} activities</p>
                          <ul className="mt-1 max-h-32 overflow-y-auto">
                            {details.slice(0, 5).map((detail: any, i: number) => (
                              <li key={i} className="text-xs mt-1">
                                {detail.type}: {detail.repo || 'Unknown repo'}
                              </li>
                            ))}
                            {details.length > 5 && (
                              <li className="text-xs mt-1 text-muted-foreground">
                                + {details.length - 5} more activities
                              </li>
                            )}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="ml-2 text-white font-medium">{count}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  
  // Render weekly view
  const renderWeeklyView = () => {
    const { weekly, maxWeeklyCount } = activityData
    
    return (
      <div className="mt-6">
        <div className="grid grid-cols-1 gap-1">
          {weekly.map(({ week, count, details }) => {
            const heightPercentage = Math.max(5, (count / maxWeeklyCount) * 100)
            
            // Extract year and week number
            const [year, weekNum] = week.split('-W')
            
            // Generate a rough date range for the week
            const weekDate = new Date(parseInt(year), 0, 1)
            weekDate.setDate(weekDate.getDate() + (parseInt(weekNum) - 1) * 7)
            const weekEndDate = new Date(weekDate)
            weekEndDate.setDate(weekDate.getDate() + 6)
            
            const dateRangeStr = `${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            
            return (
              <div key={week} className="flex items-center gap-4 group hover:bg-white/5 p-2 rounded transition-colors">
                <div className="w-48 flex-shrink-0 text-sm">{dateRangeStr}</div>
                <div className="flex-1 h-10 bg-black/40 rounded-sm overflow-hidden flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-sm transition-all duration-200 group-hover:from-violet-500 group-hover:to-indigo-500"
                          style={{ width: `${heightPercentage}%` }}
                        >
                          <div className="h-full w-full opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]"></div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="text-xs">
                          <p className="font-medium">{count} activities in week {weekNum}</p>
                          <p className="text-muted-foreground mt-1">Average: {(count / 7).toFixed(1)} per day</p>
                          <div className="mt-2">
                            <p className="font-medium mb-1">Top activities:</p>
                            {Object.entries(
                              details.reduce((acc: any, curr: any) => {
                                acc[curr.type] = (acc[curr.type] || 0) + 1
                                return acc
                              }, {})
                            )
                              .sort((a: any, b: any) => b[1] - a[1])
                              .slice(0, 3)
                              .map(([type, count]: [string, any], i) => (
                                <p key={i} className="text-xs">
                                  {type}: {count}
                                </p>
                              ))}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="ml-2 text-white font-medium">{count}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  
  // Render monthly view
  const renderMonthlyView = () => {
    const { monthly, maxMonthlyCount } = activityData
    
    return (
      <div className="mt-6">
        <div className="flex items-end h-[250px] gap-4 relative">
          {monthly.map(({ month, count, details }) => {
            // Calculate height percentage
            const heightPercentage = Math.max(5, (count / maxMonthlyCount) * 100)
            
            // Extract year and month for display
            const [year, monthNum] = month.split('-')
            const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
            const monthName = monthDate.toLocaleString('default', { month: 'long' })
            
            return (
              <div key={month} className="flex-1 flex flex-col items-center group min-w-20">
                <div className="relative flex-1 w-full flex flex-col justify-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="w-full rounded-t-sm bg-gradient-to-t from-purple-500 to-pink-500 transition-all duration-300 hover:from-purple-400 hover:to-pink-400 group-hover:shadow-glow"
                          style={{ 
                            height: `${heightPercentage}%`,
                            opacity: 0.6 + (count / maxMonthlyCount) * 0.4
                          }}
                        >
                          <div className="h-full w-full opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]"></div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p className="font-medium">{count} activities in {monthName}</p>
                          <p className="text-muted-foreground mt-1">
                            Avg: {(count / new Date(parseInt(year), parseInt(monthNum), 0).getDate()).toFixed(1)} per day
                          </p>
                          <div className="mt-2">
                            <p className="font-medium mb-1">Activity breakdown:</p>
                            {Object.entries(
                              details.reduce((acc: any, curr: any) => {
                                acc[curr.type] = (acc[curr.type] || 0) + 1
                                return acc
                              }, {})
                            )
                              .sort((a: any, b: any) => b[1] - a[1])
                              .map(([type, count]: [string, any], i) => (
                                <p key={i} className="text-xs">
                                  {type}: {count}
                                </p>
                              ))}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="mt-2 text-sm">
                  <div className="font-medium">{count}</div>
                  <div className="text-xs text-muted-foreground">{monthName} {year}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  
  // Render stats cards
  const renderStatsCards = () => {
    const { 
      totalActivities, 
      avgActivitiesPerDay, 
      avgActivitiesPerWeek,
      mostActiveDay,
      mostActiveWeek,
      mostActiveMonth
    } = activityData
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="neon-border bg-black/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Activities</CardTitle>
            <CardDescription className="text-xs">Across all time periods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <History className="h-6 w-6 text-blue-500 mr-2" />
              <div className="text-2xl font-bold">{totalActivities}</div>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            <Badge variant="outline" className="neon-glow text-xs">
              {avgActivitiesPerDay.toFixed(1)} activities per day
            </Badge>
          </CardFooter>
        </Card>
        
        <Card className="neon-border bg-black/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most Active Period</CardTitle>
            <CardDescription className="text-xs">Your peak coding time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Flame className="h-6 w-6 text-orange-500 mr-2" />
              <div className="text-lg font-bold truncate">
                {mostActiveMonth ? (
                  <>
                    {new Date(parseInt(mostActiveMonth.month.split('-')[0]), parseInt(mostActiveMonth.month.split('-')[1]) - 1, 1)
                      .toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                  </>
                ) : (
                  "No data available"
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            <Badge variant="outline" className="neon-glow text-xs">
              {mostActiveMonth ? `${mostActiveMonth.count} activities` : "Start coding!"}
            </Badge>
          </CardFooter>
        </Card>
        
        <Card className="neon-border bg-black/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Average</CardTitle>
            <CardDescription className="text-xs">Your typical coding week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-green-500 mr-2" />
              <div className="text-2xl font-bold">{avgActivitiesPerWeek.toFixed(1)}</div>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-0">
            <Badge variant="outline" className="neon-glow text-xs">
              {mostActiveWeek ? `Best week: ${mostActiveWeek.count} activities` : "No data yet"}
            </Badge>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // Main render
  return (
    <div className="container p-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button
              variant="ghost" 
              size="icon"
              className="mr-2"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Coding Timeline</h1>
              <p className="text-muted-foreground">Detailed view of your coding activity over time</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-black/60 border-white/20 hover:bg-purple-900/30 transition-colors"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Refresh</span>
              </>
            )}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center">
            <div className="mr-4">
              <p className="text-sm font-medium">Time Range</p>
            </div>
            <TimeRangeSelector 
              value={timeRange} 
              onChange={handleTimeRangeChange} 
            />
          </div>
          
          <div className="flex items-center justify-end">
            <div className="mr-4">
              <p className="text-sm font-medium">View Mode</p>
            </div>
            <Tabs
              value={viewMode} 
              onValueChange={(value) => setViewMode(value as "day" | "week" | "month")}
              className="w-auto"
            >
              <TabsList className="bg-black/60 border border-white/20">
                <TabsTrigger value="day" className="data-[state=active]:bg-purple-900/50">
                  Day
                </TabsTrigger>
                <TabsTrigger value="week" className="data-[state=active]:bg-purple-900/50">
                  Week
                </TabsTrigger>
                <TabsTrigger value="month" className="data-[state=active]:bg-purple-900/50">
                  Month
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Stats summary */}
        {renderStatsCards()}
        
        <Separator className="my-6 bg-white/10" />
        
        {/* Timeline visualization */}
        <Card className="neon-border bg-black/60">
          <CardHeader>
            <CardTitle className="text-lg">
              {viewMode === "day" ? "Daily Coding Activity" : 
               viewMode === "week" ? "Weekly Coding Activity" : 
               "Monthly Coding Activity"}
            </CardTitle>
            <CardDescription>
              {viewMode === "day" ? "Your day-by-day contribution history" : 
               viewMode === "week" ? "Your coding activity aggregated by week" : 
               "Your coding patterns visualized by month"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderTimelineVisualization()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 