import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Create and export the handler for App Router compatibility
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 