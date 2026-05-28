import type { NextConfig } from "next";

const nextConfig = {
  serverActions: {
    bodySizeLimit: "8mb",
  },
  /* config options here */
} as NextConfig;

export default nextConfig;
