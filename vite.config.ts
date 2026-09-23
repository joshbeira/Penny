import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["audio/*.mp3", "icons/*", "tesseract/**"],

      manifest: {
        name: "Penny",
        short_name: "Penny",
        theme_color: "#101418",
        background_color: "#101418",
        display: "standalone",
        description: "Accessible letter reading with on-device OCR and speech.",
        start_url: `${base}postbox`,
        scope: base,
        icons: [
          {
            src: `${base}icons/penny-192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `${base}icons/penny-512.png`,
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ],
});
