import type { NextConfig } from "next";

// The Express API server URL (only used server-side for rewrites, never exposed to browser)
// Set EXPRESS_API_URL in Vercel env vars (without NEXT_PUBLIC_ prefix)
const EXPRESS_API_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:3000"
  : "https://storage.lootops.me";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.lootops.me",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "server.lootops.me",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.subhan.tech",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "server.subhan.tech",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lootops-cloud.subhan.tech",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/**",
      },
    ],
  },

  // ─── VERCEL / CROSS-DOMAIN FIX ─────────────────────────────────────────────
  // When the frontend is on Vercel and Express is on a separate VPS,
  // we can't use cross-domain cookies (MFA tokens, etc.).
  // These rewrites make Vercel act as a transparent proxy for all Express routes,
  // so the browser only ever talks to ONE domain → cookies work perfectly.
  async rewrites() {
    return [
      // Admin API
      { source: "/admin/:path*", destination: `${EXPRESS_API_URL}/admin/:path*` },
      // File upload
      { source: "/upload", destination: `${EXPRESS_API_URL}/upload` },
      // File serving & downloads — excluded here, handled via redirects() below
      // so the browser talks directly to the backend (required for video Range requests)
      // Thumbnails
      { source: "/thumbnails/:path*", destination: `${EXPRESS_API_URL}/thumbnails/:path*` },
      // 2FA / Auth endpoints
      { source: "/api/auth/:path*", destination: `${EXPRESS_API_URL}/api/auth/:path*` },
      { source: "/auth/:path*", destination: `${EXPRESS_API_URL}/auth/:path*` },
      // Alert endpoints (login & visit emails)
      { source: "/api/alerts/:path*", destination: `${EXPRESS_API_URL}/api/alerts/:path*` },
      // Public files endpoint
      { source: "/api/public-files", destination: `${EXPRESS_API_URL}/api/public-files` },
      // Health check
      { source: "/api/health", destination: `${EXPRESS_API_URL}/api/health` },
      // Vault API
      { source: "/api/vault/:path*", destination: `${EXPRESS_API_URL}/api/vault/:path*` },
      // Settings API
      { source: "/api/settings/:path*", destination: `${EXPRESS_API_URL}/api/settings/:path*` },
      // Watchdog API
      { source: "/api/watchdog/:path*", destination: `${EXPRESS_API_URL}/api/watchdog/:path*` },
      // Deployments API
      { source: "/api/deployments/:path*", destination: `${EXPRESS_API_URL}/api/deployments/:path*` },
      // Forms API
      { source: "/api/forms/:path*", destination: `${EXPRESS_API_URL}/api/forms/:path*` },
      // Cloudflare API
      { source: "/api/cloudflare/:path*", destination: `${EXPRESS_API_URL}/api/cloudflare/:path*` },
      // Notes API
      { source: "/api/notes", destination: `${EXPRESS_API_URL}/api/notes` },
      { source: "/api/notes/:path*", destination: `${EXPRESS_API_URL}/api/notes/:path*` },
      // Passwords API
      { source: "/api/passwords", destination: `${EXPRESS_API_URL}/api/passwords` },
      { source: "/api/passwords/:path*", destination: `${EXPRESS_API_URL}/api/passwords/:path*` },
      // GitHub & Integrations APIs
      { source: "/api/github/:path*", destination: `${EXPRESS_API_URL}/api/github/:path*` },
      { source: "/api/integrations/:path*", destination: `${EXPRESS_API_URL}/api/integrations/:path*` },
      // File & folder operations (rename, move, create, share)
      { source: "/rename", destination: `${EXPRESS_API_URL}/rename` },
      { source: "/move-file", destination: `${EXPRESS_API_URL}/move-file` },
      { source: "/create-folder", destination: `${EXPRESS_API_URL}/create-folder` },
      { source: "/share/:path*", destination: `${EXPRESS_API_URL}/share/:path*` },
      // Terminal WebSocket proxy
      { source: "/terminal", destination: `${EXPRESS_API_URL}/terminal` },
    ];
  },

  // Use redirects (not rewrites) for file serving so browser talks DIRECTLY to
  // the Express backend. Vercel rewrites strip HTTP Range headers, breaking video
  // streaming. Redirects let the browser handle Range negotiation itself.
  async redirects() {
    return [
      {
        source: "/file-serve/:path*",
        destination: `${EXPRESS_API_URL}/file-serve/:path*`,
        permanent: false,
      },
      {
        source: "/file-download/:path*",
        destination: `${EXPRESS_API_URL}/file-download/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
