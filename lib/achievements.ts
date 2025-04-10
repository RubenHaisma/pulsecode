import prisma from "./prisma";
import { postTweet } from "./twitter";
import { getGitHubUserStats } from "./github";

export const ACHIEVEMENTS = {
  FIRST_COMMIT: {
    name: "First Blood",
    description: "Made your first commit",
    icon: "git-commit",
    points: 10,
  },
  STREAK_7_DAYS: {
    name: "Code Warrior",
    description: "Maintained a 7-day coding streak",
    icon: "flame",
    points: 50,
  },
  PR_MASTER: {
    name: "PR Master",
    description: "Merged 10 pull requests",
    icon: "git-pull-request",
    points: 100,
  },
  SOCIAL_BUTTERFLY: {
    name: "Social Butterfly",
    description: "Connected GitHub and Twitter accounts",
    icon: "share",
    points: 25,
  },
  CODE_MOUNTAINEER: {
    name: "Code Mountaineer",
    description: "Changed over 10,000 lines of code",
    icon: "code",
    points: 150,
  },
  REPO_COLLECTOR: {
    name: "Repo Collector",
    description: "Created or contributed to 5 or more repositories",
    icon: "folder",
    points: 75,
  },
  STAR_GAZER: {
    name: "Star Gazer",
    description: "Received 10 or more stars on your repositories",
    icon: "star",
    points: 100,
  },
  CENTURY_CLUB: {
    name: "Century Club",
    description: "Made 100 or more commits",
    icon: "git-commit",
    points: 200,
  },
};

export async function checkAndAwardAchievements(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stats: true,
        achievements: true,
      },
    });

    if (!user || !user.stats) return;

    const newAchievements = [];

    // For GitHub-specific achievements, we'll need the GitHub data
    let githubData = null;
    
    if (user.githubId) {
      githubData = await getGitHubUserStats(user.githubId, 'all', userId);
    }

    // Check for First Commit
    if (
      user.stats.commits > 0 &&
      !user.achievements.some((a) => a.name === ACHIEVEMENTS.FIRST_COMMIT.name)
    ) {
      newAchievements.push(ACHIEVEMENTS.FIRST_COMMIT);
    }

    // Check for 7-day Streak
    if (
      user.stats.streak >= 7 &&
      !user.achievements.some((a) => a.name === ACHIEVEMENTS.STREAK_7_DAYS.name)
    ) {
      newAchievements.push(ACHIEVEMENTS.STREAK_7_DAYS);
    }

    // Check for PR Master
    if (
      user.stats.pullRequests >= 10 &&
      !user.achievements.some((a) => a.name === ACHIEVEMENTS.PR_MASTER.name)
    ) {
      newAchievements.push(ACHIEVEMENTS.PR_MASTER);
    }

    // Check for Social Butterfly
    if (
      user.githubId &&
      user.twitterId &&
      !user.achievements.some((a) => a.name === ACHIEVEMENTS.SOCIAL_BUTTERFLY.name)
    ) {
      newAchievements.push(ACHIEVEMENTS.SOCIAL_BUTTERFLY);
    }
    
    // Additional GitHub achievements if we have GitHub data
    if (githubData) {
      // Check for Code Mountaineer
      if (
        (githubData.contributions || 0) >= 10000 &&
        !user.achievements.some((a) => a.name === ACHIEVEMENTS.CODE_MOUNTAINEER.name)
      ) {
        newAchievements.push(ACHIEVEMENTS.CODE_MOUNTAINEER);
      }
      
      // Check for Repo Collector
      if (
        githubData.repos >= 5 &&
        !user.achievements.some((a) => a.name === ACHIEVEMENTS.REPO_COLLECTOR.name)
      ) {
        newAchievements.push(ACHIEVEMENTS.REPO_COLLECTOR);
      }
      
      // Check for Star Gazer
      if (
        githubData.stars >= 10 &&
        !user.achievements.some((a) => a.name === ACHIEVEMENTS.STAR_GAZER.name)
      ) {
        newAchievements.push(ACHIEVEMENTS.STAR_GAZER);
      }
      
      // Check for Century Club
      if (
        githubData.commits >= 100 &&
        !user.achievements.some((a) => a.name === ACHIEVEMENTS.CENTURY_CLUB.name)
      ) {
        newAchievements.push(ACHIEVEMENTS.CENTURY_CLUB);
      }
    }

    // Award new achievements
    for (const achievement of newAchievements) {
      await prisma.achievement.create({
        data: {
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          points: achievement.points,
          userId: user.id,
        },
      });

      // Update user points
      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: {
            increment: achievement.points,
          },
        },
      });

      // Post to Twitter
      await postTweet(user.id, achievement.name);
    }

    return newAchievements;
  } catch (error) {
    console.error("Error checking achievements:", error);
    return [];
  }
}