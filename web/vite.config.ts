import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import flowbiteReact from "flowbite-react/plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), flowbiteReact()],
  server: {
    host: "0.0.0.0", // Required for Docker
    hmr: {
      clientPort: 5173, // Match the exposed port
      host: "localhost",
    },
  },
});
