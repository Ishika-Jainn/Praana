import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Noto_Sans_Devanagari, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const noto = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "Praana — Livestock Health Intelligence",
  description: "From one animal to an entire disease network. Digital twins, field reporting and geospatial livestock surveillance.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${fraunces.variable} ${noto.variable}`}>{children}</body>
    </html>
  );
}
