import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Import the new LiveKit Provider
import { LiveKitProvider } from "./context/SocketContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VeloCall | Neural Communication",
  description: "High-performance video calls powered by LiveKit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050505]">
        {/* LiveKit Provider - Replaces old ContextProvider */}
        <LiveKitProvider>
          {children}
        </LiveKitProvider>
      </body>
    </html>
  );
}