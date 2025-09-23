// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Create NextAuth handler and export only the route handlers NextAuth needs.
// Do NOT export authOptions from a route file (some builds complain if you export extra named values here).
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
