import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const achievements = await prisma.achievement.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        unlockedAt: "desc",
      },
    });

    // Calculate total points from unlocked achievements
    const totalPoints = achievements
      .filter(achievement => achievement.unlockedAt !== null)
      .reduce((sum, achievement) => sum + (achievement.points || 0), 0);

    // Count unlocked achievements
    const unlockedCount = achievements.filter(achievement => achievement.unlockedAt !== null).length;

    return NextResponse.json({
      achievements,
      totalPoints,
      unlockedCount,
      totalCount: achievements.length
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch achievements",
        achievements: [],
        totalPoints: 0,
        unlockedCount: 0,
        totalCount: 0 
      },
      { status: 500 }
    );
  }
}