"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { ArrowLeft, Github, Twitter, User, LogOut, RefreshCw, Shield, Bell, Moon, Sun, Settings as SettingsIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { GithubConnectForm } from "@/components/github-connect-form"

interface UserProfile {
  id: string
  name: string
  email: string
  image: string | null
  githubUsername: string | null
  twitterId: string | null
  createdAt: string
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserProfile()
      if (theme) {
        setDarkMode(theme === "dark")
      }
    }
  }, [status, theme])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/user/profile")
      
      if (!response.ok) {
        throw new Error("Failed to fetch user profile")
      }
      
      const data = await response.json()
      setProfile(data)
      setName(data.name || "")
      setEmail(data.email || "")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user profile. Please try again.",
        variant: "destructive",
      })
      console.error("Error fetching user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to update profile")
      }
      
      await update({
        ...session,
        user: {
          ...session?.user,
          name,
          email,
        },
      })
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
      console.error("Error updating profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const refreshGitHubData = async () => {
    try {
      setRefreshing(true)
      const response = await fetch("/api/github/refresh", {
        method: "POST",
      })
      
      if (!response.ok) {
        throw new Error("Failed to refresh GitHub data")
      }
      
      toast({
        title: "Data refreshed",
        description: "Your GitHub data has been refreshed successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh GitHub data. Please try again.",
        variant: "destructive",
      })
      console.error("Error refreshing GitHub data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const disconnectGitHub = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/github/disconnect", {
        method: "POST",
      })
      
      if (!response.ok) {
        throw new Error("Failed to disconnect GitHub")
      }
      
      // Update session and profile
      await update({
        ...session,
        user: {
          ...session?.user,
          githubUsername: null,
        },
      })
      
      setProfile(prev => prev ? {...prev, githubUsername: null} : null)
      
      toast({
        title: "Account disconnected",
        description: "Your GitHub account has been disconnected.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect GitHub account. Please try again.",
        variant: "destructive",
      })
      console.error("Error disconnecting GitHub:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleThemeChange = (checked: boolean) => {
    setDarkMode(checked)
    setTheme(checked ? "dark" : "light")
  }

  const connectGitHub = async () => {
    setIsConnecting(true)
  }
  
  const closeGitHubConnect = () => {
    setIsConnecting(false)
  }
  
  const onGitHubConnectSuccess = async () => {
    setIsConnecting(false)
    await fetchUserProfile()
    toast({
      title: "Account connected",
      description: "Your GitHub account has been connected successfully.",
    })
  }
  
  const getInitials = (name: string | null | undefined): string => 
    name?.split(' ').map(n => n[0]).join('') || 'U'

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <SettingsIcon className="h-10 w-10 animate-pulse text-purple-500" />
          <p className="text-lg font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-6xl">
      <div className="flex items-center mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="connections">
            <Github className="h-4 w-4 mr-2" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                    <AvatarFallback className="text-xl">{getInitials(session?.user?.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{session?.user?.name}</h3>
                    <p className="text-sm text-muted-foreground">Member since {new Date(profile?.createdAt || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={updateProfile} disabled={loading}>
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Account Email</Label>
                  <div className="text-sm font-medium">{session?.user?.email}</div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Account ID</Label>
                  <div className="text-sm font-medium">{session?.user?.id}</div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 pt-2">
                  <Label className="text-sm font-medium">Danger Zone</Label>
                  <p className="text-sm text-muted-foreground">
                    Actions here cannot be undone. Be careful.
                  </p>
                  
                  <div className="pt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive">Delete Account</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Are you absolutely sure?</DialogTitle>
                          <DialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove all your data from our servers.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="pt-4">
                          <Button variant="outline">Cancel</Button>
                          <Button variant="destructive">Delete Account</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="connections">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub Connection
                </CardTitle>
                <CardDescription>
                  Connect your GitHub account to track your coding activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.githubUsername ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="gap-1">
                        <Github className="h-3 w-3" /> Connected
                      </Badge>
                      <span className="text-sm font-medium">@{profile.githubUsername}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={refreshGitHubData}
                        disabled={refreshing}
                      >
                        {refreshing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh GitHub Data
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={disconnectGitHub}
                        disabled={loading}
                      >
                        Disconnect
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">About GitHub Connection</h4>
                      <p className="text-sm text-muted-foreground">
                        Your GitHub connection allows PulseCode to analyze your public and private 
                        repositories to provide insights into your coding activity.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Github className="h-3 w-3" /> Not Connected
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Connect your GitHub account to unlock full features and track your coding activity.
                    </p>
                    
                    <Button 
                      onClick={connectGitHub}
                    >
                      <Github className="h-4 w-4 mr-2" />
                      Connect GitHub Account
                    </Button>
                    
                    <Dialog open={isConnecting} onOpenChange={setIsConnecting}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Connect GitHub Account</DialogTitle>
                          <DialogDescription>
                            Link your GitHub account to track your coding activity
                          </DialogDescription>
                        </DialogHeader>
                        <GithubConnectForm
                          onSuccess={onGitHubConnectSuccess}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Twitter className="h-5 w-5" />
                  Twitter Connection
                </CardTitle>
                <CardDescription>
                  Connect Twitter to share your achievements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.twitterId ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="gap-1">
                        <Twitter className="h-3 w-3" /> Connected
                      </Badge>
                    </div>
                    
                    <div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={loading}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Twitter className="h-3 w-3" /> Not Connected
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Connect your Twitter account to easily share your coding achievements.
                    </p>
                    
                    <Button variant="outline">
                      <Twitter className="h-4 w-4 mr-2" />
                      Connect Twitter Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Manage your app preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="darkMode" className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark theme
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch 
                    id="darkMode" 
                    checked={darkMode}
                    onCheckedChange={handleThemeChange}
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications" className="text-base">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about achievements and milestones
                  </p>
                </div>
                <Switch 
                  id="notifications" 
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weeklyDigest" className="text-base">Weekly Digest Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly summary of your coding activity
                  </p>
                </div>
                <Switch 
                  id="weeklyDigest" 
                  checked={weeklyDigest}
                  onCheckedChange={setWeeklyDigest}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Active Sessions</h3>
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">
                          {navigator.userAgent.split(" ").slice(-1)[0].split("/")[0]}
                          &nbsp;•&nbsp;
                          {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-auto mr-4">
                      Active Now
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Change Password</h3>
                <p className="text-sm text-muted-foreground">
                  For password changes, please use the &quot;Forgot Password&quot; option on the login page.
                </p>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Go to Login Page
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 