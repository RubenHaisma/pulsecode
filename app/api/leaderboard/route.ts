import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const sortBy = url.searchParams.get('sortBy') || 'points';
    const timeRange = url.searchParams.get('timeRange') || 'all';
    
    // Get the current user 
    const currentUser = await getCurrentUser();
    
    // Validate sorting options
    const validSortFields = ['points', 'commits', 'pullRequests', 'streak'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'points';
    
    // Fetch all users with their stats
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        githubUsername: true,
        githubId: true,
        points: true,
        stats: {
          select: {
            commits: true,
            pullRequests: true,
            streak: true,
            contributions: true,
            lastActivity: true,
          }
        }
      },
    });
    
    // Process user data to include computed fields
    const processedUsers = users
      .filter(user => user.points > 0 || (user.stats && Object.values(user.stats).some(val => val !== null && val !== 0)))
      .map(user => {
        // Calculate level based on points
        const level = Math.floor((user.points || 0) / 100) + 1;
        
        // Format the response
        return {
          id: user.id,
          name: user.name,
          image: user.image,
          githubUsername: user.githubUsername || user.githubId,
          points: user.points || 0,
          commits: user.stats?.commits || 0,
          pullRequests: user.stats?.pullRequests || 0,
          streak: user.stats?.streak || 0,
          contributions: user.stats?.contributions || 0,
          lastActivity: user.stats?.lastActivity,
          level
        };
      });
    
    // Sort users based on the specified field
    const sortedUsers = processedUsers.sort((a, b) => {
      // Handle possible undefined values by defaulting to 0
      const valueA = (a[sortField as keyof typeof a] as number) || 0;
      const valueB = (b[sortField as keyof typeof b] as number) || 0;
      return valueB - valueA;
    });
    
    // Return formatted response
    return NextResponse.json({
      users: sortedUsers,
      currentUserId: currentUser?.id || null,
      sortBy: sortField,
      timeRange
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}