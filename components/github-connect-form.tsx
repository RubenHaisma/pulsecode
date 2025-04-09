"use client"

import { useState } from "react"
import { Github, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface GithubConnectFormProps {
  onSuccess: () => void;
  initialUsername?: string;
  isConnected?: boolean;
}

export function GithubConnectForm({ 
  onSuccess, 
  initialUsername = "", 
  isConnected = false 
}: GithubConnectFormProps) {
  const [username, setUsername] = useState(initialUsername)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isValid, setIsValid] = useState(false)

  // Validate GitHub username format
  const isValidGithubUsername = (username: string) => {
    // GitHub usernames must be between 1-39 characters and can only contain 
    // alphanumeric characters or hyphens (cannot start or end with hyphen)
    const regex = /^[a-zA-Z0-9]([a-zA-Z0-9]|-(?!-))*[a-zA-Z0-9]$/;
    return username.length > 0 && username.length < 40 && regex.test(username);
  };

  // Check if GitHub username exists
  const verifyGithubUsername = async () => {
    if (!isValidGithubUsername(username)) {
      setError("Invalid GitHub username format");
      setIsValid(false);
      return;
    }

    setIsVerifying(true);
    setError(null);
    
    try {
      // Use GitHub's public API to check if the username exists
      const response = await fetch(`https://api.github.com/users/${username}`);
      
      if (response.ok) {
        setIsValid(true);
        setError(null);
      } else if (response.status === 404) {
        setIsValid(false);
        setError("GitHub username not found");
      } else {
        setIsValid(false);
        setError("Error verifying username");
      }
    } catch (error) {
      console.error("Error validating GitHub username:", error);
      setIsValid(false);
      setError("Could not validate username");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    setIsValid(false);
    setError(null);
  };

  // Handle input blur for validation
  const handleInputBlur = () => {
    if (username && username.length > 0) {
      verifyGithubUsername();
    }
  };

  // Connect GitHub account
  const connectGitHub = async () => {
    if (!isValid && !isConnected) {
      setError("Please enter a valid GitHub username");
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log("Connecting GitHub account with username:", username);
      
      const response = await fetch("/api/github/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ githubUsername: username }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("GitHub connect error:", data);
        setError(data.error || "Failed to connect GitHub account");
        return;
      }
      
      console.log("GitHub connection successful");
      
      // Success! Call the callback
      onSuccess();
    } catch (error) {
      console.error("Error connecting GitHub:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto bg-black/60 border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Github className="mr-2 h-5 w-5" />
          {isConnected ? "Update GitHub Connection" : "Connect GitHub Account"}
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to track your coding activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Input
                value={username}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="GitHub username"
                className="pl-10 bg-black/40 border-white/20"
                disabled={isConnecting}
              />
              <Github className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              {isValid && (
                <Check className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
              )}
            </div>
            {username && !isValid && !isVerifying && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={verifyGithubUsername}
                disabled={isVerifying || !isValidGithubUsername(username)}
              >
                Verify
              </Button>
            )}
          </div>
          
          <Alert className="bg-blue-950/30 border-blue-600/30">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs text-blue-300">
              When you connect your GitHub account, we&apos;ll automatically access your personal and organization repositories using your OAuth token. No additional token setup is required.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={connectGitHub} 
          disabled={(!isValid && !isConnected) || isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : isConnected ? "Update Connection" : "Connect GitHub"}
        </Button>
      </CardFooter>
    </Card>
  )
} 