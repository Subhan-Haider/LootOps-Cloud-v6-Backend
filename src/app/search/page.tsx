"use client";

import { useEffect, useState } from "react";
import { api, FileData, getAuthToken } from "@/lib/api";
import { Search as SearchIcon, Image as ImageIcon, ScanSearch, RefreshCw, Loader2, Eye, Video, Music, FileText } from "lucide-react";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [allFiles, setAllFiles] = useState<FileData[]>([]);
  const [results, setResults] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);

  const loadData = () => {
    setLoading(true);
    api.getFiles().then((data) => {
      const imagesOnly = data.filter(file => file.type === "image");
      setAllFiles(imagesOnly);
      // Re-apply current search query to the freshly loaded data
      applySearch(query, imagesOnly);
      setLoading(false);
    });
  };

  useEffect(() => {
    getAuthToken().then(t => setToken(t));
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySearch = (text: string, filesToSearch: FileData[]) => {
    if (!text.trim()) {
      setResults(filesToSearch);
      return;
    }

    const lowerQ = text.toLowerCase();
    const filtered = filesToSearch.filter(file => {
      const matchName = file.name?.toLowerCase().includes(lowerQ);
      const matchFolder = file.folder?.toLowerCase().includes(lowerQ);
      const matchTags = file.tags && file.tags.some(tag => tag.toLowerCase().includes(lowerQ));
      return matchName || matchFolder || matchTags;
    });

    setResults(filtered);
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    applySearch(text, allFiles);
  };

  const handleScanTags = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const result = await api.post("/admin/search/scan-tags", {});
      setScanMsg((result as any).message || "Scan started!");
    } catch (e) {
      setScanMsg("Failed to start scan.");
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 overflow-y-auto">
        {/* Sticky header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-8 shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 dark:bg-indigo-950/50 p-3 rounded-xl">
                  <SearchIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Semantic Search</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Find photos using AI-generated tags, folder names, or file names.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={loadData}
                    className="flex-1 md:flex-none justify-center items-center gap-2 px-3 py-3 md:py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors"
                    title="Reload data"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    onClick={handleScanTags}
                    disabled={scanning}
                    className="flex-1 md:flex-none justify-center items-center gap-2 px-4 py-3 md:py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow"
                  >
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
                    {scanning ? "Scanning..." : "Scan Existing Photos"}
                  </button>
                </div>
                {scanMsg && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{scanMsg} Refresh the page later to see new tags.</span>}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-4 border border-slate-300 dark:border-slate-600 rounded-xl leading-5 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg transition-shadow shadow-sm"
                placeholder="Search for 'receipt', 'dog', 'beach'..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Results grid */}
        <div className="p-6 max-w-7xl mx-auto w-full">
          {results.length === 0 ? (
            <div className="text-center py-20">
              <ImageIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">No photos to display</h3>
              <p className="text-slate-500 dark:text-slate-400">Try a different keyword, upload more photos, or click Scan to let the AI analyze existing ones.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                {results.length} photo{results.length !== 1 ? "s" : ""} — click any to view
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {results.map((file) => (
                  <button
                    key={file.url}
                    onClick={() => setPreviewFile(file)}
                    className="group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title={file.name}
                  >
                    {/* File Thumbnail / Icon */}
                    {file.type === "image" || file.thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={(file.thumbnailUrl || file.url) + (!file.isPublic && token ? `?token=${token}` : '')}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.style.display = 'none';
                          }
                        }}
                      />
                    ) : file.type === "video" ? (
                      <div className="flex h-full w-full items-center justify-center bg-slate-900">
                        <Video className="h-10 w-10 text-pink-500" />
                      </div>
                    ) : file.type === "audio" ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                        <Music className="h-10 w-10 text-purple-500" />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
                        <FileText className="h-10 w-10 text-slate-400" />
                      </div>
                    )}

                    {/* Hover overlay with info + eye icon */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                      {/* Eye icon top-right */}
                      <div className="flex justify-end">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                          <Eye className="h-3.5 w-3.5 text-white" />
                        </div>
                      </div>

                      {/* File info bottom */}
                      <div>
                        <p className="text-white text-xs font-semibold truncate leading-tight">{file.name}</p>
                        {file.tags && file.tags.length > 0 && (
                          <p className="text-indigo-200 text-[10px] truncate mt-0.5">
                            {file.tags.slice(0, 4).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full preview modal — reuses the same lightbox as the Files page */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </>
  );
}


