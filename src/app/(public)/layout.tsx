import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Storage Admin",
  description: "Storage Server – Legal",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 text-gray-900 min-h-screen">
      {children}
    </div>
  );
}
