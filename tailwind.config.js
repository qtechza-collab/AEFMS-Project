/ @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/App.tsx",
    "./src/main.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/utils/**/.{js,ts,jsx,tsx}"
  ],

  theme: {
    extend: {
      // Logan Freights brand colors
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '
#030213', // Logan Freights Navy
          foreground: '
#ffffff'
        },

        // Logan Freights palette
        'logan-navy': '
#030213',
        'logan-white': '
#ffffff',

        // Functional colors
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)'
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)'
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',

        // Chart colors for financial analytics
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)'
        },

        // Sidebar colors
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)'
        }
      },

      // Logan Freights typography (following guidelines)
      fontSize: {
        'base': ['16px', { lineHeight: '1.5' }], // Accessible base size
      },

      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)'
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },

      // South African business context
      screens: {
        'mobile': '375px',   // Common SA mobile breakpoint
        'tablet': '768px',   // Tablet breakpoint
        'laptop': '1024px',  // Laptop breakpoint
        'desktop': '1280px'  // Desktop breakpoint
      },

      // Logan Freights spacing system
      spacing: {
        '18': '4.5rem',   // Custom spacing for forms
        '88': '22rem',    // Custom spacing for cards
      },

      // Animation for loading states
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulse 3s ease-in-out infinite'
      }
    }
  },

  plugins: [],

  // Enable all Tailwind features
  future: {
    hoverOnlyWhenSupported: true,
  },

  // Safelist important Logan Freights classes
  safelist: [
    'bg-logan-navy',
    'text-logan-navy',
    'border-logan-navy',
    'bg-logan-white',
    'text-logan-white'
  ]
}
