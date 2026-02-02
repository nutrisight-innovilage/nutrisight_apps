/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontSize: {
        base: '16px',
      },
      colors: {
        // Background colors
        background: {
          light: '#f0fdf4',
          dark: '#1a1a1a',
          DEFAULT: '#f0fdf4',
        },
        surface: {
          light: '#ffffff',
          dark: '#1a1a1a',
          DEFAULT: '#ffffff',
        },
        overlay: {
          light: '#dcfce7',
          dark: '#2a3a4a',
          DEFAULT: '#dcfce7',
        },

        // Text colors
        text: {
          primary: {
            light: '#333333',
            dark: '#e5e5e5',
            DEFAULT: '#333333',
          },
          secondary: {
            light: '#666666',
            dark: '#a0a0a0',
            DEFAULT: '#666666',
          },
          inverse: {
            light: '#ffffff',
            dark: '#ffffff',
            DEFAULT: '#ffffff',
          },
        },

        // Brand colors
        primary: {
          light: '#37B37E',
          dark: '#37B37E',
          DEFAULT: '#37B37E',
        },
        secondary: {
          light: '#1F78FF',
          dark: '#1F78FF',
          DEFAULT: '#1F78FF',
        },
        accent: {
          light: '#ffa726',
          dark: '#ffa726',
          DEFAULT: '#ffa726',
        },

        // UI element colors
        border: {
          light: '#B0BEC5',
          dark: '#4a4a4a',
          DEFAULT: '#B0BEC5',
        },
        input: {
          light: '#e8f1ff',
          dark: '#2a3a4a',
          DEFAULT: '#e8f1ff',
        },
        disabled: {
          light: '#D1D5DB',
          dark: '#4a4a4a',
          DEFAULT: '#D1D5DB',
        },
        icon: {
          light: '#D1D5DB',
          dark: '#a0a0a0',
          DEFAULT: '#D1D5DB',
        },

        // Status colors
        success: {
          light: '#37B37E',
          dark: '#37B37E',
          DEFAULT: '#37B37E',
        },
        error: {
          light: '#ef4444',
          dark: '#dc2626',
          DEFAULT: '#ef4444',
        },
        warning: {
          light: '#ffa726',
          dark: '#ffa726',
          DEFAULT: '#ffa726',
        },
        info: {
          light: '#1F78FF',
          dark: '#1F78FF',
          DEFAULT: '#1F78FF',
        },

        // Chart colors
        chart: {
          1: '#37B37E',
          2: '#1F78FF',
          3: '#ffa726',
          4: '#e8f1ff',
          5: '#B0BEC5',
        },
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
        xl: '0.875rem',
      },
      fontWeight: {
        medium: '500',
        normal: '400',
      },
    },
  },
  plugins: [],
}