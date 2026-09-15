import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Resuelve la URL pública del sitio para las etiquetas og:image / twitter:image,
 * que deben ser absolutas para que WhatsApp y Facebook carguen la imagen.
 *
 * Orden: SITE_URL (o VITE_SITE_URL) > dominio de producción de Vercel > relativa.
 */
function resolveSiteUrl() {
  const explicit = process.env.SITE_URL || process.env.VITE_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "";
}

/** Reemplaza %SITE_URL% en index.html al compilar. */
function siteUrlPlugin() {
  const siteUrl = resolveSiteUrl();
  return {
    name: "site-url",
    transformIndexHtml(html) {
      return html.replaceAll("%SITE_URL%", siteUrl);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-router")
          ) {
            return "react-vendor";
          }
          if (id.includes("node_modules/motion")) {
            return "animation-vendor";
          }
          if (id.includes("node_modules/@tanstack/react-query")) {
            return "query-vendor";
          }
          if (
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/react-confetti")
          ) {
            return "ui-vendor";
          }
        },
      },
    },
    // Target modern browsers for smaller bundle
    target: "es2015",
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "motion",
      "@tanstack/react-query",
    ],
  },
});
