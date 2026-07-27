"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { Lock, Unlock, KeyRound, CheckCircle, AlertCircle, Loader2, ArrowRight, ToggleLeft, ToggleRight } from "lucide-react";

type Step = "idle" | "setup" | "verify_disable" | "done" | "change_pin" | "forgot_pin_send" | "forgot_pin_verify";

export function SecureVaultSetup() {
  const { success, error: toastError } = useToast();

  const [vaultEnabled, setVaultEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [disablePin, setDisablePin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [otp, setOtp] = useState("");

  const loadStatus = async () => {
    try {
      const status = await api.vault.status();
      setVaultEnabled(status.enabled);
    } catch {
      setVaultEnabled(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSetup = async () => {
    if (pin.length < 4) { setError("PIN must be at least 4 digits"); return; }
    if (pin !== confirmPin) { setError("PINs do not match"); return; }
    
    setLoading(true);
    setError("");
    try {
      await api.vault.setup(pin);
      setVaultEnabled(true);
      setStep("done");
      success("Secure Vault enabled successfully!");
    } catch {
      setError("Failed to setup Secure Vault.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (disablePin.length < 4) { setError("Enter your PIN"); return; }
    setLoading(true);
    setError("");
    try {
      await api.vault.disable(disablePin);
      setVaultEnabled(false);
      setStep("idle");
      setDisablePin("");
      success("Secure Vault disabled.");
    } catch {
      setError("Incorrect PIN. Could not disable vault.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async () => {
    if (currentPin.length < 4) { setError("Enter current PIN"); return; }
    if (pin.length < 4) { setError("New PIN must be at least 4 digits"); return; }
    if (pin !== confirmPin) { setError("New PINs do not match"); return; }
    
    setLoading(true);
    setError("");
    try {
      await api.vault.changePin(currentPin, pin);
      setStep("done");
      success("Secure Vault PIN changed successfully!");
    } catch {
      setError("Incorrect current PIN or failed to change.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPinSend = async () => {
    setLoading(true);
    setError("");
    try {
      await api.vault.forgotPin();
      setStep("forgot_pin_verify");
      success("Verification email sent!");
    } catch {
      setError("Failed to send verification email.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPinVerify = async () => {
    if (otp.length < 6) { setError("Enter the 6-digit code"); return; }
    if (pin.length < 4) { setError("New PIN must be at least 4 digits"); return; }
    if (pin !== confirmPin) { setError("New PINs do not match"); return; }
    
    setLoading(true);
    setError("");
    try {
      await api.vault.resetPin(otp, pin);
      setStep("done");
      success("Secure Vault PIN reset successfully!");
    } catch {
      setError("Invalid or expired code.");
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
      {/* Header */}
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
              {vaultEnabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">Lock photos and videos behind a secure PIN.</p>
        </div>
        {/* Toggle indicator */}
        {vaultEnabled
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

      {/* ── IDLE STATE ─────────────────────────────────── */}
      {step === "idle" && !vaultEnabled && (
        <button
          onClick={() => { setStep("setup"); setPin(""); setConfirmPin(""); setError(""); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <Lock className="h-4 w-4" />
          Set Up Secure Vault
        </button>
      )}

      {step === "idle" && vaultEnabled && (
        <div className="flex gap-3 mt-4">
           <button
            onClick={() => {
              setStep("change_pin");
              setError("");
              setCurrentPin("");
              setPin("");
              setConfirmPin("");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 py-2.5 text-sm font-semibold text-indigo-500 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all"
          >
            <KeyRound className="h-4 w-4" />
            Change PIN
          </button>
           <button
            onClick={() => {
              setStep("verify_disable");
              setError("");
              setDisablePin("");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-sm font-semibold text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all"
          >
            <Unlock className="h-4 w-4" />
            Disable Vault
          </button>
        </div>
      )}

      {/* ── DISABLE STATE ──────────────────────────────────────── */}
      {step === "verify_disable" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-slate-300">Enter your Vault PIN to disable it. <br/><span className="text-red-400 text-xs">Note: All secure files will be moved back to public storage.</span></p>
          
          <input
            type="password"
            inputMode="numeric"
            value={disablePin}
            onChange={(e) => { setDisablePin(e.target.value.replace(/\D/g, "")); setError(""); }}
            placeholder="Enter PIN"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
          />
          
          <div className="text-center">
            <button onClick={() => { setStep("forgot_pin_send"); handleForgotPinSend(); }} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium">
              Forgot PIN? Verify via Email
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => { setStep("idle"); setDisablePin(""); setError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleDisable} disabled={loading || disablePin.length < 4} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-all">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirm Disable"}
            </button>
          </div>
        </div>
      )}

      {/* ── CHANGE PIN STATE ──────────────────────────────────────── */}
      {step === "change_pin" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-slate-300">Enter your current PIN to set a new one.</p>
          
          <div className="space-y-3">
             <input
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="Current PIN"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
            />
            
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="New PIN (min 4 digits)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
            />

            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="Confirm New PIN"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
            />
          </div>

          <div className="text-center">
            <button onClick={() => { setStep("forgot_pin_send"); handleForgotPinSend(); }} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium">
              Forgot PIN? Verify via Email
            </button>
          </div>
          
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setStep("idle"); setCurrentPin(""); setPin(""); setConfirmPin(""); setError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleChangePin} disabled={loading || currentPin.length < 4 || pin.length < 4 || confirmPin.length < 4} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save New PIN"}
            </button>
          </div>
        </div>
      )}

      {/* ── FORGOT PIN VERIFY STATE ──────────────────────────────────────── */}
      {step === "forgot_pin_send" && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sending verification code to your email...</p>
        </div>
      )}

      {step === "forgot_pin_verify" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-slate-300">We've sent a 6-digit code to your email. Enter it below to reset your PIN.</p>
          
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
            
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="New PIN (min 4 digits)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
            />

            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="Confirm New PIN"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
            />
          </div>
          
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setStep("idle"); setOtp(""); setPin(""); setConfirmPin(""); setError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleForgotPinVerify} disabled={loading || otp.length < 6 || pin.length < 4 || confirmPin.length < 4} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all">
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Reset PIN"}
            </button>
          </div>
        </div>
      )}

      {/* ── SETUP STATE ──────────────────────────────────────── */}
      {step === "setup" && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-gray-700 dark:text-slate-300">Create a PIN to protect your vault. You will need this PIN to view hidden files.</p>
          
          <div className="space-y-3">
             <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="Enter PIN (min 4 digits)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
            />
            
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="Confirm PIN"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder-slate-600"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep("idle"); setPin(""); setConfirmPin(""); setError(""); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-gray-600 hover:bg-slate-50 dark:border-white/8 dark:text-slate-400 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSetup}
              disabled={loading || pin.length < 4 || confirmPin.length < 4}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Set PIN"}
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
          <p className="text-sm font-semibold text-emerald-300">Secure Vault is Ready!</p>
          <p className="text-xs text-slate-400">You can now right-click files to move them to your vault.</p>
          <button onClick={() => setStep("idle")} className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Go back to settings
          </button>
        </div>
      )}
    </div>
  );
}
