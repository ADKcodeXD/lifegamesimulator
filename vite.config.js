import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths work for both user and project GitHub Pages sites.
  base: "./",
});

