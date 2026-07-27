"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { UploadCloud, X, CheckCircle2, AlertCircle, FolderOpen, FileText, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

interface UploadSectionProps {
  existingFolders: string[];
  onSuccess: () => void;
}

interface FileStatus {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  progress: number;
}

function getFileIcon(file: File) {
  const t = file.type;
  if (t.startsWith("image/")) return "🖼️";
  if (t.startsWith("video/")) return "🎬";
  if (t.startsWith("audio/")) return "🎵";
  if (t === "application/pdf") return "📄";
  if (t.includes("zip") || t.includes("archive")) return "🗜️";
  if (t.includes("javascript") || t.includes("json") || t.includes("html") || t.includes("css")) return "💻";
  return "📁";
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function UploadSection({ existingFolders, onSuccess }: UploadSectionProps) {
  const { success, error: toastError } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileList, setFileList] = useState<FileStatus[]>([]);
  const [folder, setFolder] = useState("root");
  const [newFolderName, setNewFolderName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [summary, setSummary] = useState<{ ok: number; fail: number } | null>(null);
  const [autoUpload, setAutoUpload] = useState(true);

  // Global drag-into-window detection for the full-page overlay
  useEffect(() => {
    const onWindowDrag = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(true);
    };
    const onWindowDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragActive(false);
    };
    const onWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
    };
    window.addEventListener("dragover", onWindowDrag);
    window.addEventListener("dragleave", onWindowDragLeave);
    window.addEventListener("drop", onWindowDrop);
    return () => {
      window.removeEventListener("dragover", onWindowDrag);
      window.removeEventListener("dragleave", onWindowDragLeave);
      window.removeEventListener("drop", onWindowDrop);
    };
  }, []);

  const getTargetFolder = useCallback(() => {
    return folder === "__new__" ? newFolderName.trim() : folder;
  }, [folder, newFolderName]);

  const uploadFiles = useCallback(async (items: FileStatus[]) => {
    const targetFolder = getTargetFolder();
    if (!targetFolder) {
      toastError("Please select or create a folder first.");
      return;
    }

    setIsUploading(true);
    setUploadDone(false);
    setSummary(null);
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setFileList(prev => prev.map(f => f.id === item.id ? { ...f, status: "uploading" } : f));

      try {
        let fileTargetFolder = targetFolder;
        if (item.file.webkitRelativePath) {
          const parts = item.file.webkitRelativePath.split("/");
          if (parts.length > 1) {
            // Keep the entire directory structure including the root folder that was dropped
            const relativeDir = parts.slice(0, -1).join("/");
            fileTargetFolder = targetFolder === "root" ? relativeDir : `${targetFolder}/${relativeDir}`;
          }
        }

        await api.uploadFile(item.file, fileTargetFolder, (pct) => {
          setFileList(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct } : f));
        });

        setFileList(prev => prev.map(f => f.id === item.id ? { ...f, status: "success", progress: 100 } : f));
        successCount++;
      } catch (e: any) {
        setFileList(prev => prev.map(f => f.id === item.id ? { ...f, status: "error", error: e.message || "Upload failed" } : f));
      }
    }

    const failCount = items.length - successCount;
    setUploadDone(true);
    setIsUploading(false);
    setSummary({ ok: successCount, fail: failCount });

    if (successCount > 0) onSuccess();
    if (failCount === 0) {
      success(`✅ All ${successCount} file(s) uploaded!`);
      setTimeout(resetState, 3000);
    } else if (successCount === 0) {
      toastError(`All ${failCount} file(s) failed.`);
    } else {
      toastError(`${failCount} failed — ${successCount} uploaded.`);
    }
  }, [getTargetFolder, onSuccess, success, toastError]);

  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    const newItems: FileStatus[] = files.map(f => ({
      file: f, id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      status: "pending", progress: 0,
    }));

    // Note: We no longer auto-set the folder name so that users can drop
    // a folder into their currently selected target directory.

    setFileList(prev => {
      const merged = [...prev, ...newItems];
      if (autoUpload) {
        // Kick off upload after state settles
        setTimeout(() => uploadFiles(merged), 50);
      }
      return merged;
    });
  }, [autoUpload, uploadFiles]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setDragActive(false);

    if (!e.dataTransfer.items || e.dataTransfer.items.length === 0) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
      return;
    }

    const files: File[] = [];

    const getFileFromEntry = (entry: any): Promise<File> => {
      return new Promise((resolve, reject) => {
        entry.file(
          (file: File) => {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: entry.fullPath.substring(1), // remove leading slash
              writable: false
            });
            resolve(file);
          },
          reject
        );
      });
    };

    const traverseFileTree = async (item: any) => {
      if (item.isFile) {
        const file = await getFileFromEntry(item);
        files.push(file);
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const readEntries = () => {
          return new Promise<any[]>((resolve, reject) => {
            dirReader.readEntries(resolve, reject);
          });
        };
        let entries = await readEntries();
        while (entries.length > 0) {
          for (const entry of entries) {
            await traverseFileTree(entry);
          }
          entries = await readEntries();
        }
      }
    };

    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      const item = e.dataTransfer.items[i].webkitGetAsEntry();
      if (item) {
        await traverseFileTree(item);
      }
    }

    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const resetState = () => {
    setFileList([]);
    setUploadDone(false);
    setSummary(null);
    setNewFolderName("");
    if (inputRef.current) inputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setFileList(prev => prev.filter(f => f.id !== id));
  };

  const totalProgress = fileList.length === 0 ? 0
    : Math.round(fileList.reduce((sum, f) => sum + f.progress, 0) / fileList.length);

  const completedCount = fileList.filter(f => f.status === "success" || f.status === "error").length;

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-gray-900 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Upload Files</h2>
          {fileList.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{fileList.length} file{fileList.length !== 1 ? "s" : ""} selected</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-upload toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Auto-upload</span>
            <button
              type="button"
              onClick={() => setAutoUpload(v => !v)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${autoUpload ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`}
            >
              <span className={`inline-block h-4 w-4 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform ${autoUpload ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </label>
          {fileList.length > 0 && !isUploading && (
            <button onClick={resetState} className="text-xs text-red-400 hover:text-red-600 transition-colors">Clear all</button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Hidden file inputs */}
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => e.target.files && handleFiles(Array.from(e.target.files))} />
        <input ref={folderInputRef} type="file" {...({ webkitdirectory: "", directory: "" } as any)} multiple className="hidden"
          onChange={e => e.target.files && handleFiles(Array.from(e.target.files))} />

        {/* Drop zone */}
        <div
          ref={dropZoneRef}
          onDragEnter={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDrop={handleDrop}
          onClick={() => fileList.length === 0 && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
            ${dragOver
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]"
              : fileList.length === 0
                ? "border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:hover:border-indigo-700 dark:hover:bg-slate-800/30"
                : "border-slate-200 dark:border-slate-700"
            }
            ${fileList.length === 0 ? "py-10" : "py-4"}
          `}
        >
          {dragOver && (
            <div className="absolute inset-0 rounded-xl bg-indigo-500/5 flex flex-col items-center justify-center z-10 pointer-events-none">
              <UploadCloud className="h-10 w-10 text-indigo-500 animate-bounce" />
              <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Drop to upload!</p>
            </div>
          )}
          <div className={`flex flex-col items-center transition-opacity ${dragOver ? "opacity-0" : "opacity-100"}`}>
            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
              fileList.length === 0 ? "bg-slate-100 dark:bg-slate-800" : "bg-indigo-50 dark:bg-indigo-950/30"
            }`}>
              <UploadCloud className={`h-6 w-6 ${fileList.length === 0 ? "text-gray-400" : "text-indigo-500"}`} />
            </div>
            {fileList.length === 0 ? (
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drag &amp; drop files here
                </p>
                <p className="mt-1 text-xs text-gray-400">or</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="flex-1 justify-center flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 sm:py-1.5 text-sm sm:text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    <FileText className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Browse Files
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); folderInputRef.current?.click(); }}
                    className="flex-1 justify-center flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:py-1.5 text-sm sm:text-xs font-semibold text-gray-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 transition-colors"
                  >
                    <FolderOpen className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Browse Folder
                  </button>
                </div>
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Images, Videos, PDFs — up to 500 MB each</p>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add More Files
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Folder selector */}
        {fileList.length > 0 && !isUploading && !uploadDone && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Destination Folder</label>
            <select
              value={folder}
              onChange={e => setFolder(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="root">🏠 Root Directory (Home)</option>
              {existingFolders.map(f => <option key={f} value={f}>{f}</option>)}
              <option value="__new__">➕ Create new folder…</option>
            </select>
            {folder === "__new__" && (
              <input
                type="text"
                placeholder="New folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            )}
          </div>
        )}

        {/* File list */}
        {fileList.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {fileList.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  item.status === "success" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                  : item.status === "error" ? "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20"
                  : item.status === "uploading" ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-950/20"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                }`}
              >
                <span className="text-xl shrink-0">{getFileIcon(item.file)}</span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white" title={item.file.name}>
                    {item.file.name}
                  </p>
                  {item.status === "error" && item.error ? (
                    <p className="text-xs text-red-500 truncate">{item.error}</p>
                  ) : item.status === "uploading" ? (
                    <div className="mt-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">{formatSize(item.file.size)}</p>
                  )}
                </div>

                <div className="shrink-0">
                  {item.status === "uploading" && (
                    <span className="text-xs font-bold text-indigo-500">{Math.round(item.progress)}%</span>
                  )}
                  {item.status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {item.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {item.status === "pending" && !isUploading && (
                    <button onClick={() => removeFile(item.id)} className="rounded-lg p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Overall progress while uploading */}
        {isUploading && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading {completedCount} / {fileList.length}…
              </span>
              <span className="text-indigo-600 font-bold">{totalProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary banner */}
        {uploadDone && summary && (
          summary.fail === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                All {summary.ok} file{summary.ok !== 1 ? "s" : ""} uploaded successfully!
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {summary.ok > 0 ? `${summary.ok} uploaded, ${summary.fail} failed.` : `All ${summary.fail} failed.`}
              </p>
            </div>
          )
        )}

        {/* Action buttons */}
        {fileList.length > 0 && (
          <div className="flex gap-2 pt-1">
            {!autoUpload && !uploadDone && !isUploading && (
              <button
                onClick={() => uploadFiles(fileList.filter(f => f.status === "pending"))}
                disabled={isUploading || fileList.every(f => f.status !== "pending")}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload {fileList.filter(f => f.status === "pending").length} File{fileList.filter(f => f.status === "pending").length !== 1 ? "s" : ""}
              </button>
            )}
            {uploadDone && (
              <button
                onClick={resetState}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                Upload More Files
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
