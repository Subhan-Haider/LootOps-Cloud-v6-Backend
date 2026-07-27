"use client";

import { useState } from "react";
import { X, Send, Clock, Lock } from "lucide-react";
import { FileData, api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

interface BulkShareModalProps {
  files: FileData[];
  onClose: () => void;
}

export function BulkShareModal({ files, onClose }: BulkShareModalProps) {
  const { success, error: toastError } = useToast();
  const [durationStr, setDurationStr] = useState<string>("0");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  if (!files || files.length === 0) return null;

  const handleBulkShare = async () => {
    if (!email) {
      toastError("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const durH = parseInt(durationStr);
      const durationMs = durH > 0 ? durH * 60 * 60 * 1000 : null;
      
      const filesPayload = files.map(f => ({ folder: f.folder, name: f.name }));
      
      await api.bulkShareEmail(filesPayload, email, durationMs, password || undefined);
      success(`Successfully sent ${files.length} secure link${files.length > 1 ? 's' : ''} to ${email}`);
      onClose();
    } catch (err: any) {
      toastError(err.response?.data?.error || "Failed to send bulk share email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
              <Send className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share via Email</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-48">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 mt-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Recipient Email
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

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
            onClick={handleBulkShare}
            disabled={loading || !email}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {loading ? "Sending Email..." : "Send Links via Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
