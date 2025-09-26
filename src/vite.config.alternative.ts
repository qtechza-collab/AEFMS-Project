import { defineConfig } from 'vite'
import path from 'path'

// Try to import the SWC plugin first, fallback to regular plugin
let reactPlugin;
try {
  const swc = await import('@vitejs/plugin-react-swc');
  reactPlugin = swc.default({
    // SWC configuration
    tsDecorators: true,
  });
  console.log('Using SWC React plugin');
} catch (error) {
  const regular = await import('@vitejs/plugin-react');
  reactPlugin = regular.default({
    include: "**/*.{jsx,tsx}",
    exclude: /node_modules/,
  });
  console.log('Using standard React plugin');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactPlugin],
  
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
    sourcemap: false,
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          supabase: ['@supabase/supabase-js'],
          utils: ['lucide-react', 'recharts', 'date-fns']
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