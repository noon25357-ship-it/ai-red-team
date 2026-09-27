import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Arabic (the default locale) is served at the root; /ar redirects there.
  async rewrites() {
    return [{ source: "/", destination: "/ar" }];
  },
  async redirects() {
    return [{ source: "/ar", destination: "/", permanent: true }];
  },
};

export default nextConfig;
