import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getGitHubUserStats, updateGitHubUserData, TimeRange } from "@/lib/github";
import { updateProgress } from "@/lib/progress";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the time range from query parameters
    const url = new URL(req.url);
    const timeRangeParam = url.searchParams.get('timeRange') as TimeRange || 'all';
    const debug = url.searchParams.get('debug') === 'true';
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
    
    // Validate time range
    const validTimeRanges: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];
    const timeRange = validTimeRanges.includes(timeRangeParam) ? timeRangeParam : 'all';

    // Get user data from the database including stats
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: { 
        stats: true,
        achievements: true
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Look for either githubUsername or githubId
    const githubUsername = userData.githubUsername || userData.githubId;
    
    if (!githubUsername) {
      return NextResponse.json({
        error: "GitHub account not connected",
        stats: userData.stats || null,
        achievements: userData.achievements || [],
        connected: false,
      }, { status: 200 });
    }

    // Check if this is first load or data needs refresh
    const isFirstLoad = !userData.stats || !userData.stats.lastActivity;
    const isDataStale = userData.stats?.lastActivity && 
      Date.now() - new Date(userData.stats.lastActivity).getTime() > 3600000; // 1 hour
    
    // Always refresh data if it's first load, force refreshed, or stale
    const shouldRefreshData = isFirstLoad || forceRefresh || isDataStale || timeRange !== 'all';

    try {
      // For first load or forced refresh, always update the data
      if (shouldRefreshData) {
        console.log(`Refreshing GitHub data for user ${user.id} with username ${githubUsername}`);
        
        // Set initial progress state
        updateProgress(user.id, 'initializing', 0, 100);
        
        // Call updateGitHubUserData with progress callback
        const githubData = await updateGitHubUserData(
          user.id,
          timeRange,
          // Progress callback function with enhanced details
          (stage: string, completed: number, total: number, details?: string, orgName?: string) => {
            if (user && user.id) {
              updateProgress(user.id, stage, completed, total, details, orgName);
            }
          }
        );
        
        // Get the updated user with fresh data
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { 
            stats: true,
            achievements: true
          },
        });
        
        if (!updatedUser) {
          throw new Error("Failed to get updated user data");
        }
        
        const response: any = {
          stats: {
            ...(updatedUser.stats || {}),
            points: updatedUser.points,
            level: Math.floor(updatedUser.points / 100) + 1,
            totalLinesChanged: githubData.totalLinesChanged,
            stars: githubData.stars,
            repos: githubData.repos,
            currentStreak: githubData.currentStreak,
            longestStreak: githubData.longestStreak,
            activeDays: githubData.activeDays,
            totalRepositoriesImpacted: githubData.totalRepositoriesImpacted
          },
          achievements: updatedUser.achievements || [],
          timeRange,
          connected: true,
          refreshed: true,
        };

        if (debug) {
          response.debug = {
            userId: user.id,
            githubUsername,
            timeRange,
            refreshReason: isFirstLoad ? "firstLoad" : forceRefresh ? "forceRefresh" : isDataStale ? "staleData" : "timeRangeChange",
          };
        }

        return NextResponse.json(response);
      } 
      
      // Return cached data if available and not stale
      const response: any = {
        stats: {
          ...(userData.stats || {}),
          points: userData.points,
          level: Math.floor(userData.points / 100) + 1,
        },
        achievements: userData.achievements || [],
        timeRange,
        connected: true,
        cached: true,
      };

      if (debug) {
        response.debug = {
          userId: user.id,
          githubUsername,
          timeRange,
          fromCache: true,
        };
      }

      return NextResponse.json(response);
    } catch (error: any) {
      console.error("Error fetching GitHub user stats:", error);
      return NextResponse.json({
        error: "Failed to fetch GitHub user stats",
        message: error.message || "Unknown error",
        stats: null,
        achievements: [],
        timeRange,
        connected: true,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error in GitHub stats API:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch GitHub stats",
        message: error.message || "Unknown error",
        stats: null,
        achievements: [],
      },
      { status: 500 }
    );
  }
}

// Force update GitHub stats
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get request body for time range
    const body = await req.json();
    const timeRangeParam = body.timeRange as TimeRange || 'all';
    const debug = body.debug === true;
    
    // Validate time range
    const validTimeRanges: TimeRange[] = ['today', 'week', 'month', 'year', 'all'];
    const timeRange = validTimeRanges.includes(timeRangeParam) ? timeRangeParam : 'all';

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userData || !userData.githubUsername) {
      return NextResponse.json(
        { 
          error: "GitHub account not connected",
          connected: false,
        },
        { status: 400 }
      );
    }

    try {
      // Update GitHub data
      const githubData = await updateGitHubUserData(
        user.id, 
        timeRange,
        // Progress callback function with enhanced details
        (stage: string, completed: number, total: number, details?: string, orgName?: string) => {
          if (user && user.id) {
            updateProgress(user.id, stage, completed, total, details, orgName);
          }
        }
      );
      
      // Get the updated user data
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { 
          stats: true,
          achievements: true
        },
      });

      const response: any = {
        stats: {
          ...(updatedUser?.stats || {}),
          points: updatedUser?.points || 0,
          level: Math.floor((updatedUser?.points || 0) / 100) + 1,
          totalLinesChanged: githubData.totalLinesChanged,
          stars: githubData.stars,
          repos: githubData.repos,
          currentStreak: githubData.currentStreak,
          longestStreak: githubData.longestStreak,
          activeDays: githubData.activeDays,
          totalRepositoriesImpacted: githubData.totalRepositoriesImpacted
        },
        achievements: updatedUser?.achievements || [],
        timeRange,
        connected: true,
        refreshed: true,
      };

      if (debug) {
        response.debug = {
          userId: user.id,
          githubUsername: userData.githubUsername,
          timeRange,
          forcedUpdate: true,
        };
      }

      return NextResponse.json(response);
    } catch (error: any) {
      console.error("Error updating GitHub user stats:", error);
      return NextResponse.json({
        error: "Failed to update GitHub user stats",
        message: error.message || "Unknown error",
        connected: true,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error in GitHub stats update API:", error);
    return NextResponse.json(
      { 
        error: "Failed to update GitHub stats",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
} 