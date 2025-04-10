"use client"

import { motion } from "framer-motion"
import { CodeOrb } from "@/components/code-orb"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BarChart,
  Calendar,
  Code2,
  Flame,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Github,
  History,
  LogOut,
  Settings,
  Share,
  Star,
  Trophy,
  Twitter,
  Loader2,
} from "lucide-react"
import { useEffect, useState, Suspense } from "react"
import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimeRangeSelector, DEFAULT_TIME_RANGES } from "@/components/time-range-selector"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GithubConnectForm } from "@/components/github-connect-form"
import { useToast } from "@/hooks/use-toast"

// Define types
interface AchievementData {
  name: string;
  description: string;
  icon: string;
  points: number;
}

interface Achievement extends AchievementData {
  unlockedAt: string;
}

export interface Stats {
  commits: number;
  pullRequests: number;
  streak: number;
  points: number;
  level: number;
  totalLinesChanged?: number;
  stars?: number;
  repos?: number;
  timeRange?: string;
  contributions?: number;
  reviews?: number;
  privateRepos?: number;
  publicRepos?: number;
  currentStreak?: number;
  longestStreak?: number;
  activeDays?: number;
  totalRepositoriesImpacted?: number;
}

// Mock achievement data
const ACHIEVEMENT_DATA: Record<string, AchievementData> = {
  FIRST_COMMIT: {
    name: "First Blood",
    description: "Made your first commit",
    icon: "git-commit",
    points: 10,
  },
  STREAK_7_DAYS: {
    name: "Code Warrior",
    description: "Maintained a 7-day coding streak",
    icon: "flame",
    points: 50,
  },
  PR_MASTER: {
    name: "PR Master",
    description: "Merged 10 pull requests",
    icon: "git-pull-request",
    points: 100,
  },
  SOCIAL_BUTTERFLY: {
    name: "Social Butterfly",
    description: "Connected GitHub and Twitter accounts",
    icon: "share",
    points: 25,
  },
  CODE_MOUNTAINEER: {
    name: "Code Mountaineer",
    description: "Reached 10,000 contributions on GitHub",
    icon: "code",
    points: 150,
  },
  REPO_COLLECTOR: {
    name: "Repo Collector",
    description: "Created or contributed to 5 or more repositories",
    icon: "folder",
    points: 75,
  },
  STAR_GAZER: {
    name: "Star Gazer",
    description: "Received 10 or more stars on your repositories",
    icon: "star",
    points: 100,
  },
  CENTURY_CLUB: {
    name: "Century Club",
    description: "Made 100 or more commits",
    icon: "git-commit",
    points: 200,
  },
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
    <ReactErrorBoundary fallback={<ProfileOrb />}>
      {children}
    </ReactErrorBoundary>
  );
};

// Helper function to get a readable time range label
const getTimeRangeLabel = (range: string): string => {
  switch (range) {
    case 'today': return 'Today';
    case 'week': return 'Last 7 days';
    case 'month': return 'Last 30 days';
    case 'year': return 'Last year';
    case 'all': return 'All time';
    default: return 'All time';
  }
};

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<Stats>({ 
    commits: 0, 
    pullRequests: 0, 
    streak: 0,
    points: 0, 
    level: 1 
  })
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<string>("Initializing")
  const [loadingProgress, setLoadingProgress] = useState<{ 
    stage: string; 
    completed: number; 
    total: number; 
    details?: string;
    orgName?: string;
  }>({ 
    stage: 'initializing', 
    completed: 0, 
    total: 100 
  })
  const [orbError, setOrbError] = useState(false)
  const [githubUsername, setGithubUsername] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [timeRange, setTimeRange] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [dataLastUpdated, setDataLastUpdated] = useState<number | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Add a function to check if GitHub is properly connected
  const checkGitHubConnection = async () => {
    try {
      const response = await fetch("/api/user/profile");
      const userData = await response.json();
      
      // Use githubUsername if available, otherwise use githubId
      if (userData.githubUsername) {
        setGithubUsername(userData.githubUsername);
        return true;
      } else if (userData.githubId) {
        setGithubUsername(userData.githubId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking GitHub connection:", error);
      return false;
    }
  };

  // Check if data is stale (older than 15 minutes)
  const isDataStale = () => {
    if (!dataLastUpdated) return true;
    
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
    return Date.now() - dataLastUpdated > fifteenMinutes;
  };
  
  // Initialize user profile and fetch data
  const initializeProfile = async (hasCache: boolean = false) => {
    try {
      if (!hasCache) {
        setLoading(true);
      }
      
      setLoadingPhase("Initializing profile");
      
      // Initialize profile
      await fetch("/api/auth/create-profile", {
        method: "POST",
      }).then((res) => {
        if (!res.ok) {
          console.error("Failed to initialize profile");
        }
      });
      
      // First check GitHub connection
      setLoadingPhase("Checking GitHub connection");
      const profileConnected = await checkGitHubConnection();
      
      // Initial data fetch with default time range
      if (profileConnected) {
        // Only fetch if data is stale or we don't have any data
        if (isDataStale() || !dataLastUpdated) {
          setLoadingPhase("Fetching your coding stats");
          await fetchGitHubData(timeRange, false); // No need to force refresh on every load
        } else if (!hasCache) {
          setLoading(false);
        }
      } else {
        setLoading(false);
        if (!githubUsername) {
          // Show GitHub connect dialog if not connected
          setIsConnecting(true);
        }
      }
    } catch (err) {
      console.error("Error initializing profile:", err);
      setLoading(false);
    }
  };
  
  // Load cached data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && status === "authenticated") {
      try {
        // Load time range preference
        const savedTimeRange = localStorage.getItem('CloutNest_timeRange');
        if (savedTimeRange) {
          setTimeRange(savedTimeRange);
        }
        
        // Load cached data
        const cachedData = localStorage.getItem('CloutNest_githubData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          
          // Check if we have valid cached data with a timestamp
          if (parsedData.stats && parsedData.achievements && 
              parsedData.activities && parsedData.timestamp) {
            
            // Check if data is stale
            const fifteenMinutes = 15 * 60 * 1000;
            const isStale = Date.now() - parsedData.timestamp > fifteenMinutes;
            
            // Set the cached data
            setStats(parsedData.stats);
            setAchievements(parsedData.achievements);
            setActivities(parsedData.activities);
            setDataLastUpdated(parsedData.timestamp);
            
            // Set loading to false since we have cached data
            setLoading(false);
            
            // If data is stale, trigger a background refresh
            if (isStale) {
              initializeProfile(true);
            }
          } else {
            // Data format is invalid, initialize profile
            initializeProfile(false);
          }
        } else {
          // No cached data, initialize profile
          initializeProfile(false);
        }
      } catch (error) {
        console.error("Error loading cached data:", error);
        // If there's an error loading cached data, initialize profile
        initializeProfile(false);
      }
    }
  }, [status]);

  // Fetch GitHub stats based on time range
  const fetchGitHubData = async (selectedTimeRange: string, forceRefresh: boolean = false) => {
    setLoading(true);
    setFetchError(null);
    setLoadingPhase("Fetching your GitHub data");
    setLoadingProgress({ stage: 'initializing', completed: 0, total: 100 });
    
    try {
      // Setup event source for progress updates
      const eventSourceUrl = `/api/github/stats/progress`;
      const eventSource = new EventSource(eventSourceUrl);
      
      // Listen for progress updates
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.stage && data.completed !== undefined && data.total !== undefined) {
          setLoadingProgress(data);
          
          // Update loading phase with more user-friendly messages
          switch (data.stage) {
            case 'discovering-repos':
              setLoadingPhase(`Finding repositories (${Math.round(data.completed/data.total*100)}%)`);
              break;
            case 'processing-repos':
              setLoadingPhase(`Processing repositories (${Math.round(data.completed/data.total*100)}%)`);
              break;
            case 'calculating-streak':
              setLoadingPhase(`Analyzing coding streak (${Math.round(data.completed/data.total*100)}%)`);
              break;
            case 'calculating-impact':
              setLoadingPhase(`Measuring code impact (${Math.round(data.completed/data.total*100)}%)`);
              break;
            case 'finalizing':
              setLoadingPhase(`Finalizing (${Math.round(data.completed/data.total*100)}%)`);
              break;
            default:
              setLoadingPhase(`Processing data (${Math.round(data.completed/data.total*100)}%)`);
          }
        }
      };
      
      // Handle errors in the event stream
      eventSource.onerror = () => {
        console.error("EventSource failed");
        eventSource.close();
      };

      // Fetch stats with selected time range, forcing refresh if needed
      const statsResponse = await fetch(`/api/github/stats?timeRange=${selectedTimeRange}${forceRefresh ? '&forceRefresh=true' : ''}`);
      
      // Close the event source after the main request is done
      eventSource.close();
      
      const statsData = await statsResponse.json();

      if (!statsResponse.ok) {
        console.error("Error fetching GitHub stats:", statsData);
        setFetchError(statsData.error || "Failed to fetch GitHub stats");
        setLoading(false);
        return false;
      }
      
      if (statsData.stats) {
        setStats({
          commits: statsData.stats.commits || 0,
          pullRequests: statsData.stats.pullRequests || 0,
          streak: statsData.stats.streak || 0,
          points: statsData.stats.points || 0,
          level: statsData.stats.level || 1,
          totalLinesChanged: statsData.stats.totalLinesChanged || 0,
          stars: statsData.stats.stars || 0,
          repos: statsData.stats.repos || 0,
          timeRange: selectedTimeRange,
          contributions: statsData.stats.contributions || 0,
          reviews: statsData.stats.reviews || 0,
          privateRepos: statsData.stats.privateRepos || 0,
          publicRepos: statsData.stats.publicRepos || 0,
          currentStreak: statsData.stats.currentStreak || 0,
          longestStreak: statsData.stats.longestStreak || 0,
          activeDays: statsData.stats.activeDays || 0,
          totalRepositoriesImpacted: statsData.stats.totalRepositoriesImpacted || 0,
        });
      }
      
      if (statsData.achievements) {
        setAchievements(statsData.achievements);
      }
      
      // Update loading phase for activity fetching
      setLoadingPhase("Fetching your recent activity");
      
      // Fetch activities with the same time range
      const activityResponse = await fetch(`/api/github/activity?timeRange=${selectedTimeRange}`);
      const activityData = await activityResponse.json();
      
      if (!activityResponse.ok) {
        console.error("Error fetching GitHub activity:", activityData);
        setFetchError(activityData.error || "Failed to fetch GitHub activity");
        setLoading(false);
        return false;
      }
      
      if (activityData.activities) {
        setActivities(activityData.activities);
      }
      
      // Save to localStorage
      const timestamp = Date.now();
      setDataLastUpdated(timestamp);
      
      try {
        localStorage.setItem('CloutNest_timeRange', selectedTimeRange);
        localStorage.setItem('CloutNest_githubData', JSON.stringify({
          stats: {
            commits: statsData.stats?.commits || 0,
            pullRequests: statsData.stats?.pullRequests || 0,
            streak: statsData.stats?.streak || 0,
            points: statsData.stats?.points || 0,
            level: statsData.stats?.level || 1,
            totalLinesChanged: statsData.stats?.totalLinesChanged || 0,
            stars: statsData.stats?.stars || 0,
            repos: statsData.stats?.repos || 0,
            timeRange: selectedTimeRange,
            contributions: statsData.stats?.contributions || 0,
            reviews: statsData.stats?.reviews || 0,
            privateRepos: statsData.stats?.privateRepos || 0,
            publicRepos: statsData.stats?.publicRepos || 0,
            currentStreak: statsData.stats?.currentStreak || 0,
            longestStreak: statsData.stats?.longestStreak || 0,
            activeDays: statsData.stats?.activeDays || 0,
            totalRepositoriesImpacted: statsData.stats?.totalRepositoriesImpacted || 0,
          },
          achievements: statsData.achievements || [],
          activities: activityData.activities || [],
          timestamp
        }));
      } catch (error) {
        console.error("Error caching data:", error);
      }
      
      return true;
    } catch (error) {
      console.error("Error fetching GitHub data:", error);
      setFetchError("Network error while fetching GitHub data");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    localStorage.setItem('CloutNest_timeRange', value);
    fetchGitHubData(value);
  };
  
  const levelProgress = (stats.points % 100) / 100 * 100;
  
  const getInitials = (name: string | null | undefined): string => 
    name?.split(' ').map(n => n[0]).join('') || 'U';

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "git-commit": return <GitCommit className="h-5 w-5 text-green-500" />;
      case "flame": return <Flame className="h-5 w-5 text-orange-500" />;
      case "git-pull-request": return <GitPullRequest className="h-5 w-5 text-purple-500" />;
      case "share": return <Share className="h-5 w-5 text-blue-500" />;
      case "code": return <Code2 className="h-5 w-5 text-blue-400" />;
      case "folder": return <GitBranch className="h-5 w-5 text-yellow-500" />;
      case "star": return <Star className="h-5 w-5 text-yellow-400" />;
      default: return <Star className="h-5 w-5 text-yellow-500" />;
    }
  };

  // Function to connect GitHub account
  const connectGitHub = async () => {
    setIsConnecting(true);
  };

  const closeGitHubConnect = () => {
    setIsConnecting(false);
  };

  const onGitHubConnectSuccess = async () => {
    setIsConnecting(false);
    toast({
      title: "GitHub account connected",
      description: "Your GitHub account has been connected successfully. We're fetching your stats now.",
    });
    
    try {
      // Re-fetch GitHub data
      const success = await fetchGitHubData(timeRange, true);
      
      if (!success) {
        toast({
          title: "Error fetching data",
          description: "There was an error fetching your GitHub data. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching GitHub data after connection:", error);
      toast({
        title: "Error fetching data",
        description: "There was an error fetching your GitHub data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // New component to explain GitHub permissions
  const GitHubPermissionsInfo = () => (
    <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
      <h4 className="font-semibold mb-2">Why we need these GitHub permissions:</h4>
      <ul className="list-disc pl-5 space-y-1">
        <li><span className="font-medium">read:user, user:email</span> - To identify you and access your public profile</li>
        <li><span className="font-medium">repo</span> - To access all your repositories, including private ones (if any)</li>
        <li><span className="font-medium">read:org</span> - To discover repositories in organizations you contribute to</li>
        <li><span className="font-medium">read:project</span> - To find all projects you&apos;ve worked on</li>
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        We only use these permissions to calculate your coding stats. We never modify your repositories or make changes on your behalf.
      </p>
    </div>
  );

  // Add refresh functionality
  const refreshStats = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      toast({
        title: "Refreshing data",
        description: "Fetching your latest GitHub activity...",
      });
      
      // Use force refresh to bypass caching
      const success = await fetchGitHubData(timeRange, true);
      
      if (success) {
        toast({
          title: "Data refreshed",
          description: "Your GitHub data has been successfully updated.",
        });
      } else {
        toast({
          title: "Refresh failed",
          description: "There was an error refreshing your GitHub data. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error refreshing stats:", error);
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing your GitHub data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add a loading indicator component to show detailed loading progress
  const LoadingIndicator = () => {
    return (
      <div className="flex flex-col items-center justify-center p-8 mt-8">
        <div className="relative w-full max-w-md mb-8">
          <Progress 
            value={(loadingProgress.completed / loadingProgress.total) * 100} 
            className="h-2 bg-gray-800"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{Math.round((loadingProgress.completed / loadingProgress.total) * 100)}%</span>
            <span>{loadingProgress.stage}</span>
          </div>
        </div>
        
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <h3 className="text-lg font-medium mb-2">{loadingPhase}</h3>
        
        {/* Show detailed progress information */}
        {loadingProgress.details && (
          <p className="text-center text-sm text-muted-foreground mb-4">
            {loadingProgress.details}
          </p>
        )}
        
        {/* Current repository being processed */}
        {loadingProgress.orgName && (
          <div className="mt-2 bg-muted/20 p-3 rounded-md text-sm">
            <span className="font-medium">Organization: </span>
            {loadingProgress.orgName}
          </div>
        )}
        
        {/* Show estimated time remaining if we're far enough in the process */}
        {loadingProgress.completed > 10 && loadingProgress.total > 0 && (
          <p className="text-xs text-muted-foreground mt-4">
            Processing repositories in parallel for faster results
          </p>
        )}
      </div>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1 flex-col justify-center items-center px-6 py-12">
          <LoadingIndicator />
        </div>
      </div>
    );
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
            {/* Use the SimpleOrb fallback directly in case of errors */}
            <div>
              <ErrorBoundary>
                <Suspense fallback={<SimpleOrb />}>
                  <CodeOrb />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <Button
              variant="ghost"
              className="w-full justify-start neon-button"
            >
              <BarChart className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => router.push("/dashboard/leaderboard")}
            >
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => router.push("/dashboard/achievements")}
            >
              <Star className="mr-2 h-4 w-4" />
              Achievements
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => router.push("/dashboard/activity")}
            >
              <History className="mr-2 h-4 w-4" />
              Activity
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => router.push("/dashboard/settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
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
        <div className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6"
          >
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold pixel-font neon-glow">
                  Welcome back, {session?.user?.name || "Coder"}!
                </h1>
                <p className="text-muted-foreground">
                  Level {stats.level} Coder · {stats.points} XP
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Dialog open={isConnecting} onOpenChange={closeGitHubConnect}>
                  <DialogTrigger asChild>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Connect GitHub Account</DialogTitle>
                      <DialogDescription>
                        Connect your GitHub account to view your coding stats and achievements.
                      </DialogDescription>
                    </DialogHeader>
                    <GithubConnectForm onSuccess={onGitHubConnectSuccess} />
                    <GitHubPermissionsInfo />
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-black/60 border-white/20 hover:bg-sky-900/30 transition-colors"
                  onClick={() => {
                    // Create tweet text with user stats
                    const tweetText = `🚀 My coding stats on CloutNest:\n\n` +
                      `✨ Level ${stats.level} Coder\n` +
                      `📊 ${stats.commits} Commits\n` +
                      `🔀 ${stats.pullRequests} Pull Requests\n` +
                      `🔥 ${stats.currentStreak || stats.streak || 0} Day Streak\n\n` +
                      `Track your GitHub stats at https://cloutnest.com with CloutNest`;
                    
                    // URL encode the tweet text
                    const encodedTweet = encodeURIComponent(tweetText);
                    
                    // Open Twitter/X with the pre-filled tweet
                    window.open(`https://x.com/intent/tweet?text=${encodedTweet}`, '_blank');
                  }}
                >
                  <Twitter className="mr-2 h-4 w-4 text-sky-400" />
                  Share Stats
                </Button>
              </div>
            </div>

            {/* Time range selector and refresh button */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {dataLastUpdated ? (
                  <>
                    <span>Last updated: </span>
                    {new Date(dataLastUpdated).toLocaleTimeString()} 
                    {isDataStale() ? 
                      <span className="ml-1 text-amber-400">(Outdated)</span> : 
                      <span className="ml-1 text-green-400">(Up to date)</span>
                    }
                  </>
                ) : 'No data loaded yet'}
              </div>
              <div className="flex space-x-2">
                <TimeRangeSelector 
                  value={timeRange} 
                  onChange={handleTimeRangeChange} 
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-black/60 border-white/20" 
                  onClick={refreshStats}
                  disabled={isRefreshing}
                >
                  <svg className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="ml-2">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </Button>
              </div>
            </div>

            {/* Level progress */}
            <Card className="neon-border bg-black/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Level Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Level {stats.level}</span>
                    <span>Level {stats.level + 1}</span>
                  </div>
                  <Progress value={levelProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {stats.points % 100} / 100 XP to next level
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="neon-border bg-black/60">
                <CardHeader className="pb-2">
                  <CardTitle>Commits</CardTitle>
                  <CardDescription>Total code submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <GitCommit className="h-8 w-8 text-green-500 mr-3" />
                    <div className="text-3xl font-bold">{stats.commits}</div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="neon-glow">
                    {stats.timeRange !== 'all' ? getTimeRangeLabel(stats.timeRange || 'all') : (
                      stats.commits > 0 ? `Last activity: ${new Date().toLocaleDateString()}` : "No activity yet"
                    )}
                  </Badge>
                </CardFooter>
              </Card>

              <Card className="neon-border bg-black/60">
                <CardHeader className="pb-2">
                  <CardTitle>Pull Requests</CardTitle>
                  <CardDescription>Contributions & reviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <GitPullRequest className="h-8 w-8 text-purple-500 mr-3" />
                    <div className="text-3xl font-bold">{stats.pullRequests}</div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="neon-glow">
                    {stats.timeRange !== 'all' ? getTimeRangeLabel(stats.timeRange || 'all') : (
                      stats.pullRequests > 0 ? `${stats.pullRequests} total PRs` : "No PRs yet"
                    )}
                  </Badge>
                </CardFooter>
              </Card>

              <Card className="neon-border bg-black/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Coding Streak</CardTitle>
                  <CardDescription>Days of consistency</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-bold">{stats.currentStreak || stats.streak || 0}</div>
                    <div className="text-sm text-muted-foreground">
                      {stats.longestStreak ? `Best: ${stats.longestStreak}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Current streak
                  </div>
                  {stats.activeDays ? (
                    <div className="mt-4 text-sm">
                      <span className="font-medium">{stats.activeDays}</span> active days in past year
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="neon-border bg-black/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Code Impact</CardTitle>
                  <CardDescription>Total contributions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.totalLinesChanged ? 
                      (stats.totalLinesChanged > 1000 
                        ? `${(stats.totalLinesChanged / 1000).toFixed(1)}k` 
                        : stats.totalLinesChanged.toLocaleString()) 
                      : '0'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Lines of code changed
                  </div>
                  {stats.repos ? (
                    <div className="mt-4 text-sm">
                      Across <span className="font-medium">{stats.totalRepositoriesImpacted || stats.repos}</span> repositories
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="neon-border bg-black/60">
                <CardHeader className="pb-2">
                  <CardTitle>GitHub Activity</CardTitle>
                  <CardDescription>Commits, PRs & Reviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Github className="h-8 w-8 text-gray-500 mr-3" />
                    <div className="text-3xl font-bold">{stats.contributions || 0}</div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="neon-glow">
                    {stats.timeRange !== 'all' ? getTimeRangeLabel(stats.timeRange || 'all') : (
                      stats.contributions ? `Total GitHub interactions` : "No activity yet"
                    )}
                  </Badge>
                </CardFooter>
              </Card>

              <Card className="neon-border bg-black/60">
                <CardHeader className="pb-2">
                  <CardTitle>Reviews</CardTitle>
                  <CardDescription>Pull request reviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <GitPullRequest className="h-8 w-8 text-indigo-500 mr-3" />
                    <div className="text-3xl font-bold">{stats.reviews || 0}</div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="neon-glow">
                    {stats.timeRange !== 'all' ? getTimeRangeLabel(stats.timeRange || 'all') : (
                      stats.reviews ? `Code reviews completed` : "No reviews yet"
                    )}
                  </Badge>
                </CardFooter>
              </Card>

              <Card className="neon-border bg-black/60">
                <CardHeader className="pb-2">
                  <CardTitle>Repositories</CardTitle>
                  <CardDescription>Public & private repos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <GitBranch className="h-8 w-8 text-yellow-500 mr-3" />
                    <div className="text-3xl font-bold">{stats.repos || 0}</div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="neon-glow">
                    {stats.timeRange !== 'all' ? getTimeRangeLabel(stats.timeRange || 'all') : (
                      stats.repos ? `${stats.publicRepos || 0} public, ${stats.privateRepos || 0} private` : "No repositories yet"
                    )}
                  </Badge>
                </CardFooter>
              </Card>

              <Card className="neon-border bg-black/60">
                <CardHeader className="pb-2">
                  <CardTitle>Stars</CardTitle>
                  <CardDescription>Repository stars</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Star className="h-8 w-8 text-yellow-400 mr-3" />
                    <div className="text-3xl font-bold">{stats.stars || 0}</div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="neon-glow">
                    {stats.timeRange !== 'all' ? getTimeRangeLabel(stats.timeRange || 'all') : (
                      stats.stars ? `Stars received` : "No stars yet"
                    )}
                  </Badge>
                </CardFooter>
              </Card>
            </div>

            {/* Tabs for activity and achievements */}
            <Tabs defaultValue="activity" className="mt-6">
              <TabsList className="grid w-full grid-cols-2 bg-black/60">
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
              </TabsList>
              
              <TabsContent value="activity" className="mt-4 space-y-6">
                {/* Recent activity list */}
                <Card className="neon-border bg-black/60">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest coding actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {fetchError && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-md p-4 mb-4">
                          <p className="text-red-300 text-sm font-medium">{fetchError}</p>
                          <p className="text-xs text-red-300/70 mt-1">Try refreshing or check your GitHub connection</p>
                        </div>
                      )}
                    
                      {activities.length > 0 ? (
                        activities.map((activity, index) => (
                          <div key={index}>
                            <div className="flex items-center gap-4">
                              {activity.type === 'commit' ? (
                                <GitCommit className="h-5 w-5 text-green-500" />
                              ) : (
                                <GitPullRequest className="h-5 w-5 text-purple-500" />
                              )}
                              <div>
                                <p className="font-medium">
                                  {activity.type === 'commit' ? 'Commit' : 'PR'}: {activity.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {activity.repo} • {new Date(activity.date).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {index < activities.length - 1 && <Separator className="my-2" />}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No activity yet</p>
                          <p className="text-xs mt-2">
                            {githubUsername ? 
                              `No activity found for ${githubUsername} in the selected time range.` : 
                              "Connect your GitHub account to see your activity"}
                          </p>
                          {githubUsername && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={refreshStats}
                              className="mt-4"
                            >
                              Try Refreshing Data
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="achievements" className="mt-4">
                <Card className="neon-border bg-black/60">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Your Achievements</CardTitle>
                        <CardDescription>Unlock more as you code</CardDescription>
                      </div>
                      <Badge variant="secondary">{achievements.length} / {Object.keys(ACHIEVEMENT_DATA).length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Unlocked achievements */}
                      {achievements.map((achievement, i) => (
                        <Card key={i} className="bg-black/40 border-green-500/30 hover:border-green-500/60 transition-colors">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              {renderIcon(achievement.icon)}
                              <CardTitle className="text-base">{achievement.name}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <div className="flex justify-between items-center mt-2">
                              <Badge variant="outline">+{achievement.points} XP</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(achievement.unlockedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Locked achievements */}
                      {Object.entries(ACHIEVEMENT_DATA)
                        .filter(([_, data]) => !achievements.some(a => a.name === data.name))
                        .map(([key, data], i) => (
                          <Card key={`locked-${i}`} className="bg-black/40 border-gray-500/30 opacity-60">
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2">
                                {renderIcon(data.icon)}
                                <CardTitle className="text-base">{data.name}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">{data.description}</p>
                              <div className="flex justify-between items-center mt-2">
                                <Badge variant="outline">+{data.points} XP</Badge>
                                <Badge variant="outline" className="bg-gray-800">Locked</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  )
}