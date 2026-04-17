import type { Metadata } from "next";
import { Syne, Space_Mono, Patrick_Hand } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";
import CookieConsentBanner from "@/components/CookieConsentBanner";

const syne = Syne({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Scrawl — Freeform Whiteboard with LaTeX Math Rendering",
    template: "%s | Scrawl",
  },
  description:
    "Draw, sketch, and write math on a freeform whiteboard. Type LaTeX like \\frac{a}{b} or x^2 and see it rendered instantly. Free, open-source Excalidraw alternative with built-in math support.",
  keywords: [
    "math whiteboard",
    "latex drawing",
    "online whiteboard",
    "math editor",
    "freeform drawing",
    "excalidraw alternative",
    "latex renderer",
    "math notes",
    "handwritten math",
    "katex whiteboard",
  ],
  authors: [{ name: "Scrawl" }],
  creator: "Scrawl",
  metadataBase: new URL("https://scrawl.site"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scrawl.site",
    siteName: "Scrawl",
    title: "Scrawl — Freeform Whiteboard with LaTeX Math Rendering",
    description:
      "Draw, sketch, and write math on a freeform whiteboard. Type LaTeX and see it rendered instantly. Free and open-source.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Scrawl — Freeform whiteboard with LaTeX math rendering",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scrawl — Freeform Whiteboard with LaTeX Math Rendering",
    description:
      "Draw, sketch, and write math on a freeform whiteboard. Type LaTeX and see it rendered instantly.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  other: {
    "theme-color": "#faf9f7",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Scrawl",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${spaceMono.variable} ${patrickHand.variable} h-full antialiased`}
      suppressHydrationWarning={true}
    >
      <body className="h-full w-full overflow-hidden">
        <ThemeSync />
        {children}
        <CookieConsentBanner />
        <Toaster position="bottom-right" toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
