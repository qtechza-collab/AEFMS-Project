import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  publicDir: 'public',
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

  // CSS optimization
  css: {
    devSourcemap: false,
    postcss: {
      plugins: []
    }
  },

  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
    minify: 'terser',
    chunkSizeWarningLimit: 500, // Reduce warning threshold to optimize for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom'],
          
          // Radix UI components (split into more specific chunks)
          'radix-core': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu', 
            '@radix-ui/react-select',
            '@radix-ui/react-popover'
          ],
          'radix-forms': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            'react-hook-form',
            'react-day-picker'
          ],
          'radix-layout': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-separator',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-tabs'
          ],
          'radix-misc': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-badge',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-toast',
            '@radix-ui/react-progress'
          ],
          
          // Data and API
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // Charts and data visualization  
          'vendor-charts': ['recharts'],
          
          // Utilities
          'vendor-utils': ['lucide-react', 'date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge'],
          
          // UI System
          'vendor-ui': ['cmdk', 'sonner', 'vaul', 'input-otp'],
          
          // Dashboard components (dynamic chunking by role)
          'dashboard-employee': (id) => {
            if (id.includes('EmployeeDashboard') || id.includes('Employee') && id.includes('Dashboard')) {
              return 'dashboard-employee';
            }
          },
          'dashboard-manager': (id) => {
            if (id.includes('EmployerDashboard') || id.includes('Manager') && id.includes('Dashboard')) {
              return 'dashboard-manager';
            }
          },
          'dashboard-hr': (id) => {
            if (id.includes('HRDashboard') || id.includes('HR') && id.includes('Dashboard')) {
              return 'dashboard-hr';
            }
          },
          'dashboard-admin': (id) => {
            if (id.includes('AdminDashboard') || id.includes('Admin') && id.includes('Dashboard')) {
              return 'dashboard-admin';
            }
          },
          
          // Shared components
          'components-shared': (id) => {
            if (id.includes('components/') && 
                !id.includes('Dashboard') && 
                !id.includes('ui/') &&
                (id.includes('Claims') || id.includes('Expense') || id.includes('Financial'))) {
              return 'components-shared';
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
