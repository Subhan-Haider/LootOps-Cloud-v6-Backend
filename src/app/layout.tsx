import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AuthGate } from "@/components/auth/AuthGate";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ThemeProvider } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Storage Admin",
  description: "Storage Server Admin Dashboard",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      suppressHydrationWarning
    >
      {/* Blocking script: apply saved theme before first paint to prevent flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="h-full flex overflow-hidden bg-[var(--background)]" suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <AuthGate>
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
            </AuthGate>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
