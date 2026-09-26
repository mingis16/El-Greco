import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `"use cache"` + cacheLife/cacheTag, which is how the menu and
  // static pages get ISR-style caching in Next 16 (see src/lib/menu.ts).
  cacheComponents: true,
  poweredByHeader: false,
};

export default nextConfig;
