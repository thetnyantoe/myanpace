import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/navbar";
import { getProfile } from "@/backend/session";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jost = localFont({
  src: "../public/fonts/Jost.ttf",
  variable: "--font-jostFont",
});

export const metadata: Metadata = {
  title: "MyanPace",
  description: "Smart Queue & Ticketing System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "MyanPace",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

// 1. Turned this into an async function
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 2. Fetch the session profile on the server side securely
  const profile = await getProfile();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jost.variable} antialiased`}
      >
        <NavBar initialUser={profile} />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
