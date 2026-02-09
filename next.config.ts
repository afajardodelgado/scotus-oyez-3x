import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  ...(process.env.NODE_ENV === "development" && {
    turbopack: {
      root: resolve(__dirname),
    },
  }),
};

export default nextConfig;
