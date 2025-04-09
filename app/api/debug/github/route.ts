import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Octokit } from "@octokit/rest";

export async function GET() {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: "Debug endpoints not available in production" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the GitHub token to check
    const githubToken = process.env.GITHUB_TOKEN;
    
    // Get user data from the database
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if GitHub is connected
    const githubConnected = !!(userData.githubUsername || userData.githubId);

    // Try to verify the GitHub token
    let tokenStatus = 'unknown';
    let tokenUser = null;
    let rateLimits = null;
    
    if (githubToken) {
      try {
        const octokit = new Octokit({
          auth: githubToken
        });
        
        // Get the authenticated user to verify token
        const { data: tokenData } = await octokit.users.getAuthenticated();
        tokenStatus = 'valid';
        tokenUser = {
          login: tokenData.login,
          id: tokenData.id,
          type: tokenData.type,
        };
        
        // Check rate limits
        const { data: limits } = await octokit.rateLimit.get();
        rateLimits = limits.resources;
      } catch (error: any) {
        tokenStatus = 'invalid';
        console.error("GitHub token validation error:", error);
      }
    } else {
      tokenStatus = 'missing';
    }
    
    // Check if the connected GitHub account exists
    let githubUserStatus = 'unknown';
    let githubUserData = null;
    
    if (githubConnected && githubToken) {
      try {
        const octokit = new Octokit({
          auth: githubToken
        });
        
        // Use githubUsername if available, fall back to githubId
        const username = userData.githubUsername || userData.githubId;
        
        const { data } = await octokit.users.getByUsername({
          username: username!
        });
        
        githubUserStatus = 'valid';
        githubUserData = {
          login: data.login,
          id: data.id,
          type: data.type,
          name: data.name,
          public_repos: data.public_repos
        };
      } catch (error) {
        githubUserStatus = 'invalid';
        console.error("GitHub user validation error:", error);
      }
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        githubConnected,
        githubId: userData.githubId,
        githubUsername: userData.githubUsername
      },
      githubToken: {
        status: tokenStatus,
        user: tokenUser,
        rateLimits
      },
      githubUser: {
        status: githubUserStatus,
        data: githubUserData
      },
      env: {
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { error: "Failed to run debug checks" },
      { status: 500 }
    );
  }
} 