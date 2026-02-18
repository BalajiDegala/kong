import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "@/components/theme-provider";

const displayFont = Geist_Mono({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kong",
  description: "Kong: Rule Your Workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} antialiased`}
      >
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
