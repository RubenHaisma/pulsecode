import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data from the database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        stats: true,
        achievements: true
      }
    });

    if (!userData) {
      console.log("User not found in database:", user.id);
      
      // If user not found in database, return session user with empty stats
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        stats: null,
        achievements: [],
      });
    }

    // Return user profile data
    return NextResponse.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      image: userData.image,
      githubId: userData.githubId,
      githubUsername: userData.githubUsername,
      twitterId: userData.twitterId,
      points: userData.points,
      level: Math.floor(userData.points / 100) + 1,
      stats: userData.stats,
      achievements: userData.achievements,
      isGitHubConnected: !!userData.githubId || !!userData.githubUsername,
      isTwitterConnected: !!userData.twitterId
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
} 