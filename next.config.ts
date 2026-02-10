import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.oyez.org",
      },
    ],
  },
  ...(process.env.NODE_ENV === "development" && {
    turbopack: {
      root: resolve(__dirname),
    },
  }),
};

export default nextConfig;
