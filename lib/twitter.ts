import prisma from "@/lib/prisma";
import twitterClient from "./twitter-client";

export async function postTweet(userId: string, achievement: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const tweet = `🎮 Achievement Unlocked: ${achievement}! 
🚀 Keep building in public with @PulseCodeApp`;

    await twitterClient.v2.tweet(tweet);
    return true;
  } catch (error) {
    console.error("Error posting tweet:", error);
    return false;
  }
}