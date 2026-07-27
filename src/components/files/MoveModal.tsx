"use client";

import { useState } from "react";
import { X, Move } from "lucide-react";
import { FileData, api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

interface MoveModalProps {
  file: FileData | null;
  folders: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function MoveModal({ file, folders, onClose, onSuccess }: MoveModalProps) {
  const { success, error: toastError } = useToast();
  const [targetFolder, setTargetFolder] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!file) return null;

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    const destination = targetFolder === "__new__" ? newFolderName.trim() : targetFolder;
    if (!destination || destination === file.folder) return;

    setLoading(true);
    try {
      await api.moveFile(file.name, file.folder, destination);
      success("File moved successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError(err.response?.data?.error || "Failed to move file");
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
              <Move className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Move File</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-48">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleMove} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Destination Folder
            </label>
            <select
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="" disabled>Select a folder...</option>
              {folders.filter(f => f !== file.folder).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
              <option value="__new__">➕ Create new folder...</option>
            </select>
          </div>

          {targetFolder === "__new__" && (
            <div>
              <input
                type="text"
                placeholder="New folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

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
              disabled={loading || !targetFolder || (targetFolder === "__new__" && !newFolderName.trim())}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              {loading ? "Moving..." : "Move"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
