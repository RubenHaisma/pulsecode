import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { Session, User, NextAuthOptions, Profile } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { JWT } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
import { requiredGitHubScopes } from "@/lib/github";

// Create a new prisma client instance directly in this file
const prismaClient = new PrismaClient();

// Extend the Session type to include id
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubId?: string;
      githubUsername?: string;
    };
  }
  
  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    githubId?: string;
    githubUsername?: string;
  }

  interface Profile {
    login?: string;
    id?: string;
    avatar_url?: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prismaClient),
  debug: process.env.NODE_ENV !== "production",
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: requiredGitHubScopes.join(' ')
        }
      },
      profile(profile) {
        console.log("GitHub profile:", profile);
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
      console.log("Session callback - user:", user);
      if (session.user) {
        session.user.id = user?.id || token?.sub;
        // Add any additional fields from the database user to the session
        if (user) {
          session.user.githubId = user.githubId;
          session.user.githubUsername = user.githubUsername;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "github") {
        try {
          // Check if user exists with this GitHub ID
          const existingUser = await prismaClient.user.findFirst({
            where: { githubId: user.id },
          });
          
          if (existingUser) {
            return true;
          }
          
          // Check if user exists with this email
          const existingUserWithEmail = await prismaClient.user.findUnique({
            where: { email: user.email || "" },
          });
          
          if (existingUserWithEmail) {
            // Update the existing user by linking the GitHub account
            await prismaClient.user.update({
              where: { id: existingUserWithEmail.id },
              data: {
                githubId: user.id,
                githubUsername: profile.login,
              },
            });
            
            // Also ensure the account is properly linked in the accounts table
            const existingAccount = await prismaClient.account.findFirst({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });
            
            if (!existingAccount) {
              await prismaClient.account.create({
                data: {
                  userId: existingUserWithEmail.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
            }
            
            return true;
          }
          
          // Create new user if none exists
          if (user.email) {
            await prismaClient.user.create({
              data: {
                email: user.email,
                name: user.name || undefined,
                image: user.image || undefined,
                githubId: user.id,
                githubUsername: profile.login,
              },
            });
          }
          return true;
        } catch (error) {
          console.error("Error during sign in:", error);
          return false;
        }
      }
      return true;
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };