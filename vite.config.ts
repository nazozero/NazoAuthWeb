import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Production is served below https://auth.nazo.run/ui/. Keep the Vite dev
  // server at the origin root while making a plain `npm run build` produce the
  // deployable artifact. Deployments may still override this explicitly.
  base: process.env.VITE_BASE_PATH ?? (command === 'build' ? '/ui/' : '/'),
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) {
            return 'vendor-motion';
          }
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }
          if (id.includes('/@marsidev/react-turnstile/')) {
            return 'vendor-captcha';
          }
          if (id.includes('/@gsap/react/') || id.includes('/gsap/')) {
            return 'vendor-gsap';
          }
          if (id.includes('/three/')) {
            return 'vendor-three';
          }
          return 'vendor';
        },
      },
    },
  },
}))
