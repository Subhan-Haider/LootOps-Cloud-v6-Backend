"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  FolderPlus, Folder, FolderOpen, Trash2, Pencil, Check, X,
  ChevronRight, ChevronDown, Plus, Loader2, HardDrive, Files,
} from "lucide-react";
import { api, FolderTreeNode } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface FolderRowProps {
  node: FolderTreeNode;
  depth: number;
  onRefresh: () => void;
  onMoveFolder: (source: string, dest: string) => void;
}

function FolderRow({ node, depth, onRefresh, onMoveFolder }: FolderRowProps) {
  const { success, error: toastError } = useToast();
  const [expanded, setExpanded] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [renamingBusy, setRenamingBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [creatingChild, setCreatingChild] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const hasChildren = node.children && node.children.length > 0;

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === node.name) { setRenaming(false); return; }
    setRenamingBusy(true);
    try {
      await api.renameFolder(node.path, node.path.replace(node.name, trimmed));
      success(`Renamed to "${trimmed}"`);
      onRefresh();
    } catch (e: any) {
      toastError(e?.response?.data?.error || "Rename failed");
      setNewName(node.name);
    } finally {
      setRenamingBusy(false);
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteFolder(node.path);
      success(`"${node.name}" deleted`);
      onRefresh();
    } catch (e: any) {
      toastError(e?.response?.data?.error || "Delete failed");
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleCreateChild = async () => {
    const trimmed = childName.trim();
    if (!trimmed) return;
    setCreatingChild(true);
    try {
      await api.createFolder(`${node.path}/${trimmed}`);
      success(`Subfolder "${trimmed}" created`);
      setChildName("");
      setAddingChild(false);
      setExpanded(true);
      onRefresh();
    } catch (e: any) {
      toastError(e?.response?.data?.error || "Failed to create subfolder");
    } finally {
      setCreatingChild(false);
    }
  };

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/json", JSON.stringify({ type: "folder", folderPath: node.path }));
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("ring-2", "ring-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/40");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("ring-2", "ring-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/40");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("ring-2", "ring-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/40");
          const data = e.dataTransfer.getData("application/json");
          if (!data) return;
          try {
            const payload = JSON.parse(data);
            if (payload.type === "folder" && payload.folderPath !== node.path) {
              onMoveFolder(payload.folderPath, node.path);
            }
          } catch (err) {}
        }}
        className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
          depth === 0 ? "border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 shadow-sm mb-1" : "mb-0.5"
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {hasChildren || addingChild
            ? expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            : <span className="w-4 inline-block" />
          }
        </button>

        {/* Folder icon */}
        {expanded && (hasChildren || addingChild)
          ? <FolderOpen className="h-5 w-5 shrink-0 text-indigo-400" />
          : <Folder className="h-5 w-5 shrink-0 text-indigo-400" />
        }

        {/* Name / rename input */}
        {renaming ? (
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setRenaming(false); setNewName(node.name); }}}
              className="flex-1 min-w-0 rounded-lg border border-indigo-300 bg-indigo-50 px-2 py-1 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-800 dark:text-white dark:border-indigo-700"
            />
            <button onClick={handleRename} disabled={renamingBusy} className="text-emerald-500 hover:text-emerald-700">
              {renamingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button onClick={() => { setRenaming(false); setNewName(node.name); }} className="text-gray-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href={`/files?q=${node.path}`}
            className="flex-1 min-w-0 flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{node.name}</span>
            <span className="hidden sm:inline text-xs text-gray-400 shrink-0">
              {node.fileCount} file{node.fileCount !== 1 ? "s" : ""} · {formatSize(node.sizeBytes)}
            </span>
          </Link>
        )}

        {/* Action buttons — shown on hover */}
        {!renaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {/* Add subfolder */}
            <button
              onClick={() => { setAddingChild(true); setExpanded(true); }}
              title="Add subfolder"
              className="rounded-lg p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            {/* Rename */}
            <button
              onClick={() => setRenaming(true)}
              title="Rename"
              className="rounded-lg p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {/* Delete */}
            <button
              onClick={() => setShowConfirmDelete(true)}
              title="Delete folder"
              disabled={deleting}
              className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showConfirmDelete && (
        <div
          className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20 px-4 py-3"
          style={{ marginLeft: `${depth * 20 + 8}px` }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Delete "{node.name}"?</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">This will delete all files inside. Cannot be undone.</p>
          </div>
          <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button onClick={() => setShowConfirmDelete(false)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Cancel
          </button>
        </div>
      )}

      {/* Children */}
      {expanded && (
        <div>
          {node.children?.map(child => (
            <FolderRow key={child.path} node={child} depth={depth + 1} onRefresh={onRefresh} onMoveFolder={onMoveFolder} />
          ))}

          {/* Add subfolder input */}
          {addingChild && (
            <div
              className="flex items-center gap-2 px-3 py-2 mb-1"
              style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}
            >
              <Folder className="h-4 w-4 shrink-0 text-slate-300" />
              <input
                autoFocus
                placeholder="New subfolder name…"
                value={childName}
                onChange={e => setChildName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateChild(); if (e.key === "Escape") { setAddingChild(false); setChildName(""); }}}
                className="flex-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 dark:bg-slate-800 px-2.5 py-1.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-solid"
              />
              <button onClick={handleCreateChild} disabled={creatingChild || !childName.trim()} className="text-emerald-500 hover:text-emerald-700 disabled:opacity-40">
                {creatingChild ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button onClick={() => { setAddingChild(false); setChildName(""); }} className="text-gray-300 hover:text-red-400">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FoldersPage() {
  const { success, error: toastError } = useToast();
  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolder, setNewFolder] = useState("");
  const [creating, setCreating] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const treeData = await api.getFolderTree();
      setTree(treeData);
      // Compute totals
      const sumNodes = (nodes: FolderTreeNode[]): [number, number] => {
        return nodes.reduce(([fc, sb], n) => {
          const [cfc, csb] = sumNodes(n.children || []);
          return [fc + n.fileCount + cfc, sb + n.sizeBytes + csb];
        }, [0, 0] as [number, number]);
      };
      // Only count root-level nodes for dashboard summary
      const [fc, sb] = [
        treeData.reduce((s, n) => s + n.fileCount, 0),
        treeData.reduce((s, n) => s + n.sizeBytes, 0),
      ];
      setTotalFiles(fc);
      setTotalSize(sb);
    } catch {
      toastError("Failed to load folder tree");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  const handleMoveFolder = async (sourceFolder: string, destFolder: string) => {
    try {
      await api.moveFolder(sourceFolder, destFolder);
      success(`Moved ${sourceFolder} into ${destFolder}`);
      loadData();
    } catch {
      toastError(`Failed to move ${sourceFolder}`);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolder.trim()) return;
    setCreating(true);
    try {
      await api.createFolder(newFolder.trim());
      success(`Folder "${newFolder.trim()}" created`);
      setNewFolder("");
      loadData();
    } catch {
      toastError("Failed to create folder");
    } finally {
      setCreating(false);
    }
  };

  const filterTree = (nodes: FolderTreeNode[], query: string): FolderTreeNode[] => {
    if (!query) return nodes;
    const lowerQuery = query.toLowerCase();
    
    return nodes.map(node => {
      const filteredChildren = filterTree(node.children || [], query);
      if (node.name.toLowerCase().includes(lowerQuery) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }).filter(Boolean) as FolderTreeNode[];
  };

  const filteredTree = filterTree(tree, searchQuery);

  return (
    <>
      <Topbar onRefresh={loadData} />
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Folders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Browse, create, rename, and nest your folders.</p>
        </div>

        {/* Summary bar */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                <Folder className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Folders</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{tree.length}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <HardDrive className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total Size</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatSize(totalSize)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Create root folder */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">New Root Folder</p>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 sm:gap-2">
            <input
              type="text"
              placeholder="e.g. projects, photos, docs…"
              value={newFolder}
              onChange={e => setNewFolder(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={creating || !newFolder.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </form>
        </div>

        {/* Folder tree */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-sm space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div className="flex flex-col w-full sm:w-auto">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Folder Tree</p>
              <input 
                type="text"
                placeholder="Search folders..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="text-xs text-gray-400 self-start">{totalFiles} total files</p>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="py-12 text-center">
              <Folder className="mx-auto h-12 w-12 text-slate-200 dark:text-slate-700 mb-3" />
              <p className="text-sm text-gray-400">
                {searchQuery ? "No matching folders found." : "No folders yet. Create one above."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTree.map(node => (
                <FolderRow key={node.path} node={node} depth={0} onRefresh={loadData} onMoveFolder={handleMoveFolder} />
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        {tree.length > 0 && (
          <p className="text-xs text-gray-400 text-center">
            Hover over a folder to <span className="font-semibold">rename</span>, add a <span className="font-semibold">subfolder</span>, or <span className="font-semibold">delete</span> it. Click the name to browse files. You can also <span className="font-semibold">drag and drop</span> folders to move them.
          </p>
        )}

      </div>
    </>
  );
}
