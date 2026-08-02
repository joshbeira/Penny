import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // SPEC 14's PWA. devOptions stays off (the default), so `vite` and
    // `vercel dev` are untouched and no service worker exists in development.
    VitePWA({
      registerType: "autoUpdate",

      // SPEC 14 pins ["audio/*.mp3", "icons/*"]. AMENDED to add "tesseract/**",
      // which is what makes SPEC 17 P7's own acceptance criterion — "installed
      // PWA passes scenario D offline" — reachable at all. P3 measured the
      // failure: a COLD start with the radios off cannot mask, the chip reads
      // "Masking unavailable", and SPEC 12.3 D's whole claim (the PIN never
      // leaves the phone) has nothing behind it. P3, P4, P5 and P6 each carried
      // this forward as P7's inheritance.
      //
      // Why the glob is required rather than nice to have: includeAssets entries
      // become workbox `additionalManifestEntries`, and eng.traineddata.gz
      // matches NONE of Workbox's default globs (js/css/html/ico/png/svg), so
      // without it the language data is silently absent from the precache
      // manifest — the app installs, looks fine, and cannot read a letter
      // offline.
      includeAssets: ["audio/*.mp3", "icons/*", "tesseract/**"],

      manifest: {
        name: "Penny",
        short_name: "Penny",
        theme_color: "#101418",
        background_color: "#101418",
        display: "standalone",
        icons: [
          { src: "/icons/penny-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/penny-512.png", sizes: "512x512", type: "image/png" },
        ],
      },

      workbox: {
        // AMENDED alongside includeAssets above, and not optional. The two
        // tesseract-core-*.wasm.js files are 3.94 MB each and DO match Workbox's
        // default "**/*.js" glob, so at the 2 MiB default they exceed the limit —
        // and vite-plugin-pwa resolves throwMaximumFileSizeToCacheInBytes to true
        // by default, which fails the build outright rather than warning.
        // 15 MB clears the largest file; the whole precache is ~12.4 MB.
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ],
});
