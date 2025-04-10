// Create a global progress store keyed by user ID
export const progressStore: Map<string, { 
  stage: string; 
  completed: number; 
  total: number;
  details?: string;
  orgName?: string; 
}> = new Map();

// Track active controllers to prevent errors when a connection closes
export const activeControllers = new Map<string, boolean>();

/**
 * Updates the progress state for a specific user
 */
export function updateProgress(
  userId: string, 
  stage: string, 
  completed: number, 
  total: number, 
  details?: string,
  orgName?: string
) {
  progressStore.set(userId, { stage, completed, total, details, orgName });
} 