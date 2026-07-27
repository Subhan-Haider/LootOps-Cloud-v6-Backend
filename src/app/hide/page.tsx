"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";
import { api, FileData } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { Lock, Loader2, File, Image as ImageIcon, Film, FileText, FileJson, FileArchive, Package, MoreVertical, Download, ArrowRightFromLine, Trash2 } from "lucide-react";

export default function VaultPage() {
  const { error: toastError, success } = useToast();
  
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [vaultToken, setVaultToken] = useState<string | null>(null);
  
  const [files, setFiles] = useState<FileData[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // If locked, we don't need to load files until unlocked.
  const handleUnlock = async () => {
    if (pin.length < 4) { setError("PIN is too short"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.vault.verify(pin);
      setVaultToken(res.token);
      setIsLocked(false);
      loadFiles(res.token);
    } catch {
      setError("Incorrect PIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.MouseEvent, file: FileData) => {
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await api.vault.moveFromVault("root", file.name);
      success("Restored to main storage");
      loadFiles(vaultToken!);
    } catch (err) {
      toastError("Failed to restore file");
    }
  };

  const handleDelete = async (e: React.MouseEvent, file: FileData) => {
    e.stopPropagation();
    setOpenMenu(null);
    if (!confirm("Delete this file permanently?")) return;
    try {
      await api.vault.deleteFromVault(file.name);
      success("File deleted permanently");
      loadFiles(vaultToken!);
    } catch (err) {
      toastError("Failed to delete file");
    }
  };

  const loadFiles = async (token: string) => {
    setLoadingFiles(true);
    try {
      const secureFiles = await api.vault.getFiles(token);
      setFiles(secureFiles);
    } catch {
      toastError("Failed to load vault files");
    } finally {
      setLoadingFiles(false);
    }
  };

  const lockVault = () => {
    setIsLocked(true);
    setVaultToken(null);
    setFiles([]);
    setPin("");
  };

  // Lock automatically if page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lockVault();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const getFileIcon = (type: FileData["type"]) => {
    switch (type) {
      case "image": return <ImageIcon className="h-5 w-5 text-blue-500" />;
      case "video": return <Film className="h-5 w-5 text-purple-500" />;
      case "pdf": return <FileText className="h-5 w-5 text-red-500" />;
      case "code": return <FileJson className="h-5 w-5 text-amber-500" />;
      case "archive": return <FileArchive className="h-5 w-5 text-orange-500" />;
      case "installer": return <Package className="h-5 w-5 text-indigo-500" />;
      default: return <File className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <>
      <Topbar onRefresh={!isLocked && vaultToken ? () => loadFiles(vaultToken) : undefined} />
      <div className="min-h-full bg-slate-100 dark:bg-slate-900 px-4 py-6 md:px-8">
        
        {isLocked ? (
          <div className="flex h-[calc(100vh-100px)] flex-col items-center justify-center">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-8 shadow-xl max-w-sm w-full text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 mb-6">
                <Lock className="h-8 w-8 text-indigo-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Secure Vault</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your PIN to access hidden files.</p>
              
              {error && (
                <div className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-2 rounded-xl">
                  {error}
                </div>
              )}
              
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
                placeholder="Enter PIN"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500/60 mb-4"
              />
              
              <button
                onClick={handleUnlock}
                disabled={loading || pin.length < 4}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Unlock Vault"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Secure Vault</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your hidden and encrypted files.</p>
              </div>
              <button
                onClick={lockVault}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <Lock className="h-4 w-4" />
                Lock Vault
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm min-h-[400px]">
              {loadingFiles ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : files.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50">
                    <Lock className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vault is empty</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Right-click files in the explorer to move them here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {files.map((file) => (
                    <div 
                      key={file.name} 
                      onClick={() => setPreviewFile(file)}
                      className="group relative flex cursor-pointer flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md"
                    >
                      {/* Context Menu Button */}
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === file.name ? null : file.name); }}
                          className="p-1.5 rounded-lg bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openMenu === file.name && (
                          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden py-1 z-50">
                            <a 
                              href={file.url} 
                              download 
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                            >
                              <Download className="h-4 w-4 text-indigo-500" /> Download
                            </a>
                            <button 
                              onClick={(e) => handleRestore(e, file)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                            >
                              <ArrowRightFromLine className="h-4 w-4 text-emerald-500" /> Move to Main
                            </button>
                            <button 
                              onClick={(e) => handleDelete(e, file)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="relative aspect-square w-full rounded-t-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                        {file.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={file.thumbnailUrl} alt={file.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            {getFileIcon(file.type)}
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-slate-100 dark:border-slate-700/50">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {previewFile && (
          <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        )}

      </div>
    </>
  );
}
