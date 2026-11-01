import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard reads filters and review actions at request time.
  // Cache Components would prerender a shell around that mutable state.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
