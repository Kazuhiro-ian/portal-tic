/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',

      // --- Breakpoints da ÁREA DE CONTEÚDO ---
      // As media queries acima medem a JANELA, mas em telas grandes o conteúdo não ocupa a
      // janela toda: a sidebar fixa come 256px (w-64) e o <main> ainda tem 64px de padding
      // (lg:p-8 nos dois lados). Sobram `viewport - 320px`.
      //
      // Por isso um `lg:grid-cols-6` (que dispara com a janela em 1024px) montava 6 colunas
      // dentro de apenas 698px -- 103px por coluna, com os rótulos dos cards cortados no meio
      // da palavra. Era o que quebrava as telas em notebook (1024-1440px) e passava
      // despercebido no monitor grande.
      //
      // Os breakpoints abaixo são expressos pelo espaço que sobra PARA O CONTEÚDO. Use-os em
      // grids densas (4+ colunas) e em divisões de coluna; os breakpoints normais continuam
      // valendo para o que não convive com a sidebar (modais, painéis, login, mobile).
      'c-sm': '960px',    // ~640px de conteúdo
      'c-md': '1088px',   // ~768px de conteúdo
      'c-lg': '1344px',   // ~1024px de conteúdo
      'c-xl': '1600px',   // ~1280px de conteúdo
    },
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      colors: {
        // Queiroz primary green
        primary: {
          50:  '#f0faf1',
          100: '#d9f5dc',
          200: '#b3eabd',
          300: '#7dd994',
          400: '#4ec964',
          500: '#39b54a',
          600: '#28993a',
          700: '#1e7a30',
          800: '#1a6229',
          900: '#165123',
          950: '#082d11',
        },
        // Queiroz orange accent
        accent: {
          50:  '#fff8ed',
          100: '#ffefcf',
          200: '#ffdba0',
          300: '#ffc066',
          400: '#ff9a2d',
          500: '#f7941d',
          600: '#e07209',
          700: '#ba5409',
          800: '#94420f',
          900: '#793710',
          950: '#411b04',
        },
        // Queiroz pink / magenta
        brand: {
          50:  '#fdf2fa',
          100: '#fce7f7',
          200: '#facef1',
          300: '#f5a0e2',
          400: '#ee6bcb',
          500: '#e41daa',
          600: '#c91094',
          700: '#a50e78',
          800: '#880f63',
          900: '#711154',
          950: '#460232',
        },
        dark: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
    },
  },
  plugins: [],
};
