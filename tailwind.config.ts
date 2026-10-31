import type { Config } from "tailwindcss";

/**
 * Tokens declarados em `src/app/globals.css` como triplas HSL
 * (`--token: h s% l%`) e consumidos aqui via `hsl(var(--token))`.
 * Uma alteração em globals.css propaga-se a toda a aplicação.
 */
const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: ["var(--font-merriweather)", "Georgia", "Cambria", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--background))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--background))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--background))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-md)",
        sm: "calc(var(--radius-md) - 4px)",
        xl: "var(--radius-lg)",
        "2xl": "var(--radius-xl)",
      },
      boxShadow: {
        // Sombras discretas e difusas, coerentes com os dois temas.
        sm: "0 1px 2px 0 hsl(var(--foreground) / 0.04)",
        DEFAULT: "0 1px 3px 0 hsl(var(--foreground) / 0.06), 0 1px 2px -1px hsl(var(--foreground) / 0.06)",
        md: "0 4px 12px -2px hsl(var(--foreground) / 0.08)",
        lg: "0 12px 32px -8px hsl(var(--foreground) / 0.12)",
        xl: "0 24px 56px -16px hsl(var(--foreground) / 0.16)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        fast: "140ms",
        base: "220ms",
        slow: "320ms",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      typography: (theme: (path: string) => string) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": "hsl(var(--foreground) / 0.88)",
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-links": "hsl(var(--primary))",
            "--tw-prose-bold": "hsl(var(--foreground))",
            "--tw-prose-bullets": "hsl(var(--muted-foreground))",
            "--tw-prose-quotes": "hsl(var(--foreground) / 0.85)",
            "--tw-prose-quote-borders": "hsl(var(--border))",
            "--tw-prose-hr": "hsl(var(--border))",
            "--tw-prose-code": "hsl(var(--foreground))",
            "--tw-prose-th-borders": "hsl(var(--border))",
            "--tw-prose-td-borders": "hsl(var(--border))",
            maxWidth: "none",
            fontSize: "0.9375rem",
            lineHeight: "1.7",
            h1: { fontWeight: "600", letterSpacing: "-0.02em" },
            h2: { fontWeight: "600", letterSpacing: "-0.015em" },
            h3: {
              color: "hsl(var(--primary))",
              fontWeight: "600",
              fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            },
            code: {
              background: "hsl(var(--muted))",
              padding: "0.15em 0.4em",
              borderRadius: "0.375rem",
              fontWeight: "500",
              fontSize: "0.875em",
            },
            "code::before": { content: "none" },
            "code::after": { content: "none" },
            pre: {
              background: "hsl(var(--surface-2))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
            },
            table: { fontSize: "0.875rem" },
          },
        },
        invert: {
          css: {
            "--tw-prose-body": "hsl(var(--foreground) / 0.9)",
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-links": "hsl(var(--primary))",
            "--tw-prose-bold": "hsl(var(--foreground))",
            h3: {
              color: "hsl(var(--primary))",
              fontWeight: "600",
              fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            },
          },
        },
      }),
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;
