import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import Link from "next/link";
import { Dumbbell, LineChart, Settings, Sun, Moon } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Muszle — Minimalist Gym Tracker",
  description: "Track your workouts with a clean, minimal interface.",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="black" rx="20"/><text x="50" y="50" dominant-baseline="central" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold" font-size="60">M</text></svg>',
  },
};

import { ThemeToggle } from "../components/theme-toggle";
import { AuthWrapper } from "../components/auth-wrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthWrapper>
              {/* Navigation Header */}
              <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-900 dark:bg-white flex items-center justify-center rounded-xl shadow-sm">
                      <span className="font-bold text-white dark:text-slate-900 text-lg tracking-tighter">M</span>
                    </div>
                    <span className="font-bold text-xl tracking-tight hidden sm:block">
                      Muszle
                    </span>
                  </div>
                  
                  <nav className="flex items-center gap-1 sm:gap-4">
                    <Link 
                      href="/" 
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      <Dumbbell className="w-4 h-4" />
                      <span className="hidden sm:inline">Tracker</span>
                    </Link>
                    <Link 
                      href="/analysis" 
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      <LineChart className="w-4 h-4" />
                      <span className="hidden sm:inline">Analysis</span>
                    </Link>
                    <Link 
                      href="/settings" 
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Settings</span>
                    </Link>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 sm:mx-2"></div>
                    <ThemeToggle />
                  </nav>
                </div>
              </header>

              {/* Main Content Area */}
              <main className="flex-1 flex flex-col">{children}</main>
            </AuthWrapper>
          </ThemeProvider>
      </body>
    </html>
  );
}
