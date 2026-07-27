"use client";

import { useState, useRef } from "react";
import { Folder, X, Download, Trash2, Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";

interface FolderViewProps {
  folders: { path: string; name: string; count: number }[];
  activeFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
  onDownloadFolder?: (folder: string) => void;
  onDeleteFolder?: (folder: string) => void;
  onCreateFolder?: (folder: string) => Promise<void>;
  onMoveFile?: (file: any, destFolder: string) => void;
  onMoveFolder?: (sourceFolder: string, destFolder: string) => void;
}

const FOLDER_COLORS = [
  "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/40",
  "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800/40",
  "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40",
  "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40",
  "bg-pink-50 border-pink-200 dark:bg-pink-950/20 dark:border-pink-800/40",
  "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800/40",
];

const FOLDER_ICON_COLORS = [
  "text-blue-500",
  "text-purple-500",
  "text-emerald-500",
  "text-amber-500",
  "text-pink-500",
  "text-indigo-500",
];

export function FolderView({ folders, activeFolder, onSelectFolder, onDownloadFolder, onDeleteFolder, onCreateFolder, onMoveFile, onMoveFolder }: FolderViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'button' || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).tagName.toLowerCase() === 'input') {
      return;
    }
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleCreate = async () => {
    if (!newFolderName.trim() || !onCreateFolder) return;
    await onCreateFolder(newFolderName.trim());
    setIsCreating(false);
    setNewFolderName("");
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Folders
        </h2>
        {activeFolder && (
          <button
            onClick={() => onSelectFolder(null)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      <div className="relative group/slider">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden items-center justify-center h-8 w-8 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-600 hover:bg-white hover:text-indigo-600 dark:bg-gray-800/90 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-400 group-hover/slider:flex transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div 
          ref={scrollRef} 
          className={`flex gap-3 overflow-x-auto pb-2 scrollbar-hide w-full ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {/* Create Folder Button/Input */}
        {onCreateFolder && (
          isCreating ? (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 dark:border-indigo-800/40 dark:bg-indigo-950/20">
              <Folder className="h-5 w-5 shrink-0 text-indigo-400" />
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setIsCreating(false); setNewFolderName(""); } }}
                placeholder="Folder name..."
                className="w-32 bg-transparent text-sm font-semibold text-indigo-900 outline-none placeholder:text-indigo-300 dark:text-indigo-100 dark:placeholder:text-indigo-700"
              />
              <button onClick={handleCreate} disabled={!newFolderName.trim()} className="text-emerald-500 hover:text-emerald-700 disabled:opacity-50">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => { setIsCreating(false); setNewFolderName(""); }} className="text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="group flex shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30 transition-all"
            >
              <Plus className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="text-sm font-semibold text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400">
                New Folder
              </span>
            </button>
          )
        )}

        {folders.map((folder, i) => {
          const colorClass = FOLDER_COLORS[i % FOLDER_COLORS.length];
          const iconColor = FOLDER_ICON_COLORS[i % FOLDER_ICON_COLORS.length];
          const isActive = activeFolder === folder.path;
          return (
            <button
              key={folder.path}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/json", JSON.stringify({ type: "folder", folderPath: folder.path }));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("ring-2", "ring-indigo-500", "scale-[1.02]", "bg-indigo-50", "dark:bg-indigo-950/40");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("ring-2", "ring-indigo-500", "scale-[1.02]", "bg-indigo-50", "dark:bg-indigo-950/40");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-2", "ring-indigo-500", "scale-[1.02]", "bg-indigo-50", "dark:bg-indigo-950/40");
                const data = e.dataTransfer.getData("application/json");
                if (!data) return;
                try {
                  const payload = JSON.parse(data);
                  if (payload.type === "file" && onMoveFile) {
                    onMoveFile(payload.file, folder.path);
                  } else if (payload.type === "folder" && onMoveFolder) {
                    if (payload.folderPath !== folder.path) {
                      onMoveFolder(payload.folderPath, folder.path);
                    }
                  }
                } catch (err) {}
              }}
              onClick={() => onSelectFolder(isActive ? null : folder.path)}
              className={`group flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                isActive
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-950/40 shadow-sm shadow-indigo-100 dark:shadow-indigo-900/20"
                  : `${colorClass} hover:shadow-sm`
              }`}
            >
              <Folder className={`h-5 w-5 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : iconColor}`} />
              <div className="text-left">
                <p className={`text-sm font-semibold ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200"}`}>
                  {folder.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {folder.count} {folder.count === 1 ? "file" : "files"}
                </p>
              </div>
              {onDownloadFolder && (
                <div
                  role="button"
                  tabIndex={0}
                  className="ml-1 hidden p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadFolder(folder.path);
                  }}
                  title="Download Folder"
                >
                  <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
              )}
              {onDeleteFolder && (
                <div
                  role="button"
                  tabIndex={0}
                  className="ml-1 hidden p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.path);
                  }}
                  title="Delete Folder"
                >
                  <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                </div>
              )}
            </button>
          );
        })}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden items-center justify-center h-8 w-8 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-600 hover:bg-white hover:text-indigo-600 dark:bg-gray-800/90 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-400 group-hover/slider:flex transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
