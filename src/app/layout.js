import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bilancio Boys & Girls",
  description: "Gestione semplice di spese condivise.",
  applicationName: "Bilancio Boys & Girls",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Bilancio Boys & Girls",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#0a4a8a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={spaceGrotesk.variable}>{children}</body>
    </html>
  );
}
