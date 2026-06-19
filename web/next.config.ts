import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-hosted long-running server: produces .next/standalone/server.js.
  output: 'standalone',
  // Keep the native module out of the bundle (better-sqlite3 is in Next's default
  // externals list already; listing it is explicit and future-proof).
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
