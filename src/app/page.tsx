"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ServerHealthMonitor } from "@/components/dashboard/ServerHealthMonitor";
import { UploadSection } from "@/components/upload/UploadSection";
import { FileGrid } from "@/components/files/FileGrid";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";
import { ShareModal } from "@/components/files/ShareModal";
import { RenameModal } from "@/components/files/RenameModal";
import { MoveModal } from "@/components/files/MoveModal";
import { api, FileData, SystemStats } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

export default function Dashboard() {
  const { success, error: toastError } = useToast();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [shareFile, setShareFile] = useState<FileData | null>(null);
  const [renameFile, setRenameFile] = useState<FileData | null>(null);
  const [moveFile, setMoveFile] = useState<FileData | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, filesData] = await Promise.all([api.getStats(), api.getFiles()]);
      setStats(statsData);
      setFiles(filesData);
    } catch (err: any) {
      toastError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const existingFolders = stats?.foldersBreakdown ? Object.keys(stats.foldersBreakdown) : Array.from(new Set(files.map(f => f.folder)));
  const recentFiles = [...files]
    .filter(f => f.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const handleDelete = async (folder: string, name: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await api.deleteFile(folder, name);
      success("File deleted");
      loadData();
    } catch {
      toastError("Failed to delete file");
    }
  };

  const handleTogglePrivacy = async (file: FileData) => {
    try {
      await api.togglePrivacy(file.folder, file.name, !file.isPublic);
      success(`File is now ${!file.isPublic ? "public" : "private"}`);
      loadData();
    } catch {
      toastError("Failed to update privacy");
    }
  };

  return (
    <>
      <Topbar onRefresh={loadData} />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your storage and recent activity.</p>
        </div>

        <StatsCards statsData={stats} isLoading={loading} />
        
        <ServerHealthMonitor />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Uploads</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Showing {Math.min(recentFiles.length, 6)} of {files.length} files
              </p>
            </div>
            <a
              href="/files"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50 transition-colors"
            >
              View All
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
          <FileGrid
            files={recentFiles}
            selectedFiles={[]}
            viewMode="grid"
            onSelectFile={() => {}}
            onDelete={handleDelete}
            onRename={setRenameFile}
            onMove={setMoveFile}
            onShare={setShareFile}
            onTogglePrivacy={handleTogglePrivacy}
            onPreview={setPreviewFile}
            isLoading={loading}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload New File</h2>
          <UploadSection existingFolders={existingFolders} onSuccess={loadData} />
        </div>
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <ShareModal file={shareFile} onClose={() => setShareFile(null)} />
      <RenameModal file={renameFile} onClose={() => setRenameFile(null)} onSuccess={loadData} />
      <MoveModal file={moveFile} folders={existingFolders} onClose={() => setMoveFile(null)} onSuccess={loadData} />
    </>
  );
}
