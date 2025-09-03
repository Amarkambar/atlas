module.exports = {
  content: [
    "./pages/*.{html,js}",
    "./index.html",
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./components/**/*.{html,js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors - Deep Forest Green
        primary: {
          DEFAULT: "#2D5A27", // deep forest green
          50: "#F0F7EF", // very light green
          100: "#D4E8D1", // light green
          200: "#A9D1A3", // medium light green
          300: "#7EBA75", // medium green
          400: "#53A347", // medium dark green
          500: "#2D5A27", // deep forest green - base
          600: "#244821", // darker green
          700: "#1B361B", // very dark green
          800: "#122415", // extremely dark green
          900: "#091209", // near black green
        },
        
        // Secondary Colors - Rich Earth Brown
        secondary: {
          DEFAULT: "#8B4513", // rich earth brown
          50: "#F7F2ED", // very light brown
          100: "#E8D5C2", // light brown
          200: "#D1AB85", // medium light brown
          300: "#BA8148", // medium brown
          400: "#A3570B", // medium dark brown
          500: "#8B4513", // rich earth brown - base
          600: "#6F370F", // darker brown
          700: "#53290B", // very dark brown
          800: "#371B07", // extremely dark brown
          900: "#1B0D04", // near black brown
        },
        
        // Accent Colors - Vibrant Orange
        accent: {
          DEFAULT: "#FF8C00", // vibrant orange
          50: "#FFF7F0", // very light orange
          100: "#FFE6CC", // light orange
          200: "#FFCC99", // medium light orange
          300: "#FFB366", // medium orange
          400: "#FF9933", // medium dark orange
          500: "#FF8C00", // vibrant orange - base
          600: "#CC7000", // darker orange
          700: "#995400", // very dark orange
          800: "#663800", // extremely dark orange
          900: "#331C00", // near black orange
        },
        
        // Background Colors
        background: "#FAFAFA", // warm off-white
        surface: "#FFFFFF", // pure white
        
        // Text Colors
        text: {
          primary: "#1A1A1A", // near-black
          secondary: "#666666", // medium gray
        },
        
        // Status Colors
        success: {
          DEFAULT: "#228B22", // forest green
          50: "#F0F8F0", // very light success green
          100: "#D4E8D4", // light success green
          200: "#A9D1A9", // medium light success green
          300: "#7EBA7E", // medium success green
          400: "#53A353", // medium dark success green
          500: "#228B22", // forest green - base
          600: "#1B6F1B", // darker success green
          700: "#145314", // very dark success green
          800: "#0D370D", // extremely dark success green
          900: "#061B06", // near black success green
        },
        
        warning: {
          DEFAULT: "#DAA520", // golden yellow
          50: "#FDF9F0", // very light warning yellow
          100: "#F9EBCC", // light warning yellow
          200: "#F3D799", // medium light warning yellow
          300: "#EDC366", // medium warning yellow
          400: "#E7AF33", // medium dark warning yellow
          500: "#DAA520", // golden yellow - base
          600: "#AE841A", // darker warning yellow
          700: "#826313", // very dark warning yellow
          800: "#56420D", // extremely dark warning yellow
          900: "#2B2106", // near black warning yellow
        },
        
        error: {
          DEFAULT: "#DC143C", // crimson red
          50: "#FDF0F2", // very light error red
          100: "#F8CCD6", // light error red
          200: "#F199AD", // medium light error red
          300: "#EA6684", // medium error red
          400: "#E3335B", // medium dark error red
          500: "#DC143C", // crimson red - base
          600: "#B01030", // darker error red
          700: "#840C24", // very dark error red
          800: "#580818", // extremely dark error red
          900: "#2C040C", // near black error red
        },
        
        // Border Colors
        border: {
          light: "#E5E5E5", // light gray border
          medium: "#CCCCCC", // medium gray border
          dark: "#999999", // dark gray border
        },
      },
      
      fontFamily: {
        // Headings - Inter
        sans: ['Inter', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        
        // Body - Source Sans Pro
        body: ['Source Sans Pro', 'sans-serif'],
        'source-sans': ['Source Sans Pro', 'sans-serif'],
        
        // Captions - Roboto
        caption: ['Roboto', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        
        // Data - JetBrains Mono
        data: ['JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      
      boxShadow: {
        'sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.2)',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'elevation-2': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'elevation-3': '0 8px 24px rgba(0, 0, 0, 0.2)',
      },
      
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      
      transitionDuration: {
        'fast': '200ms',
        'medium': '300ms',
        'slow': '500ms',
      },
      
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 300ms ease-in-out',
        'slide-up': 'slideUp 300ms ease-in-out',
        'slide-down': 'slideDown 300ms ease-in-out',
      },
      
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slideUp': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slideDown': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.scale-press': {
          transform: 'scale(0.98)',
        },
        '.transition-micro': {
          transition: 'all 200ms ease-out',
        },
        '.transition-smooth': {
          transition: 'all 300ms ease-in-out',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}