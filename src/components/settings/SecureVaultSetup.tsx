"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { Lock, Unlock, KeyRound, CheckCircle, AlertCircle, Loader2, Fingerprint, Mail } from "lucide-react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

type Step = "idle" | "send_email" | "verify_email" | "register_passkey" | "done" | "verify_disable";

export function SecureVaultSetup() {
  const { success, error: toastError } = useToast();

  const [vaultEnabled, setVaultEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const loadStatus = async () => {
    try {
      const status = await api.vault.status();
      setVaultEnabled(status.enabled);
    } catch {
      setVaultEnabled(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSendEmail = async () => {
    setLoading(true);
    setError("");
    try {
      await api.request("/api/vault/email/send", { method: "POST" });
      setStep("verify_email");
      setResendCooldown(60);
      success("Verification code sent to your email!");
    } catch (err: any) {
      setError(err.message || "Failed to send verification email.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (otp.length < 6) { setError("Enter the 6-digit code"); return; }
    
    setLoading(true);
    setError("");
    try {
      await api.request("/api/vault/email/verify", { 
        method: "POST", 
        body: JSON.stringify({ code: otp }) 
      });
      setStep("register_passkey");
      handleRegisterPasskey();
    } catch (err: any) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setError("");
    try {
      const options = await api.request("/api/vault/webauthn/register", { method: "GET" });
      const attResp = await startRegistration({ optionsJSON: options });
      
      await api.request("/api/vault/webauthn/register", {
        method: "POST",
        body: JSON.stringify(attResp),
      });

      setVaultEnabled(true);
      setStep("done");
      success("Vault secured with Windows Hello / Touch ID!");
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError') {
        setError("Setup cancelled. You must register a passkey to secure your vault.");
      } else {
        setError("Failed to register passkey. Ensure your device supports Windows Hello / Touch ID.");
      }
      setStep("verify_email");
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError("");
    try {
      const options = await api.request("/api/vault/webauthn/authenticate", { method: "GET" });
      const asseResp = await startAuthentication({ optionsJSON: options });

      const verifyRes = await api.request("/api/vault/webauthn/authenticate", {
        method: "POST",
        body: JSON.stringify(asseResp),
      });

      if (verifyRes.success) {
        await api.request("/api/vault/disable", { method: "POST", body: JSON.stringify({ token: verifyRes.token }) });
        setVaultEnabled(false);
        setStep("idle");
        success("Secure Vault disabled.");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Disable failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  if (vaultEnabled === null) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 dark:border-white/8 dark:bg-white/[0.03]">
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${vaultEnabled ? "bg-emerald-50 dark:bg-emerald-500/15" : "bg-slate-100 dark:bg-slate-500/15"}`}>
          {vaultEnabled
            ? <Lock className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            : <Unlock className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">Secure Vault</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              vaultEnabled
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
            }`}>
              {vaultEnabled ? "SECURED VIA PASSKEY" : "DISABLED"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">Lock your passwords behind Windows Hello / Touch ID.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {step === "idle" && !vaultEnabled && (
        <button
          onClick={() => { setStep("send_email"); handleSendEmail(); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
          Set Up Secure Vault
        </button>
      )}

      {step === "idle" && vaultEnabled && (
        <div className="flex gap-3 mt-4">
           <button
            onClick={handleRegisterPasskey}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 py-2.5 text-sm font-semibold text-indigo-500 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all"
          >
            <Fingerprint className="h-4 w-4" />
            Add Another Device
          </button>
           <button
            onClick={() => setStep("verify_disable")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-sm font-semibold text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all"
          >
            <Unlock className="h-4 w-4" />
            Disable Vault
          </button>
        </div>
      )}

      {step === "verify_disable" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-slate-300">You must authenticate to disable the vault.</p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep("idle")} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleDisable} disabled={loading} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-all">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Authenticate & Disable"}
            </button>
          </div>
        </div>
      )}

      {step === "send_email" && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sending verification code to your email...</p>
        </div>
      )}

      {step === "verify_email" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15">
              <Mail className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-sm text-gray-700 dark:text-slate-300 flex-1">We've sent a 6-digit code to your email. Enter it below to continue.</p>
          </div>
          
          <div className="space-y-3">
             <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="6-Digit Code"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
              maxLength={6}
            />
          </div>
          
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setStep("idle"); setOtp(""); setError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleVerifyEmail} disabled={loading || otp.length < 6} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify Code"}
            </button>
          </div>
          <div className="text-center mt-2">
            <button 
              onClick={handleSendEmail} 
              disabled={resendCooldown > 0 || loading}
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50 transition-colors"
            >
              {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Didn't receive it? Resend Code"}
            </button>
          </div>
        </div>
      )}

      {step === "register_passkey" && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Fingerprint className="h-10 w-10 animate-pulse text-indigo-500 mb-4" />
          <h4 className="text-md font-bold text-slate-900 dark:text-white mb-2">Check your browser</h4>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Please follow the browser prompts to register Windows Hello, Touch ID, or a security key.</p>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-emerald-300">Vault Secured!</p>
          <p className="text-xs text-slate-400">You can now use your biometric passkey to quickly unlock your vault.</p>
          <button onClick={() => setStep("idle")} className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Go back to settings
          </button>
        </div>
      )}
    </div>
  );
}
