// Every colour token resolves through a CSS variable that holds bare RGB channels
// (`--bg-base: 9 9 11` in src/index.css), so a theme only has to swap the variables.
// `<alpha-value>` is what lets `/NN` opacity modifiers work on these tokens.
const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          base:     channel('--bg-base'),
          surface:  channel('--bg-surface'),
          elevated: channel('--bg-elevated'),
        },
        ink: {
          pri: channel('--text-primary'),
          sec: channel('--text-secondary'),
          muted: channel('--text-muted'),
          // Text on the CTA gradient or a photo: white in every theme.
          'on-accent': channel('--text-on-accent'),
        },
        accent: {
          pri:    channel('--accent-primary'),
          sec:    channel('--accent-secondary'),
          cyan:   channel('--accent-cyan'),
          green:  channel('--accent-green'),
          red:    channel('--accent-red'),
          amber:  channel('--accent-amber'),
          violet: channel('--accent-violet'),
          blue:   channel('--accent-blue'),
        },
        bdr: channel('--border'),
        scrim: channel('--scrim'),
        // Same variables as the semantic aliases above: `tb-amber` and `accent-amber`
        // are one colour, so a theme cannot change one without the other.
        'tb-base':      channel('--bg-base'),
        'tb-surface':   channel('--bg-surface'),
        'tb-elevated':  channel('--bg-elevated'),
        'tb-border':    channel('--border'),
        'tb-amber':     channel('--accent-amber'),
        'tb-green':     channel('--accent-green'),
        'tb-red':       channel('--accent-red'),
        'tb-cyan':      channel('--accent-cyan'),
        'tb-muted':     channel('--text-muted'),
        'tb-secondary': channel('--text-secondary'),
      },
      backgroundImage: {
        'tb-gradient':    'linear-gradient(135deg, #F59E0B, #EF4444)',
        'tb-gradient-90': 'linear-gradient(90deg, #F59E0B, #EF4444)',
        // The gradients above stay the same in every theme; these two do not.
        'login-left': 'var(--tb-login-glow)',
        // For `bg-clip-text` only: text needs darker ends than a filled button in light.
        'tb-gradient-text': 'var(--tb-gradient-text)',
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
        'tb-cta':  'var(--tb-shadow-cta)',
        'tb-card': 'var(--tb-shadow-card)',
      },
    },
  },
  plugins: [],
}
