import type { NextConfig } from "next";

if (process.env.VERCEL_ENV === "production") {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey?.startsWith("pk_live_") || !secretKey?.startsWith("sk_live_")) {
    throw new Error(
      "Vercel production builds require Clerk production keys. Configure pk_live_ and sk_live_ keys in the Vercel production environment.",
    );
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
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
