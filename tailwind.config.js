/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          base:     'var(--bg-base)',
          surface:  'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        ink: {
          pri: 'var(--text-primary)',
          sec: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          pri:    'var(--accent-primary)',
          sec:    'var(--accent-secondary)',
          cyan:   'var(--accent-cyan)',
          green:  'var(--accent-green)',
          red:    'var(--accent-red)',
          amber:  'var(--accent-amber)',
          violet: '#8b5cf6',
          blue:   '#3b82f6',
        },
        bdr: 'var(--border)',
        'tb-base':      '#09090B',
        'tb-surface':   '#111113',
        'tb-elevated':  '#1C1C1E',
        'tb-border':    '#27272A',
        'tb-amber':     '#F59E0B',
        'tb-green':     '#10B981',
        'tb-red':       '#EF4444',
        'tb-cyan':      '#06B6D4',
        'tb-muted':     '#52525B',
        'tb-secondary': '#A1A1AA',
      },
      backgroundImage: {
        'tb-gradient':    'linear-gradient(135deg, #F59E0B, #EF4444)',
        'tb-gradient-90': 'linear-gradient(90deg, #F59E0B, #EF4444)',
        'login-left':
          'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.18), transparent 50%),' +
          'radial-gradient(circle at 80% 80%, rgba(239,68,68,0.14), transparent 55%)',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'tb-pill':  '6px',
        'tb-ghost': '8px',
        'tb-input': '10px',
        'tb-cta':   '12px',
        'tb-card':  '16px',
        'tb-sheet': '20px',
      },
      boxShadow: {
        'tb-cta':  '0 8px 24px rgba(245,158,11,0.25)',
        'tb-card': '0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
