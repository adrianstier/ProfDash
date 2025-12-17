import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@scholaros/shared"],
  // Enable typedRoutes once all routes are implemented
  // experimental: {
  //   typedRoutes: true,
  // },
};

export default nextConfig;
