"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check for authentication errors
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      let errorMessage = "An error occurred during sign in.";
      
      // Handle specific error types
      if (error === "OAuthAccountNotLinked") {
        errorMessage = "This account is already linked to another login method.";
      } else if (error === "AccessDenied") {
        errorMessage = "Access was denied. Please try again.";
      } else if (error === "Callback") {
        errorMessage = "There was a problem with the authentication callback.";
      }
      
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: errorMessage,
      });
    }
  }, [searchParams, toast]);

  if (status === "authenticated") {
    router.push("/dashboard");
    return null;
  }

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("github", { callbackUrl: "/dashboard" });
    } catch (error) {
      // This will rarely be caught since OAuth redirects
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background-start to-background-end">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 space-y-8 bg-black/60 backdrop-blur-xl rounded-lg border border-white/10"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome to PulseCode</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in with your GitHub account to track your coding journey
          </p>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full neon-button bg-black/60 hover:bg-black/80"
            onClick={handleGitHubLogin}
            disabled={isLoading || status === "loading"}
          >
            {isLoading || status === "loading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Github className="mr-2 h-4 w-4" />
            )}
            Sign in with GitHub
          </Button>
        </div>
      </motion.div>
    </div>
  );
}