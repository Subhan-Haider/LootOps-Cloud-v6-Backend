"use client";

import { useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, RefreshCw, LogOut, Compass, Sun, Moon } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { NotificationDropdown } from "./NotificationDropdown";
import { useTheme } from "@/lib/theme";

interface TopbarProps {
  onRefresh?: () => void;
}

export function Topbar({ onRefresh }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("q", val);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_role");
    }
    await signOut(auth);
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 md:h-16 shrink-0 items-center gap-1.5 md:gap-4 border-b border-slate-200/60 bg-white/90 backdrop-blur-sm px-3 pl-14 md:px-6 md:pl-6 dark:border-slate-800/60 dark:bg-gray-900/90">
      {/* Search */}
      <div className="flex flex-1 items-center min-w-0">
        <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search files..."
            defaultValue={searchParams.get("q") || ""}
            onChange={handleSearch}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:bg-slate-800 transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        {/* Dark / Light mode toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-gray-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <a
          href="https://server.lootops.me/explore"
          target="_blank"
          rel="noopener noreferrer"
          title="Explore"
          className="flex h-10 md:h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <Compass className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Explore</span>
        </a>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh files"
            className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-gray-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}

        <NotificationDropdown />

        <div className="hidden sm:block mx-1 md:mx-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={handleLogout}
          title="Logout"
          className="flex h-10 md:h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 md:py-1.5 text-xs font-medium text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-red-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4 md:h-3.5 md:w-3.5 shrink-0" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
