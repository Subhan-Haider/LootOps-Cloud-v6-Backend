"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Database, Plus, Download, Trash2, Loader2, Calendar, HardDrive, Shield } from "lucide-react";

interface BackupFile {
  name: string;
  size: number;
  createdAt: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchBackups = async () => {
    try {
      const data = await api.getBackups();
      setBackups(data);
    } catch (err) {
      console.error("Failed to load backups", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await api.createBackup();
      if (res.success) {
        setMessage({ text: `Backup "${res.filename}" created successfully!`, type: "success" });
        await fetchBackups();
      } else {
        setMessage({ text: "Failed to create backup.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || "Error generating backup.", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (name: string) => {
    if (!confirm(`Are you sure you want to permanently delete backup "${name}"?`)) return;
    try {
      await api.deleteBackup(name);
      setMessage({ text: "Backup deleted successfully.", type: "success" });
      setBackups(backups.filter((b) => b.name !== name));
    } catch (err) {
      setMessage({ text: "Failed to delete backup.", type: "error" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <Database className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Redundant Backups</h1>
              <p className="text-slate-500 mt-1">
                Make-A-Copy: Create, download, and manage system and photo backups.
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 duration-150"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Zip...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Create Backup Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto w-full flex-grow">
        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <Shield className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="font-medium text-sm">{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-slate-400" />
              <span>Available Archives</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
              Keeps last 7 backups max
            </span>
          </div>

          {backups.length === 0 ? (
            <div className="text-center py-20 px-6">
              <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700">No backups found</h3>
              <p className="text-slate-500 mt-1 max-w-md mx-auto">
                Automatic backups run daily at 2:00 AM. You can also trigger a manual backup above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {backups.map((backup) => (
                <div
                  key={backup.name}
                  className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600 mt-0.5">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 break-all">{backup.name}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          {formatDate(backup.createdAt)}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {formatSize(backup.size)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mt-4 sm:mt-0 ml-0 sm:ml-4 flex-shrink-0">
                    <button
                      onClick={() => api.downloadBackup(backup.name)}
                      className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Download Backup"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(backup.name)}
                      className="p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Backup"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
