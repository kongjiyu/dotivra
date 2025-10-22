import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Use production API URL when building for production
  const productionApiUrl = 'https://api-uaxvd2wafa-uc.a.run.app';
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Define environment variables at build time
    define: {
      // Override VITE_API_URL for production builds
      ...(mode === 'production' && {
        'import.meta.env.VITE_API_URL': JSON.stringify(productionApiUrl)
      })
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    }
  }
})
