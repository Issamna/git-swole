import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { AppNav } from "@/components/app-nav";
import Link from "next/link";

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
          <div className="flex min-h-screen flex-col">
            <AppNav />
            <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
            <footer className="border-t border-[#334753] bg-[#24323a]">
              <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-[#c7d7e0]">
                <span>Built by Christina Branson</span>
                <div className="flex items-center gap-3">
                  <Link
                    href="https://github.com/christinabranson"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#45bb7c] hover:underline"
                  >
                    GitHub
                  </Link>
                  <Link
                    href="https://github.com/christinabranson/git-swole"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#45bb7c] hover:underline"
                  >
                    Repo
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
