"use client";

import { useState } from "react";
import { X, Move, Pin, PinOff, ShieldCheck, ShieldAlert, Clock, ChevronRight, Lock } from "lucide-react";
import { FileData, api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

interface BulkActionsModalProps {
  files: FileData[];
  folders: string[];
  onClose: () => void;
  onSuccess: () => void;
}

type Action = "move" | "pin" | "unpin" | "make-public" | "make-private" | "expiry" | "vault";

const DURATION_PRESETS = [
  { label: "1 Hour",   ms: 1 * 60 * 60 * 1000 },
  { label: "6 Hours",  ms: 6 * 60 * 60 * 1000 },
  { label: "24 Hours", ms: 24 * 60 * 60 * 1000 },
  { label: "7 Days",   ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 Days",  ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "Never",    ms: null },
];

const ACTIONS: { id: Action; icon: React.ElementType; label: string; desc: string; color: string; bg: string }[] = [
  { id: "move",         icon: Move,        label: "Move to...",   desc: "Move files to another folder",       color: "text-indigo-600 dark:text-indigo-400",  bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  { id: "pin",          icon: Pin,         label: "Pin to Top",   desc: "Pin files so they appear first",     color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-950/40" },
  { id: "unpin",        icon: PinOff,      label: "Unpin",        desc: "Remove pinned status from files",    color: "text-slate-600 dark:text-slate-400",    bg: "bg-slate-100 dark:bg-slate-800" },
  { id: "make-public",  icon: ShieldCheck, label: "Make Public",  desc: "Allow anyone with a link to access", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  { id: "make-private", icon: ShieldAlert, label: "Make Private", desc: "Restrict access to admins only",     color: "text-rose-600 dark:text-rose-400",      bg: "bg-rose-50 dark:bg-rose-950/40" },
  { id: "expiry",       icon: Clock,       label: "Set Expiry",   desc: "Auto-delete files after a duration", color: "text-violet-600 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-violet-950/40" },
  { id: "vault",        icon: Lock,        label: "Move to Vault",desc: "Move files to Secure Vault",         color: "text-purple-600 dark:text-purple-400",  bg: "bg-purple-50 dark:bg-purple-950/40" },
];

export function BulkActionsModal({ files, folders, onClose, onSuccess }: BulkActionsModalProps) {
  const { success, error: toastError } = useToast();
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [targetFolder, setTargetFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [expiryPreset, setExpiryPreset] = useState<number | null>(7 * 24 * 60 * 60 * 1000);
  const [loading, setLoading] = useState(false);

  const filePairs = files.map(f => ({ folder: f.folder, name: f.name }));

  const handleExecute = async () => {
    if (!selectedAction) return;
    setLoading(true);
    try {
      switch (selectedAction) {
        case "move": {
          const dest = targetFolder === "__new__" ? newFolderName.trim() : targetFolder;
          if (!dest) { toastError("Please select a destination folder"); return; }
          await api.bulkMove(filePairs, dest);
          success(`Moved ${files.length} file${files.length > 1 ? "s" : ""} to "${dest}"`);
          break;
        }
        case "pin":
          await api.bulkTogglePin(filePairs, true);
          success(`Pinned ${files.length} file${files.length > 1 ? "s" : ""}`);
          break;
        case "unpin":
          await api.bulkTogglePin(filePairs, false);
          success(`Unpinned ${files.length} file${files.length > 1 ? "s" : ""}`);
          break;
        case "make-public":
          await api.bulkTogglePrivacy(filePairs, true);
          success(`Made ${files.length} file${files.length > 1 ? "s" : ""} public`);
          break;
        case "make-private":
          await api.bulkTogglePrivacy(filePairs, false);
          success(`Made ${files.length} file${files.length > 1 ? "s" : ""} private`);
          break;
        case "expiry": {
          const expiresAt = expiryPreset ? new Date(Date.now() + expiryPreset).toISOString() : null;
          await api.bulkSetExpiry(filePairs, expiresAt);
          success(expiresAt ? `Expiry set for ${files.length} files` : `Expiry cleared for ${files.length} files`);
          break;
        }
        case "vault":
          await api.vault.bulkMoveToVault(filePairs);
          success(`Moved ${files.length} file${files.length > 1 ? "s" : ""} to Vault`);
          break;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError(err.response?.data?.error || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Bulk Actions</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Picker */}
        {!selectedAction ? (
          <div className="p-3 space-y-1">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 group"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.bg}`}>
                  <action.icon className={`h-4.5 w-4.5 ${action.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Back button + action label */}
            <button
              onClick={() => setSelectedAction(null)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Back
            </button>

            <div className={`flex items-center gap-3 rounded-xl ${ACTIONS.find(a => a.id === selectedAction)?.bg} p-3`}>
              {(() => {
                const a = ACTIONS.find(a => a.id === selectedAction)!;
                return (
                  <>
                    <a.icon className={`h-5 w-5 ${a.color}`} />
                    <div>
                      <p className={`text-sm font-semibold ${a.color}`}>{a.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Applying to {files.length} file{files.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Move options */}
            {selectedAction === "move" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Destination Folder</label>
                  <select
                    value={targetFolder}
                    onChange={(e) => setTargetFolder(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="" disabled>Select a folder...</option>
                    <option value="root">Root (top level)</option>
                    {folders.filter(f => f !== "root").map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="__new__">➕ Create new folder...</option>
                  </select>
                </div>
                {targetFolder === "__new__" && (
                  <input
                    type="text"
                    placeholder="New folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                )}
              </div>
            )}

            {/* Expiry options */}
            {selectedAction === "expiry" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_PRESETS.map(({ label, ms }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setExpiryPreset(ms)}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium transition-all ${
                        expiryPreset === ms
                          ? "border-indigo-400 bg-indigo-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm / Cancel */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecute}
                disabled={loading || (selectedAction === "move" && !targetFolder) || (selectedAction === "move" && targetFolder === "__new__" && !newFolderName.trim())}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                {loading ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
