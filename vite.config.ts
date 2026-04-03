import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub project Pages: https://<user>.github.io/<repo>/ — set VITE_BASE_PATH=/<repo>/
const rawBase = (process.env.VITE_BASE_PATH || "/").trim();
const base =
  rawBase === "" || rawBase === "/"
    ? "/"
    : `/${rawBase.replace(/^\/+|\/+$/g, "")}/`;

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon-32-light.png",
        "favicon-32-dark.png",
        "apple-touch-icon.png",
        "seed/exercises.json",
        "seed/workouts.json",
      ],
      manifest: {
        name: "GymOverload",
        short_name: "GymOverload",
        description:
          "Strength training tracker: exercises, workouts, on-device storage.",
        theme_color: "#32d74b",
        background_color: "#32d74b",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}pwa-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: `${base}pwa-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
