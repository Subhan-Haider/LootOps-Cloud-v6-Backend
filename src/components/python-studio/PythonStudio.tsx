"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { api, FileData, getAuthToken } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Play, Plus, Upload, Trash2, RefreshCw, FolderPlus, Code2,
  Image, Music, Film, FileText, Archive, ChevronRight, ChevronDown,
  Save, Terminal, X, File, Folder, Settings2, Download, Copy, Check,
  AlertTriangle, Loader2, Palette, Wand2, Maximize2, Minimize2, Settings,
  Search, Edit3, ReplaceAll, Sun, Moon, Keyboard, PlayCircle
} from "lucide-react";
import { RenameModal } from "@/components/files/RenameModal";
import { LivePreviewPane } from "./LivePreviewPane";

// ── File type helpers ──────────────────────────────────────────────────────────
function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["py"].includes(ext)) return <Code2 className="h-3.5 w-3.5 text-yellow-400" />;
  if (["png","jpg","jpeg","gif","webp","svg","ico","bmp"].includes(ext)) return <Image className="h-3.5 w-3.5 text-blue-400" />;
  if (["mp3","wav","ogg","flac","aac"].includes(ext)) return <Music className="h-3.5 w-3.5 text-purple-400" />;
  if (["mp4","webm","avi","mov","mkv"].includes(ext)) return <Film className="h-3.5 w-3.5 text-pink-400" />;
  if (["zip","tar","gz","7z","rar"].includes(ext)) return <Archive className="h-3.5 w-3.5 text-amber-400" />;
  return <FileText className="h-3.5 w-3.5 text-slate-400" />;
}

function isImageFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ["png","jpg","jpeg","gif","webp","svg","bmp"].includes(ext);
}
function isPyFile(name: string) {
  return name.split(".").pop()?.toLowerCase() === "py";
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Project { name: string; fileCount: number; pyCount: number; }
interface PythonOutput { stdout: string; stderr: string; exitCode: number; }

const PYGAME_TEMPLATE = `import pygame
import sys

pygame.init()
width, height = 800, 600
screen = pygame.display.set_mode((width, height))
clock = pygame.time.Clock()

x, y = 400, 300
speed = 5

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Controls
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]: x -= speed
    if keys[pygame.K_RIGHT]: x += speed
    if keys[pygame.K_UP]: y -= speed
    if keys[pygame.K_DOWN]: y += speed

    # Render
    screen.fill((30, 30, 30))
    pygame.draw.rect(screen, (59, 130, 246), (x, y, 40, 40))
    
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
sys.exit()
`;

// ── Main Component ─────────────────────────────────────────────────────────────
export function PythonStudio() {
  const { success, error: toastError } = useToast();

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<FileData[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Editor state
  const [activeFile, setActiveFile] = useState<FileData | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  // Terminal state
  const [output, setOutput] = useState<PythonOutput | null>(null);
  const [running, setRunning] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);

  // Asset preview
  const [previewAsset, setPreviewAsset] = useState<string | null>(null);

  // UI
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Tools state
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [copiedColor, setCopiedColor] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [wordWrap, setWordWrap] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoSave, setAutoSave] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getAuthToken().then(t => setToken(t));
  }, []);

  // Theme
  const t = isLightMode ? {
    bg: "bg-white",
    bg2: "bg-slate-100",
    bg3: "bg-slate-50",
    border: "border-slate-200",
    sidebar: "bg-slate-100",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    textFaint: "text-slate-400",
    inputBg: "bg-white",
    btnBg: "bg-slate-200 hover:bg-slate-300",
    btnBorder: "border-slate-300",
    editorBg: "bg-white",
    editorText: "text-slate-800",
    lineNumBg: "bg-slate-50",
    lineNumText: "text-slate-400",
    termBg: "bg-slate-50",
    termHeader: "bg-slate-100",
    panelBg: "bg-slate-100",
    hoverBg: "hover:bg-slate-200",
  } : {
    bg: "bg-[#0d1117]",
    bg2: "bg-[#161b22]",
    bg3: "bg-[#12161c]",
    border: "border-slate-800",
    sidebar: "bg-[#161b22]",
    text: "text-white",
    textMuted: "text-slate-400",
    textFaint: "text-slate-600",
    inputBg: "bg-slate-900",
    btnBg: "bg-slate-800 hover:bg-slate-700",
    btnBorder: "border-slate-700",
    editorBg: "bg-[#0d1117]",
    editorText: "text-emerald-300",
    lineNumBg: "bg-[#0d1117]",
    lineNumText: "text-slate-600",
    termBg: "bg-[#0d1117]",
    termHeader: "bg-[#161b22]",
    panelBg: "bg-[#12161c]",
    hoverBg: "hover:bg-white/5",
  };

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  // Rename state
  const [renameFile, setRenameFile] = useState<FileData | null>(null);

  const hexToRgbStr = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `[${r}, ${g}, ${b}]`;
  };

  const handleReplace = (all: boolean) => {
    if (!findText) return;
    if (all) {
      setEditorContent(editorContent.split(findText).join(replaceText));
    } else {
      setEditorContent(editorContent.replace(findText, replaceText));
    }
  };

  const insertSnippet = (snippet: string) => {
    if (!editorRef.current) return;
    const s = editorRef.current.selectionStart;
    const e = editorRef.current.selectionEnd;
    const val = editorContent;
    setEditorContent(val.substring(0, s) + snippet + val.substring(e));
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.selectionStart = editorRef.current.selectionEnd = s + snippet.length;
        editorRef.current.focus();
      }
    }, 0);
  };

  // ── Load projects ────────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const files = await api.getFiles();
      // Group by folder, flag folders with .py files as projects
      const folderMap = new Map<string, { total: number; py: number }>();
      files.forEach(f => {
        const cur = folderMap.get(f.folder) || { total: 0, py: 0 };
        cur.total++;
        if (isPyFile(f.name)) cur.py++;
        folderMap.set(f.folder, cur);
      });
      const ps: Project[] = Array.from(folderMap.entries()).map(([name, v]) => ({
        name, fileCount: v.total, pyCount: v.py
      }));
      setProjects(ps);
    } catch {
      toastError("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  }, [toastError]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // ── Load project files ───────────────────────────────────────────────────────
  const loadProjectFiles = useCallback(async (folder: string) => {
    try {
      const files = await api.getFolderFiles(folder);
      setProjectFiles(files);
    } catch {
      toastError("Failed to load project files");
    }
  }, [toastError]);

  const selectProject = async (name: string) => {
    setActiveProject(name);
    setExpandedProject(name);
    setActiveFile(null);
    setEditorContent("");
    setSavedContent("");
    setOutput(null);
    await loadProjectFiles(name);
  };

  // ── Open file in editor ──────────────────────────────────────────────────────
  const openFile = async (file: FileData) => {
    if (!isPyFile(file.name)) {
      if (isImageFile(file.name)) {
        const url = file.url.startsWith("http") ? file.url : `${API_BASE}${file.url}`;
        setPreviewAsset(url);
      }
      return;
    }
    setLoadingFile(true);
    setActiveFile(file);
    try {
      const text = await api.getFileContent(file.folder, file.name);
      setEditorContent(text);
      setSavedContent(text);
    } catch {
      toastError("Failed to load file");
    } finally {
      setLoadingFile(false);
    }
  };

  // ── Save file ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    try {
      await api.saveFileContent(activeFile.folder, activeFile.name, editorContent);
      setSavedContent(editorContent);
      success("Saved!");
    } catch {
      toastError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFile, editorContent]);

  // ── Run Python ───────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!activeFile) return;
    // Block running Pygame on the backend to avoid confusion
    if (editorContent.includes("import pygame")) {
      alert("Pygame is a visual library and cannot run on the backend server.\\n\\nPlease click the purple 'Run in Browser' button at the top instead to see the game!");
      return;
    }

    // Auto-save before running
    if (editorContent !== savedContent) await handleSave();
    setRunning(true);
    setOutput(null);
    setTerminalOpen(true);
    try {
      const result = await api.runPython(activeFile.folder, activeFile.name);
      setOutput({ stdout: result.output, stderr: result.error, exitCode: result.exitCode });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setOutput({ stdout: "", stderr: msg, exitCode: -1 });
    } finally {
      setRunning(false);
    }
  };

  // ── Create project ───────────────────────────────────────────────────────────
  const handleCreateProject = async () => {
    const name = newProjectName.trim().replace(/[^a-zA-Z0-9_\-]/g, "_");
    if (!name) return;
    try {
      await api.createFolder(name);
      success(`Project "${name}" created`);
      setNewProjectName("");
      setCreatingProject(false);
      await loadProjects();
      await selectProject(name);
    } catch {
      toastError("Failed to create project");
    }
  };

  // ── Create new Python file ───────────────────────────────────────────────────
  const handleCreateFile = async () => {
    if (!activeProject) return;
    let name = newFileName.trim();
    if (!name) return;
    if (!name.endsWith(".py")) name += ".py";
    try {
      await api.saveFileContent(activeProject, name, `# ${name}\n# Python Studio\n\nprint("Hello from ${name}!")\n`);
      success(`Created ${name}`);
      setNewFileName("");
      setCreatingFile(false);
      await loadProjectFiles(activeProject);
      await loadProjects();
    } catch {
      toastError("Failed to create file");
    }
  };

  // ── Upload assets ────────────────────────────────────────────────────────────
  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProject || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", activeProject);
        await fetch(`${API_BASE}/upload`, {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${await import("@/lib/firebase").then(m => m.auth.currentUser?.getIdToken())}` }
        });
      }
      success(`Uploaded ${files.length} asset(s)`);
      await loadProjectFiles(activeProject);
      await loadProjects();
    } catch {
      toastError("Upload failed");
    }
    e.target.value = "";
  };

  // ── Delete file ──────────────────────────────────────────────────────────────
  const handleDeleteFile = async (file: FileData) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      await api.deleteFile(file.folder, file.name);
      success("Deleted");
      if (activeFile?.name === file.name) {
        setActiveFile(null);
        setEditorContent("");
        setSavedContent("");
      }
      await loadProjectFiles(file.folder);
      await loadProjects();
    } catch {
      toastError("Delete failed");
    }
  };

  // ── Download Folder ──────────────────────────────────────────────────────────
  const handleDownloadFolder = async (folder: string) => {
    try {
      const files = await api.getFolderFiles(folder);
      if (files.length === 0) {
        toastError("Folder is empty");
        return;
      }
      success(`Zipping ${files.length} files...`);
      const filesToZip = files.map(f => ({ folder: f.folder, name: f.name }));
      const blob = await api.zipFiles(filesToZip, folder);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folder}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toastError("Failed to download folder");
    }
  };

  const isDirty = editorContent !== savedContent;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <Topbar onRefresh={loadProjects} />

      <div className={`flex flex-col md:flex-row overflow-hidden ${t.bg} ${isFullscreen ? "fixed inset-0 z-[100]" : "h-[calc(100vh-4rem)]"}`}>

        {/* ── LEFT: Projects + File Explorer ── */}
        {(!isFullscreen) && (
        <aside className={`flex w-full md:w-60 shrink-0 flex-col max-h-[30vh] md:max-h-none border-b md:border-b-0 md:border-r ${t.border} ${t.sidebar} overflow-hidden`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b ${t.border} px-3 py-3`}>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-yellow-500/20">
                <Code2 className="h-3 w-3 text-yellow-400" />
              </div>
              <span className={`text-xs font-bold ${t.text} tracking-wide`}>PYTHON STUDIO</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCreatingProject(true)}
                title="New Project"
                className={`rounded p-1 ${t.textMuted} ${t.hoverBg} transition-colors`}
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={loadProjects}
                title="Refresh"
                className={`rounded p-1 ${t.textMuted} ${t.hoverBg} transition-colors`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* New project input */}
          {creatingProject && (
            <div className={`border-b ${t.border} p-2 space-y-1.5`}>
              <p className={`text-[10px] font-semibold ${t.textFaint} uppercase tracking-wide px-1`}>New Project</p>
              <input
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateProject(); if (e.key === "Escape") setCreatingProject(false); }}
                placeholder="project_name"
                className={`w-full rounded ${t.inputBg} border ${t.border} px-2 py-1 text-xs ${t.text} focus:border-yellow-500 focus:outline-none`}
              />
              <div className="flex gap-1">
                <button onClick={handleCreateProject} className="flex-1 rounded bg-yellow-500/20 px-2 py-1 text-[10px] font-bold text-yellow-400 hover:bg-yellow-500/30 transition-colors">Create</button>
                <button onClick={() => setCreatingProject(false)} className={`flex-1 rounded border ${t.border} px-2 py-1 text-[10px] ${t.textMuted} ${t.hoverBg} transition-colors`}>Cancel</button>
              </div>
            </div>
          )}

          {/* Projects list */}
          <div className="flex-1 overflow-y-auto py-2">
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              </div>
            ) : projects.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Code2 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No projects yet.</p>
                <button onClick={() => setCreatingProject(true)} className="mt-2 text-[10px] text-yellow-400 hover:underline">Create your first project</button>
              </div>
            ) : (
              projects.map(project => (
                <div key={project.name}>
                  {/* Project row */}
                  <button
                    onClick={() => {
                      if (expandedProject === project.name) {
                        setExpandedProject(null);
                      } else {
                        selectProject(project.name);
                      }
                    }}
                    className={`group flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors ${
                      activeProject === project.name
                        ? "bg-yellow-500/10 text-yellow-500"
                        : `${t.textMuted} ${t.hoverBg}`
                    }`}
                  >
                    {expandedProject === project.name
                      ? <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                      : <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />}
                    <Folder className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                    <span className="flex-1 truncate text-xs font-medium">{project.name}</span>
                    <span className={`text-[9px] ${t.textFaint}`}>{project.pyCount}py · {project.fileCount}</span>
                  </button>

                  {/* Files under project */}
                  {expandedProject === project.name && (
                    <div className={`ml-5 border-l ${t.border}`}>
                      {/* Toolbar */}
                      <div className="flex items-center gap-1 px-2 py-1">
                        <button
                          onClick={() => setCreatingFile(true)}
                          title="New .py file"
                          className={`rounded p-0.5 ${t.textMuted} hover:text-yellow-400 transition-colors`}
                        ><Plus className="h-3 w-3" /></button>
                        <button
                          onClick={() => uploadRef.current?.click()}
                          title="Upload assets"
                          className={`rounded p-0.5 ${t.textMuted} hover:text-blue-400 transition-colors`}
                        ><Upload className="h-3 w-3" /></button>
                        <button
                          onClick={() => loadProjectFiles(project.name)}
                          title="Refresh"
                          className={`rounded p-0.5 ${t.textMuted} hover:${t.text} transition-colors`}
                        ><RefreshCw className="h-2.5 w-2.5" /></button>
                        <button
                          onClick={() => handleDownloadFolder(project.name)}
                          title="Download Folder"
                          className={`rounded p-0.5 ${t.textMuted} hover:text-green-400 transition-colors`}
                        ><Download className="h-2.5 w-2.5" /></button>
                      </div>

                      {/* New file input */}
                      {creatingFile && activeProject === project.name && (
                        <div className="px-2 pb-1.5 space-y-1">
                          <input
                            autoFocus
                            value={newFileName}
                            onChange={e => setNewFileName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleCreateFile(); if (e.key === "Escape") setCreatingFile(false); }}
                            placeholder="main.py"
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-0.5 text-[11px] text-white focus:border-yellow-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* File list */}
                      {projectFiles
                        .filter(f => f.folder === project.name && isPyFile(f.name))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(file => (
                          <div
                            key={file.name}
                            onClick={() => openFile(file)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => e.key === "Enter" && openFile(file)}
                            className={`group flex w-full items-center gap-2 px-2 py-1 text-left transition-colors cursor-pointer ${
                              activeFile?.name === file.name
                                ? "bg-indigo-500/20 text-indigo-300"
                                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            }`}
                          >
                            {getFileIcon(file.name)}
                            <span className="flex-1 truncate text-[11px]">{file.name}</span>
                            <div className="hidden group-hover:flex items-center">
                              <button
                                onClick={e => { e.stopPropagation(); setRenameFile(file); }}
                                className="rounded p-0.5 text-slate-600 hover:text-blue-400 transition-colors mr-1"
                                title="Rename"
                              ><Edit3 className="h-2.5 w-2.5" /></button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDeleteFile(file); }}
                                className="rounded p-0.5 text-slate-600 hover:text-red-400 transition-colors"
                                title="Delete"
                              ><Trash2 className="h-2.5 w-2.5" /></button>
                            </div>
                          </div>
                        ))}

                      {projectFiles.filter(f => f.folder === project.name).length === 0 && (
                        <p className="px-3 py-2 text-[10px] text-slate-600">No files yet. Add a .py file or upload assets.</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <input
            ref={uploadRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,.py,.txt,.json,.csv"
            onChange={handleUploadAsset}
            className="hidden"
          />
        </aside>
        )}

        {/* ── CENTER + BOTTOM: Editor + Terminal ── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Editor toolbar */}
          <div className={`flex items-center gap-2 border-b ${t.border} ${t.bg2} px-4 py-2`}>
            {activeFile ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <Code2 className="h-4 w-4 text-yellow-400 shrink-0" />
                  <span className={`text-sm font-medium ${t.text} truncate`}>{activeFile.name}</span>
                  {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" title="Unsaved changes" />}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    className={`flex items-center gap-1.5 rounded-lg border ${t.btnBorder} ${t.btnBg} px-3 py-1.5 text-xs font-medium ${t.textMuted} disabled:opacity-40 transition-all`}
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                    <span className="text-[9px] text-slate-500 ml-1">Ctrl+S</span>
                  </button>
                  {isPyFile(activeFile.name) && (
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all shadow-md ${showPreview ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30" : "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 border border-indigo-500/20"}`}
                      title="Run Pygame visually in the browser via PyScript"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {showPreview ? "Close Preview" : "Run in Browser"}
                    </button>
                  )}
                  <button
                    onClick={handleRun}
                    disabled={running}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-1.5 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-900/30"
                  >
                    {running
                      ? <><Loader2 className="h-3 w-3 animate-spin" />Running...</>
                      : <><Play className="h-3 w-3" />Run</>}
                  </button>
                  <div className={`w-px h-5 ${isLightMode ? "bg-slate-300" : "bg-slate-700"} mx-1`} />
                  {/* Download button */}
                  {activeFile && (
                    <button
                      onClick={() => {
                        const url = activeFile.url.startsWith("http") ? activeFile.url : `${API_BASE}${activeFile.url}`;
                        window.open(url, "_blank");
                      }}
                      className={`flex items-center gap-1.5 rounded-lg border ${t.btnBorder} ${t.btnBg} px-2 py-1.5 text-xs font-medium ${t.textMuted} transition-all`}
                      title="Download Code"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  )}
                  {/* Fullscreen Sidebar Toggle */}
                  {isFullscreen && (
                    <button
                      onClick={() => setShowSidebar(!showSidebar)}
                      className={`rounded-lg border ${t.btnBorder} ${t.btnBg} p-1.5 ${showSidebar ? "text-indigo-500" : t.textMuted} transition-all`}
                      title={showSidebar ? "Hide Sidebar" : "Show Assets & Dev Tools"}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowShortcuts(true)}
                    className={`rounded-lg border ${t.btnBorder} ${t.btnBg} p-1.5 ${t.textMuted} transition-all`}
                    title="Keyboard Shortcuts"
                  >
                    <Keyboard className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setShowFindReplace(!showFindReplace)}
                    className={`rounded-lg border ${t.btnBorder} p-1.5 transition-all ${showFindReplace ? "bg-indigo-600 border-indigo-600 text-white" : `${t.btnBg} ${t.textMuted}`}`}
                    title="Find & Replace"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setIsLightMode(!isLightMode)}
                    className={`rounded-lg border ${t.btnBorder} ${t.btnBg} p-1.5 ${t.textMuted} transition-all`}
                    title={isLightMode ? "Switch to Dark" : "Switch to Light"}
                  >
                    {isLightMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className={`rounded-lg border ${t.btnBorder} ${t.btnBg} p-1.5 ${t.textMuted} transition-all`}
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
                  >
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </>
            ) : (
              <div className={`flex items-center gap-2 ${t.textMuted}`}>
                <Settings2 className="h-4 w-4" />
                <span className="text-sm">{activeProject ? "Select a file to edit" : "Select or create a project to get started"}</span>
              </div>
            )}
          </div>

          {/* Tab bar */}
          {activeFile && (
            <div className={`flex items-center gap-1 border-b ${t.border} ${t.editorBg} px-3 py-1`}>
              <div className={`flex items-center gap-2 rounded-t ${t.bg2} border ${t.border} border-b-0 px-3 py-1`}>
                {getFileIcon(activeFile.name)}
                <span className={`text-[11px] ${t.textMuted}`}>{activeFile.name}</span>
                {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />}
                <button onClick={() => { setActiveFile(null); setEditorContent(""); setSavedContent(""); }} className={`${t.textFaint} hover:${t.textMuted} transition-colors`}><X className="h-3 w-3" /></button>
              </div>
            </div>
          )}

          {/* Editor area */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {!activeFile ? (
              /* Welcome screen */
              <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center p-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
                  <Code2 className="h-10 w-10 text-yellow-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${t.text} mb-1`}>Python Studio</h2>
                  <p className={`text-sm ${t.textMuted} max-w-sm`}>Build Python projects with images, audio, and assets. Edit code, upload resources, and run scripts — all in one place.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-lg w-full">
                  {[
                    { icon: <FolderPlus className="h-4 w-4 text-yellow-400" />, title: "Create Project", desc: "Organize scripts + assets in a folder" },
                    { icon: <Upload className="h-4 w-4 text-blue-400" />, title: "Upload Assets", desc: "Add images, audio, video to your project" },
                    { icon: <Play className="h-4 w-4 text-emerald-400" />, title: "Run & Debug", desc: "Execute Python with stdout/stderr capture" },
                  ].map(item => (
                    <div key={item.title} className={`rounded-xl border ${t.border} ${t.bg2} p-3`}>
                      <div className="mb-1">{item.icon}</div>
                      <p className={`text-xs font-semibold ${t.text} mb-0.5`}>{item.title}</p>
                      <p className={`text-[10px] ${t.textMuted}`}>{item.desc}</p>
                    </div>
                  ))}
                </div>
                {!activeProject && (
                  <button
                    onClick={() => setCreatingProject(true)}
                    className="flex items-center gap-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 px-5 py-2.5 text-sm font-semibold text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                  >
                    <FolderPlus className="h-4 w-4" /> New Project
                  </button>
                )}
              </div>
            ) : loadingFile ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : (
              /* Code Editor */
              <div className="flex flex-1 min-h-0 relative">
                {/* Line numbers */}
                {showLineNumbers && !showPreview && (
                  <div
                    className={`select-none shrink-0 border-r ${t.border} ${t.lineNumBg} px-3 pt-4 pb-4 text-right font-mono ${t.lineNumText} overflow-hidden min-w-[3rem]`}
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                  >
                    {editorContent.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                )}
                {/* Textarea */}
                <textarea
                  ref={editorRef}
                  value={editorContent}
                  onChange={e => setEditorContent(e.target.value)}
                  spellCheck={false}
                  onKeyDown={e => {
                    // Tab support
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const s = e.currentTarget.selectionStart;
                      const end = e.currentTarget.selectionEnd;
                      const val = editorContent;
                      setEditorContent(val.substring(0, s) + "    " + val.substring(end));
                      requestAnimationFrame(() => {
                        if (editorRef.current) {
                          editorRef.current.selectionStart = editorRef.current.selectionEnd = s + 4;
                        }
                      });
                    }
                  }}
                  className={`flex-1 h-full resize-none ${t.editorBg} p-4 font-mono ${t.editorText} focus:outline-none caret-yellow-400 ${wordWrap ? "whitespace-pre-wrap" : "whitespace-pre"}`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                />
                
                {/* Live Preview (Right Pane) */}
                {showPreview && (
                  <div className={`flex-1 min-w-0 overflow-hidden relative border-l ${t.border} ${isLightMode ? "bg-slate-50" : "bg-[#0d1117]"}`}>
                    <LivePreviewPane code={editorContent} isLightMode={isLightMode} />
                  </div>
                )}
                
                {/* Find & Replace Overlay */}
                {showFindReplace && (
                  <div className={`absolute top-2 right-6 w-72 rounded-lg border ${t.border} ${t.bg} shadow-xl overflow-hidden z-10 flex flex-col`}>
                    <div className={`flex items-center justify-between ${t.bg2} px-3 py-1.5 border-b ${t.border}`}>
                      <span className={`text-[10px] font-bold ${t.textMuted} uppercase tracking-wider`}>Find & Replace</span>
                      <button onClick={() => setShowFindReplace(false)} className={`${t.textFaint} hover:${t.textMuted}`}><X className="h-3 w-3" /></button>
                    </div>
                    <div className="p-2 space-y-2">
                      <div className={`flex items-center ${t.inputBg} rounded border ${t.border} px-2 py-1`}>
                        <Search className={`h-3 w-3 ${t.textMuted} mr-2 shrink-0`} />
                        <input
                          autoFocus
                          value={findText}
                          onChange={e => setFindText(e.target.value)}
                          placeholder="Find..."
                          className={`w-full bg-transparent text-xs ${t.text} outline-none`}
                        />
                      </div>
                      <div className={`flex items-center ${t.inputBg} rounded border ${t.border} px-2 py-1`}>
                        <Edit3 className={`h-3 w-3 ${t.textMuted} mr-2 shrink-0`} />
                        <input
                          value={replaceText}
                          onChange={e => setReplaceText(e.target.value)}
                          placeholder="Replace with..."
                          className={`w-full bg-transparent text-xs ${t.text} outline-none`}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          onClick={() => handleReplace(false)}
                          disabled={!findText}
                          className={`rounded ${t.btnBg} border ${t.btnBorder} px-3 py-1 text-[10px] font-medium ${t.text} disabled:opacity-50`}
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => handleReplace(true)}
                          disabled={!findText}
                          className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1 text-[10px] font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                          <ReplaceAll className="h-2.5 w-2.5" /> Replace All
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TERMINAL ── */}
            <div className={`shrink-0 border-t ${t.border} ${t.termBg} flex flex-col transition-all duration-200 ${terminalOpen ? "h-52" : "h-9"}`}>
              {/* Terminal header */}
              <div className={`flex items-center gap-2 border-b ${t.border} px-3 py-1.5 ${t.termHeader} shrink-0`}>
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-slate-300">Terminal</span>
                {output && (
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    output.exitCode === 0 ? "bg-emerald-900/50 text-emerald-400"
                    : output.exitCode === -1 ? "bg-amber-900/50 text-amber-400"
                    : "bg-red-900/50 text-red-400"
                  }`}>
                    {output.exitCode === -1 ? "TIMEOUT" : `Exit ${output.exitCode}`}
                  </span>
                )}
                {running && <span className="text-[10px] text-slate-500 animate-pulse">Executing...</span>}
                <div className="ml-auto flex items-center gap-1">
                  {output && (
                    <>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText((output.stdout + output.stderr).trim());
                          setCopiedOutput(true);
                          setTimeout(() => setCopiedOutput(false), 2000);
                        }}
                        className="rounded p-1 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy output"
                      >
                        {copiedOutput ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button onClick={() => setOutput(null)} className="rounded p-1 text-slate-500 hover:text-slate-300 transition-colors" title="Clear"><X className="h-3 w-3" /></button>
                    </>
                  )}
                  <button onClick={() => setTerminalOpen(v => !v)} className="rounded p-1 text-slate-500 hover:text-slate-300 transition-colors">
                    {terminalOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Terminal output */}
              {terminalOpen && (
                <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
                  {running && <p className={`${t.textMuted} animate-pulse`}>▶ Running {activeFile?.name}...</p>}
                  {!output && !running && <p className={t.textFaint}>Press Run ▶ to execute the active Python script. Output appears here.</p>}
                  {output && (
                    <>
                      {output.stdout && <pre className="text-emerald-400 whitespace-pre-wrap break-words">{output.stdout}</pre>}
                      {output.stderr && (
                        <div className="mt-1">
                          {(() => {
                            const match = output.stderr.match(/line\s+(\d+)/i);
                            const errLine = match ? parseInt(match[1], 10) : null;
                            return (
                              <>
                                {errLine && (
                                  <div className="mb-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                                    <span className="text-red-400 text-xs font-semibold">
                                      Syntax or Runtime Error detected on Line {errLine}
                                    </span>
                                  </div>
                                )}
                                <span className="text-red-500 flex items-center gap-1 mb-1"><AlertTriangle className="h-3 w-3" /> stderr:</span>
                                <pre className="text-red-400 whitespace-pre-wrap break-words">{output.stderr}</pre>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {!output.stdout && !output.stderr && (
                        <p className={t.textMuted}>Script finished with no output (exit {output.exitCode}).</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Asset Panel & Tools ── */}
        {activeProject && (
          <aside className={`${
            isFullscreen
              ? showSidebar ? "flex" : "hidden"
              : "hidden xl:flex"
          } w-full md:w-64 shrink-0 flex-col max-h-[25vh] md:max-h-none border-t md:border-t-0 md:border-l ${t.border} ${t.sidebar} overflow-hidden`}>
            <div className={`border-b ${t.border} px-3 py-3`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textFaint}`}>Project Assets</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[100px]">
              {projectFiles
                .filter(f => f.folder === activeProject && !isPyFile(f.name))
                .map(file => {
                  let fileUrl = file.url.startsWith("http") ? file.url : `${API_BASE}${file.url}`;
                  if (!file.isPublic && token) {
                    fileUrl += `?token=${token}`;
                  }
                  return (
                    <button
                      key={file.name}
                      onClick={() => isImageFile(file.name) ? setPreviewAsset(fileUrl) : window.open(fileUrl, "_blank")}
                      className={`group relative w-full rounded-lg overflow-hidden border ${t.border} ${isLightMode ? 'hover:border-slate-300 bg-slate-200/50' : 'hover:border-slate-600 bg-slate-900/50'} transition-colors`}
                    >
                      {isImageFile(file.name) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fileUrl} alt={file.name} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="flex h-14 items-center justify-center">
                          {getFileIcon(file.name)}
                        </div>
                      )}
                      <div className={`px-2 py-1 ${t.bg2}`}>
                        <p className={`text-[9px] ${t.text} truncate`}>{file.name}</p>
                        <p className={`text-[8px] ${t.textFaint}`}>{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      {/* Download overlay */}
                      <a
                        href={fileUrl}
                        download
                        onClick={e => e.stopPropagation()}
                        className="absolute top-1 right-1 hidden group-hover:flex rounded bg-black/60 p-1"
                      >
                        <Download className="h-2.5 w-2.5 text-white" />
                      </a>
                    </button>
                  );
                })}
              {projectFiles.filter(f => f.folder === activeProject && !isPyFile(f.name)).length === 0 && (
                <div className="py-6 text-center">
                  <Image className="h-6 w-6 text-slate-700 mx-auto mb-1" />
                  <p className={`text-[10px] ${t.textFaint}`}>No assets yet.</p>
                  <button onClick={() => uploadRef.current?.click()} className="mt-1 text-[10px] text-blue-400 hover:underline">Upload assets</button>
                </div>
              )}
            </div>

            {/* Upload button */}
            <div className={`border-t ${t.border} p-2`}>
              <button
                onClick={() => uploadRef.current?.click()}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed ${t.border} py-2 text-[11px] ${t.textMuted} hover:border-blue-500 hover:text-blue-400 transition-colors`}
              >
                <Upload className="h-3.5 w-3.5" /> Upload Asset
              </button>
            </div>

            {/* Development Tools */}
            <div className={`border-t ${t.border} ${t.panelBg} flex flex-col shrink-0`}>
              <div className={`px-3 py-2 border-b ${t.border}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textFaint}`}>Dev Tools</p>
              </div>
              <div className="p-3 space-y-3">
                {/* Color Picker */}
                <div>
                  <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] ${t.textFaint}`}>
                    <Palette className="h-3 w-3" /> Color Picker
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={e => setSelectedColor(e.target.value)}
                      className={`h-7 w-8 cursor-pointer rounded border ${t.border} ${t.inputBg} p-0`}
                    />
                    <div className="flex-1 flex gap-1">
                      <div className={`flex-1 rounded border ${t.border} ${t.inputBg} px-2 py-1 text-[10px] font-mono ${t.text}`}>
                        {hexToRgbStr(selectedColor)}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(hexToRgbStr(selectedColor));
                          setCopiedColor(true);
                          setTimeout(() => setCopiedColor(false), 2000);
                        }}
                        className={`rounded ${t.btnBg} border ${t.btnBorder} px-1.5 py-1 ${t.text} transition-colors`}
                        title="Copy RGB"
                      >
                        {copiedColor ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Snippets */}
                <div>
                  <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] ${t.textFaint}`}>
                    <Wand2 className="h-3 w-3" /> Quick Snippets
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => insertSnippet('print("Hello World")\n')}
                      className={`rounded border ${t.btnBorder} ${t.btnBg} py-1 text-[10px] ${t.textMuted} hover:${t.text} transition-colors`}
                    >
                      Print
                    </button>
                    <button
                      onClick={() => insertSnippet('import pygame\nimg = pygame.image.load("image.png")\n')}
                      className={`rounded border ${t.btnBorder} ${t.btnBg} py-1 text-[10px] ${t.textMuted} hover:${t.text} transition-colors`}
                    >
                      Load Image
                    </button>
                    <button
                      onClick={() => insertSnippet('for i in range(10):\n    print(i)\n')}
                      className={`rounded border ${t.btnBorder} ${t.btnBg} py-1 text-[10px] ${t.textMuted} hover:${t.text} transition-colors`}
                    >
                      For Loop
                    </button>
                    <button
                      onClick={() => insertSnippet('try:\n    # Code\n    pass\nexcept Exception as e:\n    print(e)\n')}
                      className={`rounded border ${t.btnBorder} ${t.btnBg} py-1 text-[10px] ${t.textMuted} hover:${t.text} transition-colors`}
                    >
                      Try/Except
                    </button>
                    <button
                      onClick={() => insertSnippet('class MyClass:\n    def __init__(self):\n        pass\n')}
                      className={`rounded border ${t.btnBorder} ${t.btnBg} py-1 text-[10px] ${t.textMuted} hover:${t.text} transition-colors col-span-2`}
                    >
                      Class
                    </button>
                    <button
                      onClick={() => insertSnippet('def main():\n    pass\n\nif __name__ == "__main__":\n    main()\n')}
                      className={`rounded border ${t.btnBorder} ${t.btnBg} py-1 text-[10px] ${t.textMuted} hover:${t.text} transition-colors col-span-2`}
                    >
                      Main Block
                    </button>
                    <button
                      onClick={() => insertSnippet(PYGAME_TEMPLATE)}
                      className={`rounded border border-indigo-500/50 bg-indigo-500/10 py-1 text-[10px] text-indigo-500 font-medium hover:bg-indigo-500/20 transition-colors col-span-2`}
                    >
                      Pygame Game Loop
                    </button>
                  </div>
                </div>

                {/* Editor Settings */}
                <div>
                  <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] ${t.textFaint}`}>
                    <Settings className="h-3 w-3" /> Editor Settings
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={t.textMuted}>Font Size</span>
                      <div className={`flex items-center gap-1 ${t.btnBg} rounded border ${t.btnBorder}`}>
                        <button onClick={() => setFontSize(Math.max(10, fontSize - 1))} className={`px-1.5 py-0.5 ${t.textMuted} hover:${t.text}`}>-</button>
                        <span className={`${t.text} w-4 text-center`}>{fontSize}</span>
                        <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className={`px-1.5 py-0.5 ${t.textMuted} hover:${t.text}`}>+</button>
                      </div>
                    </div>
                    <label className="flex items-center justify-between text-[10px] cursor-pointer">
                      <span className={t.textMuted}>Auto-Save</span>
                      <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} className={`rounded ${t.btnBorder} ${t.inputBg}`} />
                    </label>
                    <label className="flex items-center justify-between text-[10px] cursor-pointer">
                      <span className={t.textMuted}>Word Wrap</span>
                      <input type="checkbox" checked={wordWrap} onChange={e => setWordWrap(e.target.checked)} className={`rounded ${t.btnBorder} ${t.inputBg}`} />
                    </label>
                    <label className="flex items-center justify-between text-[10px] cursor-pointer">
                      <span className={t.textMuted}>Line Numbers</span>
                      <input type="checkbox" checked={showLineNumbers} onChange={e => setShowLineNumbers(e.target.checked)} className={`rounded ${t.btnBorder} ${t.inputBg}`} />
                    </label>
                  </div>
                </div>

              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── Shortcuts Modal ── */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className={`relative max-w-sm w-full rounded-xl border ${t.border} ${t.bg} p-6 shadow-2xl`} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowShortcuts(false)} className={`absolute top-4 right-4 ${t.textMuted} hover:${t.text}`}><X className="h-4 w-4" /></button>
            <h3 className={`text-lg font-bold ${t.text} mb-4 flex items-center gap-2`}><Keyboard className="h-5 w-5" /> Keyboard Shortcuts</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className={t.textMuted}>Save File</span>
                <kbd className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold">Ctrl + S</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className={t.textMuted}>Find & Replace</span>
                <kbd className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold">Ctrl + F</kbd>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className={t.textMuted}>Indent / Space</span>
                <kbd className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold">Tab</kbd>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className={t.textMuted}>Run Script</span>
                <span className={`text-xs ${t.textMuted}`}>Use Run button</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image preview modal ── */}
      {previewAsset && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreviewAsset(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewAsset} alt="Asset preview" className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            <button onClick={() => setPreviewAsset(null)} className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Rename modal ── */}
      <RenameModal
        file={renameFile}
        onClose={() => setRenameFile(null)}
        onSuccess={() => {
          if (activeProject) {
            loadProjectFiles(activeProject);
            loadProjects();
          }
        }}
      />
    </>
  );
}
