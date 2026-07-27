"use client";

import { useEffect, useState } from "react";
import { FileGrid } from "@/components/files/FileGrid";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";
import { ShareModal } from "@/components/files/ShareModal";
import { api, FileData } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { HardDrive, Search, Sparkles, Cloud } from "lucide-react";

export default function ExplorePage() {
  const { error: toastError } = useToast();
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [stats, setStats] = useState({ totalFiles: 0, totalViews: 0 });

  // Modals
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [shareFile, setShareFile] = useState<FileData | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const filesData = await api.getPublicFiles();
      // Sort newest first
      const sorted = filesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFiles(sorted);
      setStats({
        totalFiles: filesData.length,
        totalViews: filesData.reduce((acc, f) => acc + (f.downloads || 0), 0)
      });
    } catch (err: any) {
      toastError("Failed to load public files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.folder.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || f.type === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/20 overflow-x-hidden relative">
      
      {/* ─── Animated Background Effects ─── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
        
        {/* Glowing Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-300/40 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-300/30 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-300/30 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }}></div>
      </div>

      {/* ─── Navigation Header ─── */}
      <header className="relative z-40 border-b border-slate-200/60 bg-white/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain drop-shadow-md" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-800">LootOps Cloud</span>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <div className="relative z-10 pt-24 pb-16 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold mb-8 uppercase tracking-widest shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Public Access Portal
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
          Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Shared Files</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
          Browse, preview, and securely download publicly shared files from the LootOps network. No account required.
        </p>

        {/* ─── Search Bar ─── */}
        <div className="relative max-w-2xl mx-auto group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-15 group-hover:opacity-30 transition duration-500"></div>
          <div className="relative flex items-center bg-white/80 border border-slate-200 rounded-2xl p-2 backdrop-blur-xl shadow-xl shadow-slate-200/50">
            <div className="pl-4 pr-2">
              <Search className="w-6 h-6 text-indigo-500" />
            </div>
            <input
              type="text"
              placeholder="Search for images, videos, documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 text-lg py-3 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors bg-slate-100 rounded-xl mr-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ─── Quick Filters ─── */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {["all", "image", "video", "audio", "pdf", "archive"].map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all shadow-sm ${
                activeCategory === cat 
                  ? "bg-indigo-600 text-white shadow-indigo-200 scale-105" 
                  : "bg-white/80 border border-slate-200 text-slate-600 hover:bg-white backdrop-blur-md"
              }`}
            >
              {cat === "all" ? "All Files" : cat + "s"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Stats Banner ─── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 -mt-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 text-center shadow-xl shadow-slate-200/40">
            <div className="text-3xl font-extrabold text-indigo-600 mb-1">{stats.totalFiles}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Public Files</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 text-center shadow-xl shadow-slate-200/40">
            <div className="text-3xl font-extrabold text-purple-600 mb-1">{stats.totalViews}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Views</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 text-center shadow-xl shadow-slate-200/40">
            <div className="text-3xl font-extrabold text-pink-500 mb-1">24/7</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Availability</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 text-center shadow-xl shadow-slate-200/40">
            <div className="text-3xl font-extrabold text-emerald-500 mb-1">100%</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secure</div>
          </div>
        </div>
      </div>

      {/* ─── Main Content / File Grid ─── */}
      <main className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto w-full min-h-[50vh]">
        
        <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <HardDrive className="text-indigo-500" />
            Available Files
            <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
              {filteredFiles.length}
            </span>
          </h2>
        </div>

        <FileGrid
          files={filteredFiles}
          selectedFiles={[]}
          viewMode={viewMode}
          onSelectFile={() => {}}
          onDelete={() => {}}
          onRename={() => {}}
          onMove={() => {}}
          onTogglePrivacy={() => {}}
          onShare={setShareFile}
          onPreview={setPreviewFile}
          isLoading={loading}
          readOnly={true}
        />

      </main>

      {/* ─── Features Highlights ─── */}
      <div className="relative z-10 bg-white border-t border-slate-200 mt-12 pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-12">Why LootOps Cloud?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Lightning Fast</h3>
              <p className="text-slate-500 leading-relaxed">Optimized delivery network ensures your files download at blazing speeds anywhere in the world.</p>
            </div>
            <div className="p-6">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-purple-100">
                <HardDrive className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">No Account Needed</h3>
              <p className="text-slate-500 leading-relaxed">Browse and download any publicly shared file instantly without jumping through registration hoops.</p>
            </div>
            <div className="p-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
                <Cloud className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Secure & Private</h3>
              <p className="text-slate-500 leading-relaxed">Only files explicitly marked as public are visible. Everything else remains strictly confidential.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">LootOps Cloud</span>
          </div>
          <p className="text-sm font-medium">© {new Date().getFullYear()} LootOps. All rights reserved.</p>
          <div className="flex gap-8 text-sm font-semibold">
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <ShareModal file={shareFile} onClose={() => setShareFile(null)} />
      
    </div>
  );
}
