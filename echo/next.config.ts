import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://10.191.0.37:3000"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
