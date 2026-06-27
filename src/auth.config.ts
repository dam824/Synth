import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

// Configuration partagée et compatible Edge (utilisée par le middleware).
// Aucune dépendance à Prisma ici : le middleware tourne sur le runtime Edge.
export const authConfig = {
  providers: [Google, GitHub],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Protège /app : seul un utilisateur connecté peut y accéder.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnApp = nextUrl.pathname.startsWith("/app");

      if (isOnApp) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
