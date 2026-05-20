import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    /**
     * Prevent "Invalid hook call" by ensuring only ONE copy of React/ReactDOM
     * is ever bundled/loaded (common in deployments/linked deps).
     */
    dedupe: ['react', 'react-dom'],
    alias: {
      // Hard-alias React to prevent multiple copies (fixes "Invalid hook call" in some deployments)
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': resolve(__dirname, 'node_modules/react-dom/client'),
      'react/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      "@": resolve(__dirname, "src")
    }
  },

  // Force a single React instance in dev/preview (permanent fix for "Invalid hook call" / useState null)
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-redux',
      'react-router-dom',
    ],
    // Ensure pre-bundle is used consistently (no stray second copy)
    esbuildOptions: {
      mainFields: ['module', 'main'],
    },
  },

  build: {
    sourcemap: true,
    // Keep single React in production bundle
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  server: {
    port: 8001,
    strictPort: true,
    sourcemapIgnoreList: false,
  },
});
