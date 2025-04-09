import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Create a global progress store keyed by user ID
const progressStore: Map<string, { 
  stage: string; 
  completed: number; 
  total: number;
  details?: string;
  orgName?: string; 
}> = new Map();

// Track active controllers to prevent errors when a connection closes
const activeControllers = new Map<string, boolean>();

// Function to update progress for a user
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

// Server-sent events (SSE) endpoint for progress updates
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id; // Extract as local variable to help TypeScript

    // Set headers for SSE
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    // Create a readable stream
    const stream = new ReadableStream({
      start(controller) {
        // Mark this controller as active
        activeControllers.set(userId, true);
        
        // Function to send progress updates
        const sendProgress = () => {
          // Skip if controller is no longer active
          if (!activeControllers.get(userId)) return;
          
          try {
            const progress = progressStore.get(userId) || { 
              stage: 'initializing', 
              completed: 0, 
              total: 100, 
              details: 'Preparing to fetch GitHub data...'
            };
            const data = `data: ${JSON.stringify(progress)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            console.error('Error sending progress update:', error);
            // Mark controller as inactive on error
            activeControllers.set(userId, false);
            
            try {
              clearInterval(intervalId);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        };

        // Send initial progress
        sendProgress();

        // Set up interval to send progress updates every 500ms
        const intervalId = setInterval(sendProgress, 500);

        // Clean up after 5 minutes (prevent zombie connections)
        setTimeout(() => {
          activeControllers.set(userId, false);
          clearInterval(intervalId);
          try {
            controller.close();
          } catch (e) {
            // Ignore close errors
          }
        }, 5 * 60 * 1000);
        
        // Handle client disconnection
        return () => {
          activeControllers.set(userId, false);
          clearInterval(intervalId);
        };
      },
      cancel() {
        // When the client disconnects, mark this controller as inactive
        activeControllers.set(userId, false);
      }
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error("Error in progress endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 