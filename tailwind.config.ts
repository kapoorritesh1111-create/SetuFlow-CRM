import type { Config } from 'tailwindcss'

/**
 * SETU Flow CRM — Tailwind config wired to design-tokens.css.
 *
 * SF-DS-1: This fixes the broken brand color scale bug (~242 usages of
 * text-brand-700 / bg-brand-50 / ring-brand-500 etc. previously compiled
 * to NOTHING because only brand.primary/dark/teal existed, no numeric
 * ramp — including every focus ring built on ring-brand-500). It also
 * fixes the dark-mode strategy conflict (globals.css styled `.dark body`
 * while this config had no `darkMode` set, so `dark:` variants used the
 * media-query strategy and could disagree with the class toggle) and
 * wires next/font's --font-jakarta variable into `font-sans`, which was
 * never actually applied anywhere before this (Plus Jakarta Sans was
 * loaded but every element rendered in the browser default sans stack).
 *
 * Back-compat: brand.primary/dark/teal, status.*, and the custom
 * `neutral` slate-ish overrides are preserved so 0 call-site edits were
 * required for existing usages of those specific keys.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        // Brand ramps — navy is `brand`, teal is `accent`.
        brand: {
          50: 'var(--sf-navy-50)',
          100: 'var(--sf-navy-100)',
          200: 'var(--sf-navy-200)',
          300: 'var(--sf-navy-300)',
          400: 'var(--sf-navy-400)',
          500: 'var(--sf-navy-500)',
          600: 'var(--sf-navy-600)',
          700: 'var(--sf-navy-700)',
          800: 'var(--sf-navy-800)',
          900: 'var(--sf-navy-900)',
          950: 'var(--sf-navy-950)',
          // Back-compat aliases for existing brand-primary / brand-dark / brand-teal usage.
          primary: 'var(--sf-navy-700)',
          dark: 'var(--sf-navy-800)',
          teal: 'var(--sf-teal-500)'
        },
        accent: {
          50: 'var(--sf-teal-50)',
          100: 'var(--sf-teal-100)',
          200: 'var(--sf-teal-200)',
          300: 'var(--sf-teal-300)',
          400: 'var(--sf-teal-400)',
          500: 'var(--sf-teal-500)',
          600: 'var(--sf-teal-600)',
          700: 'var(--sf-teal-700)',
          800: 'var(--sf-teal-800)',
          900: 'var(--sf-teal-900)',
          950: 'var(--sf-teal-950)'
        },
        // Themed surfaces/text — respond to .dark and .sf-field automatically.
        surface: {
          app: 'var(--sf-bg-app)',
          1: 'var(--sf-surface-1)',
          2: 'var(--sf-surface-2)',
          3: 'var(--sf-surface-3)'
        },
        line: {
          DEFAULT: 'var(--sf-border)',
          strong: 'var(--sf-border-strong)'
        },
        content: {
          primary: 'var(--sf-text-primary)',
          secondary: 'var(--sf-text-secondary)',
          muted: 'var(--sf-text-muted)',
          faint: 'var(--sf-text-faint)',
          inverse: 'var(--sf-text-inverse)',
          accent: 'var(--sf-text-accent)'
        },
        // Feedback triads: bg-success-bg text-success-fg border-success-border.
        success: { bg: 'var(--sf-success-bg)', fg: 'var(--sf-success-fg)', border: 'var(--sf-success-border)', solid: 'var(--sf-success-solid)' },
        warning: { bg: 'var(--sf-warning-bg)', fg: 'var(--sf-warning-fg)', border: 'var(--sf-warning-border)', solid: 'var(--sf-warning-solid)' },
        danger: { bg: 'var(--sf-danger-bg)', fg: 'var(--sf-danger-fg)', border: 'var(--sf-danger-border)', solid: 'var(--sf-danger-solid)' },
        info: { bg: 'var(--sf-info-bg)', fg: 'var(--sf-info-fg)', border: 'var(--sf-info-border)', solid: 'var(--sf-info-solid)' },
        // Pipeline stages: bg-stage-won-bg text-stage-won-fg etc.
        stage: {
          'new-solid': 'var(--sf-stage-new-solid)', 'new-bg': 'var(--sf-stage-new-bg)', 'new-fg': 'var(--sf-stage-new-fg)', 'new-border': 'var(--sf-stage-new-border)',
          'contacted-solid': 'var(--sf-stage-contacted-solid)', 'contacted-bg': 'var(--sf-stage-contacted-bg)', 'contacted-fg': 'var(--sf-stage-contacted-fg)', 'contacted-border': 'var(--sf-stage-contacted-border)',
          'qualified-solid': 'var(--sf-stage-qualified-solid)', 'qualified-bg': 'var(--sf-stage-qualified-bg)', 'qualified-fg': 'var(--sf-stage-qualified-fg)', 'qualified-border': 'var(--sf-stage-qualified-border)',
          'sample-solid': 'var(--sf-stage-sample-solid)', 'sample-bg': 'var(--sf-stage-sample-bg)', 'sample-fg': 'var(--sf-stage-sample-fg)', 'sample-border': 'var(--sf-stage-sample-border)',
          'negotiation-solid': 'var(--sf-stage-negotiation-solid)', 'negotiation-bg': 'var(--sf-stage-negotiation-bg)', 'negotiation-fg': 'var(--sf-stage-negotiation-fg)', 'negotiation-border': 'var(--sf-stage-negotiation-border)',
          'won-solid': 'var(--sf-stage-won-solid)', 'won-bg': 'var(--sf-stage-won-bg)', 'won-fg': 'var(--sf-stage-won-fg)', 'won-border': 'var(--sf-stage-won-border)',
          'lost-solid': 'var(--sf-stage-lost-solid)', 'lost-bg': 'var(--sf-stage-lost-bg)', 'lost-fg': 'var(--sf-stage-lost-fg)', 'lost-border': 'var(--sf-stage-lost-border)',
          // Back-compat bare aliases for pre-existing `stage.new` etc (design tool references / dynamic lookups).
          new: '#3B82F6',
          qualified: '#22C55E',
          contacted: '#6366F1',
          sample: '#F59E0B',
          negotiation: '#A855F7',
          won: '#10B981',
          lost: '#EF4444'
        },
        // Back-compat: previously bare, unused-as-Tailwind-classes status colors.
        // Kept 1:1 so any dynamic/JS reference to theme.colors.status.* still resolves.
        status: {
          ready: 'var(--sf-compliance-ready)',
          progress: 'var(--sf-compliance-progress)',
          blocked: 'var(--sf-compliance-blocked)',
          cold: 'var(--sf-compliance-expired)',
          ontrack: '#3B82F6'
        },
        // Back-compat: app's existing slate-toned "neutral" override (body bg/text).
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          600: '#475569',
          900: '#0F172A'
        }
      },
      borderRadius: {
        ctl: 'var(--sf-radius-ctl)',
        card: 'var(--sf-radius-card)',
        panel: 'var(--sf-radius-panel)',
        hero: 'var(--sf-radius-hero)'
      },
      boxShadow: {
        soft: 'var(--sf-shadow-soft)',
        card: 'var(--sf-shadow-card)',
        panel: 'var(--sf-shadow-panel)',
        hero: 'var(--sf-shadow-hero)',
        pop: 'var(--sf-shadow-pop)',
        'focus-ring': '0 0 0 3px var(--sf-focus-ring)'
      },
      fontSize: {
        display: ['var(--sf-text-display)', { lineHeight: 'var(--sf-leading-display)', fontWeight: '600', letterSpacing: '-0.02em' }],
        title: ['var(--sf-text-title)', { lineHeight: 'var(--sf-leading-title)', fontWeight: '600', letterSpacing: '-0.01em' }],
        section: ['var(--sf-text-section)', { lineHeight: 'var(--sf-leading-section)', fontWeight: '600' }],
        body: ['var(--sf-text-body)', { lineHeight: 'var(--sf-leading-body)' }],
        small: ['var(--sf-text-small)', { lineHeight: 'var(--sf-leading-small)' }],
        caption: ['var(--sf-text-caption)', { lineHeight: 'var(--sf-leading-caption)', fontWeight: '600', letterSpacing: 'var(--sf-tracking-eyebrow)' }]
      },
      transitionTimingFunction: {
        sf: 'var(--sf-ease)'
      },
      transitionDuration: {
        fast: 'var(--sf-duration-fast)',
        base: 'var(--sf-duration-base)',
        slow: 'var(--sf-duration-slow)'
      }
    }
  },
  plugins: []
}

export default config
