import type { DefaultSession } from "next-auth";

// Étend le type de session pour exposer l'identifiant utilisateur côté app.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
