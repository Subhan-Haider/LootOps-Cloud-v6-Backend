"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ShieldCheck, ShieldOff, QrCode, Smartphone, CheckCircle,
  AlertCircle, Loader2, ArrowRight, ToggleLeft, ToggleRight,
  Mail, Send,
} from "lucide-react";

interface Props {
  onStatusChange?: (enabled: boolean) => void;
}

type Step = "idle" | "method_select" | "qr" | "email_verify" | "app_verify" | "done";
type Method = "app" | "email";

function CodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <div
          key={i}
          className={`flex h-12 w-10 items-center justify-center rounded-xl border text-lg font-bold transition-colors ${
            d ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-500/60 dark:bg-indigo-500/10 dark:text-white" : "border-slate-200 bg-slate-50 text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
          }`}
        >
          {d || <span className="text-gray-400 dark:text-slate-600">—</span>}
        </div>
      ))}
    </div>
  );
}

export function TwoFactorSetup({ onStatusChange }: Props) {
  const { success, error: toastError } = useToast();

  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [activeMethod, setActiveMethod] = useState<Method | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    try {
      const { mfaEnabled, mfaMethod } = await api.mfa.status();
      setMfaEnabled(mfaEnabled);
      if (mfaMethod) setActiveMethod(mfaMethod);
    } catch {
      setMfaEnabled(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleStartAppSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const { secret: s, qrCode: q } = await api.mfa.generate();
      setSecret(s);
      setQrCode(q);
      setStep("qr");
    } catch {
      toastError("Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEmailSetup = async () => {
    setLoading(true);
    setError("");
    try {
      await api.mfa.sendEmailCode();
      setStep("email_verify");
      success("Verification code sent to your email!");
    } catch {
      toastError("Failed to send email. Check SMTP settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (method: Method) => {
    if (code.length !== 6) { setError("Enter the full 6-digit code"); return; }
    setLoading(true);
    setError("");
    try {
      await api.mfa.verifySetup(code, method === "app" ? secret : undefined, method);
      setMfaEnabled(true);
      setActiveMethod(method);
      setStep("done");
      onStatusChange?.(true);
      success("Two-factor authentication enabled!");
    } catch {
      setError(method === "app" 
        ? "Invalid code — make sure your app is synced to the correct time."
        : "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) { setError("Enter the full 6-digit code"); return; }
    setLoading(true);
    setError("");
    try {
      await api.mfa.disable(disableCode);
      setMfaEnabled(false);
      setActiveMethod(null);
      setShowDisable(false);
      setDisableCode("");
      onStatusChange?.(false);
      success("Two-factor authentication disabled.");
    } catch {
      setError("Invalid code. Could not disable 2FA.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setter(digits);
    setError("");
  };

  if (mfaEnabled === null) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 dark:border-white/8 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mfaEnabled ? "bg-emerald-50 dark:bg-emerald-500/15" : "bg-slate-100 dark:bg-slate-500/15"}`}>
          {mfaEnabled
            ? <ShieldCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            : <ShieldOff className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">Two-Factor Authentication</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              mfaEnabled
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
            }`}>
              {mfaEnabled ? `ENABLED (${activeMethod?.toUpperCase()})` : "DISABLED"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">Protect your account with an extra layer of security.</p>
        </div>
        {/* Toggle indicator */}
        {mfaEnabled
          ? <ToggleRight className="h-6 w-6 shrink-0 text-emerald-400" />
          : <ToggleLeft className="h-6 w-6 shrink-0 text-slate-500" />
        }
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── IDLE / ENABLED STATE ─────────────────────────────────── */}
      {step === "idle" && !mfaEnabled && (
        <button
          onClick={() => setStep("method_select")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <ShieldCheck className="h-4 w-4" />
          Set Up 2FA
        </button>
      )}

      {step === "idle" && mfaEnabled && !showDisable && (
        <button
          onClick={() => {
            setShowDisable(true);
            setError("");
            if (activeMethod === "email") {
              api.mfa.sendEmailCode()
                .then(() => success("Verification code sent to your email!"))
                .catch(() => toastError("Failed to send verification code."));
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-sm font-semibold text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all"
        >
          <ShieldOff className="h-4 w-4" />
          Disable 2FA
        </button>
      )}

      {step === "idle" && mfaEnabled && showDisable && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-slate-300">Enter the 6-digit code from your {activeMethod === "app" ? "authenticator app" : "email"} to disable 2FA:</p>
          <div className="relative mx-auto w-full max-w-sm">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(e) => handleCodeInput(e.target.value, setDisableCode)}
              className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />
            <CodeInput value={disableCode} onChange={setDisableCode} />
          </div>
          
          {activeMethod === "email" && (
            <button 
              onClick={() => api.mfa.sendEmailCode().then(() => success("Code resent!")).catch(() => toastError("Failed to send code."))}
              className="w-full text-center text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Send new code to email
            </button>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowDisable(false); setDisableCode(""); setError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleDisable} disabled={loading || disableCode.length !== 6} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-all">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirm Disable"}
            </button>
          </div>
        </div>
      )}

      {/* ── METHOD SELECT ──────────────────────────────────────── */}
      {step === "method_select" && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-gray-700 dark:text-slate-300 mb-2">Choose how you want to receive your security codes:</p>
          
          <button
            onClick={handleStartAppSetup}
            disabled={loading}
            className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/20">
              <Smartphone className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Authenticator App</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Get codes from an app like Google Authenticator or Authy.</p>
            </div>
          </button>

          <button
            onClick={handleStartEmailSetup}
            disabled={loading}
            className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-500/20">
              <Mail className="h-5 w-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Email Address</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Receive a one-time code in your inbox each time you sign in.</p>
            </div>
          </button>

          <button onClick={() => setStep("idle")} className="mt-2 w-full text-center text-xs font-medium text-slate-500 hover:text-slate-400">
            Cancel
          </button>
        </div>
      )}

      {/* ── APP SETUP: SHOW QR ──────────────────────────────────────── */}
      {step === "qr" && (
        <div className="space-y-5 mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <Smartphone className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <span>Scan this QR code with your authenticator app</span>
          </div>

          {qrCode && (
            <div className="flex justify-center">
              <div className="rounded-2xl bg-white p-4 shadow-2xl shadow-indigo-500/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="2FA QR Code" className="h-44 w-44" />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/8 dark:bg-white/5">
            <p className="mb-1 text-xs text-gray-500 dark:text-slate-400">Or enter this key manually:</p>
            <p className="break-all font-mono text-xs text-indigo-600 dark:text-indigo-300 tracking-widest">{secret}</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("method_select")} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Back
            </button>
            <button
              onClick={() => { setStep("app_verify"); setCode(""); setError(""); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all"
            >
              I&apos;ve scanned it
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── APP SETUP: VERIFY ───────────────────────────────────────── */}
      {step === "app_verify" && (
        <div className="space-y-5 mt-4">
          <p className="text-sm text-gray-700 dark:text-slate-300">
            Enter the <strong className="text-gray-900 dark:text-white">6-digit code</strong> from your authenticator app to enable 2FA:
          </p>

          <CodeInput value={code} onChange={setCode} />
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => handleCodeInput(e.target.value, setCode)}
            placeholder="000000"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600 dark:focus:border-indigo-500/60 dark:focus:ring-indigo-500/20"
          />

          <div className="flex gap-3">
            <button onClick={() => { setStep("qr"); setCode(""); setError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Back
            </button>
            <button
              onClick={() => handleVerifySetup("app")}
              disabled={loading || code.length !== 6}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify Code"}
            </button>
          </div>
        </div>
      )}

      {/* ── EMAIL SETUP: VERIFY ───────────────────────────────────────── */}
      {step === "email_verify" && (
        <div className="space-y-5 mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <Mail className="h-5 w-5 text-purple-500 dark:text-purple-400" />
            <span>We sent a 6-digit code to your email.</span>
          </div>

          <CodeInput value={code} onChange={setCode} />
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => handleCodeInput(e.target.value, setCode)}
            placeholder="000000"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600 dark:focus:border-purple-500/60 dark:focus:ring-purple-500/20"
          />

          <button 
            onClick={handleStartEmailSetup}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-slate-400 hover:text-white"
          >
            <Send className="h-3 w-3" /> Resend code
          </button>

          <div className="flex gap-3">
            <button onClick={() => { setStep("method_select"); setCode(""); setError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Back
            </button>
            <button
              onClick={() => handleVerifySetup("email")}
              disabled={loading || code.length !== 6}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify Email"}
            </button>
          </div>
        </div>
      )}

      {/* ── DONE ─────────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-emerald-300">2FA is now active!</p>
          <p className="text-xs text-slate-400">You will be asked for your {activeMethod === "app" ? "authenticator" : "email"} code each time you sign in.</p>
          <button onClick={() => setStep("idle")} className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Go back to settings
          </button>
        </div>
      )}
    </div>
  );
}
