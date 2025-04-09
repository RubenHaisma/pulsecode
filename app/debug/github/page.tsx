"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Check, Github, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { GithubConnectForm } from "@/components/github-connect-form"

interface DebugData {
  user?: {
    id: string;
    githubConnected: boolean;
    githubId?: string;
  };
  githubToken?: {
    status: string;
    user?: any;
    rateLimits?: any;
  };
  githubUser?: {
    status: string;
    data?: any;
  };
  env?: {
    NODE_ENV: string;
  };
  error?: string;
}

export default function GithubDebugPage() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [githubUsername, setGithubUsername] = useState("")
  const [statsData, setStatsData] = useState<any>(null)
  const [activityData, setActivityData] = useState<any>(null)
  
  // Fetch debug data when the component mounts
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/debug/github');
        const data = await response.json();
        
        setDebugData(data);
        
        if (data.user?.githubId) {
          setGithubUsername(data.user.githubId);
        }
      } catch (error) {
        console.error("Error fetching debug data:", error);
        setDebugData({ error: "Failed to fetch debug data" });
      } finally {
        setIsLoading(false);
      }
    }
    
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);
  
  // Fetch GitHub stats
  const fetchGitHubStats = async () => {
    try {
      const response = await fetch('/api/github/stats?debug=true');
      const data = await response.json();
      setStatsData(data);
    } catch (error) {
      console.error("Error fetching GitHub stats:", error);
      setStatsData({ error: "Failed to fetch GitHub stats" });
    }
  };
  
  // Fetch GitHub activity
  const fetchGitHubActivity = async () => {
    try {
      const response = await fetch('/api/github/activity?debug=true');
      const data = await response.json();
      setActivityData(data);
    } catch (error) {
      console.error("Error fetching GitHub activity:", error);
      setActivityData({ error: "Failed to fetch GitHub activity" });
    }
  };
  
  // Force refresh GitHub data
  const refreshGitHubData = async () => {
    try {
      const response = await fetch('/api/github/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ debug: true })
      });
      const data = await response.json();
      setStatsData(data);
    } catch (error) {
      console.error("Error refreshing GitHub data:", error);
      setStatsData({ error: "Failed to refresh GitHub data" });
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-500">Valid</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>;
      case 'missing':
        return <Badge variant="outline">Missing</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };
  
  const handleConnectionSuccess = () => {
    window.location.reload();
  };
  
  if (status === "loading" || isLoading) {
    return <div className="min-h-screen grid place-items-center">Loading...</div>;
  }
  
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen grid place-items-center">
        <Card className="w-[420px]">
          <CardHeader>
            <CardTitle>Not Authorized</CardTitle>
            <CardDescription>You need to sign in to access this page</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.location.href = "/login"} className="w-full">
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">GitHub Debug</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Github className="mr-2 h-5 w-5" />
              GitHub Connection Status
            </CardTitle>
            <CardDescription>
              Diagnostic information about your GitHub connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {debugData?.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{debugData.error}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">User</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">User ID:</span>
                          <span>{debugData?.user?.id || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">GitHub Connected:</span>
                          <span>
                            {debugData?.user?.githubConnected ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">GitHub Username:</span>
                          <span>{debugData?.user?.githubId || "Not connected"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">GitHub Token</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Token Status:</span>
                          <span>{getStatusBadge(debugData?.githubToken?.status || "unknown")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Token User:</span>
                          <span>{debugData?.githubToken?.user?.login || "N/A"}</span>
                        </div>
                        {debugData?.githubToken?.rateLimits && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate Limit (Core):</span>
                              <span>
                                {debugData.githubToken.rateLimits.core.remaining}/{debugData.githubToken.rateLimits.core.limit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate Limit (Search):</span>
                              <span>
                                {debugData.githubToken.rateLimits.search.remaining}/{debugData.githubToken.rateLimits.search.limit}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {debugData?.githubUser?.status === "valid" && debugData.githubUser.data && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">GitHub User</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Login:</span>
                            <span>{debugData.githubUser.data.login}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ID:</span>
                            <span>{debugData.githubUser.data.id}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name:</span>
                            <span>{debugData.githubUser.data.name || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span>{debugData.githubUser.data.type}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Public Repos:</span>
                            <span>{debugData.githubUser.data.public_repos}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {debugData?.githubUser?.status === "invalid" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>GitHub User Error</AlertTitle>
                    <AlertDescription>
                      The configured GitHub username could not be found or accessed.
                    </AlertDescription>
                  </Alert>
                )}
                
                {!debugData?.user?.githubConnected && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>GitHub Not Connected</AlertTitle>
                    <AlertDescription>
                      You need to connect your GitHub account to track activity.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={() => window.location.reload()}>
              Refresh Status
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/dashboard"}
            >
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
        
        <Tabs defaultValue="connect">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connect">GitHub Connection</TabsTrigger>
            <TabsTrigger value="stats">
              Stats API
              {statsData && <Badge variant="outline" className="ml-2">{statsData.connected ? "Connected" : "Not Connected"}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activity API
              {activityData && <Badge variant="outline" className="ml-2">{activityData.count || 0}</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="connect" className="space-y-4">
            <GithubConnectForm 
              onSuccess={handleConnectionSuccess}
              initialUsername={githubUsername}
              isConnected={!!githubUsername}
            />
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>GitHub Stats API</CardTitle>
                <CardDescription>Test the GitHub stats API endpoint</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between space-x-2 mb-4">
                  <Button onClick={fetchGitHubStats}>Fetch Stats</Button>
                  <Button variant="secondary" onClick={refreshGitHubData}>Force Refresh</Button>
                </div>
                
                {statsData && (
                  <div className="border border-white/10 rounded-md p-4 mt-4 bg-black/40 overflow-auto">
                    <pre className="text-xs text-white/80">
                      {JSON.stringify(statsData, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>GitHub Activity API</CardTitle>
                <CardDescription>Test the GitHub activity API endpoint</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={fetchGitHubActivity}>Fetch Activity</Button>
                
                {activityData && (
                  <div className="border border-white/10 rounded-md p-4 mt-4 bg-black/40 overflow-auto">
                    <pre className="text-xs text-white/80">
                      {JSON.stringify(activityData, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 