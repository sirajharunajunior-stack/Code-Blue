import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CODE-BLUE · Astronaut Health",
    template: "%s · CODE-BLUE",
  },
  description:
    "CODE-BLUE is a demonstration astronaut health platform: vitals, a body map, guided health checks and spaceflight hazards. Not a medical device.",
  applicationName: "CODE-BLUE",
  keywords: ["astronaut health", "spaceflight", "biometrics"],
};

export const viewport = {
  themeColor: "#03060a",
  colorScheme: "dark" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
