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
  Share,
  Star,
  Trophy,
  Twitter,
  Loader2,
  Menu,
  X,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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
  codeSubmissions?: number;
  bestStreak?: number;
  codeImpact?: number;
  prReviews?: number;
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
        // If we have local cached data, don't need to fetch from database yet
        if (hasCache) {
          setLoading(false);
          return;
        }
        
        // First try to just load data from database without refreshing from GitHub
        try {
          const response = await fetch(`/api/github/stats?timeRange=${timeRange}`);
          const data = await response.json();
          
          if (response.ok && data.stats) {
            // We have database data, use it
            setLoadingPhase("Loading data from database");
            await fetchGitHubData(timeRange, false);
            return;
          }
        } catch (error) {
          console.error("Error checking database data:", error);
        }
        
        // If we reached here, we need to force refresh from GitHub
        setLoadingPhase("No database data found, fetching from GitHub");
        await fetchGitHubData(timeRange, true);
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
    
    try {
      if (forceRefresh) {
        // Only set up EventSource for real-time progress when forcing refresh from GitHub
        setLoadingPhase("Fetching your GitHub data from the source");
        setLoadingProgress({ stage: 'initializing', completed: 0, total: 100 });
        
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
        const statsResponse = await fetch(`/api/github/stats?timeRange=${selectedTimeRange}&forceRefresh=true`);
        
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
            codeSubmissions: statsData.stats.codeSubmissions || 0,
            bestStreak: statsData.stats.bestStreak || 0,
            codeImpact: statsData.stats.codeImpact || 0,
            prReviews: statsData.stats.prReviews || 0,
          });
        }
        
        if (statsData.achievements) {
          setAchievements(statsData.achievements);
        }
        
        // Update loading phase for activity fetching
        setLoadingPhase("Fetching your recent activity");
        
        // Fetch activities for user history
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
              codeSubmissions: statsData.stats?.codeSubmissions || 0,
              bestStreak: statsData.stats?.bestStreak || 0,
              codeImpact: statsData.stats?.codeImpact || 0,
              prReviews: statsData.stats?.prReviews || 0,
            },
            achievements: statsData.achievements || [],
            activities: activityData.activities || [],
            timestamp
          }));
        } catch (error) {
          console.error("Error caching data:", error);
        }
      } else {
        // Fetch data from database (no progress tracking needed)
        setLoadingPhase("Loading your coding stats from database");
        
        // Fetch stats without forcing refresh (will use cached data in DB)
        const statsResponse = await fetch(`/api/github/stats?timeRange=${selectedTimeRange}`);
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
            codeSubmissions: statsData.stats.codeSubmissions || 0,
            bestStreak: statsData.stats.bestStreak || 0,
            codeImpact: statsData.stats.codeImpact || 0,
            prReviews: statsData.stats.prReviews || 0,
          });
        }
        
        if (statsData.achievements) {
          setAchievements(statsData.achievements);
        }
        
        // Fetch activities for user history
        const activityResponse = await fetch(`/api/github/activity?timeRange=${selectedTimeRange}`);
        const activityData = await activityResponse.json();
        
        if (activityData.activities) {
          setActivities(activityData.activities);
        }
        
        // Update last updated timestamp
        const timestamp = Date.now();
        setDataLastUpdated(timestamp);
        
        // Update local storage
        try {
          localStorage.setItem('CloutNest_timeRange', selectedTimeRange);
          localStorage.setItem('CloutNest_githubData', JSON.stringify({
            stats: {
              ...statsData.stats,
              timeRange: selectedTimeRange,
            },
            achievements: statsData.achievements || [],
            activities: activityData.activities || [],
            timestamp
          }));
        } catch (error) {
          console.error("Error caching data:", error);
        }
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
        title: "Refreshing from GitHub",
        description: "Fetching your latest GitHub activity...",
      });
      
      // Use force refresh to bypass caching
      const success = await fetchGitHubData(timeRange, true);
      
      if (success) {
        toast({
          title: "Data refreshed",
          description: "Your GitHub data has been successfully updated from GitHub.",
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:gap-6"
      >
        {/* Header section - now only needed for non-mobile */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:flex">
          <div className="hidden lg:block">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold pixel-font neon-glow">
              Welcome back, {session?.user?.name || "Coder"}!
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Level {stats.level} Coder · {stats.points} XP
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 mt-2 md:mt-0 w-full md:w-auto">
            <Dialog open={isConnecting} onOpenChange={closeGitHubConnect}>
              <DialogTrigger asChild>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Connect GitHub Account</DialogTitle>
                  <DialogDescription>
                    Connect your GitHub account to see your coding stats
                  </DialogDescription>
                </DialogHeader>
                <GithubConnectForm onSuccess={onGitHubConnectSuccess} />
                <GitHubPermissionsInfo />
              </DialogContent>
            </Dialog>
            
            <Button
              variant="outline"
              size="sm"
              className="bg-black/60 border-white/20 hover:bg-sky-900/30 transition-colors w-full md:w-auto"
              onClick={() => {
                // Create tweet text with user stats
                const tweetText = `🚀 My coding stats on CloutNest:\n\n` +
                  `✨ Level ${stats.level} Coder\n` +
                  `📊 ${stats.commits} Commits\n` +
                  `💻 ${stats.codeSubmissions || 0} Total code submissions\n` +
                  `🔀 ${stats.pullRequests} Pull Requests\n` +
                  `🔥 ${stats.currentStreak || stats.streak || 0} Day Streak (Best: ${stats.bestStreak || 0})\n` +
                  `📈 ${stats.totalLinesChanged?.toLocaleString() || 0} Code impact contributions\n` +
                  `Track your GitHub stats at https://cloutnest.com with CloutNest`;
                
                // URL encode the tweet text
                const encodedTweet = encodeURIComponent(tweetText);
                
                // Open Twitter/X with the pre-filled tweet
                window.open(`https://x.com/intent/tweet?text=${encodedTweet}`, '_blank');
              }}
            >
              <Twitter className="mr-2 h-4 w-4 text-sky-400" />
              <span className="hidden sm:inline">Share Stats</span>
              <span className="sm:hidden">Share</span>
            </Button>
          </div>
        </div>

        {/* Time range selector and refresh button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div className="text-xs text-muted-foreground w-full sm:w-auto mb-2 sm:mb-0">
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
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:space-x-2 w-full sm:w-auto">
            <TimeRangeSelector 
              value={timeRange} 
              onChange={handleTimeRangeChange}
              className="w-full sm:w-auto"
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-black/60 border-white/20 w-full sm:w-auto" 
              onClick={refreshStats}
              disabled={isRefreshing}
              title="Fetch fresh data from GitHub API (otherwise data is loaded from our database)"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Refreshing from GitHub...</span>
                  <span className="sm:hidden inline">Refreshing...</span>
                </>
              ) : (
                <>
                  <Github className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Refresh from GitHub</span>
                  <span className="sm:hidden inline">Refresh</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Level progress */}
        <Card className="neon-border bg-black/60">
          <CardHeader className="pb-2 px-3 sm:px-4 md:px-6">
            <CardTitle className="text-sm">Level Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6">
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

        {/* Stats cards - adjust for mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <Card className="neon-border bg-black/60">
            <CardHeader className="pb-1 px-2 sm:px-3 md:px-6 pt-2 sm:pt-3 md:pt-6">
              <CardTitle className="text-sm md:text-base">Commits</CardTitle>
              <CardDescription className="text-xs">Total code submissions</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 md:pb-6">
              <div className="flex items-center">
                <GitCommit className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-green-500 mr-2 md:mr-3" />
                <div className="text-lg sm:text-xl md:text-3xl font-bold">{stats.commits}</div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 md:pb-6 pt-0">
              <Badge variant="outline" className="neon-glow text-xs max-w-full overflow-hidden text-ellipsis">
                {stats.timeRange !== 'all' ? getTimeRangeLabel(stats.timeRange || 'all') : (
                  stats.commits > 0 ? `Last activity: ${new Date().toLocaleDateString()}` : "No activity yet"
                )}
              </Badge>
            </CardFooter>
          </Card>

          <Card className="neon-border bg-black/60">
            <CardHeader className="pb-1 px-2 sm:px-3 md:px-6 pt-2 sm:pt-3 md:pt-6">
              <CardTitle className="text-sm md:text-base">Pull Requests</CardTitle>
              <CardDescription className="text-xs">Contributions & reviews</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 md:pb-6">
              <div className="flex items-center">
                <GitPullRequest className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-purple-500 mr-2 md:mr-3" />
                <div className="text-lg sm:text-xl md:text-3xl font-bold">{stats.pullRequests}</div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 md:pb-6 pt-0">
              <Badge variant="outline" className="neon-glow text-xs max-w-full overflow-hidden text-ellipsis">
                {stats.timeRange !== 'all' ? getTimeRangeLabel(stats.timeRange || 'all') : (
                  stats.pullRequests > 0 ? `${stats.pullRequests} total PRs` : "No PRs yet"
                )}
              </Badge>
            </CardFooter>
          </Card>

          <Card className="neon-border bg-black/60">
            <CardHeader className="pb-1 px-2 sm:px-3 md:px-6 pt-2 sm:pt-3 md:pt-6">
              <CardTitle className="text-sm md:text-base">Coding Streak</CardTitle>
              <CardDescription className="text-xs">Consecutive days coding</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 md:pb-6">
              <div className="flex items-center">
                <Flame className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-orange-500 mr-2 md:mr-3" />
                <div className="text-lg sm:text-xl md:text-3xl font-bold">{stats.currentStreak || stats.streak || 0}</div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 md:pb-6 pt-0">
              <Badge variant="outline" className="neon-glow text-xs max-w-full overflow-hidden text-ellipsis">
                {stats.longestStreak ? `Best: ${stats.longestStreak} days` : "Start a streak"}
              </Badge>
            </CardFooter>
          </Card>

          <Card className="neon-border bg-black/60">
            <CardHeader className="pb-1 px-2 sm:px-3 md:px-6 pt-2 sm:pt-3 md:pt-6">
              <CardTitle className="text-sm md:text-base">Stars</CardTitle>
              <CardDescription className="text-xs">Repository stars received</CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 md:pb-6">
              <div className="flex items-center">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-yellow-500 mr-2 md:mr-3" />
                <div className="text-lg sm:text-xl md:text-3xl font-bold">{stats.stars || 0}</div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground px-2 sm:px-3 md:px-6 pb-2 sm:pb-3 md:pb-6 pt-0">
              <Badge variant="outline" className="neon-glow text-xs max-w-full overflow-hidden text-ellipsis">
                {stats.repos ? `Across ${stats.repos} repos` : "No starred repos"}
              </Badge>
            </CardFooter>
          </Card>
        </div>

        {/* Additional stats - 1 column on mobile, 3 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <Card className="neon-border bg-black/60">
            <CardHeader className="pb-1 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-sm md:text-base">Code Impact</CardTitle>
              <CardDescription className="text-xs">Total contributions</CardDescription>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="flex items-center">
                <Code2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-blue-500 mr-2 md:mr-3" />
                <div className="text-lg sm:text-xl md:text-3xl font-bold">{stats.totalLinesChanged?.toLocaleString() || 0}</div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground px-3 md:px-6 pb-3 md:pb-6 pt-0">
              <Badge variant="outline" className="neon-glow text-xs max-w-full overflow-hidden text-ellipsis">
                {stats.totalRepositoriesImpacted 
                  ? `Across ${stats.totalRepositoriesImpacted} repos` 
                  : stats.repos 
                    ? `Across ${stats.repos} repos` 
                    : "No code yet"}
              </Badge>
            </CardFooter>
          </Card>

          <Card className="neon-border bg-black/60">
            <CardHeader className="pb-1 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-sm md:text-base">Active Days</CardTitle>
              <CardDescription className="text-xs">Days with activity</CardDescription>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-violet-500 mr-2 md:mr-3" />
                <div className="text-lg sm:text-xl md:text-3xl font-bold">{stats.activeDays || 0}</div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground px-3 md:px-6 pb-3 md:pb-6 pt-0">
              <Badge variant="outline" className="neon-glow text-xs">
                Past year
              </Badge>
            </CardFooter>
          </Card>

          <Card className="neon-border bg-black/60">
            <CardHeader className="pb-1 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-sm md:text-base">PR Reviews</CardTitle>
              <CardDescription className="text-xs">Reviews conducted</CardDescription>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="flex items-center">
                <GitBranch className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-emerald-500 mr-2 md:mr-3" />
                <div className="text-lg sm:text-xl md:text-3xl font-bold">{stats.reviews || 0}</div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground px-3 md:px-6 pb-3 md:pb-6 pt-0">
              <Badge variant="outline" className="neon-glow text-xs">
                {stats.reviews ? "Code reviews" : "No reviews yet"}
              </Badge>
            </CardFooter>
          </Card>
        </div>
        
        {/* Achievements - 1 column on small mobile, 2 on larger mobile, 4 on desktop */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold pixel-font">Recent Achievements</h2>
            <Button 
              variant="link" 
              size="sm" 
              className="text-muted-foreground"
              onClick={() => router.push("/dashboard/achievements")}
            >
              View all
            </Button>
          </div>
          
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {achievements.length > 0 ? (
              achievements.slice(0, 4).map((achievement) => (
                <Card key={achievement.name} className="neon-border bg-black/60">
                  <CardHeader className="py-2 sm:py-3 px-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                        {renderIcon(achievement.icon)}
                      </div>
                      <div>
                        <CardTitle className="text-sm md:text-base">{achievement.name}</CardTitle>
                        <CardDescription className="text-xs">{achievement.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="py-2 px-3 md:px-4 border-t border-white/10 flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-xs">+{achievement.points} XP</Badge>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-1 xs:col-span-2 sm:col-span-3 md:col-span-4 text-center py-8 bg-black/40 rounded-lg border border-white/10">
                <p className="text-muted-foreground">Complete coding tasks to unlock achievements!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold pixel-font">Recent Activity</h2>
            <Button 
              variant="link" 
              size="sm" 
              className="text-muted-foreground"
              onClick={() => router.push("/dashboard/activity")}
            >
              View all
            </Button>
          </div>
          
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.slice(0, 3).map((activity, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 md:p-4 bg-black/40 rounded-lg border border-white/10"
                >
                  <div className="w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center mt-1 shrink-0">
                    <GitCommit className="h-4 w-4 text-pink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.repo}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.date ? new Date(activity.date).toLocaleDateString() : ""}
                    </p>
                  </div>
                  {activity.url && (
                    <a 
                      href={activity.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 text-xs shrink-0"
                    >
                      View
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-black/40 rounded-lg border border-white/10">
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
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
                        <div className="flex items-start sm:items-center gap-3">
                          {activity.type === 'commit' ? (
                            <GitCommit className="h-5 w-5 text-green-500 shrink-0 mt-1 sm:mt-0" />
                          ) : (
                            <GitPullRequest className="h-5 w-5 text-purple-500 shrink-0 mt-1 sm:mt-0" />
                          )}
                          <div className="overflow-hidden">
                            <p className="font-medium text-sm sm:text-base break-words">
                              {activity.type === 'commit' ? 'Commit' : 'PR'}: {activity.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
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
  )
}