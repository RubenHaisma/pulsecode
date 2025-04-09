"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { User } from "@prisma/client";

interface LeaderboardUser extends User {
  stats: {
    commits: number;
    pullRequests: number;
    streak: number;
  };
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboard");
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <Trophy className="h-6 w-6 text-purple-500" />;
    }
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-3xl font-bold pixel-font neon-glow mb-8">
          Leaderboard
        </h1>

        <div className="grid gap-6">
          {isLoading ? (
            <Card className="neon-border">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-gray-700/50 rounded-lg"
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="neon-border">
              <CardHeader>
                <CardTitle>Top Coders</CardTitle>
                <CardDescription>
                  Based on commits, PRs, and streaks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        user.id === session?.user?.id
                          ? "bg-pink-500/20 neon-border"
                          : "bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold pixel-font w-8">
                          #{index + 1}
                        </span>
                        {getRankIcon(index)}
                        <Avatar>
                          <AvatarImage src={user.image || ""} />
                          <AvatarFallback>
                            {user.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-sm text-gray-400">
                            {user.stats.commits} commits · {user.stats.pullRequests}{" "}
                            PRs · {user.stats.streak} day streak
                          </p>
                        </div>
                      </div>
                      <div className="text-2xl font-bold pixel-font text-pink-500">
                        {user.points}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
}