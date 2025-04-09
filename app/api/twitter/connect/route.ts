import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TwitterApi } from "twitter-api-v2";
import { checkAndAwardAchievements } from "@/lib/achievements";
import twitterClient from "@/lib/twitter-client";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { oauth_token, oauth_verifier } = await req.json();

    // For OAuth 1.0a login flow, we still need API key and secret
    const oauthClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
    });

    const {
      client: loggedClient,
      accessToken,
      accessSecret,
    } = await oauthClient.login(oauth_token, oauth_verifier);

    // Use the logged client to get user info
    const { data: twitterUser } = await loggedClient.v2.me();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twitterId: twitterUser.id,
      },
    });

    // Check for new achievements after connecting Twitter
    await checkAndAwardAchievements(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error connecting Twitter:", error);
    return NextResponse.json(
      { error: "Failed to connect Twitter account" },
      { status: 500 }
    );
  }
}