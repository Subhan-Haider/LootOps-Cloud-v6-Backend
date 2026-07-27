"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { UploadSection } from "@/components/upload/UploadSection";
import { api, FileData } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function UploadsPage() {
  const { error: toastError } = useToast();
  const [existingFolders, setExistingFolders] = useState<string[]>([]);
  const [recentUploads, setRecentUploads] = useState<number>(0);

  const loadData = async () => {
    try {
      const [statsData, filesData] = await Promise.all([api.getStats(), api.getFiles()]);
      const folders = statsData?.foldersBreakdown ? Object.keys(statsData.foldersBreakdown) : Array.from(new Set(filesData.map(f => f.folder)));
      setExistingFolders(folders);
    } catch {
      toastError("Failed to load folders");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSuccess = () => {
    setRecentUploads(prev => prev + 1);
    loadData();
  };

  return (
    <>
      <Topbar onRefresh={loadData} />
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6 pt-8 md:pt-12">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 mb-4 dark:bg-indigo-950/30">
            <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Upload Files</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Add new files to your storage securely.</p>
        </div>

        <UploadSection existingFolders={existingFolders} onSuccess={handleSuccess} />

        {recentUploads > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Successfully uploaded {recentUploads} file(s) this session.
              </p>
            </div>
            <Link
              href="/files"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800 underline dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              View Files
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
