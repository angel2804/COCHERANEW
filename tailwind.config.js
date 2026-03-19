/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{jsx,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent:  '#f5a623',
        accent2: '#e09420',
        yellow:  '#f9ca24',
        danger:  '#ff4757',
        blue:    '#4facfe',
        bg: {
          DEFAULT: '#091e1e',
          light:   '#f4fafa',
        },
        bg2: {
          DEFAULT: '#0c2828',
          light:   '#e8f4f4',
        },
        bg3: {
          DEFAULT: '#0f3333',
          light:   '#dceeed',
        },
        surface: {
          DEFAULT: '#133a3a',
          light:   '#ffffff',
        },
        surface2: {
          DEFAULT: '#184545',
          light:   '#ecf6f6',
        },
        border: {
          DEFAULT: '#1e5a5a',
          light:   '#a8d4d4',
        },
        border2: {
          DEFAULT: '#246868',
          light:   '#88c0c0',
        },
        txt: {
          DEFAULT: '#e0f0f0',
          light:   '#0a2828',
        },
        txt2: {
          DEFAULT: '#7ab8b8',
          light:   '#2a5858',
        },
        txt3: {
          DEFAULT: '#4a8080',
          light:   '#5a9090',
        },
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
        body:    ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

