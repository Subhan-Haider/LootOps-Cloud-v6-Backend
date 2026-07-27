"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, File, Image as ImageIcon, Video, Music, FileText, Archive, Code2, CheckCheck } from "lucide-react";
import { api, FileData } from "@/lib/api";

function FileIcon({ type }: { type: FileData["type"] }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "image":   return <ImageIcon className={`${cls} text-blue-400`} />;
    case "video":   return <Video className={`${cls} text-pink-400`} />;
    case "audio":   return <Music className={`${cls} text-purple-400`} />;
    case "pdf":     return <FileText className={`${cls} text-red-400`} />;
    case "code":    return <Code2 className={`${cls} text-emerald-400`} />;
    case "archive": return <Archive className={`${cls} text-amber-400`} />;
    default:        return <File className={`${cls} text-gray-400`} />;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load recent uploads when opened
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getFiles()
      .then(data => {
        const sorted = [...(data ?? [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setFiles(sorted.slice(0, 10));
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [open]);

  const unread = Math.max(0, files.length - readCount);

  const handleOpen = () => {
    setOpen(v => !v);
  };

  const handleMarkAllRead = () => {
    setReadCount(files.length);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={handleOpen}
        title="Notifications"
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors relative ${
          open
            ? "border-indigo-400 bg-indigo-50 text-indigo-600 dark:border-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
            : "border-slate-200 bg-white text-gray-500 hover:border-slate-300 hover:text-gray-700 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-slate-600"
        }`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white shadow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-gray-900 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Recent Uploads</span>
              {unread > 0 && (
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-slate-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-gray-400">No recent uploads</p>
              </div>
            ) : (
              <ul>
                {files.map((file, i) => (
                  <li
                    key={`${file.folder}/${file.name}`}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      i < unread ? "bg-indigo-50/50 dark:bg-indigo-950/10" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <FileIcon type={file.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        📁 {file.folder} · {formatBytes(file.size)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                      {timeAgo(file.createdAt)}
                    </span>
                    {i < unread && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {files.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <p className="text-center text-[10px] text-gray-400">
                Showing {files.length} most recent uploads
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
