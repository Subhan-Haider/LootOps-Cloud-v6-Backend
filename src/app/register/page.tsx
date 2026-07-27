"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles, Loader2, KeyRound } from "lucide-react";
import { api } from "@/lib/api";

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteToken = searchParams.get("invite");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      await api.auth.register({
        email,
        password,
        name,
        inviteToken: inviteToken || undefined
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to register. Token may be invalid.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
          <Sparkles className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registration Successful!</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          You can now log in to the server. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
          <KeyRound className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Create an Account</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {inviteToken ? "You've been invited to join the server." : "Register the first Super Admin account."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name (Optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-md hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950 p-4">
      <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
