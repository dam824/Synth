import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { SITE_CONFIG } from "@/config/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
  description: `Une demande. Plusieurs analyses. Une synthèse plus solide. ${SITE_CONFIG.name} confronte et synthétise pour vous.`,
  icons: {
    icon: "/brand/themis-logo.svg",
    shortcut: "/brand/themis-logo.svg",
    apple: "/brand/Themis-logo.png",
  },
  openGraph: {
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: `Plusieurs analyses confrontées dans une réponse consolidée par ${SITE_CONFIG.name}.`,
    images: ["/brand/Themis-logo.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
