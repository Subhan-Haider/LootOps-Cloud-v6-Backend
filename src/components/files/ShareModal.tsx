"use client";

import { useState } from "react";
import { X, Copy, Share2, Check, Clock, Lock } from "lucide-react";
import { FileData, api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

interface ShareModalProps {
  file: FileData | null;
  onClose: () => void;
}

export function ShareModal({ file, onClose }: ShareModalProps) {
  const { success, error: toastError } = useToast();
  const [durationStr, setDurationStr] = useState<string>("0");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const handleCreateShare = async () => {
    setLoading(true);
    setShareUrl(null);
    try {
      const durH = parseInt(durationStr);
      const durationMs = durH > 0 ? durH * 60 * 60 * 1000 : null;
      const url = await api.createShare(file.folder, file.name, durationMs, password || undefined);
      setShareUrl(url);
      success("Share link generated!");
    } catch (err: any) {
      toastError(err.response?.data?.error || "Failed to create share link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      let copyUrl = shareUrl;
      if (copyUrl.startsWith("/")) {
        copyUrl = window.location.origin + copyUrl;
      }
      navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
              <Share2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share File</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-48">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!shareUrl ? (
          <div className="space-y-4 mt-6">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Clock className="inline h-3.5 w-3.5 mr-1 mb-0.5" />
                Expiry Time
              </label>
              <select
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="0">Never (Permanent)</option>
                <option value="1">1 Hour</option>
                <option value="24">24 Hours</option>
                <option value="168">7 Days</option>
                <option value="720">30 Days</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                <Lock className="inline h-3.5 w-3.5 mr-1 mb-0.5" />
                Password (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            <button
              onClick={handleCreateShare}
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
            >
              {loading ? "Generating..." : "Generate Link"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Share Link Ready
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-1 pl-3 dark:border-emerald-800 dark:bg-slate-900">
                <p className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">{shareUrl}</p>
                <button
                  onClick={handleCopy}
                  className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
