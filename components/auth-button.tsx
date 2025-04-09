"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { Github, Loader2 } from "lucide-react";
import { useState } from "react";

export function AuthButton() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (session) {
        await signOut();
      } else {
        await signIn("github");
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={session ? "outline" : "default"}
      className="neon-button"
      onClick={handleAuth}
      disabled={isLoading || status === "loading"}
    >
      {isLoading || status === "loading" ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Github className="mr-2 h-4 w-4" />
      )}
      {session ? "Sign Out" : "Sign in with GitHub"}
    </Button>
  );
}