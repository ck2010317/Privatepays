import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PrivatePay - Non-KYC Neo Bank",
  description: "Privacy-first banking with virtual prepaid cards. No KYC required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-gray-950 text-white`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
