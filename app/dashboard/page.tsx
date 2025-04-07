"use client"

import { motion } from "framer-motion"
import { CodeOrb } from "@/components/code-orb"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BarChart,
  Code2,
  GitPullRequest,
  Star,
  Trophy,
  Twitter,
} from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <div className="fixed top-0 left-0 w-64 h-screen border-r border-white/10 bg-background-start/80 backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Code2 className="h-8 w-8 text-pink-500" />
            <span className="text-xl font-bold pixel-font">PulseCode</span>
          </div>

          <div className="flex justify-center mb-8">
            <CodeOrb />
          </div>

          <nav className="space-y-2">
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
            >
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
            >
              <Star className="mr-2 h-4 w-4" />
              Achievements
            </Button>
          </nav>
        </div>
      </div>

      <main className="pl-64">
        <div className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6"
          >
            <h1 className="text-3xl font-bold pixel-font neon-glow">
              Welcome back, Coder!
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="neon-border">
                <CardHeader>
                  <CardTitle>Today&apos;s Commits</CardTitle>
                  <CardDescription>Your coding activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">8</div>
                </CardContent>
              </Card>

              <Card className="neon-border">
                <CardHeader>
                  <CardTitle>Open PRs</CardTitle>
                  <CardDescription>Pending reviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">3</div>
                </CardContent>
              </Card>

              <Card className="neon-border">
                <CardHeader>
                  <CardTitle>Streak</CardTitle>
                  <CardDescription>Days coding</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">12</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="neon-border">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <GitPullRequest className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">New PR: Add authentication</p>
                        <p className="text-sm text-gray-400">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Twitter className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Posted daily update</p>
                        <p className="text-sm text-gray-400">5 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="neon-border">
                <CardHeader>
                  <CardTitle>Latest Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">Code Phantom</p>
                        <p className="text-sm text-gray-400">
                          10 days coding streak
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Trophy className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium">PR Master</p>
                        <p className="text-sm text-gray-400">
                          Merged 50 pull requests
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}