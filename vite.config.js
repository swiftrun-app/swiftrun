import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single-file build: everything (JS, CSS, images) is inlined into dist/index.html.
// This is required for the Android WebView shell, which loads the app from
// file:///android_asset — ES module scripts are CORS-blocked over file://,
// so a multi-file Vite build renders a blank screen. Single file = no
// subresource fetches = no CORS problem, and it keeps the app fully offline.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
  build: {
    outDir: "dist",
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 2000,
  },
});
