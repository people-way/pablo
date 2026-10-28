import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import Script from "next/script";
import { PwaInstallPrompt } from "@/components/pwa/install-prompt";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0b0c",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Pablo — Chess Coach That Never Sleeps",
  description:
    "Pablo analyzes your chess games and delivers brutally honest improvement advice. Stop guessing. Start winning.",
  applicationName: "Pablo",
  appleWebApp: {
    capable: true,
    title: "Pablo",
    statusBarStyle: "black",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Pablo — Chess Coach That Never Sleeps",
    description:
      "Pablo analyzes your chess games and delivers brutally honest improvement advice. Stop guessing. Start winning.",
    type: "website",
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
      className={`${playfair.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}
      >
        {children}
        <PwaInstallPrompt />
      </body>
      <Script
        src="https://phospho-nanocorp-prod--nanocorp-api-fastapi-app.modal.run/beacon/snippet.js?s=pablo"
        defer
      />
    </html>
  );
}
