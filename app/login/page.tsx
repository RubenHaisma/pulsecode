"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleGitHubLogin = async () => {
    setIsLoading(true)
    try {
      // GitHub OAuth logic will go here
      toast({
        title: "Coming soon!",
        description: "GitHub authentication will be available shortly.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="neon-border p-8">
          <h2 className="text-2xl font-bold pixel-font text-center mb-8 neon-glow">
            Login to PulseCode
          </h2>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="mt-1"
              />
            </div>

            <Button className="w-full neon-button bg-pink-500 hover:bg-pink-600">
              Login
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background-start px-2 text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full neon-button"
              onClick={handleGitHubLogin}
              disabled={isLoading}
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>

            <p className="text-center text-sm text-gray-400 mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-pink-500 hover:text-pink-400">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  )
}