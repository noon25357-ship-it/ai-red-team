import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The default locale is served at the root. Add locales in lib/i18n.ts.
  async rewrites() {
    return [{ source: "/", destination: "/en" }];
  },
};

export default nextConfig;
