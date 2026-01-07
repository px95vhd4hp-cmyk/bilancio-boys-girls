import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bilancio Boys & Girls",
  description: "Gestione semplice di spese condivise.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className={spaceGrotesk.variable}>{children}</body>
    </html>
  );
}
