import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware basé sur la config Edge : applique le callback `authorized`.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Ne protéger que les routes applicatives ; les assets et l'API auth restent libres.
  matcher: ["/app/:path*"],
};
