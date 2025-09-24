import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            maxWidth: '100%',
            h1: { fontWeight: '600', letterSpacing: '-0.02em' },
            h2: { fontWeight: '600', marginTop: theme('spacing.10') },
            code: {
              background: theme('colors.gray.100'),
              padding: '0.2rem 0.4rem',
              borderRadius: theme('borderRadius.sm'),
              fontWeight: '500'
            },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            pre: {
              background: theme('colors.gray.900'),
              color: theme('colors.gray.100'),
              padding: theme('spacing.4'),
              borderRadius: theme('borderRadius.lg'),
              lineHeight: '1.4'
            }
          }
        },
        compact: {
          css: {
            p: { marginTop: '0.5rem', marginBottom: '0.5rem' },
            h2: { marginTop: '1.1rem', marginBottom: '.5rem' },
            h3: { marginTop: '1rem', marginBottom: '.4rem' },
            ul: { marginTop: '.5rem', marginBottom: '.5rem' },
            ol: { marginTop: '.5rem', marginBottom: '.5rem' },
            li: { marginTop: '.15rem', marginBottom: '.15rem' }
          }
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.gray.300'),
            '--tw-prose-headings': theme('colors.white'),
            '--tw-prose-links': theme('colors.blue.400'),
            '--tw-prose-code': theme('colors.blue.300'),
            '--tw-prose-pre-bg': theme('colors.gray.800'),
          }
        }
      })
    }
  },
  plugins: [typography]
}

export default config
