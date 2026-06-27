/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sortie autonome pour une image Docker légère en production.
  output: "standalone",
  reactStrictMode: true,
  // Déplace l'indicateur de dev Next.js en bas à droite (n'apparaît qu'en dev).
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
