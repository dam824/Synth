/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sortie autonome pour une image Docker légère en production.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
