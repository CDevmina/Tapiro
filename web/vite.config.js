import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    host: true,
    strictPort: true,
    port: 5173,
    hmr: {
      clientPort: 3001,
      overlay: true,
    },
  },
});
