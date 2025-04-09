import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAndAwardAchievements } from "@/lib/achievements";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const githubId = payload.sender.id.toString();

    const user = await prisma.user.findUnique({
      where: { githubId },
      include: { stats: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update stats based on event type
    if (payload.commits) {
      await prisma.stats.update({
        where: { userId: user.id },
        data: {
          commits: { increment: payload.commits.length },
          lastActivity: new Date(),
        },
      });
    }

    if (payload.pull_request) {
      if (payload.action === "closed" && payload.pull_request.merged) {
        await prisma.stats.update({
          where: { userId: user.id },
          data: {
            pullRequests: { increment: 1 },
            lastActivity: new Date(),
          },
        });
      }
    }

    // Update streak
    const lastActivity = user.stats?.lastActivity;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (lastActivity && lastActivity > oneDayAgo) {
      await prisma.stats.update({
        where: { userId: user.id },
        data: {
          streak: { increment: 1 },
        },
      });
    } else if (!lastActivity || lastActivity <= oneDayAgo) {
      await prisma.stats.update({
        where: { userId: user.id },
        data: {
          streak: 1,
        },
      });
    }

    // Check and award achievements
    await checkAndAwardAchievements(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}