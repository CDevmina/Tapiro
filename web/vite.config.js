import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 100, // Check for changes every 100ms
    },
    host: true,
    strictPort: true,
    port: 5173,
    hmr: {
      clientPort: 3001, // This is important for Docker
    },
  },
});
