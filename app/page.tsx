"use client"

import { motion } from "framer-motion"
import { Code2, Github, Twitter } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen">
      <nav className="fixed w-full z-50 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Code2 className="h-8 w-8 text-pink-500" />
              <span className="ml-2 text-xl font-bold pixel-font text-white">PulseCode</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="neon-button">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="neon-button bg-pink-500 hover:bg-pink-600">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold pixel-font neon-glow mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Level Up Your
            <br />
            #BuildInPublic Journey
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Automatically track your coding progress, share achievements, and compete
            with other developers in style.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button className="neon-button bg-pink-500 hover:bg-pink-600 text-lg px-8 py-6">
              <Github className="mr-2 h-5 w-5" />
              Connect with GitHub
            </Button>
            <Button className="neon-button bg-blue-500 hover:bg-blue-600 text-lg px-8 py-6">
              <Twitter className="mr-2 h-5 w-5" />
              Connect with X
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div 
              className="neon-border p-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
            >
              <h3 className="text-xl font-bold mb-3 pixel-font">Auto-Track Progress</h3>
              <p className="text-gray-300">
                Sync with GitHub to automatically track your commits, PRs, and coding activity.
              </p>
            </motion.div>

            <motion.div 
              className="neon-border p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <h3 className="text-xl font-bold mb-3 pixel-font">Share Updates</h3>
              <p className="text-gray-300">
                Auto-post quirky updates to X about your coding progress and achievements.
              </p>
            </motion.div>

            <motion.div 
              className="neon-border p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
            >
              <h3 className="text-xl font-bold mb-3 pixel-font">Earn Badges</h3>
              <p className="text-gray-300">
                Unlock 8-bit style badges and compete on the weekly leaderboard.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center pixel-font neon-glow mb-12">
            Pricing
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="neon-border p-8">
              <h3 className="text-2xl font-bold mb-4 pixel-font">Free Tier</h3>
              <ul className="space-y-4 mb-8">
                <li>✨ 1 post per day</li>
                <li>🎮 3 achievement badges</li>
                <li>📊 Basic GitHub stats</li>
                <li>🏆 Leaderboard access</li>
              </ul>
              <Button className="w-full neon-button">
                Get Started
              </Button>
            </div>

            <div className="neon-border p-8 border-pink-500/50">
              <h3 className="text-2xl font-bold mb-4 pixel-font">Premium - $5/mo</h3>
              <ul className="space-y-4 mb-8">
                <li>🚀 Unlimited posts</li>
                <li>🎯 Custom tweet templates</li>
                <li>📈 Advanced analytics</li>
                <li>🎨 Unlimited badges</li>
                <li>💫 Priority support</li>
              </ul>
              <Button className="w-full neon-button bg-pink-500 hover:bg-pink-600">
                Upgrade to Premium
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400">
          <p>© 2024 PulseCode. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}