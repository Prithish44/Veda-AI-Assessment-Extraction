import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "VedaAI — Assessment Extraction & Answer Mapping",
  description: "Upload a question paper and a student's answer sheet to extract, map, and grade answers automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-canvas">{children}</body>
    </html>
  );
}
