import type { Metadata, Viewport } from "next";
import { DM_Sans, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Primary body font - Clean, modern, highly legible
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Display font - Scholarly, refined serif for headings
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

// Mono font - For code and technical content
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "ScholarOS - Academic Productivity Dashboard",
    template: "%s | ScholarOS",
  },
  description:
    "An AI-native academic operations dashboard for professors, lab managers, and research teams. Streamline grants, publications, teaching, and mentorship.",
  keywords: [
    "academic productivity",
    "research management",
    "grant tracking",
    "publication management",
    "task management",
    "professor tools",
    "lab management",
    "academic workflow",
    "research dashboard",
    "AI assistant",
  ],
  authors: [{ name: "ScholarOS Team" }],
  creator: "ScholarOS",
  publisher: "ScholarOS",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scholaros.app",
    siteName: "ScholarOS",
    title: "ScholarOS - Academic Productivity Dashboard",
    description:
      "An AI-native academic operations dashboard for professors, lab managers, and research teams.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ScholarOS Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarOS - Academic Productivity Dashboard",
    description:
      "An AI-native academic operations dashboard for professors, lab managers, and research teams.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${newsreader.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
