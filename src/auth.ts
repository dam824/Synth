import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

// Instance complète (runtime Node) : ajoute l'adaptateur Prisma et la
// stratégie de session JWT pour rester simple côté middleware.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Le rôle est porté par le JWT pour éviter une requête DB à chaque
        // vérification d'accès admin.
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? token.sub ?? "";
        session.user.role =
          (token.role as "USER" | "ADMIN" | "SUPPORT" | undefined) ?? "USER";
      }
      return session;
    },
  },
});
