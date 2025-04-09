import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Octokit } from "@octokit/rest";

// Create profile or initialize
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`Creating/updating profile for user: ${user.id}`);

    // Check if user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      console.log(`User ${user.id} not found in database, creating...`);
      
      // Create user
      const newUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || `${user.id}@example.com`,
          name: user.name || "User",
          image: user.image,
        },
      });
      
      console.log(`Created new user: ${newUser.id}`);
      
      // Create empty stats
      await prisma.stats.create({
        data: {
          userId: user.id,
          commits: 0,
          pullRequests: 0,
          streak: 0,
        },
      });
      
      console.log(`Created empty stats for user: ${user.id}`);
      
      return NextResponse.json({ success: true, created: true });
    }
    
    // Check if GitHub token is valid (for diagnostic purposes)
    const githubToken = process.env.GITHUB_TOKEN;
    let tokenStatus = "missing";
    let tokenUser = null;
    
    if (githubToken) {
      try {
        const octokit = new Octokit({ auth: githubToken });
        const { data } = await octokit.users.getAuthenticated();
        
        tokenStatus = "valid";
        tokenUser = {
          login: data.login,
          id: data.id,
          type: data.type,
        };
        
        console.log(`GitHub token valid, authenticated as: ${data.login}`);
      } catch (error) {
        tokenStatus = "invalid";
        console.error("GitHub token validation error:", error);
      }
    }
    
    // Check if user has GitHub info
    const hasGitHub = !!existingUser.githubId || !!existingUser.githubUsername;
    
    // Create stats if they don't exist
    if (!(await prisma.stats.findUnique({ where: { userId: user.id } }))) {
      await prisma.stats.create({
        data: {
          userId: user.id,
          commits: 0,
          pullRequests: 0,
          streak: 0,
        },
      });
      console.log(`Created missing stats for existing user: ${user.id}`);
    }
    
    return NextResponse.json({
      success: true,
      created: false,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        githubId: existingUser.githubId,
        githubUsername: existingUser.githubUsername,
        hasGitHub,
      },
      github: {
        tokenStatus,
        tokenUser
      }
    });
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
} 