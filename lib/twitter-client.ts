import { TwitterApi } from "twitter-api-v2";

// Create a Twitter client instance using bearer token
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!);

// Read-only client
export const twitterReadOnlyClient = twitterClient.readOnly;

export default twitterClient; 