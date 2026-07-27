"use client";

import { useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import {
  Shield, Mail, Lock, Eye, EyeOff, AlertCircle,
  CheckCircle, ArrowLeft, Loader2, KeyRound, Sparkles,
  HardDrive, ShieldCheck,
} from "lucide-react";

interface AuthGateProps { children: ReactNode; }
type Mode = "login" | "activate" | "reset";

// ── Single digit box for the 2FA code input ──────────────────────────────────
function MfaDigitBox({ digit }: { digit: string }) {
  return (
    <div className={`flex h-14 w-11 items-center justify-center rounded-xl border text-xl font-bold text-white transition-colors ${
      digit ? "border-indigo-500/70 bg-indigo-500/15" : "border-white/10 bg-white/5"
    }`}>
      {digit || <span className="text-slate-700">—</span>}
    </div>
  );
}

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // 2FA state
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<"app" | "email" | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [mfaVerified, setMfaVerified] = useState(false);
  const [mfaInitDone, setMfaInitDone] = useState(false);

  // Trigger website visit alert on mount
  useEffect(() => {
    api.alerts.visit().catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && !mfaPending && !mfaVerified) {
        try {
          // Check 2FA status — this also verifies the Firebase token is valid
          const { mfaEnabled, mfaMethod } = await api.mfa.status();

          if (mfaEnabled) {
            // Check if we already have a valid MFA session (localStorage token)
            const existingMfaToken = typeof window !== "undefined" ? localStorage.getItem("mfa_token") : null;
            if (existingMfaToken) {
              // Try a real authenticated call to verify the stored MFA token still works
              try {
                const res = await api.get<{success: boolean, profile: {role: string}}>("/auth/me");
                if (res.profile?.role && typeof window !== "undefined") {
                  localStorage.setItem("user_role", res.profile.role);
                }
                // MFA token is still valid — user is fully authenticated
                setMfaVerified(true);
                await api.alerts.login().catch(() => {});
              } catch (authErr: any) {
                // Stored MFA token is expired/invalid — force re-authentication
                if (typeof window !== "undefined") localStorage.removeItem("mfa_token");
                setMfaMethod(mfaMethod);
                setMfaPending(true);
                if (mfaMethod === "email") await api.mfa.sendEmailCode();
              }
            } else {
              // No stored MFA token — show 2FA challenge
              setMfaMethod(mfaMethod);
              setMfaPending(true);
              if (mfaMethod === "email") await api.mfa.sendEmailCode();
            }
          } else {
            // No 2FA required — verify backend access then let in
            try {
              const res = await api.get<{success: boolean, profile: {role: string}}>("/auth/me");
              if (res.profile?.role) {
                if (typeof window !== "undefined") {
                  localStorage.setItem("user_role", res.profile.role);
                }
              }
              await api.alerts.login().catch(() => {});
            } catch (err: any) {
              if (err?.response?.status === 403) {
                await auth.signOut();
                setUser(null);
                setError("Access Denied: Your email is not authorized to use this server.");
                setMode("login");
              }
            }
          }
        } catch (err: any) {
          // If backend returns 403 Forbidden, they are not authorized
          if (err?.response?.status === 403) {
            await auth.signOut();
            setUser(null);
            setError("Access Denied: Your email is not authorized to use this server.");
            setMode("login");
            return;
          }
          // For other errors (server down, network issue), let them in optimistically
        } finally {
          setMfaInitDone(true);
        }
      } else if (u && mfaVerified) {
        // User is logged in and MFA already verified — mark init as done
        setMfaInitDone(true);
      } else if (!u) {
        setMfaInitDone(true);
      }
    });
    return () => unsub();
  }, [mfaPending, mfaVerified]);

  const clearMessages = () => { setError(""); setSuccessMsg(""); };

  const handleGoogle = async () => {
    clearMessages();
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === "activate") {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user);
          setSuccessMsg("Activation email sent! Check your inbox and click the link to activate your account.");
        } else {
          setSuccessMsg("Your account is already active! You can sign in normally.");
        }
        await auth.signOut();
        setMode("login");
      } else if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg("Password reset email sent! Check your inbox.");
        setMode("login");
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? "An error occurred";
      setError(msg.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async () => {
    if (mfaCode.length !== 6) { setMfaError("Please enter the full 6-digit code."); return; }
    setMfaLoading(true);
    setMfaError("");
    try {
      await api.mfa.login(mfaCode);
      const res = await api.get<{success: boolean, profile: {role: string}}>("/auth/me");
      if (res.profile?.role && typeof window !== "undefined") {
        localStorage.setItem("user_role", res.profile.role);
      }
      setMfaVerified(true);
      setMfaPending(false);
      await api.alerts.login().catch(() => {});
    } catch {
      setMfaError("Invalid code. Please check your authenticator app and try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaCodeChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setMfaCode(digits);
    setMfaError("");
  };

  const handleSignOut = async () => {
    await api.mfa.logout().catch(() => {});
    await auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_role");
    }
    setMfaPending(false);
    setMfaMethod(null);
    setMfaVerified(false);
    setMfaCode("");
    setMfaError("");
  };

  const handleResendEmailCode = async () => {
    setMfaError("");
    try {
      await api.mfa.sendEmailCode();
    } catch {
      setMfaError("Failed to resend code.");
    }
  };

  // ── Public Routes Bypass ─────────────────────────────────────────────────────
  if (pathname === "/privacy" || pathname === "/terms" || pathname === "/explore") {
    return <>{children}</>;
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (user === undefined || (user && !mfaInitDone && !mfaPending && !mfaVerified)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain drop-shadow-lg" />
            <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  // ── 2FA Challenge Screen ─────────────────────────────────────────────────────
  if (user && mfaPending && !mfaVerified) {
    const digits = mfaCode.split("").concat(Array(6).fill("")).slice(0, 6);
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-auto bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50 px-4 py-8 z-[100]">
        {/* Soft background blobs */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-indigo-200/40 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-purple-200/40 blur-[100px]" />
        </div>

        <div className="relative w-full max-w-[380px]">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">

            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-5 relative">
                <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain drop-shadow-lg" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Two-Factor Auth</h1>
              <p className="mt-1.5 text-sm text-gray-500">
                {mfaMethod === "email"
                  ? "We've sent a 6-digit code to your email"
                  : "Open your authenticator app and enter the 6-digit code"}
              </p>
            </div>

            {mfaError && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-600">{mfaError}</p>
              </div>
            )}

            {/* Digit display */}
            <div className="mb-5 flex justify-center gap-2">
              {digits.map((d, i) => (
                <div key={i} className={`flex h-14 w-11 items-center justify-center rounded-xl border text-xl font-bold transition-colors ${
                  d ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-300"
                }`}>
                  {d || "—"}
                </div>
              ))}
            </div>

            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={mfaCode}
              onChange={(e) => handleMfaCodeChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleMfaSubmit(); }}
              className="mb-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all"
              placeholder="000000"
            />

            <button
              onClick={handleMfaSubmit}
              disabled={mfaLoading || mfaCode.length !== 6}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            >
              {mfaLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify & Enter"
              )}
            </button>

            {mfaMethod === "email" && (
              <button
                onClick={handleResendEmailCode}
                className="mt-4 w-full text-center text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Send new code
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Sign out and use a different account
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs text-slate-400">storage.lootops.me — Personal Storage Admin</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Logged in with 2FA verified (or no 2FA) ──────────────────────────────────
  if (user && (mfaInitDone || mfaVerified)) return <>{children}</>;

  // ── Login form ───────────────────────────────────────────────────────────────
  const modeConfig: Record<Mode, { heading: string; sub: string; icon: typeof KeyRound }> = {
    login:    { heading: "Welcome back",      sub: "Sign in to your secure storage",   icon: Shield },
    activate: { heading: "Activate Account", sub: "Verify your email to get access",  icon: Sparkles },
    reset:    { heading: "Reset Password",   sub: "We'll send a reset link to your email", icon: KeyRound },
  };

  const { heading, sub, icon: ModeIcon } = modeConfig[mode];

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-auto bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50 px-4 py-8 z-[100]">
      {/* Soft background blobs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-indigo-200/50 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-purple-200/50 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[250px] w-[250px] rounded-full bg-blue-100/60 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/80">

          {/* Logo & Heading */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5">
              <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain drop-shadow-lg" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{heading}</h1>
            <p className="mt-1.5 text-sm text-gray-500">{sub}</p>
          </div>

          {/* Back button */}
          {mode !== "login" && (
            <button onClick={() => { setMode("login"); clearMessages(); }}
              className="mb-5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </button>
          )}

          {successMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-sm text-emerald-700">{successMsg}</p>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Google — login only */}
          {mode === "login" && (
            <>
              <button onClick={handleGoogle} disabled={loading} id="btn-google-signin"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-400">or continue with email</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          )}

          {/* Activate info */}
          {mode === "activate" && (
            <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-xs text-indigo-700 leading-relaxed">
                Enter your credentials below. We&apos;ll send a verification link to activate your account.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input id="input-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all" />
              </div>
            </div>

            {mode !== "reset" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input id="input-password" type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button type="button" onClick={() => { setMode("reset"); clearMessages(); }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" id="btn-email-submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "login" ? "Signing in..." : mode === "activate" ? "Sending activation..." : "Sending..."}
                </span>
              ) : (
                mode === "login" ? "Sign in" : mode === "activate" ? "Send Activation Email" : "Send Reset Email"
              )}
            </button>
          </form>

          {mode === "login" && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="h-px w-full bg-slate-100 dark:bg-slate-700" />
              <button onClick={() => { setMode("activate"); clearMessages(); }}
                className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
                <Sparkles className="h-3.5 w-3.5" />
                Need to activate your account?
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs text-slate-400">storage.lootops.me — Personal Storage Admin</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/privacy" target="_blank" className="text-xs text-slate-400 hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <span className="text-slate-300 text-xs">·</span>
            <a href="/terms" target="_blank" className="text-xs text-slate-400 hover:text-indigo-600 transition-colors">Terms &amp; Conditions</a>
          </div>
        </div>
      </div>
    </div>
  );
}
