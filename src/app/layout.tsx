import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { AppNav } from "@/components/app-nav";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Git Swole",
  description: "StrongLifts-style 5x5 workout app",
  icons: {
    icon: "/gitswole.png",
    apple: "/gitswole.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        <Providers>
          <AppNav />
          <main className="mx-auto w-full max-w-6xl p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
