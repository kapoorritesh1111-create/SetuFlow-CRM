import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1F487C',
          dark: '#193769'
        },
        stage: {
          new: '#3B82F6',
          qualified: '#22C55E',
          contacted: '#6366F1',
          sample: '#F59E0B',
          negotiation: '#A855F7',
          won: '#10B981',
          lost: '#EF4444'
        },
        status: {
          ready: '#16A34A',
          progress: '#FACC15',
          blocked: '#DC2626',
          cold: '#9CA3AF',
          ontrack: '#3B82F6'
        },
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          600: '#475569',
          900: '#0F172A'
        }
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.06)',
        premium: '0 12px 32px rgba(15, 23, 42, 0.08)',
        glow: '0 0 8px rgba(0,0,0,0.4)'
      }
    }
  },
  plugins: []
}

export default config
