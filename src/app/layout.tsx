import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Providers from "./providers";
import WalletButton from "../components/WalletButton";

export const metadata: Metadata = {
  title: "QuantumQie — Factory Builder",
  description: "Build your factory empire. A Factorio-inspired browser game built with Next.js and Canvas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>
        <Providers>
          <nav className="global-nav">
            <div className="nav-logo">QuantumQie</div>
            <div className="nav-right">
              <div className="nav-links">
                <Link href="/game" className="nav-link">Factory Hub</Link>
                <Link href="/workers" className="nav-link">Worker Hub</Link>
              </div>
              <WalletButton />
            </div>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
