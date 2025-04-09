import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getGitHubActivity, TimeRange } from "@/lib/github";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the time range and limit from query parameters
    const url = new URL(req.url);
    const timeRangeParam = url.searchParams.get('timeRange') as TimeRange || 'all';
    const limitParam = url.searchParams.get('limit');
    const debug = url.searchParams.get('debug') === 'true';
    
    // Validate time range
    const validTimeRanges: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];
    const timeRange = validTimeRanges.includes(timeRangeParam) ? timeRangeParam : 'all';
    
    // Parse limit or use default
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Get user data from the database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use githubUsername if available, fall back to githubId
    const githubUsername = userData.githubUsername || userData.githubId;
    
    if (!githubUsername) {
      return NextResponse.json({
        error: "GitHub account not connected",
        activities: [],
        timeRange,
        connected: false,
      }, { status: 200 });
    }

    try {
      // Get GitHub activities with time range filtering
      const activities = await getGitHubActivity(githubUsername, limit, timeRange, user.id);

      // Include debugging info if requested
      const response: any = { 
        activities,
        timeRange,
        connected: true,
        count: activities.length
      };

      if (debug) {
        response.debug = {
          userId: user.id,
          githubUsername,
          params: {
            timeRange,
            limit
          }
        };
      }

      return NextResponse.json(response);
    } catch (error: any) {
      console.error("Error fetching GitHub activity data:", error);
      return NextResponse.json({
        error: "Failed to fetch GitHub activity data",
        message: error.message || "Unknown error",
        timeRange,
        connected: true,
        activities: []
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error in GitHub activity API:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch GitHub activity",
        message: error.message || "Unknown error",
        activities: []
      },
      { status: 500 }
    );
  }
} 