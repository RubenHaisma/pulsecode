"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Star, Lock, Trophy } from "lucide-react";
import { Achievement } from "@prisma/client";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch("/api/achievements");
        const data = await response.json();
        setAchievements(data);
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-4 mb-8">
          <Trophy className="h-8 w-8 text-pink-500" />
          <h1 className="text-3xl font-bold pixel-font neon-glow">
            Achievements
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="neon-border">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-700/50 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`neon-border ${
                      achievement.unlockedAt
                        ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20"
                        : "opacity-50"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {achievement.unlockedAt ? (
                            <Star className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <Lock className="h-5 w-5 text-gray-500" />
                          )}
                          {achievement.name}
                        </CardTitle>
                        <span className="text-pink-500 font-bold">
                          {achievement.points} pts
                        </span>
                      </div>
                      <CardDescription>{achievement.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {achievement.unlockedAt && (
                        <p className="text-sm text-gray-400">
                          Unlocked{" "}
                          {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}