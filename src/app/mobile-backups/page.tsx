"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Cloud, Search, Image as ImageIcon, Video, AlertCircle } from "lucide-react";
import { api, FileData, getAuthToken } from "@/lib/api";

export default function MobileBackupsPage() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getAuthToken().then(t => setToken(t));
    const fetchBackups = async () => {
      try {
        const data = await api.getFolderFiles("MobileBackups");
        setFiles(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err: any) {
        setError(err.message || "Failed to load backups");
      } finally {
        setLoading(false);
      }
    };
    fetchBackups();
  }, []);

  // Group files by date
  const groupedFiles = files.reduce((acc, file) => {
    const dateObj = new Date(file.createdAt);
    const date = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(file);
    return acc;
  }, {} as Record<string, FileData[]>);

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-900/50">
      <Topbar />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          
          {/* Header Stats & Search */}
          <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/50">
                <Cloud className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mobile Backups Timeline</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {files.length} items backed up from your devices
                </p>
              </div>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search backups (AI tags coming soon)..." className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : error ? (
            <div className="text-red-500 flex items-center justify-center py-12 gap-2">
              <AlertCircle className="h-5 w-5" /> {error}
            </div>
          ) : files.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-24 text-center dark:border-gray-800">
              <Cloud className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No backups yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Install the Android app and enable Auto-Backup to get started.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedFiles).map(([date, dateFiles]) => (
                <div key={date}>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{date}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {dateFiles.map(file => (
                      <div key={file.name} className="relative aspect-square group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        {file.type === "image" || file.type === "video" ? (
                          <img 
                            src={(file.thumbnailUrl || file.url) + (!file.isPublic && token ? `?token=${token}` : '')} 
                            alt={file.name} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        {file.type === "video" && (
                          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                            <Video className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
