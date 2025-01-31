import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // For Docker access
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Required for file watching in Docker
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
