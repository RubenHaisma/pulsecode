import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateGitHubUserData } from "@/lib/github";
import { checkAndAwardAchievements } from "@/lib/achievements";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { githubUsername } = await req.json();

    if (!githubUsername) {
      return NextResponse.json(
        { error: "GitHub username is required" },
        { status: 400 }
      );
    }

    console.log("Received request to connect GitHub for user ID:", user.id);
    console.log("GitHub username to connect:", githubUsername);

    // First verify this user exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      console.log("User not found in database:", user.id);
      // Try to create the user first
      try {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email || `${user.id}@example.com`,
            name: user.name || "User",
            githubId: githubUsername,
            githubUsername: githubUsername,
          },
        });
        console.log("Created new user:", user.id);
      } catch (createError) {
        console.error("Failed to create user:", createError);
        return NextResponse.json(
          { error: "User account not found in database" },
          { status: 500 }
        );
      }
    } else {
      // Update the user's GitHub ID and username
      await prisma.user.update({
        where: { id: user.id },
        data: {
          githubId: githubUsername,
          githubUsername: githubUsername,
        },
      });
      console.log("Updated existing user:", user.id);
    }

    // Update GitHub data in the database
    await updateGitHubUserData(user.id);

    // Check for achievements
    await checkAndAwardAchievements(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error connecting GitHub account:", error);
    return NextResponse.json(
      { error: "Failed to connect GitHub account", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 