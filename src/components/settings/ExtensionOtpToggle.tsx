"use client";

import { useEffect, useState } from "react";
import { Puzzle, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { apiInstance } from "@/lib/api";

export function ExtensionOtpToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiInstance
      .get("/api/vault/settings")
      .then((res) => setEnabled(res.data.extensionSkipEmailVerify === true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    const next = !enabled;
    setSaving(true);
    setMessage(null);
    try {
      await apiInstance.post("/api/vault/settings", { extensionSkipEmailVerify: next });
      setEnabled(next);
      setMessage(
        next
          ? "Email verify disabled for extension. Signing in will skip the OTP step."
          : "Email verify re-enabled. Extension will ask for an OTP code on sign-in."
      );
    } catch {
      setMessage("Failed to update setting. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/8 dark:bg-white/[0.03]">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="mb-5 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            enabled ? "bg-amber-50 dark:bg-amber-500/15" : "bg-slate-100 dark:bg-slate-500/15"
          }`}
        >
          {enabled ? (
            <ShieldOff className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              Extension Email Verify
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                enabled
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              }`}
            >
              {enabled ? "SKIPPED" : "REQUIRED"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {enabled
              ? "Extension logs in directly with no OTP email."
              : "Extension requires email OTP each time you sign in."}
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
          <p className="text-sm text-indigo-400">{message}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {enabled ? "Toggle to require OTP again" : "Toggle to skip OTP for extension"}
        </span>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
            enabled ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          {saving ? (
            <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
          ) : (
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          )}
        </button>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] p-3">
        <Puzzle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          When skipped, the browser extension signs into your vault without sending an OTP email.
          Best for trusted personal devices. Re-enable anytime to restore email verification.
        </p>
      </div>
    </div>
  );
}
