import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { testGitHubToken, getOctokit, requiredGitHubScopes } from "@/lib/github";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user's GitHub OAuth token and scopes from their account
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'github'
      },
      select: {
        access_token: true,
        scope: true
      }
    });
    
    if (!account) {
      return NextResponse.json({ 
        error: "GitHub account not connected",
        connected: false
      }, { status: 200 });
    }
    
    // Check the scopes
    let missingScopes: string[] = [];
    if (account.scope) {
      const scopes = account.scope.split(' ');
      missingScopes = requiredGitHubScopes.filter(scope => !scopes.includes(scope));
    } else {
      missingScopes = [...requiredGitHubScopes];
    }
    
    // Get an Octokit instance with the user's OAuth token
    const octokit = await getOctokit(user.id);
    
    // Test GitHub token
    const tokenTest = await testGitHubToken(octokit);

    // Only include detailed token test in development
    let detailedPermissions = null;
    if (process.env.NODE_ENV !== 'production' && tokenTest.valid) {
      try {
        // Check rate limits
        const { data: rateLimits } = await octokit.rateLimit.get();
        
        // Try to access authenticated user's repos
        const { data: authRepos } = await octokit.repos.listForAuthenticatedUser({
          per_page: 10,
          sort: "updated"
        });
        
        // Try to get organizations the user belongs to
        const { data: orgs } = await octokit.orgs.listForAuthenticatedUser();
        
        // Create detailed permissions object
        detailedPermissions = {
          rateLimits: rateLimits.resources,
          repos: {
            total: authRepos.length,
            private: authRepos.filter(r => r.private).length,
            public: authRepos.filter(r => !r.private).length,
            orgRepos: authRepos.filter(r => r.owner.type === "Organization").length,
            sample: authRepos.slice(0, 3).map(r => ({
              name: r.name,
              full_name: r.full_name,
              private: r.private,
              owner: {
                login: r.owner.login,
                type: r.owner.type
              }
            }))
          },
          orgs: {
            count: orgs.length,
            list: orgs.map(o => o.login)
          }
        };
      } catch (error) {
        console.error("Error checking detailed permissions:", error);
      }
    }

    return NextResponse.json({
      token: {
        ...tokenTest,
        detailedPermissions,
        source: "oauth_session"
      },
      missingScopes,
      needsReauth: missingScopes.length > 0,
      environment: {
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error("Error in token test API:", error);
    return NextResponse.json(
      { error: "Failed to test token" },
      { status: 500 }
    );
  }
} 