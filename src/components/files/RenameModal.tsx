"use client";

import { useState, useEffect } from "react";
import { X, Edit3 } from "lucide-react";
import { FileData, api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

interface RenameModalProps {
  file: FileData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RenameModal({ file, onClose, onSuccess }: RenameModalProps) {
  const { success, error: toastError } = useToast();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      setNewName(file.name);
    }
  }, [file]);

  if (!file) return null;

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === file.name) return;

    setLoading(true);
    try {
      const oldPath = `${file.folder}/${file.name}`;
      const newPath = `${file.folder}/${newName.trim()}`;
      await api.renameFile(oldPath, newPath);
      success("File renamed successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError(err.response?.data?.error || "Failed to rename file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
              <Edit3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rename File</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-48">{file.folder}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleRename} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              New Name
            </label>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newName.trim() || newName === file.name}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
