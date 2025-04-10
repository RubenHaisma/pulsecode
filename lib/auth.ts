import { getServerSession } from "next-auth/next";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions, DefaultSession } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaClient } from "@prisma/client";
import { requiredGitHubScopes } from "./github";

// Create a new prisma client instance 
const prisma = new PrismaClient();

// Extend the session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      githubId?: string;
      githubUsername?: string;
    } & DefaultSession["user"]
  }
  
  interface User {
    id: string;
    githubId?: string;
    githubUsername?: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV !== "production",
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: requiredGitHubScopes.join(" ")
        }
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email || `${profile.id}@github.user`,
          image: profile.avatar_url,
          githubId: profile.id.toString(),
          githubUsername: profile.login,
        };
      },
    }),
  ],
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id || token?.sub || "";
        if (user) {
          session.user.githubId = user.githubId;
          session.user.githubUsername = user.githubUsername;
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        token.userId = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper to get the current user server-side
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

// Get a user by ID from the database
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      stats: true,
      achievements: true
    }
  });
  return user;
}