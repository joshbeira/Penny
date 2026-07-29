import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// vite-plugin-pwa is installed (SPEC 2) but is not wired until P7.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
