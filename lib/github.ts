import { Octokit } from "@octokit/rest";
import prisma from "./prisma";

// Add additional headers to get more information including private data
const headers = {
  "X-GitHub-Api-Version": "2022-11-28",
  accept: "application/vnd.github.v3+json",
  "Accept": "application/vnd.github+json"
};

// Scope that should be requested from GitHub to ensure proper access
export const requiredGitHubScopes = [
  "read:user", 
  "user:email", 
  "repo", 
  "read:org",
  "read:project", 
  "admin:org_hook"
];

// Create a function to get an Octokit instance with the user's token
export async function getOctokit(userId?: string) {
  // If no userId is provided, use the default token (only for admin/system operations)
  if (!userId) {
    return new Octokit({
      auth: process.env.GITHUB_TOKEN,
      request: {
        retries: 3,
        retryAfter: 5
      }
    });
  }

  // Find the user's GitHub OAuth token from their account
  const account = await prisma.account.findFirst({
    where: {
      userId: userId,
      provider: 'github'
    },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
      token_type: true,
      scope: true
    }
  });

  // Check if token needs refreshing
  let token = account?.access_token || process.env.GITHUB_TOKEN;
  
  // If we have a refresh token and the token is expired, try to refresh it
  if (account?.refresh_token && account?.expires_at) {
    const expiresAt = account.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    
    if (now >= expiresAt) {
      try {
        // Token is expired, try to refresh
        console.log(`GitHub token expired for user ${userId}, attempting to refresh`);
        
        // Implement token refresh logic here if GitHub OAuth supports it
        // This would typically be a call to the OAuth provider's token endpoint
        
        // For now, we'll just use the existing token and fallback
      } catch (refreshError) {
        console.error(`Error refreshing GitHub token for user ${userId}:`, refreshError);
        // Continue with the existing token
      }
    }
  }

  // Check if we have all the required scopes
  if (account?.scope) {
    const scopes = account.scope.split(' ');
    const missingScopes = requiredGitHubScopes.filter(scope => !scopes.includes(scope));
    
    if (missingScopes.length > 0) {
      console.warn(`User ${userId} is missing GitHub scopes: ${missingScopes.join(', ')}`);
      // We'll proceed with the token anyway, but data collection might be limited
    }
  }
  
  return new Octokit({
    auth: token,
    request: {
      retries: 3,
      retryAfter: 5
    }
  });
}

// Function to test a specific Octokit instance's permissions
export async function testGitHubToken(octokit: Octokit) {
  try {
    // Test basic authentication
    const { data: user } = await octokit.users.getAuthenticated();
    
    console.log(`GitHub token valid for user: ${user.login}`);
    
    // Test repo access - including private repos
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 5,
      sort: "updated",
      headers
    });
    
    // Check if any private repos are accessible
    const hasPrivate = repos.some(repo => repo.private);
    
    // Check if any org repos are accessible
    const orgs = new Set(repos.filter(repo => repo.owner.type === "Organization").map(repo => repo.owner.login));
    
    return {
      valid: true,
      user: {
        login: user.login,
        id: user.id
      },
      repoAccess: {
        total: repos.length,
        private: hasPrivate,
        organizations: Array.from(orgs)
      }
    };
  } catch (error: unknown) {
    console.error("GitHub token validation error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export interface GitHubUserData {
  commits: number;
  pullRequests: number;
  mergedPullRequests: number;
  openPullRequests: number;
  stars: number;
  repos: number;
  streak: number;
  totalLinesChanged: number;
  lastActivity?: Date;
  timeRange?: string;
  contributions?: number;
  reviews?: number;
  privateRepos?: number;
  publicRepos?: number;
  currentStreak?: number;
  longestStreak?: number;
  activeDays?: number;
  totalRepositoriesImpacted?: number;
}

export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

/**
 * Get date range based on the specified time range
 */
function getDateRangeFromTimeRange(timeRange: TimeRange): { startDate: Date, endDate: Date } {
  const endDate = new Date();
  let startDate = new Date();
  
  switch (timeRange) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
    default:
      // Set to a date far in the past for "all time"
      startDate = new Date(0);
  }
  
  return { startDate, endDate };
}

/**
 * Format a date for GitHub API queries
 */
function formatDateForGitHub(date: Date): string {
  return date.toISOString().split('T')[0];
}

// At the top of the file, add these TypeScript type definitions
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    type: string;
  };
  stargazers_count: number;
  html_url: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
  html_url: string;
}

// Add these helper functions near the beginning of the file
/**
 * Helper function to wait for a specified number of milliseconds
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper function to handle rate limit errors with exponential backoff
 */
async function withRateLimit<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let retries = 0;
  let delayMs = initialDelayMs;
  const maxWaitTime = 60000; // Maximum wait time of 1 minute
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = 
        error.status === 403 && 
        (error.message?.includes('rate limit') || error.message?.includes('API rate'));
      
      // If it's not a rate limit error or we've exceeded max retries, throw
      if (!isRateLimit || retries >= maxRetries || delayMs > maxWaitTime) {
        throw error;
      }
      
      // Log and wait with exponential backoff
      console.warn(`Rate limit hit, waiting ${delayMs}ms before retry ${retries + 1}/${maxRetries}`);
      await delay(delayMs);
      
      // Increase delay for next retry (exponential backoff)
      delayMs *= 2;
      retries++;
    }
  }
}

/**
 * Helper function for parallel processing of async tasks with enhanced concurrency control
 */
async function processInParallelWithProgress<T, R>(
  items: T[],
  processItem: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    batchSize?: number;
    updateProgress?: (completed: number, total: number, currentItem?: string) => void;
    retryDelayMs?: number;
    maxRetries?: number;
  } = {}
): Promise<R[]> {
  const {
    concurrency = 10,
    batchSize = 20,
    updateProgress,
    retryDelayMs = 1000,
    maxRetries = 3
  } = options;
  
  const results: R[] = [];
  let completedCount = 0;
  const total = items.length;
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < total; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults: R[] = [];
    
    // Process each batch with controlled concurrency
    const processBatch = async () => {
      const queue = [...batch];
      const inProgress = new Set();
      
      // Function to process next item in queue
      const processNext = async () => {
        if (queue.length === 0) return;
        
        const item = queue.shift()!;
        const index = items.indexOf(item);
        inProgress.add(index);
        
        try {
          // Try to process with retries
          let result: R | null = null;
          let retries = 0;
          
          while (retries <= maxRetries) {
            try {
              result = await processItem(item, index);
              break; // Success, exit retry loop
            } catch (error: any) {
              retries++;
              
              // If rate limited, wait longer
              const isRateLimit = error.status === 403 && 
                (error.message?.includes('rate limit') || error.message?.includes('API rate'));
              
              if (isRateLimit && retries <= maxRetries) {
                console.warn(`Rate limit hit, waiting ${retryDelayMs * retries}ms before retry ${retries}/${maxRetries}`);
                await delay(retryDelayMs * retries); // Exponential backoff
              } else if (retries <= maxRetries) {
                // For other errors, try again with standard delay
                console.error(`Error processing item (attempt ${retries}):`, error);
                await delay(retryDelayMs);
              } else {
                // Max retries reached, give up
                console.error(`Failed after ${maxRetries} retries:`, error);
                result = null as unknown as R;
              }
            }
          }
          
          completedCount++;
          if (result !== null) {
            batchResults.push(result);
          }
          
          // Update progress if callback provided
          if (updateProgress) {
            const itemName = typeof item === 'object' && item !== null && 'name' in item 
              ? String(item.name) 
              : `Item ${index}`;
            updateProgress(completedCount, total, itemName);
          }
        } finally {
          inProgress.delete(index);
        }
      };
      
      // Start initial batch of concurrent tasks
      const promisePool: Promise<void>[] = [];
      for (let j = 0; j < Math.min(concurrency, batch.length); j++) {
        promisePool.push(processNext());
      }
      
      // As tasks complete, start new ones to maintain concurrency
      while (promisePool.length > 0) {
        await Promise.race(promisePool);
        
        // Remove fulfilled promises - simplified approach to avoid potential infinite loops
        const activePromises: Promise<void>[] = [];
        for (let i = 0; i < promisePool.length; i++) {
          const promise = promisePool[i];
          // Create a race to see if this promise is pending
          const isResolved = await Promise.race([
            promise.then(() => true).catch(() => true),
            new Promise(r => setTimeout(() => r(false), 10))
          ]);
          
          // If not resolved yet, keep it in the active pool
          if (isResolved === false) {
            activePromises.push(promise);
          }
        }
        
        // Replace the pool with active promises
        promisePool.length = 0;
        promisePool.push(...activePromises);
        
        // Fill the pool back up with new tasks
        while (promisePool.length < concurrency && queue.length > 0) {
          promisePool.push(processNext());
        }
        
        // Safety check - if no more items in queue and all promises are stuck, break out
        if (queue.length === 0 && promisePool.length > 0 && promisePool.length === activePromises.length) {
          // Wait a bit and check one more time
          await delay(1000);
          if (activePromises.length === promisePool.length) {
            console.warn(`Breaking out of potentially stalled promise pool with ${promisePool.length} items still pending`);
            break;
          }
        }
      }
    };
    
    // Process this batch
    await processBatch();
    results.push(...batchResults);
    
    // Add a short delay between batches to avoid overwhelming the API
    if (i + batchSize < total) {
      await delay(500);
    }
  }
  
  return results.filter(result => result !== null);
}

// Add this function to search for specific organizations
async function getKnownOrganizations(): Promise<string[]> {
  // Add any known organizations the user might contribute to
  return [
    'incubit-nl',
    'laava-ai',
    'pingping-io',
    'thenewdivision',
    'huffle-io',
    'avocados-studio',
    'boonfactory',
    'ihn-solutions',
    // Add any additional organizations here
  ];
}

/**
 * Helper function to fetch all repositories for an organization with proper pagination
 */
async function fetchAllOrgRepositories(
  octokit: Octokit,
  orgName: string,
  maxPages: number = 10 // Increased from 3 to 10 for better coverage
): Promise<any[]> {
  let allRepos: any[] = [];
  let page = 1;
  let hasMorePages = true;
  
  try {
    // Paginate through all repositories with proper error handling
    while (hasMorePages && page <= maxPages) {
      try {
        const { data: reposPage } = await withRateLimit(() => 
          octokit.repos.listForOrg({
            org: orgName,
        per_page: 100,
            page: page,
        sort: "updated",
        headers
          })
        );
        
        // No more results
        if (reposPage.length === 0) {
          hasMorePages = false;
          break;
        }
        
        allRepos = [...allRepos, ...reposPage];
        
        // Check if we need to fetch more pages
        if (reposPage.length < 100) {
          hasMorePages = false;
        } else {
          page++;
        }
      } catch (pageError: any) {
        // If we hit rate limits, properly handle with withRateLimit
        if (pageError.status === 403 && pageError.message?.includes('rate limit')) {
          console.warn(`Rate limit hit when fetching org repos for ${orgName}, page ${page}`);
          // The withRateLimit function will handle retries
          throw pageError;
        }
        
        // For other errors like 404 (org not found) or permissions issues, stop pagination
        console.error(`Error fetching repos for org ${orgName}, page ${page}:`, pageError);
        hasMorePages = false;
      }
    }
    
    console.log(`Found ${allRepos.length} total repositories for organization ${orgName}`);
    return allRepos;
  } catch (error) {
    console.error(`Failed to fetch repositories for organization ${orgName}:`, error);
    return [];
  }
}

/**
 * Helper function to fetch all organizations a user belongs to
 * Uses multiple methods to ensure we get all orgs
 */
async function getAllUserOrganizations(
  octokit: Octokit, 
  githubUsername: string
): Promise<string[]> {
  const orgs = new Set<string>();
  
  try {
    // First try authenticated user's organizations (gives private orgs too)
    try {
      const { data: authOrgs } = await withRateLimit(() => 
        octokit.orgs.listForAuthenticatedUser({
            per_page: 100,
            headers
        })
      );
      
      for (const org of authOrgs) {
        orgs.add(org.login);
      }
      
      console.log(`Found ${authOrgs.length} authenticated organizations for user`);
    } catch (error) {
      console.error("Error fetching authenticated organizations:", error);
    }
    
    // Then try public organizations the user belongs to
    try {
      const { data: publicOrgs } = await withRateLimit(() => 
        octokit.orgs.listForUser({
          username: githubUsername,
                per_page: 100,
                headers
        })
      );
      
      for (const org of publicOrgs) {
        orgs.add(org.login);
      }
      
      console.log(`Found ${publicOrgs.length} public organizations for user ${githubUsername}`);
    } catch (error) {
      console.error(`Error fetching public organizations for ${githubUsername}:`, error);
    }
    
    // Try to get organizations through memberships API (requires different scopes)
    try {
      const { data: memberships } = await withRateLimit(() => 
        octokit.orgs.listMembershipsForAuthenticatedUser({
          state: 'active',
          per_page: 100,
          headers
        })
      );
      
      for (const membership of memberships) {
        if (membership.organization && membership.organization.login) {
          orgs.add(membership.organization.login);
        }
      }
      
      console.log(`Found ${memberships.length} organization memberships for user`);
    } catch (error) {
      console.error("Error fetching organization memberships:", error);
    }
    
    // Try to get membership status in specific popular organizations
    const potentialOrgs = [
      ...await getKnownOrganizations(),
      // Add any organization-specific logic here if needed
    ];
    
    // Check membership for each potential org
    for (const orgName of potentialOrgs) {
      if (orgs.has(orgName)) continue; // Skip if we already found it
      
      try {
        await withRateLimit(() => 
          octokit.orgs.checkMembershipForUser({
            org: orgName,
        username: githubUsername,
        headers
          })
        );
        
        // If no error is thrown, the user is a member
        orgs.add(orgName);
        console.log(`User is a member of ${orgName}`);
      } catch (error) {
        // 404 means not a member, other errors could be permission issues
        if ((error as any).status !== 404) {
          console.error(`Error checking membership in ${orgName}:`, error);
        }
      }
    }
    
    return Array.from(orgs);
  } catch (error) {
    console.error("Error getting user organizations:", error);
    return [];
  }
}

// Process repositories with more efficient concurrency control
async function processRepositoriesInParallel(
  octokit: Octokit,
  repos: any[],
  githubUsername: string,
  timeRange: TimeRange,
  startDate: Date,
  endDate: Date,
  updateProgress?: (stage: string, completed: number, total: number, details?: string, orgName?: string) => void
): Promise<{
  totalCommits: number;
  totalLinesChanged: number;
  totalPRs: number;
  openPRs: number;
  mergedPRs: number;
  reviews: number;
  contributions: number;
}> {
  // First prioritize repos with most recent activity
  repos.sort((a, b) => {
    const dateA = new Date(a.updated_at || "2000-01-01");
    const dateB = new Date(b.updated_at || "2000-01-01");
    return dateB.getTime() - dateA.getTime();
  });
  
  // Define dateQuery based on timeRange
  const dateQuery = timeRange !== 'all' 
    ? ` author-date:${formatDateForGitHub(startDate)}..${formatDateForGitHub(endDate)}`
    : '';
  
  // Take the most recent 75 repos to analyze
  const reposToProcess = repos.slice(0, 75);
  let processedCount = 0;
  
  if (updateProgress) {
    updateProgress('processing-repos', 0, reposToProcess.length, `Preparing to process ${reposToProcess.length} repositories`);
  }
  
  // Process in smaller batches to avoid rate limits
  const batchSize = 5;
    let totalCommits = 0;
    let totalLinesChanged = 0;
  let totalPRs = 0;
  let openPRs = 0;
  let mergedPRs = 0;
  let reviews = 0;
    let contributions = 0;

  // Process in batches with delays between batches
  for (let i = 0; i < reposToProcess.length; i += batchSize) {
    const batch = reposToProcess.slice(i, i + batchSize);
    
    // Process this batch in parallel
    const results = await Promise.all(batch.map(async (repo) => {
      try {
        // Get commits
        const commitData = await getRepositoryCommits(octokit, repo, githubUsername, timeRange, startDate, endDate);
        
        // Get PRs and reviews
        const prData = await getRepositoryPRs(octokit, repo, githubUsername, timeRange, startDate, endDate);
        
        return {
          repo: repo.full_name,
          commits: commitData.commits,
          linesChanged: commitData.linesChanged,
          prs: prData.prs,
          openPRs: prData.openPRs,
          mergedPRs: prData.mergedPRs,
          reviews: prData.reviews
        };
      } catch (error) {
        console.error(`Error processing repo ${repo.full_name}:`, error);
        return {
          repo: repo.full_name,
          commits: 0,
          linesChanged: 0,
          prs: 0,
          openPRs: 0,
          mergedPRs: 0,
          reviews: 0
        };
      }
    }));
    
    // Update counters
    for (const result of results) {
      totalCommits += result.commits;
      totalLinesChanged += result.linesChanged;
      totalPRs += result.prs;
      openPRs += result.openPRs;
      mergedPRs += result.mergedPRs;
      reviews += result.reviews;
      contributions += result.commits + result.prs + result.reviews;
    }
    
    // Update progress
    processedCount += batch.length;
    if (updateProgress) {
      updateProgress(
        'processing-repos', 
        processedCount, 
        reposToProcess.length, 
        `Processed ${processedCount} of ${reposToProcess.length} repositories`
      );
    }
    
    // Add a delay between batches to avoid rate limits
    if (i + batchSize < reposToProcess.length) {
      await delay(1000);
    }
  }
  
  return {
    totalCommits,
    totalLinesChanged,
    totalPRs,
    openPRs,
    mergedPRs,
    reviews,
    contributions
  };
}

// Helper function to get repository commits
async function getRepositoryCommits(
  octokit: Octokit,
  repo: any,
  githubUsername: string,
  timeRange: TimeRange,
  startDate: Date,
  endDate: Date
): Promise<{ commits: number; linesChanged: number }> {
      try {
        console.log(`Processing repo: ${repo.full_name}, Private: ${repo.private}`);
        
        // Define dateQuery for search queries if needed
        const dateQuery = timeRange !== 'all' 
          ? ` author-date:${formatDateForGitHub(startDate)}..${formatDateForGitHub(endDate)}`
          : '';
          
        // Apply time range to commit query if specified
        const commitQueryParams: any = {
          owner: repo.owner.login,
          repo: repo.name,
          author: githubUsername,
          per_page: 100,
          headers
        };
        
        if (timeRange !== 'all') {
          commitQueryParams.since = startDate.toISOString();
          commitQueryParams.until = endDate.toISOString();
        }
        
    // Get commits with pagination
    let allCommits: any[] = [];
    let page = 1;
    let hasMoreCommitPages = true;
    
    // Only fetch up to 3 pages of commits per repo (300 commits)
    while (hasMoreCommitPages && page <= 3) {
      try {
        commitQueryParams.page = page;
        const { data: commitPage } = await withRateLimit(() => 
          octokit.repos.listCommits(commitQueryParams)
        );
        
        allCommits = [...allCommits, ...commitPage];
        
        // Check if we need to fetch more pages
        if (commitPage.length < 100) {
          hasMoreCommitPages = false;
        } else {
          page++;
        }
      } catch (pageError) {
        console.error(`Error fetching commit page ${page} for ${repo.name}:`, pageError);
        hasMoreCommitPages = false;
      }
    }
    
    console.log(`Found ${allCommits.length} commits in ${repo.name}`);
    
    // Sample lines changed from a subset of commits
    const commitSampleSize = Math.min(5, allCommits.length);
    const commitSample = allCommits.slice(0, commitSampleSize);
    
    let repoLinesChanged = 0;
    
    // Get line changes for sample commits
    if (commitSample.length > 0) {
      const commitDataPromises = commitSample.map(commit =>
        withRateLimit(() => 
          octokit.repos.getCommit({
              owner: repo.owner.login,
              repo: repo.name,
              ref: commit.sha,
              headers
          })
        ).catch(error => {
          console.error(`Error fetching commit details for ${commit.sha}:`, error);
          return null;
        })
      );
      
      const commitDataResults = await Promise.all(commitDataPromises);
      
      for (const result of commitDataResults) {
        if (result && result.data && result.data.stats) {
          const changes = (result.data.stats.additions || 0) + (result.data.stats.deletions || 0);
          repoLinesChanged += changes;
        }
      }
      
      // Scale up to estimate full count
      const scaleFactor = allCommits.length / Math.max(1, commitSampleSize);
      const estimatedLinesChanged = Math.round(repoLinesChanged * scaleFactor);
      console.log(`Estimated lines changed for ${repo.name}: ${estimatedLinesChanged} (based on sample of ${commitSampleSize} commits)`);
      
      return {
        commits: allCommits.length,
        linesChanged: estimatedLinesChanged
      };
    }
    
    return {
      commits: allCommits.length,
      linesChanged: 0
    };
      } catch (error) {
    console.error(`Error processing commits for ${repo.full_name}:`, error);
    return {
      commits: 0,
      linesChanged: 0
    };
  }
}

// Helper function to get repository PRs and reviews
async function getRepositoryPRs(
  octokit: Octokit,
  repo: any,
  githubUsername: string,
  timeRange: TimeRange,
  startDate: Date,
  endDate: Date
): Promise<{ prs: number; openPRs: number; mergedPRs: number; reviews: number }> {
      try {
        // Get PRs created by user
    let allPRs: any[] = [];
    let prPage = 1;
    let hasMorePRPages = true;
    
    // Paginate to get PRs, limited to 2 pages per repo
    while (hasMorePRPages && prPage <= 2) {
        const prQueryParams: any = {
          owner: repo.owner.login,
          repo: repo.name,
          state: "all",
          per_page: 100,
        page: prPage,
          headers
        };
        
      try {
        const { data: pullRequestsPage } = await withRateLimit(() => 
          octokit.pulls.list(prQueryParams)
        );
        
        allPRs = [...allPRs, ...pullRequestsPage];
        
        // Check if we need to fetch more pages
        if (pullRequestsPage.length < 100) {
          hasMorePRPages = false;
        } else {
          prPage++;
        }
      } catch (prPageError) {
        console.error(`Error fetching PR page ${prPage} for ${repo.name}:`, prPageError);
        hasMorePRPages = false;
      }
    }
    
    const filteredPRs = allPRs.filter(pr => {
          if (!pr.user || pr.user.login.toLowerCase() !== githubUsername.toLowerCase()) {
            return false;
          }
          
          if (timeRange !== 'all') {
            const prDate = new Date(pr.created_at);
            return prDate >= startDate && prDate <= endDate;
          }
          
          return true;
        });
        
    console.log(`Found ${filteredPRs.length} PRs by user in ${repo.name}`);
    
    // Get PR reviews
    let userReviewCount = 0;
    
    // Get a sample of PRs to check for reviews
    try {
      const { data: repoPRs } = await withRateLimit(() => 
        octokit.pulls.list({
            owner: repo.owner.login,
            repo: repo.name,
            state: "all",
          per_page: 20,
            headers
        })
      );
          
          // Check for reviews on each PR
      const reviewPromises = repoPRs.map(pr => 
        withRateLimit(() => 
          octokit.pulls.listReviews({
                owner: repo.owner.login,
                repo: repo.name,
                pull_number: pr.number,
                headers
          })
        ).then(response => {
          const userReviews = response.data.filter(review => 
                review.user && review.user.login.toLowerCase() === githubUsername.toLowerCase()
              );
              
          // Filter reviews by time range if needed
          return userReviews.filter(review => {
            if (timeRange !== 'all' && review.submitted_at) {
              const reviewDate = new Date(review.submitted_at);
              return reviewDate >= startDate && reviewDate <= endDate;
            }
            return true;
          });
        }).catch(error => {
          console.log(`Error fetching reviews for PR #${pr.number} in ${repo.name}`);
          return [];
        })
      );
      
      const allReviews = await Promise.all(reviewPromises);
      userReviewCount = allReviews.reduce((acc, reviews) => acc + reviews.length, 0);
          
          console.log(`Found ${userReviewCount} reviews by user in ${repo.name}`);
        } catch (error) {
          console.error(`Error fetching PR reviews for ${repo.name}:`, error);
        }
    
    return {
      prs: filteredPRs.length,
      openPRs: filteredPRs.filter(pr => pr.state === "open").length,
      mergedPRs: filteredPRs.filter(pr => pr.merged_at !== null).length,
      reviews: userReviewCount
    };
      } catch (error) {
    console.error(`Error processing PRs for ${repo.name}:`, error);
    return {
      prs: 0,
      openPRs: 0,
      mergedPRs: 0,
      reviews: 0
    };
  }
}

/**
 * Helper function to discover all repositories the user has contributed to
 */
async function discoverUserRepositories(
  octokit: Octokit,
  githubUsername: string,
  organizationNames: string[] = []
): Promise<any[]> {
  const allRepos = new Map<string, any>();
  
  console.log(`Starting repository discovery for user ${githubUsername}`);
  
  try {
    // First get authenticated user's repositories
    try {
      const { data: authRepos } = await withRateLimit(() => 
        octokit.repos.listForAuthenticatedUser({
          per_page: 100, 
          sort: "updated",
          headers
        })
      );
      
      // Add repos to map, using full_name as key to avoid duplicates
      authRepos.forEach(repo => {
        allRepos.set(repo.full_name, repo);
      });
      
      console.log(`Found ${authRepos.length} repositories for authenticated user`);
    } catch (error) {
      console.error("Error fetching authenticated repositories:", error);
    }

    // Get repositories where user is listed as contributor
    try {
      const { data: userRepos } = await withRateLimit(() => 
        octokit.repos.listForUser({
          username: githubUsername,
          type: "all",
          sort: "updated",
          per_page: 100,
          headers
        })
      );
      
      userRepos.forEach(repo => {
        allRepos.set(repo.full_name, repo);
      });
      
      console.log(`Found ${userRepos.length} repositories for user ${githubUsername}`);
      } catch (error) {
      console.error(`Error fetching user repositories for ${githubUsername}:`, error);
    }
    
    // Get repos from organizations
    for (const orgName of organizationNames) {
      try {
        // Get all repos for this organization
        const orgRepos = await fetchAllOrgRepositories(octokit, orgName);
        
        orgRepos.forEach(repo => {
          allRepos.set(repo.full_name, repo);
        });
        
        console.log(`Added ${orgRepos.length} repositories from organization ${orgName}`);
      } catch (error) {
        console.error(`Error fetching repos for organization ${orgName}:`, error);
      }
    }
    
    // Find repositories via search API using multiple search strategies
    try {
      // Search strategies to find all possible repositories
      const searchStrategies = [
        `user:${githubUsername}`, // User's own repos
        `org:${organizationNames.join(' org:')}`, // All org repos
        `involves:${githubUsername}`, // PRs, issues, comments
        `author:${githubUsername}`, // Commits
        `committer:${githubUsername}` // Commits
      ];
      
      for (const query of searchStrategies) {
        if (!query || query.endsWith(':')) continue; // Skip empty queries
        
        try {
          const { data: searchResults } = await withRateLimit(() => 
            octokit.search.repos({
              q: query,
              sort: "updated",
              per_page: 100,
              headers
            })
          );
          
          if (searchResults.items) {
            searchResults.items.forEach(repo => {
              allRepos.set(repo.full_name, repo);
            });
            
            console.log(`Found ${searchResults.items.length} repositories with query "${query}"`);
          }
        } catch (searchError) {
          console.error(`Error searching repos with query "${query}":`, searchError);
        }
      }
    } catch (error) {
      console.error("Error during repository search:", error);
    }
    
    // Use GraphQL API to get repositories user has contributed to
    try {
      // This requires the 'repo' scope to access private repos
      const query = `
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              commitContributionsByRepository(maxRepositories: 100) {
                repository {
                  nameWithOwner
                  name
                  owner {
                    login
                    __typename
                  }
                  isPrivate
                  url
                }
              }
              pullRequestContributionsByRepository(maxRepositories: 100) {
                repository {
                  nameWithOwner
                  name
                  owner {
                    login
                    __typename
                  }
                  isPrivate
                  url
                }
              }
              issueContributionsByRepository(maxRepositories: 100) {
                repository {
                  nameWithOwner
                  name
                  owner {
                    login
                    __typename
                  }
                  isPrivate
                  url
                }
              }
            }
          }
        }
      `;
      
      // Add timeout to prevent hanging on GraphQL queries
      const graphqlPromise = octokit.graphql(query, { username: githubUsername });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("GraphQL query timeout")), 30000); // 30 second timeout
      });
      
      // Use race to implement timeout
      const result: any = await Promise.race([graphqlPromise, timeoutPromise]);
      
      if (result && result.user && result.user.contributionsCollection) {
        const { commitContributionsByRepository, pullRequestContributionsByRepository, issueContributionsByRepository } = 
          result.user.contributionsCollection;
          
        // Process commit contributions
        if (commitContributionsByRepository) {
          for (const { repository } of commitContributionsByRepository) {
            // Convert GraphQL result to REST API format
            if (repository && repository.nameWithOwner) {
              if (!allRepos.has(repository.nameWithOwner)) {
                // Fetch full repo info
                try {
                  const [owner, name] = repository.nameWithOwner.split('/');
                  const { data: repoData } = await withRateLimit(() => 
                    octokit.repos.get({
                      owner,
                      repo: name,
                      headers
                    })
                  );
                  
                  allRepos.set(repository.nameWithOwner, repoData);
                } catch (repoError) {
                  // Just store the basic info we have
                  allRepos.set(repository.nameWithOwner, {
                    name: repository.name,
                    full_name: repository.nameWithOwner,
                    owner: {
                      login: repository.owner.login,
                      type: repository.owner.__typename
                    },
                    private: repository.isPrivate,
                    html_url: repository.url
                  });
                }
              }
            }
          }
        }
        
        // Process PR contributions
        if (pullRequestContributionsByRepository) {
          for (const { repository } of pullRequestContributionsByRepository) {
            if (repository && repository.nameWithOwner && !allRepos.has(repository.nameWithOwner)) {
              // Convert GraphQL to REST format
              try {
                const [owner, name] = repository.nameWithOwner.split('/');
                const { data: repoData } = await withRateLimit(() => 
                  octokit.repos.get({
                    owner,
                    repo: name,
                    headers
                  })
                );
                
                allRepos.set(repository.nameWithOwner, repoData);
              } catch (repoError) {
                // Store basic info
                allRepos.set(repository.nameWithOwner, {
                  name: repository.name,
                  full_name: repository.nameWithOwner,
                  owner: {
                    login: repository.owner.login,
                    type: repository.owner.__typename
                  },
                  private: repository.isPrivate,
                  html_url: repository.url
                });
              }
            }
          }
        }
        
        // Process issue contributions
        if (issueContributionsByRepository) {
          for (const { repository } of issueContributionsByRepository) {
            if (repository && repository.nameWithOwner && !allRepos.has(repository.nameWithOwner)) {
              // Convert GraphQL to REST format
              try {
                const [owner, name] = repository.nameWithOwner.split('/');
                const { data: repoData } = await withRateLimit(() => 
                  octokit.repos.get({
                    owner,
                    repo: name,
                    headers
                  })
                );
                
                allRepos.set(repository.nameWithOwner, repoData);
              } catch (repoError) {
                // Store basic info
                allRepos.set(repository.nameWithOwner, {
                  name: repository.name,
                  full_name: repository.nameWithOwner,
                  owner: {
                    login: repository.owner.login,
                    type: repository.owner.__typename
                  },
                  private: repository.isPrivate,
                  html_url: repository.url
                });
              }
            }
          }
        }
        
        console.log(`Found additional ${allRepos.size} repositories via GraphQL contributions query`);
      }
    } catch (graphqlError) {
      console.error("Error fetching repository contributions via GraphQL:", graphqlError);
    }
    
    // Return all discovered repositories as array
    return Array.from(allRepos.values());
  } catch (error) {
    console.error("Error discovering repositories:", error);
    return [];
  }
}

/**
 * Calculate coding streak based on daily contributions
 * Returns both current streak and longest streak
 */
interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  activeDays: Map<string, number>; // Key: ISO date string, Value: contribution count
}

async function calculateCodingStreak(
  octokit: Octokit,
  githubUsername: string,
  startDate?: Date // Optional: if we want to limit the calculation range
): Promise<StreakData> {
  const activeDays = new Map<string, number>();
    const now = new Date();
  let startDateToUse = startDate;
  
  if (!startDateToUse) {
    // Default to looking back 365 days if no start date specified
    startDateToUse = new Date();
    startDateToUse.setDate(startDateToUse.getDate() - 365);
  }
  
  // Format dates for GitHub API
  const since = startDateToUse.toISOString();
  
  try {
    // Use GraphQL to get contribution data - more efficient than multiple REST calls
    const query = `
      query($username: String!, $from: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }
    `;
    
    const variables = {
      username: githubUsername,
      from: since
    };
    
    // Execute the GraphQL query
    const result: any = await octokit.graphql(query, variables);
    
    if (result?.user?.contributionsCollection?.contributionCalendar?.weeks) {
      // Process the contribution calendar
      const weeks = result.user.contributionsCollection.contributionCalendar.weeks;
      
      for (const week of weeks) {
        for (const day of week.contributionDays) {
          if (day.contributionCount > 0) {
            activeDays.set(day.date, day.contributionCount);
          }
        }
      }
    }
    
    // Calculate current streak
    let currentStreak = 0;
    let lastActiveDate: Date | null = null;
    
    // Start from today and go backward
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 366; i++) { // Check up to a year back
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      const dateString = checkDate.toISOString().split('T')[0];
      
      if (activeDays.has(dateString)) {
        if (i === 0 || currentStreak > 0) {
          currentStreak++;
          if (!lastActiveDate) {
            lastActiveDate = new Date(checkDate);
          }
        }
      } else {
        // Break on first day with no activity (for current streak)
        if (i === 0 || currentStreak > 0) {
          break;
        }
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let currentLongestCount = 0;
    
    // Sort dates and iterate in order
    const sortedDates = Array.from(activeDays.keys()).sort();
    
    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      
      if (i > 0) {
        const prevDate = new Date(sortedDates[i-1]);
        // Check if dates are consecutive
        const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          // Consecutive day, increment streak
          currentLongestCount++;
        } else {
          // Gap found, reset counter
          currentLongestCount = 1;
        }
      } else {
        // First day with activity
        currentLongestCount = 1;
      }
      
      // Update longest streak if current is longer
      if (currentLongestCount > longestStreak) {
        longestStreak = currentLongestCount;
      }
    }
    
    return {
      currentStreak,
      longestStreak,
      lastActiveDate,
      activeDays
    };
  } catch (error) {
    console.error("Error calculating coding streak:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      activeDays: new Map()
    };
  }
}

/**
 * Calculate total code impact (added/changed lines) with more accuracy
 */
async function calculateCodeImpact(
  octokit: Octokit,
  githubUsername: string,
  repositories: any[]
): Promise<{ totalLinesChanged: number; totalRepositories: number; detailedImpact: Map<string, number> }> {
  const detailedImpact = new Map<string, number>();
  let totalLinesChanged = 0;
  
  try {
    // Calculate impact across all repos
    console.log(`Calculating code impact across ${repositories.length} repositories`);
    
    // Use a smarter sampling approach for large repository lists
    const sortedRepos = [...repositories].sort((a, b) => {
      // Prioritize repos with recent activity
      const dateA = new Date(a.updated_at || a.pushed_at || "2000-01-01");
      const dateB = new Date(b.updated_at || b.pushed_at || "2000-01-01");
      return dateB.getTime() - dateA.getTime();
    });
    
    // Process repositories in batches to avoid rate limits
    const batchSize = 10; // Process 10 repos at a time
    const totalReposToProcess = Math.min(100, sortedRepos.length); // Cap at 100 repos for performance
    
    for (let i = 0; i < totalReposToProcess; i += batchSize) {
      const batch = sortedRepos.slice(i, Math.min(i + batchSize, totalReposToProcess));
      
      // Process this batch in parallel with rate limiting
      await Promise.all(batch.map(async (repo) => {
        try {
          // Get all commits by user for this repo
          const repoName = repo.name;
          const repoOwner = repo.owner.login;
          
          let allCommits: any[] = [];
          let page = 1;
          let hasMorePages = true;
          
          while (hasMorePages && page <= 5) { // Limit to 5 pages (500 commits)
            try {
              const { data: commits } = await withRateLimit(() => 
                octokit.repos.listCommits({
                  owner: repoOwner,
                  repo: repoName,
                  author: githubUsername,
            per_page: 100,
                  page: page,
                  headers
                })
              );
              
              if (commits.length > 0) {
                allCommits = [...allCommits, ...commits];
              }
              
              hasMorePages = commits.length === 100;
              page++;
            } catch (error) {
              console.error(`Error fetching commits for ${repoOwner}/${repoName} page ${page}:`, error);
              hasMorePages = false;
            }
          }
          
          // For each repo, get detailed stats for a sample of commits
          let commitSampleSize = 0;
          if (allCommits.length <= 10) {
            // For repos with few commits, analyze all commits
            commitSampleSize = allCommits.length;
          } else if (allCommits.length <= 100) {
            // For medium-sized repos, analyze 25% of commits
            commitSampleSize = Math.max(10, Math.floor(allCommits.length * 0.25));
          } else {
            // For large repos, analyze 10% with at least 15 commits
            commitSampleSize = Math.max(15, Math.floor(allCommits.length * 0.1));
          }
          
          // Distribute the sample throughout the commit history
          const sampledCommits = [];
          const commitCount = allCommits.length;
          
          if (commitCount > 0 && commitSampleSize > 0) {
            // Take samples distributed evenly through the commit history
            const step = commitCount / commitSampleSize;
            
            for (let j = 0; j < commitSampleSize; j++) {
              const index = Math.min(Math.floor(j * step), commitCount - 1);
              sampledCommits.push(allCommits[index]);
            }
          }
          
          // Get detailed stats for each sampled commit
          let repoLinesChanged = 0;
          let analyzedCommits = 0;
          
          for (const commit of sampledCommits) {
            try {
              const { data: commitData } = await withRateLimit(() => 
                octokit.repos.getCommit({
                  owner: repoOwner,
                  repo: repoName,
                  ref: commit.sha,
                  headers
                })
              );
              
              if (commitData.stats) {
                const changes = (commitData.stats.additions || 0) + (commitData.stats.deletions || 0);
                repoLinesChanged += changes;
                analyzedCommits++;
              }
            } catch (error) {
              console.error(`Error fetching stats for commit ${commit.sha}:`, error);
            }
          }
          
          // Extrapolate total impact if we sampled
          if (analyzedCommits > 0) {
            const averageChangesPerCommit = repoLinesChanged / analyzedCommits;
            const estimatedTotalChanges = Math.round(averageChangesPerCommit * allCommits.length);
            
            // Store detailed impact per repo
            detailedImpact.set(`${repoOwner}/${repoName}`, estimatedTotalChanges);
            
            // Add to total
            totalLinesChanged += estimatedTotalChanges;
            
            console.log(`Repo ${repoOwner}/${repoName}: ${allCommits.length} commits, ~${estimatedTotalChanges} lines changed`);
          }
        } catch (error) {
          console.error(`Error processing code impact for ${repo.full_name}:`, error);
        }
      }));
      
      // Brief pause between batches to avoid rate limits
      if (i + batchSize < totalReposToProcess) {
        await delay(1000);
      }
    }
    
    return {
      totalLinesChanged,
      totalRepositories: repositories.length,
      detailedImpact
    };
  } catch (error) {
    console.error("Error calculating code impact:", error);
    return {
      totalLinesChanged: 0,
      totalRepositories: repositories.length,
      detailedImpact
    };
  }
}

/**
 * Fetch GitHub stats for a user with time range filtering
 */
export async function getGitHubUserStats(
  githubUsername: string, 
  timeRange: TimeRange = 'all',
  userId?: string,
  updateProgress?: (stage: string, completed: number, total: number, details?: string, orgName?: string) => void
): Promise<GitHubUserData> {
  try {
    if (updateProgress) updateProgress('initializing', 0, 100, 'Setting up GitHub client and validating user credentials');
    
    const startTime = Date.now();
    console.log(`Starting GitHub data collection for ${githubUsername} at ${new Date().toISOString()}`);
    
    // Set a global timeout for the entire operation
    const maxExecutionTime = 180000; // 3 minutes max
    const timeoutPromise = new Promise<GitHubUserData>((_, reject) => {
      setTimeout(() => {
        console.error(`GitHub data collection for ${githubUsername} timed out after ${maxExecutionTime/1000}s`);
        reject(new Error(`GitHub data collection timed out after ${maxExecutionTime/1000}s`));
      }, maxExecutionTime);
    });
    
    // Create the actual data collection promise
    const dataCollectionPromise = (async () => {
      // Get Octokit instance with user's token if userId is provided
      const octokit = await getOctokit(userId);
      
      // Find user by GitHub username
      const user = await withRateLimit(() => 
        octokit.users.getByUsername({
          username: githubUsername,
          headers
        })
      );
      
      if (!user || !user.data) {
        throw new Error("GitHub user not found");
      }

      // Get date range based on time range
      const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
      
      if (updateProgress) updateProgress('discovering-repos', 0, 100, 'Finding all repositories you have access to');

      // Get all organizations the user belongs to
      const allOrgs = await getAllUserOrganizations(octokit, githubUsername);
      console.log(`Found ${allOrgs.length} total organizations for user ${githubUsername}`);
      
      if (updateProgress) updateProgress('discovering-repos', 20, 100, `Found ${allOrgs.length} organizations you belong to. Discovering repositories...`);

      // Use the enhanced repository discovery function to find all repositories the user has contributed to
      const repos = await discoverUserRepositories(octokit, githubUsername, allOrgs);
      
      if (updateProgress) updateProgress('discovering-repos', 70, 100, `Found ${repos.length} total repositories. Processing data...`);

      console.log(`Found ${repos.length} repositories for ${githubUsername}, including private: ${repos.some(r => r.private)}, org repos: ${repos.filter(r => r.owner.type === "Organization").length}`);

      // Count public vs private repos
      const publicRepos = repos.filter(repo => !repo.private).length;
      const privateRepos = repos.filter(repo => repo.private).length;

      // Calculate total commits (aggregated from all repos)
      let totalCommits = 0;
      let totalLinesChanged = 0;
      let contributions = 0;

      // Limiting to 100 most recently updated repos for performance
      // Sorting repos by last updated time
      repos.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.pushed_at || "2000-01-01");
        const dateB = new Date(b.updated_at || b.pushed_at || "2000-01-01");
        return dateB.getTime() - dateA.getTime();
      });
      
      // Take the top 100 repositories by recency
      const reposToProcess = repos.slice(0, 100);
      
      if (updateProgress) {
        updateProgress(
          'processing-repos', 
          0, 
          reposToProcess.length, 
          `Processing ${reposToProcess.length} repositories in parallel`,
          `Processing multiple repositories`
        );
      }

      // Track processed repositories for progress reporting
      let processedRepos = 0;
      const repoDataByFullName = new Map();
      
      // Process repositories in parallel with enhanced progress reporting
      const repoResults = await processInParallelWithProgress(
        reposToProcess,
        async (repo) => {
          try {
            const fullName = repo.full_name;
            console.log(`Processing repository: ${fullName}`);
            
            // Get commits for this repository
            let commits = [];
            let commitCount = 0;
            let linesChanged = 0;
            
            try {
              // Apply time range to commit query if specified
              const commitQueryParams: any = {
                owner: repo.owner.login,
                repo: repo.name,
                author: githubUsername,
                per_page: 100,
                headers
              };
              
              if (timeRange !== 'all') {
                commitQueryParams.since = startDate.toISOString();
                commitQueryParams.until = endDate.toISOString();
              }
              
              // Get first page of commits
              const response = await withRateLimit(() => 
                octokit.repos.listCommits(commitQueryParams)
              );
              
              commits = response.data;
              commitCount = commits.length;
              
              // If we have commits, sample a few to get line change stats
              if (commits.length > 0) {
                const sampleSize = Math.min(5, commits.length);
                const sampleCommits = commits.slice(0, sampleSize);
                
                // Get detailed stats for sampled commits
                for (const commit of sampleCommits) {
                  try {
                    const commitDetail = await withRateLimit(() => 
                      octokit.repos.getCommit({
                        owner: repo.owner.login,
                        repo: repo.name,
                        ref: commit.sha,
                        headers
                      })
                    );
                    
                    if (commitDetail.data.stats) {
                      linesChanged += (commitDetail.data.stats.additions || 0) + 
                                      (commitDetail.data.stats.deletions || 0);
                    }
          } catch (error) {
                    console.error(`Error getting commit details for ${commit.sha}:`, error);
                  }
                }
                
                // Extrapolate to estimate total lines changed
                if (sampleSize > 0) {
                  linesChanged = Math.round((linesChanged / sampleSize) * commitCount);
                }
              }
            } catch (error) {
              console.error(`Error fetching commits for ${fullName}:`, error);
            }
            
            // Get PRs and reviews
            let prs = [];
            let prCount = 0;
            let openPRs = 0;
            let mergedPRs = 0;
            let reviewCount = 0;
            
            try {
              // Get PRs created by user
              const prResponse = await withRateLimit(() => 
                octokit.pulls.list({
                  owner: repo.owner.login,
                  repo: repo.name,
                  state: "all",
                  per_page: 100,
                  headers
                })
              );
              
              prs = prResponse.data.filter(pr => 
                pr.user && pr.user.login.toLowerCase() === githubUsername.toLowerCase() &&
                (timeRange === 'all' || 
                  (new Date(pr.created_at) >= startDate && new Date(pr.created_at) <= endDate))
              );
              
              prCount = prs.length;
              openPRs = prs.filter(pr => pr.state === "open").length;
              mergedPRs = prs.filter(pr => pr.merged_at !== null).length;
              
              // Get a sample of all PRs to check reviews
              const allPRsResponse = await withRateLimit(() => 
                octokit.pulls.list({
                  owner: repo.owner.login,
                  repo: repo.name,
                  state: "all",
                  per_page: 20,
                  headers
                })
              );
              
              // Check for reviews by user
              for (const pr of allPRsResponse.data.slice(0, 5)) { // Limit to 5 PRs for performance
                try {
                  const reviewsResponse = await withRateLimit(() => 
                    octokit.pulls.listReviews({
                      owner: repo.owner.login,
                      repo: repo.name,
                      pull_number: pr.number,
                      headers
                    })
                  );
                  
                  const userReviews = reviewsResponse.data.filter(review => 
                    review.user && review.user.login.toLowerCase() === githubUsername.toLowerCase() &&
                    (timeRange === 'all' || 
                      (review.submitted_at && new Date(review.submitted_at) >= startDate && 
                       new Date(review.submitted_at) <= endDate))
                  );
                  
                  reviewCount += userReviews.length;
                } catch (error) {
                  console.error(`Error fetching reviews for PR #${pr.number}:`, error);
                }
              }
            } catch (error) {
              console.error(`Error fetching PRs for ${fullName}:`, error);
            }
            
            // Store data for this repo
            const repoData = {
              fullName,
              commitCount,
              linesChanged,
              prCount,
              openPRs,
              mergedPRs,
              reviewCount,
              isOrg: repo.owner.type === "Organization",
              orgName: repo.owner.type === "Organization" ? repo.owner.login : null
            };
            
            repoDataByFullName.set(fullName, repoData);
            
            processedRepos++;
            if (updateProgress) {
              updateProgress(
                'processing-repos', 
                processedRepos, 
                reposToProcess.length, 
                `Processed ${processedRepos}/${reposToProcess.length} repositories`,
                repo.owner.type === "Organization" ? repo.owner.login : undefined
              );
            }
            
            return repoData;
          } catch (error) {
            console.error(`Error processing repository ${repo.full_name}:`, error);
            processedRepos++;
            return null;
          }
        },
        {
          concurrency: 10, // Process 10 repos at a time
          batchSize: 20,   // Process in batches of 20
          updateProgress: (completed, total, repoName) => {
            if (updateProgress) {
              const percentage = Math.floor((completed / total) * 100);
              updateProgress(
                'processing-repos', 
                completed, 
                total, 
                `Processed ${completed}/${total} repositories${repoName ? ` - ${repoName}` : ''}`,
                repoName
              );
            }
          }
        }
      );

      // Calculate totals from processed repositories
      for (const repoData of repoResults) {
        if (repoData) {
          totalCommits += repoData.commitCount;
          totalLinesChanged += repoData.linesChanged;
          contributions += repoData.commitCount + repoData.prCount + repoData.reviewCount;
        }
      }

      // Calculate totals for PRs and reviews
      let totalPRs = 0;
      let openPRCount = 0;
      let mergedPRCount = 0;
      let reviewsCount = 0;
      
      repoResults.forEach(repo => {
        if (repo) {
          totalPRs += repo.prCount;
          openPRCount += repo.openPRs;
          mergedPRCount += repo.mergedPRs;
          reviewsCount += repo.reviewCount;
          contributions += repo.prCount + repo.reviewCount;
        }
      });

      // Calculate stars received (stars don't change based on time range)
      const totalStars = repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);

      if (updateProgress) updateProgress('calculating-streak', 0, 100, 'Analyzing your coding streak patterns');
      
      // Calculate coding streak data
      const streakData = await calculateCodingStreak(octokit, githubUsername);
      
      if (updateProgress) updateProgress('calculating-streak', 100, 100, 'Streak analysis complete');
      
      if (updateProgress) updateProgress('calculating-impact', 0, 100, 'Measuring your code impact across repositories');
      
      // Use our existing calculations instead of recalculating
      const impactData = {
        totalLinesChanged,
        totalRepositories: reposToProcess.length,
        detailedImpact: new Map()
      };
      
      if (updateProgress) updateProgress('calculating-impact', 100, 100, 'Code impact analysis complete');
      
      // Record end time and calculate duration
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`GitHub data collection for ${githubUsername} completed in ${duration}s`);
      
      // Integrate new data with existing stats
      if (updateProgress) updateProgress('finalizing', 100, 100, `Analysis complete! Processed ${reposToProcess.length} repositories in ${duration.toFixed(1)}s`);

      return {
        commits: totalCommits,
        pullRequests: totalPRs,
        mergedPullRequests: mergedPRCount,
        openPullRequests: openPRCount,
        stars: totalStars,
        repos: repos.length,
        streak: streakData.currentStreak, // Use current streak as the main streak value
        totalLinesChanged: impactData.totalLinesChanged,
        lastActivity: streakData.lastActiveDate || undefined, // Convert null to undefined to satisfy type
        timeRange,
        contributions,
        reviews: reviewsCount,
        privateRepos: privateRepos,
        publicRepos: publicRepos,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        activeDays: streakData.activeDays.size,
        totalRepositoriesImpacted: impactData.totalRepositories
      };
    })();
    
    // Race between the data collection and timeout
    return await Promise.race([dataCollectionPromise, timeoutPromise]);
  } catch (error) {
    console.error("Error fetching GitHub user stats:", error);
    // Return default values if error occurs
    return {
      commits: 0,
      pullRequests: 0,
      mergedPullRequests: 0,
      openPullRequests: 0,
      stars: 0,
      repos: 0,
      streak: 0,
      totalLinesChanged: 0,
      timeRange,
      contributions: 0,
      reviews: 0,
      privateRepos: 0,
      publicRepos: 0,
      currentStreak: 0,
      longestStreak: 0,
      activeDays: 0,
      totalRepositoriesImpacted: 0
    };
  }
}

/**
 * Get recent activity for the user with time range filtering
 */
export async function getGitHubActivity(
  githubUsername: string, 
  limit: number = 10,
  timeRange: TimeRange = 'all',
  userId?: string
): Promise<any[]> {
  const activities: any[] = [];
  
  try {
    // Get Octokit instance with user's token if userId is provided
    const octokit = await getOctokit(userId);
    
    // Get date range based on time range
    const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
    const dateQuery = timeRange !== 'all' 
      ? ` author-date:${formatDateForGitHub(startDate)}..${formatDateForGitHub(endDate)}`
      : '';
      
    // Get repositories - first try with authenticated user repos if username matches token
    let repos = [];
    try {
      // First try to get authenticated user repos if token's username matches
      const { data: authUser } = await octokit.users.getAuthenticated();
      
      if (authUser.login.toLowerCase() === githubUsername.toLowerCase()) {
        console.log("Getting repos for authenticated user for activity");
        const { data: authRepos } = await octokit.repos.listForAuthenticatedUser({
          per_page: 20,
          sort: "updated",
          headers
        });
        repos = authRepos;
        
        // For authenticated users, also fetch activity from organization repositories
        try {
          // Get organizations the user is a member of
          const { data: orgs } = await octokit.orgs.listForAuthenticatedUser({
            per_page: 100,
            headers
          });
          
          console.log(`Found ${orgs.length} organizations for activity tracking`);
          
          // For each org, get repositories the user has access to
          for (const org of orgs) {
            try {
              const { data: orgRepos } = await octokit.repos.listForOrg({
                org: org.login,
                per_page: 10,
                sort: "updated",
                headers
              });
              
              console.log(`Found ${orgRepos.length} repositories in organization ${org.login} for activity`);
              
              // Add org repos to the list, avoiding duplicates
              const existingRepoIds: Set<number> = new Set(repos.map(r => r.id));
              const newOrgRepos = orgRepos.filter(r => !existingRepoIds.has(r.id));
              repos = [...repos, ...newOrgRepos];
            } catch (orgError) {
              console.error(`Error fetching repos for organization ${org.login} activity:`, orgError);
            }
          }
        } catch (orgsError) {
          console.error("Error fetching organizations for activity:", orgsError);
        }
      } else {
        console.log("Using standard user repos for activity");
        const { data: userRepos } = await octokit.repos.listForUser({
          username: githubUsername,
          sort: "updated",
          per_page: 20,
          type: "all",
          headers
        });
        repos = userRepos;
      }
    } catch (error: unknown) {
      console.log("Error getting authenticated repos for activity, falling back to user repos");
      // Fall back to the standard method
      const { data: userRepos } = await octokit.repos.listForUser({
        username: githubUsername,
        sort: "updated",
        per_page: 20,
        type: "all", 
        headers
      });
      repos = userRepos;
    }
    
    console.log(`Found ${repos.length} repositories for activity, including private: ${repos.some(r => r.private)}, org repos: ${repos.filter(r => r.owner.type === "Organization").length}`);
      
    // For each repo, get the most recent commits
    const commitActivities = [];
    for (const repo of repos.slice(0, 5)) { // Process top 5 repos for better activity data
      try {
        // Get commits with time range filtering
        const commitParams: any = {
          owner: repo.owner.login,
          repo: repo.name,
          author: githubUsername,
          per_page: 10,
          headers
        };
        
        // Add date filters if not all time
        if (timeRange !== 'all') {
          commitParams.since = startDate.toISOString();
          commitParams.until = endDate.toISOString();
        }
        
        const { data: commits } = await octokit.repos.listCommits(commitParams);
        
        console.log(`Found ${commits.length} commits for activity in ${repo.name}`);
        
        // Map the commits to our activity format
        const repoCommits = commits.map(commit => ({
          type: 'commit',
          id: commit.sha,
          title: commit.commit.message.split('\n')[0],
          repo: repo.full_name,
          date: commit.commit.author?.date ? new Date(commit.commit.author.date) : new Date(),
          url: commit.html_url
        }));
        
        commitActivities.push(...repoCommits);
      } catch (error) {
        console.log(`Error fetching commits for ${repo.name} activity:`, error);
      }
    }
    
    // Add the commits to activities
    activities.push(...commitActivities);
    
    // Get recent PRs
    try {
      // Use the repos we already collected, which includes org repos if the user is authenticated
      const prActivities = [];
      for (const repo of repos.slice(0, 10)) { // Process more repos for PRs
        try {
          const { data: pullRequests } = await octokit.pulls.list({
            owner: repo.owner.login,
            repo: repo.name,
            state: "all",
            per_page: 10,
            headers
          });
          
          // Filter PRs by author and time range if needed
          const userPRs = pullRequests.filter(pr => {
            if (!pr.user || pr.user.login.toLowerCase() !== githubUsername.toLowerCase()) {
              return false;
            }
            
            if (timeRange !== 'all') {
              const prDate = new Date(pr.created_at);
              return prDate >= startDate && prDate <= endDate;
            }
            
            return true;
          });
          
          console.log(`Found ${userPRs.length} PRs for activity in ${repo.name}${repo.owner.type === "Organization" ? ` (org: ${repo.owner.login})` : ''}`);
          
          // Map PRs to activity format
          const repoPRs = userPRs.map(pr => ({
            type: 'pr',
            id: pr.number.toString(),
            title: pr.title,
            repo: repo.full_name,
            state: pr.state,
            date: new Date(pr.updated_at),
            url: pr.html_url,
          }));
          
          prActivities.push(...repoPRs);
        } catch (error) {
          console.log(`Error fetching PRs for ${repo.name} activity:`, error);
        }
      }
      
      // Add PRs to activities
      activities.push(...prActivities);
    } catch (error) {
      console.error("Error fetching recent PRs for activity:", error);
    }
    
    // Sort by date (newest first) and limit
    activities.sort((a, b) => {
      // Handle potential date conversion issues
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Convert dates to ISO string format for JSON serialization
    const formattedActivities = activities.slice(0, limit).map(activity => ({
      ...activity,
      date: activity.date instanceof Date ? activity.date.toISOString() : activity.date
    }));
    
    console.log(`Returning ${formattedActivities.length} activities`);
    return formattedActivities;
  } catch (error) {
    console.error("Error fetching GitHub activity:", error);
    return [];
  }
}

/**
 * Update a user's GitHub data in the database
 */
export async function updateGitHubUserData(
  userId: string, 
  timeRange: TimeRange = 'all',
  progressCallback?: (stage: string, completed: number, total: number, details?: string, orgName?: string) => void
) {
  try {
    // Forward the detailed progress reports from the updateProgress function
    const enhancedProgressCallback = (stage: string, completed: number, total: number, details?: string, orgName?: string) => {
      if (progressCallback) {
        progressCallback(stage, completed, total, details, orgName);
      }
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        githubUsername: true,
        githubId: true,
        points: true
      }
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // If we have a githubUsername, use that, otherwise fall back to githubId
    if (!user.githubUsername && !user.githubId) {
      throw new Error("GitHub not connected");
    }
    
    const githubUsername = user.githubUsername || user.githubId || '';
    
    // Pass userId to use the user's own OAuth token
    const githubData = await getGitHubUserStats(
      githubUsername, 
      timeRange, 
      userId,
      enhancedProgressCallback
    );
    
    // Always update the database, regardless of timeRange
    if (enhancedProgressCallback) {
      enhancedProgressCallback('saving', 0, 100, 'Saving data to database');
    }

    // Calculate level from points
    const level = Math.floor((user.points || 0) / 100) + 1;

    // Update user stats in the database
    await prisma.stats.upsert({
      where: { userId },
      update: {
        commits: githubData.commits,
        pullRequests: githubData.pullRequests,
        streak: githubData.streak,
        lastActivity: githubData.lastActivity,
        contributions: githubData.contributions || 0,
        reviews: githubData.reviews || 0,
        privateRepos: githubData.privateRepos || 0,
        publicRepos: githubData.publicRepos || 0,
        totalLinesChanged: githubData.totalLinesChanged || 0,
        stars: githubData.stars || 0,
        repos: githubData.repos || 0,
        currentStreak: githubData.currentStreak || 0,
        longestStreak: githubData.longestStreak || 0,
        activeDays: githubData.activeDays || 0,
        totalRepositoriesImpacted: githubData.totalRepositoriesImpacted || 0,
        mergedPullRequests: githubData.mergedPullRequests || 0,
        openPullRequests: githubData.openPullRequests || 0,
        lastRefreshed: new Date(),
        level: level,
        points: user.points || 0,
      },
      create: {
        userId,
        commits: githubData.commits,
        pullRequests: githubData.pullRequests,
        streak: githubData.streak,
        lastActivity: githubData.lastActivity,
        contributions: githubData.contributions || 0,
        reviews: githubData.reviews || 0,
        privateRepos: githubData.privateRepos || 0,
        publicRepos: githubData.publicRepos || 0,
        totalLinesChanged: githubData.totalLinesChanged || 0,
        stars: githubData.stars || 0,
        repos: githubData.repos || 0,
        currentStreak: githubData.currentStreak || 0,
        longestStreak: githubData.longestStreak || 0,
        activeDays: githubData.activeDays || 0,
        totalRepositoriesImpacted: githubData.totalRepositoriesImpacted || 0,
        mergedPullRequests: githubData.mergedPullRequests || 0,
        openPullRequests: githubData.openPullRequests || 0,
        lastRefreshed: new Date(),
        level: level,
        points: user.points || 0,
      },
    });
    
    if (enhancedProgressCallback) {
      enhancedProgressCallback('saving', 50, 100, 'Checking for achievements');
    }
    
    // Check for achievements
    const { checkAndAwardAchievements } = await import('./achievements');
    await checkAndAwardAchievements(userId);
    
    if (enhancedProgressCallback) {
      enhancedProgressCallback('complete', 100, 100, 'GitHub data updated successfully');
    }
    
    return githubData;
    
  } catch (error) {
    console.error("Error updating GitHub user data:", error);
    throw error;
  }
} 