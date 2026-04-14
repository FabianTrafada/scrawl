import type { Metadata } from "next";
import { Outfit, Fira_Code, Patrick_Hand } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
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
  metadataBase: new URL("https://scrawl-lovat.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scrawl-lovat.vercel.app",
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
      className={`${outfit.variable} ${firaCode.variable} ${patrickHand.variable} h-full antialiased`}
    >
      <body className="h-full w-full overflow-hidden">{children}</body>
    </html>
  );
}
