import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Typography - Scholarly display font paired with clean body
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-newsreader)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "0.875rem" }],
      },
      // Colors - Warm academic palette
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-bg))",
          border: "hsl(var(--sidebar-border))",
        },
        surface: {
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        // Academic category colors - refined and harmonious
        category: {
          research: {
            DEFAULT: "hsl(var(--category-research))",
            light: "hsl(var(--category-research) / 0.15)",
            dark: "hsl(var(--category-research) / 0.25)",
          },
          teaching: {
            DEFAULT: "hsl(var(--category-teaching))",
            light: "hsl(var(--category-teaching) / 0.15)",
            dark: "hsl(var(--category-teaching) / 0.25)",
          },
          grants: {
            DEFAULT: "hsl(var(--category-grants))",
            light: "hsl(var(--category-grants) / 0.15)",
            dark: "hsl(var(--category-grants) / 0.25)",
          },
          mentorship: {
            DEFAULT: "hsl(var(--category-mentorship))",
            light: "hsl(var(--category-mentorship) / 0.15)",
            dark: "hsl(var(--category-mentorship) / 0.25)",
          },
          admin: {
            DEFAULT: "hsl(var(--category-admin))",
            light: "hsl(var(--category-admin) / 0.15)",
            dark: "hsl(var(--category-admin) / 0.25)",
          },
        },
        // Priority colors
        priority: {
          p1: {
            DEFAULT: "hsl(var(--priority-p1))",
            light: "hsl(var(--priority-p1) / 0.12)",
          },
          p2: {
            DEFAULT: "hsl(var(--priority-p2))",
            light: "hsl(var(--priority-p2) / 0.12)",
          },
          p3: {
            DEFAULT: "hsl(var(--priority-p3))",
            light: "hsl(var(--priority-p3) / 0.12)",
          },
          p4: {
            DEFAULT: "hsl(var(--priority-p4))",
            light: "hsl(var(--priority-p4) / 0.12)",
          },
        },
      },
      // Spacing scale extensions
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      // Border radius
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      // Box shadows - refined and warm
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "inner-sm": "inset 0 1px 2px 0 rgb(0 0 0 / 0.05)",
        glow: "0 0 20px hsl(var(--primary) / 0.25)",
        "glow-lg": "0 0 40px hsl(var(--primary) / 0.35)",
      },
      // Keyframes
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-left": {
          from: { opacity: "0", transform: "translateX(10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-right": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-1deg)" },
          "50%": { transform: "rotate(1deg)" },
        },
        "progress-bar": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
      },
      // Animations
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-out": "fade-out 0.3s ease-out forwards",
        "slide-up": "slide-up 0.3s ease-out forwards",
        "slide-down": "slide-down 0.3s ease-out forwards",
        "slide-left": "slide-left 0.3s ease-out forwards",
        "slide-right": "slide-right 0.3s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "scale-out": "scale-out 0.2s ease-out forwards",
        shimmer: "shimmer 1.5s infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "bounce-subtle": "bounce-subtle 1s ease-in-out infinite",
        wiggle: "wiggle 0.3s ease-in-out",
        "progress-bar": "progress-bar 0.5s ease-out forwards",
      },
      // Backdrop blur
      backdropBlur: {
        xs: "2px",
      },
      // Z-index scale
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
      },
      // Screen breakpoints
      screens: {
        xs: "475px",
        "3xl": "1920px",
      },
      // Transition timing
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "smooth-out": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      // Container
      container: {
        center: true,
        padding: {
          DEFAULT: "1rem",
          sm: "1.5rem",
          lg: "2rem",
          xl: "2.5rem",
          "2xl": "3rem",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
