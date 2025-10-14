import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pantrii — Your kitchen, organized.",
  description:
    "Meal prep, recipes, grocery lists, and kitchen organization in one modern app.",
  metadataBase: new URL("https://pantrii.example"),
  openGraph: {
    title: "Pantrii",
    description:
      "Your one-stop shop for meal prep, cooking, grocery, and recipes.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pantrii — Your kitchen, organized.",
    description:
      "Meal prep, recipes, grocery lists, and kitchen organization in one modern app.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
