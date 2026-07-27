"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { FileGrid } from "@/components/files/FileGrid";
import { FolderView } from "@/components/files/FolderView";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";
import { ShareModal } from "@/components/files/ShareModal";
import { BulkShareModal } from "@/components/files/BulkShareModal";
import { BulkActionsModal } from "@/components/files/BulkActionsModal";
import { RenameModal } from "@/components/files/RenameModal";
import { MoveModal } from "@/components/files/MoveModal";
import { api, FileData, FolderTreeNode } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { LayoutGrid, List, Trash2, Filter, Download, Share2, MoreHorizontal, FolderPlus, Check, X, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function FilesPage() {
  const { success, error: toastError } = useToast();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase() || "";

  const [files, setFiles] = useState<FileData[]>([]);
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>("all");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Modals
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [shareFile, setShareFile] = useState<FileData | null>(null);
  const [showBulkShare, setShowBulkShare] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [renameFile, setRenameFile] = useState<FileData | null>(null);
  const [moveFile, setMoveFile] = useState<FileData | null>(null);

  const [isCreatingSub, setIsCreatingSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [creatingSubBusy, setCreatingSubBusy] = useState(false);

  const handleCreateSubfolder = async () => {
    if (!subName.trim() || !activeFolder) return;
    setCreatingSubBusy(true);
    try {
      await api.createFolder(`${activeFolder}/${subName.trim()}`);
      success(`Subfolder created`);
      setSubName("");
      setIsCreatingSub(false);
      loadData();
    } catch {
      toastError("Failed to create subfolder");
    } finally {
      setCreatingSubBusy(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [filesData, treeData] = await Promise.all([
        api.getFiles(),
        api.getFolderTree()
      ]);
      setFiles(filesData);
      setFolderTree(treeData);
    } catch (err) {
      toastError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute folders
  const findNodeByPath = (nodes: FolderTreeNode[], path: string): FolderTreeNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
    return null;
  };

  let displayedNodes = folderTree;
  if (activeFolder) {
    const node = findNodeByPath(folderTree, activeFolder);
    if (node) {
      displayedNodes = node.children;
    } else {
      displayedNodes = [];
    }
  }

  const foldersList = displayedNodes.map(node => ({
    path: node.path,
    name: node.name,
    count: node.fileCount
  }));

  const getAllPaths = (nodes: FolderTreeNode[]): string[] => {
    let paths: string[] = [];
    for (const node of nodes) {
      paths.push(node.path);
      paths = paths.concat(getAllPaths(node.children));
    }
    return paths;
  };
  const allFolderPaths = getAllPaths(folderTree);

  // Filter files
  let filteredFiles = files.filter(f => f.isPublic);
  if (activeFolder) filteredFiles = filteredFiles.filter(f => f.folder === activeFolder);
  if (activeType !== "all") filteredFiles = filteredFiles.filter(f => f.type === activeType);
  if (searchQuery) {
    filteredFiles = filteredFiles.filter(f => 
      f.name.toLowerCase().includes(searchQuery) || 
      f.folder.toLowerCase().includes(searchQuery)
    );
  }

  const handleSelect = (key: string) => {
    setSelectedFiles(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => `${f.folder}/${f.name}`));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedFiles.length} files?`)) return;
    try {
      const filesToDelete = selectedFiles.map(key => {
        const slashIdx = key.indexOf("/");
        return { folder: key.slice(0, slashIdx), name: key.slice(slashIdx + 1) };
      });
      await api.bulkDelete(filesToDelete);
      success(`Deleted ${selectedFiles.length} files`);
      setSelectedFiles([]);
      loadData();
    } catch {
      toastError("Error during bulk delete");
    }
  };

  const handleBulkDownload = async () => {
    try {
      const filesToZip = selectedFiles.map(key => {
        const slashIdx = key.indexOf("/");
        return { folder: key.slice(0, slashIdx), name: key.slice(slashIdx + 1) };
      });
      success(`Zipping ${filesToZip.length} file(s)...`);
      const blob = await api.zipFiles(filesToZip, "selected-files");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "selected-files.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      let msg = "Failed to download selected files";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          msg = JSON.parse(text).error || msg;
        } catch {}
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }
      toastError(msg);
    }
  };

  const handleDelete = async (folder: string, name: string) => {
    if (!confirm("Delete this file?")) return;
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
      success(`Privacy updated`);
      loadData();
    } catch {
      toastError("Failed to update privacy");
    }
  };

  const handleDownloadFolder = async (folder: string) => {
    try {
      const folderFiles = files.filter(f => f.folder === folder).map(f => ({ folder: f.folder, name: f.name }));
      if (folderFiles.length === 0) {
        toastError("Folder is empty");
        return;
      }
      success(`Zipping ${folderFiles.length} files...`);
      const blob = await api.zipFiles(folderFiles, folder);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folder}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      let msg = "Failed to download folder";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          msg = JSON.parse(text).error || msg;
        } catch {}
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }
      toastError(msg);
    }
  };

  const handleDeleteFolder = async (folder: string) => {
    const fileCount = files.filter(f => f.folder === folder).length;
    const msg = fileCount > 0
      ? `Delete folder "${folder}" and all ${fileCount} file(s) inside? This cannot be undone.`
      : `Delete empty folder "${folder}"?`;
    if (!confirm(msg)) return;
    try {
      await api.deleteFolder(folder);
      success(`Folder "${folder}" deleted`);
      if (activeFolder === folder) setActiveFolder(null);
      loadData();
    } catch {
      toastError(`Failed to delete folder "${folder}"`);
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    try {
      await api.createFolder(folderName);
      success(`Folder "${folderName}" created`);
      loadData();
    } catch {
      toastError(`Failed to create folder "${folderName}"`);
    }
  };

  const handleMoveFile = async (file: FileData, destFolder: string) => {
    try {
      await api.moveFile(file.name, file.folder, destFolder);
      success(`Moved ${file.name} to ${destFolder}`);
      loadData();
    } catch {
      toastError(`Failed to move ${file.name}`);
    }
  };

  const handleMoveFolder = async (sourceFolder: string, destFolder: string) => {
    try {
      await api.moveFolder(sourceFolder, destFolder);
      success(`Moved ${sourceFolder} into ${destFolder}`);
      loadData();
    } catch {
      toastError(`Failed to move ${sourceFolder}`);
    }
  };

  const handleMoveToVault = async (file: FileData) => {
    try {
      await api.vault.moveToVault(file.folder, file.name);
      success("Moved to Secure Vault");
      loadData();
    } catch {
      toastError("Failed to move to vault");
    }
  };

  return (
    <>
      <Topbar onRefresh={loadData} />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Files</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage all your uploaded files.</p>
        </div>

        <FolderView folders={foldersList} activeFolder={activeFolder} onSelectFolder={setActiveFolder} onDownloadFolder={handleDownloadFolder} onDeleteFolder={handleDeleteFolder} onCreateFolder={handleCreateFolder} onMoveFile={handleMoveFile} onMoveFolder={handleMoveFolder} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={activeType}
              onChange={e => setActiveType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="pdf">PDFs</option>
              <option value="html">HTML</option>
              <option value="document">Documents</option>
              <option value="code">Code</option>
              <option value="archive">Archives</option>
              <option value="installer">Installers</option>
              <option value="unknown">Other</option>
            </select>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedFiles.length > 0 && (
              <>
                <button
                  onClick={handleBulkDownload}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-3 sm:py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download ({selectedFiles.length})
                </button>
                <button
                  onClick={() => setShowBulkShare(true)}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-3 sm:py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  Share ({selectedFiles.length})
                </button>
                <button
                  onClick={() => setShowBulkActions(true)}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-3 sm:py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  More Actions
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-3 sm:py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedFiles.length})
                </button>
              </>
            )}

            {activeFolder && (
              isCreatingSub ? (
                <div className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 dark:border-indigo-800/40 dark:bg-indigo-950/20">
                  <input
                    autoFocus
                    value={subName}
                    onChange={e => setSubName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleCreateSubfolder(); if (e.key === "Escape") { setIsCreatingSub(false); setSubName(""); } }}
                    placeholder="Subfolder name..."
                    className="w-32 bg-transparent text-sm font-medium text-indigo-900 outline-none placeholder:text-indigo-300 dark:text-indigo-100 dark:placeholder:text-indigo-700"
                  />
                  <button onClick={handleCreateSubfolder} disabled={creatingSubBusy || !subName.trim()} className="text-emerald-500 hover:text-emerald-700 disabled:opacity-50">
                    {creatingSubBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button onClick={() => { setIsCreatingSub(false); setSubName(""); }} className="text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingSub(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <FolderPlus className="h-4 w-4" />
                  New Subfolder
                </button>
              )
            )}

            <button
              onClick={handleSelectAll}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              {selectedFiles.length === filteredFiles.length && filteredFiles.length > 0 ? "Deselect All" : "Select All"}
            </button>

            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-gray-800">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-slate-100 text-gray-900 dark:bg-slate-700 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-slate-100 text-gray-900 dark:bg-slate-700 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <FileGrid
          files={filteredFiles}
          selectedFiles={selectedFiles}
          viewMode={viewMode}
          onSelectFile={handleSelect}
          onDelete={handleDelete}
          onRename={setRenameFile}
          onMove={setMoveFile}
          onShare={setShareFile}
          onTogglePrivacy={handleTogglePrivacy}
          onPreview={setPreviewFile}
          onMoveToVault={handleMoveToVault}
          isLoading={loading}
        />
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      <ShareModal file={shareFile} onClose={() => setShareFile(null)} />
      {showBulkShare && (
        <BulkShareModal 
          files={filteredFiles.filter(f => selectedFiles.includes(`${f.folder}/${f.name}`))} 
          onClose={() => setShowBulkShare(false)} 
        />
      )}
      {showBulkActions && (
        <BulkActionsModal
          files={filteredFiles.filter(f => selectedFiles.includes(`${f.folder}/${f.name}`))}
          folders={allFolderPaths}
          onClose={() => setShowBulkActions(false)}
          onSuccess={() => { setSelectedFiles([]); loadData(); }}
        />
      )}
      <RenameModal file={renameFile} onClose={() => setRenameFile(null)} onSuccess={loadData} />
      <MoveModal file={moveFile} folders={allFolderPaths} onClose={() => setMoveFile(null)} onSuccess={loadData} />
    </>
  );
}
