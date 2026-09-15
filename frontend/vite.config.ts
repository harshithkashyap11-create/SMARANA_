import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Smārana",
        short_name: "Smārana",
        description: "Gentle memory and daily support.",
        theme_color: "#2f5d50",
        background_color: "#f6f3ea",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "en",
        prefer_related_applications: false,
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,woff2}"],
        runtimeCaching: [
          { urlPattern: /\/media\//, handler: "CacheFirst", options: { cacheName: "smarana-media", expiration: { maxEntries: 500, maxAgeSeconds: 2592000 } } },
          { urlPattern: /\/api\/v1\/content\/pack/, handler: "StaleWhileRevalidate", options: { cacheName: "smarana-content" } },
          { urlPattern: /\/api\/v1\/patients\//, handler: "NetworkOnly" },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});
