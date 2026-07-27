"use client";

import { useState } from "react";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function ChangePassword() {
  const { success, error: toastError } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isGoogle = auth.currentUser?.providerData?.some(
    (p) => p.providerId === "google.com"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (next.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser!;

      // Re-authenticate first
      if (isGoogle) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        const credential = EmailAuthProvider.credential(user.email!, current);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user, next);
      setDone(true);
      setCurrent(""); setNext(""); setConfirm("");
      success("Password changed successfully!");
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? "Failed to change password";
      setError(msg.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15">
          <KeyRound className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {isGoogle ? "Re-authenticate with Google to set a new password." : "Update your account password."}
          </p>
        </div>
      </div>

      {done && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-300">Password changed successfully!</p>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isGoogle && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Current password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="••••••••"
                required={!isGoogle}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600 dark:focus:border-indigo-500/60 dark:focus:ring-indigo-500/20 transition-all"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">New password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type={showNext ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Min. 6 characters"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600 dark:focus:border-indigo-500/60 dark:focus:ring-indigo-500/20 transition-all"
            />
            <button type="button" onClick={() => setShowNext(!showNext)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Confirm new password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 transition-all ${
                confirm && next !== confirm
                  ? "border-red-500 focus:ring-red-500 bg-red-50 text-red-900 placeholder-red-400 dark:bg-red-500/10 dark:text-red-100"
                  : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 text-gray-900 placeholder-gray-400 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
              }`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </span>
          ) : (
            isGoogle ? "Re-authenticate & Set Password" : "Change Password"
          )}
        </button>
      </form>
    </div>
  );
}
