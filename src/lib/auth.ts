// src/lib/auth.ts
import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // get DB connection
        const db = await getDb();
        const user = await db.collection("users").findOne({ email: credentials.email });
        if (!user) {
          // no user found
          return null;
        }

        // compare password hash (bcrypt)
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // return minimal user object required by NextAuth
        return { id: String(user._id), email: user.email };
      },
    }),
  ],

  // session options — typed via AuthOptions so literal is okay
  session: { strategy: "jwt" },

  // specify callbacks if you need (optional)
  callbacks: {
    // this ensures JWT contains id and email
    async jwt({ token, user }) {
      if (user) {
        token.sub = token.sub ?? (user as any).id ?? token.sub;
        token.email = token.email ?? (user as any).email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.sub;
        session.user.email = token.email as string | undefined;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
