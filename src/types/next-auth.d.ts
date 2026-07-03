import type { DefaultSession } from "next-auth";

// Étend le type de session pour exposer l'identifiant utilisateur côté app.
type SynthRole = "USER" | "ADMIN" | "SUPPORT";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: SynthRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: SynthRole;
  }
}
