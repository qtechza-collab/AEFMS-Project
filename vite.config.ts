import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Explicit configuration for better compatibility
      include: "**/*.{jsx,tsx}",
      exclude: /node_modules/,
    })
  ],
  
  // Path resolution for imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@utils': path.resolve(__dirname, './utils'),
      '@styles': path.resolve(__dirname, './styles'),
      '@lib': path.resolve(__dirname, './lib')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },

  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
    minify: 'terser',
    chunkSizeWarningLimit: 1000, // Increase threshold to 1MB for Logan Freights comprehensive system
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          vendor: ['react', 'react-dom'],
          
          // Radix UI components (split into smaller chunks)
          'radix-core': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu', 
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs'
          ],
          'radix-forms': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider'
          ],
          'radix-layout': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-separator',
            '@radix-ui/react-scroll-area'
          ],
          
          // Data and API
          supabase: ['@supabase/supabase-js'],
          
          // Charts and utilities
          charts: ['recharts'],
          utils: ['lucide-react', 'date-fns', 'clsx', 'class-variance-authority'],
          
          // Form handling
          forms: ['react-hook-form', 'react-day-picker'],
          
          // Large dashboard components (dynamically chunked)
          dashboards: (id) => {
            if (id.includes('Dashboard') || id.includes('Management')) {
              return 'dashboards';
            }
          }
        }
      }
    }
  },

  // Development server configuration
  server: {
    port: 5173,
    host: true
  },

  // Environment variables (only VITE_ prefix for Vite projects)
  envPrefix: ['VITE_'],

  // Define global constants
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    global: 'globalThis'
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'recharts',
      'date-fns'
    ]
  }
})
