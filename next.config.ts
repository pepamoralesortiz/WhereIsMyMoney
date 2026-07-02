import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /* Opciones de Next.js aquí. */
};

// @serwist/next requiere Webpack (los scripts usan `next dev/build --webpack`).
// El SW se deshabilita en desarrollo.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
