"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Shield, Activity, User, Users, Mail, LogOut, Loader2, Clock, Settings, Palette, Sun, Moon } from "lucide-react";
import { AuditLog } from "@/lib/api";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { ChangePassword } from "@/components/settings/ChangePassword";
import { TwoFactorSetup } from "@/components/settings/TwoFactorSetup";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { AISettings } from "@/components/settings/AISettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { SecureVaultSetup } from "@/components/settings/SecureVaultSetup";
import { ExtensionOtpToggle } from "@/components/settings/ExtensionOtpToggle";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const { error: toastError } = useToast();
  const { theme, setTheme } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("user");
  const [activeTab, setActiveTab] = useState("account");
  const user = auth.currentUser;

  const loadData = async () => {
    if (typeof window !== "undefined") {
      setUserRole(localStorage.getItem("user_role") || "user");
    }
    setLoading(true);
    try {
      const logsData = await api.getLogs();
      setLogs(logsData);
    } catch {
      toastError("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const handleSignOut = async () => {
    await api.mfa.logout().catch(() => {});
    await signOut(auth);
  };

  return (
    <>
      <Topbar onRefresh={loadData} />
      <div className="min-h-full bg-slate-100 dark:bg-slate-900 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-8">

          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Settings &amp; Security</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account, security, and activity.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Tabs Navigation (Vertical on Desktop, Horizontal on Mobile) */}
            <div className="md:w-64 shrink-0">
              <div className="flex flex-row md:flex-col overflow-x-auto space-x-2 md:space-x-0 md:space-y-1 pb-px md:pb-0 scrollbar-hide">
                {[
                  { id: "account", label: "Account", icon: User },
                  { id: "security", label: "Security", icon: Shield },
                  { id: "access", label: "Access & Roles", icon: Users },
                  { id: "system", label: "System Config", icon: Settings },
                  { id: "ai", label: "AI Settings", icon: Activity },
                  { id: "activity", label: "Activity Logs", icon: Clock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold md:rounded-xl transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-b-2 md:border-b-0 border-indigo-500 md:bg-indigo-50 text-indigo-700 md:dark:bg-indigo-500/10 dark:text-indigo-400"
                        : "border-b-2 md:border-b-0 border-transparent text-gray-500 hover:text-gray-700 hover:border-slate-300 md:hover:bg-slate-50 md:hover:border-transparent dark:text-gray-400 dark:hover:text-gray-300 md:dark:hover:bg-slate-800/50 dark:hover:border-slate-600"
                    }`}
                  >
                    <tab.icon className={`h-4.5 w-4.5 ${activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-w-0 space-y-8">
            
            {/* ── ACCOUNT TAB ── */}
            {activeTab === "account" && (
              <>
                {/* Profile Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-5 md:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-5">
                    {/* Avatar & User Info */}
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        {user?.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.photoURL} alt="avatar" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-indigo-500/30" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white">
                            {(user?.displayName ?? user?.email ?? "A")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-800 bg-emerald-500" />
                      </div>

                      <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {user?.displayName ?? "User"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{user?.email}</span>
                        </div>
                        {user?.emailVerified !== undefined && (
                          <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            user.emailVerified ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}>
                            {user.emailVerified ? "✓ Email verified" : "⚠ Email not verified"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700 mt-2 sm:mt-0">
                      <span className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                        {userRole.replace('_', ' ')}
                      </span>
                      <button
                        onClick={handleSignOut}
                        title="Sign out"
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>

                {/* Appearance Section */}
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <Palette className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Appearance</h2>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Choose your preferred color theme.</p>
                    <div className="grid grid-cols-2 gap-3 max-w-xs">
                      {/* Light option */}
                      <button
                        onClick={() => setTheme("light")}
                        className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                          theme === "light"
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
                          <Sun className={`h-5 w-5 ${theme === "light" ? "text-amber-500" : "text-gray-400"}`} />
                        </div>
                        <span className={`text-xs font-semibold ${
                          theme === "light" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"
                        }`}>Light</span>
                        {theme === "light" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        )}
                      </button>

                      {/* Dark option */}
                      <button
                        onClick={() => setTheme("dark")}
                        className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                          theme === "dark"
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                          <Moon className={`h-5 w-5 ${theme === "dark" ? "text-indigo-400" : "text-gray-400"}`} />
                        </div>
                        <span className={`text-xs font-semibold ${
                          theme === "dark" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"
                        }`}>Dark</span>
                        {theme === "dark" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── SECURITY TAB ── */}
            {activeTab === "security" && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Security Settings</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChangePassword />
                  <TwoFactorSetup />
                  <SecureVaultSetup />
                  <ExtensionOtpToggle />
                </div>
              </div>
            )}

            {/* ── ACCESS & ROLES TAB ── */}
            {activeTab === "access" && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">User Management & Invites</h2>
                </div>
                <UserManagement />
              </div>
            )}

            {/* ── SYSTEM CONFIG TAB ── */}
            {activeTab === "system" && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">System Configuration</h2>
                </div>
                <SystemSettings />
              </div>
            )}

            {/* ── AI SETTINGS TAB ── */}
            {activeTab === "ai" && (
              <div>
                <AISettings />
              </div>
            )}

            {/* ── ACTIVITY LOGS TAB ── */}
            {activeTab === "activity" && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                  {loading ? (
                    <div className="flex h-32 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                      <Activity className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">No activity yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {logs.slice(0, 50).map((log) => (
                        <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                            <User className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.event}</p>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                                {Object.entries(log.details)
                                  .map(([k, v]) => `${k}: ${String(v)}`)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
