"use client";

import { useEffect, useState } from "react";
import {
  X, Download, Copy, Check, FileText, Archive, Music, Code2,
  Tag, Hash, Calendar, Info, AlignLeft, ChevronRight, Eye, Smartphone
} from "lucide-react";
import { FileData, api } from "@/lib/api";
import { auth } from "@/lib/firebase";

interface FilePreviewModalProps {
  file: FileData | null;
  onClose: () => void;
}

// Map file extensions to language labels for the code header
const EXT_LANG_MAP: Record<string, string> = {
  js: "JavaScript", ts: "TypeScript", jsx: "JSX", tsx: "TSX",
  py: "Python", html: "HTML", htm: "HTML", css: "CSS",
  json: "JSON", xml: "XML", yaml: "YAML", yml: "YAML",
  sh: "Shell", bash: "Bash", php: "PHP", rb: "Ruby",
  java: "Java", c: "C", cpp: "C++", h: "C Header",
  cs: "C#", go: "Go", rs: "Rust", sql: "SQL",
  graphql: "GraphQL", env: "ENV", toml: "TOML",
  ini: "INI", cfg: "Config", log: "Log", md: "Markdown",
  csv: "CSV", txt: "Text",
};

// Simple Markdown -> HTML converter (no external deps)
function simpleMarkdown(md: string): string {
  // First extract code blocks to avoid messing up their internal formatting
  const codeBlocks: string[] = [];
  let parsed = md.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  parsed = parsed
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3 class='text-base font-bold mt-4 mb-2'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-lg font-bold mt-5 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-xl font-bold mt-6 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2'>$1</h1>")
    .replace(/^> (.+)$/gm, "<blockquote class='border-l-4 border-indigo-500 pl-4 py-1 my-2 bg-slate-50 dark:bg-slate-800/50 italic text-gray-700 dark:text-gray-300'>$1</blockquote>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400'>$1</code>")
    .replace(/^[-*] (.+)$/gm, "<li class='ml-6 list-disc mb-1'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-6 list-decimal mb-1'>$2</li>")
    .replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2' class='text-indigo-600 dark:text-indigo-400 hover:underline' target='_blank'>$1</a>")
    .replace(/\n{2,}/g, "</p><p class='mb-3'>")
    .replace(/^(?!<[h|l|p|b|u])(.+)$/gm, (m) => m && !m.startsWith("__CODE_BLOCK") ? `<p class='mb-3'>${m}</p>` : m);

  // Restore code blocks
  parsed = parsed.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
    return `<pre class='bg-slate-950 p-4 rounded-xl overflow-x-auto text-emerald-400 font-mono text-sm my-4 border border-slate-800'><code>${codeBlocks[parseInt(index)]}</code></pre>`;
  });

  return parsed;
}

// Parse CSV into 2D array
function parseCsv(text: string): string[][] {
  return text.trim().split("\n").map(line =>
    line.split(",").map(cell => cell.trim().replace(/^"|"$/g, ""))
  );
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [codeContent, setCodeContent] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [runningPython, setRunningPython] = useState(false);
  const [pythonResult, setPythonResult] = useState<{ output: string; error: string; exitCode: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<"preview" | "code" | "rendered" | "pyscript">("preview");
  const [showInfo, setShowInfo] = useState(false);
  const [token, setToken] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!file) return;
    // Always refresh the token when a new file opens so private files load correctly
    auth.currentUser?.getIdToken(true).then(setToken).catch(() => {});
  }, [file]);

  const ext = file?.name.split(".").pop()?.toLowerCase() ?? "";
  const langLabel = EXT_LANG_MAP[ext] ?? ext.toUpperCase();

  useEffect(() => {
    if (!file) return;
    document.body.style.overflow = "hidden";

    setImageFailed(false);

    const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (fileExt === "html" || fileExt === "htm") {
      setPreviewMode("preview");
    } else if (fileExt === "md" || fileExt === "csv") {
      setPreviewMode("rendered");
    } else {
      setPreviewMode("code");
    }

    if (file.type === "code") {
      setLoadingCode(true);
      const fetchUrl = file.url + (token && !file.isPublic ? `?token=${token}` : "");
      fetch(fetchUrl)
        .then(r => r.text())
        .then(text => { setCodeContent(text); setEditedContent(text); })
        .catch(() => { setCodeContent("⚠️ Failed to load file content."); setEditedContent(""); })
        .finally(() => setLoadingCode(false));
    } else {
      setCodeContent(null);
    }
    return () => { document.body.style.overflow = ""; };
  }, [file, token]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!file) return null;

  const isMedia = file.type === "video" || file.type === "audio";
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://storage.lootops.me";
  
  let baseUrl = file.url;
  // Bypass the Next.js/Vercel proxy for media files, because serverless proxies break HTTP Range requests.
  // file-serve supports ?token= so it doesn't need cross-domain cookies to work!
  if (isMedia && baseUrl.startsWith("/")) {
    baseUrl = BACKEND_URL + baseUrl;
  }

  const authUrl = baseUrl + (token && !file.isPublic ? (baseUrl.includes("?") ? `&token=${token}` : `?token=${token}`) : "");
  const downloadUrl = file.url.replace("/file-serve/", "/file-download/") + (token && !file.isPublic ? `?token=${token}` : "");

  const handleCopy = () => {
    let copyUrl = file.url;
    if (copyUrl.startsWith("/")) {
      copyUrl = window.location.origin + copyUrl;
    }
    navigator.clipboard.writeText(copyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    switch (file.type) {
      case "image":
        if (imageFailed) {
          return (
            <div className="flex flex-col items-center justify-center gap-4 py-12 bg-slate-950 rounded-xl max-h-[70vh]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900">
                <FileText className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-sm text-gray-400">
                Image could not be loaded.
              </p>
            </div>
          );
        }
        return (
          <div className="flex max-h-[55dvh] sm:max-h-[70vh] items-center justify-center overflow-hidden rounded-xl bg-slate-950 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={authUrl}
              alt={file.name}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = "1";
                  target.src = authUrl; // Try one more time
                } else {
                  setImageFailed(true);
                }
              }}
            />
          </div>
        );

      case "video":
        return (
          <div className="rounded-xl overflow-hidden bg-black">
            <video
              src={authUrl}
              controls
              autoPlay
              className="max-h-[70vh] w-full"
              preload="metadata"
              crossOrigin="anonymous"
            />
          </div>
        );

      case "audio":
        return (
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-xl">
              <Music className="h-12 w-12 text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{file.name}</p>
            <audio src={authUrl} controls className="w-full max-w-lg" />
          </div>
        );

      case "html":
        return (
          <iframe
            src={authUrl}
            className="h-[70vh] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
            title={file.name}
            sandbox="allow-scripts allow-same-origin"
          />
        );

      case "pdf":
        return (
          <iframe
            src={authUrl}
            className="h-[70vh] w-full rounded-xl border border-slate-200 dark:border-slate-700"
            title={file.name}
          />
        );

      case "code": {
        if (loadingCode) {
          return (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            </div>
          );
        }

        const isHtml = ext === "html" || ext === "htm";
        const isMd   = ext === "md";
        const isCsv  = ext === "csv";
        const isPython = ext === "py";

        const handleSaveCode = async () => {
          if (!editedContent || !file) return;
          setSavingCode(true);
          try {
            await import("@/lib/api").then(m => m.api.saveFileContent(file.folder, file.name, editedContent));
            setCodeContent(editedContent);
            setIsEditing(false);
          } catch (e) {
            console.error(e);
            alert("Failed to save file.");
          } finally {
            setSavingCode(false);
          }
        };

        // ── CSV TABLE VIEW ──
        if (isCsv && codeContent) {
          const rows = parseCsv(codeContent);
          const headers = rows[0] || [];
          const body = rows.slice(1);
          return (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewMode("rendered")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode !== "code" ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Table</button>
                  <button onClick={() => setPreviewMode("code")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode === "code" ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Raw CSV</button>
                </div>
                <span className="text-xs text-gray-500">{rows.length - 1} rows · {headers.length} cols</span>
              </div>
              {previewMode !== "code" ? (
                <div className="max-h-[62vh] overflow-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-800 text-slate-200 sticky top-0">
                      <tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-slate-700 last:border-0">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {body.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? "bg-slate-900" : "bg-slate-950"}>
                          {headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-1.5 text-slate-300 border-r border-slate-800 last:border-0 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">{row[ci] ?? ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="max-h-[62vh] overflow-auto bg-slate-950 p-4 font-mono text-xs text-emerald-400 leading-relaxed">{codeContent}</pre>
              )}
            </div>
          );
        }

        // ── MARKDOWN RENDER ──
        if (isMd && codeContent) {
          return (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewMode("rendered")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode !== "code" ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}><Eye className="inline h-3 w-3 mr-1" />Rendered</button>
                  <button onClick={() => setPreviewMode("code")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode === "code" ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}><Code2 className="inline h-3 w-3 mr-1" />Source</button>
                </div>
                <button onClick={() => codeContent && navigator.clipboard.writeText(codeContent)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Copy className="h-3 w-3" /> Copy</button>
              </div>
              {previewMode !== "code" ? (
                <div
                  className="max-h-[62vh] overflow-auto p-6 prose prose-sm dark:prose-invert bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: simpleMarkdown(codeContent) }}
                />
              ) : (
                <pre className="max-h-[62vh] overflow-auto bg-slate-950 p-4 font-mono text-xs text-emerald-400 leading-relaxed">{codeContent}</pre>
              )}
            </div>
          );
        }

        // ── HTML IFRAME PREVIEW ──
        if (isHtml && previewMode === "preview") {
          return (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewMode("preview")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors bg-indigo-600 text-white`}>Live Preview</button>
                  <button onClick={() => setPreviewMode("code")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700`}>Source Code</button>
                </div>
              </div>
              <iframe src={authUrl} className="h-[65vh] w-full bg-white rounded-b-lg border-0" title={file.name} sandbox="allow-scripts allow-same-origin" />
            </div>
          );
        }

        // ── PYTHON SERVER-SIDE RUNNER ──
        if (isPython && previewMode === "pyscript") {
          const handleRunPython = async () => {
            setRunningPython(true);
            setPythonResult(null);
            try {
              const result = await api.runPython(file.folder, file.name);
              setPythonResult(result);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Unknown error";
              setPythonResult({ output: "", error: msg, exitCode: -1 });
            } finally {
              setRunningPython(false);
            }
          };

          return (
            <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewMode("pyscript")} className="rounded-md px-3 py-1 text-xs font-semibold bg-indigo-600 text-white">&#9654; Run Python</button>
                  <button onClick={() => setPreviewMode("code")} className="rounded-md px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Source Code</button>
                </div>
                <span className="text-[10px] text-slate-400">Runs on server · stdout captured</span>
              </div>
              <div className="flex flex-col bg-[#0d1117] min-h-[55vh] max-h-[65vh] overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-2.5 bg-[#161b22]">
                  <button
                    onClick={handleRunPython}
                    disabled={runningPython}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-1.5 text-xs font-bold text-white transition-colors"
                  >
                    {runningPython ? (
                      <><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />Running...</>
                    ) : (
                      <>&#9654; Run</>  
                    )}
                  </button>
                  {pythonResult && (
                    <>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        pythonResult.exitCode === 0 ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
                      }`}>
                        Exit {pythonResult.exitCode === -1 ? "Timeout" : pythonResult.exitCode}
                      </span>
                      <button onClick={() => setPythonResult(null)} className="ml-auto text-[10px] text-slate-500 hover:text-slate-300 transition-colors">Clear</button>
                    </>
                  )}
                </div>

                {/* Output terminal */}
                <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
                  {!pythonResult && !runningPython && (
                    <p className="text-slate-500 text-xs">Press &#9654; Run to execute the script on the server. Output (stdout/stderr) will appear here.</p>
                  )}
                  {runningPython && (
                    <p className="text-slate-400 text-xs animate-pulse">Executing {file.name}...</p>
                  )}
                  {pythonResult && (
                    <>
                      {pythonResult.output && (
                        <pre className="text-emerald-400 whitespace-pre-wrap break-words">{pythonResult.output}</pre>
                      )}
                      {pythonResult.error && (
                        <pre className="text-red-400 whitespace-pre-wrap break-words mt-2">{pythonResult.error}</pre>
                      )}
                      {!pythonResult.output && !pythonResult.error && (
                        <p className="text-slate-500 text-xs">Script finished with no output.</p>
                      )}
                    </>
                  )}
                </div>

                {/* Note for pygame */}
                <div className="shrink-0 border-t border-slate-800 px-4 py-2 bg-[#161b22]">
                  <p className="text-[10px] text-slate-500">&#9888; pygame/GUI windows open on the server and are not visible here. Only stdout/stderr output is captured.</p>
                </div>
              </div>
            </div>
          );
        }

        // ── DEFAULT: LINE-NUMBERED CODE VIEW & EDITOR ──
        const lines = (isEditing ? editedContent ?? "" : codeContent ?? "").split("\n");
        return (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                {isHtml ? (
                  <>
                    <button onClick={() => setPreviewMode("preview")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode === "preview" ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Live Preview</button>
                    <button onClick={() => setPreviewMode("code")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode === "code" ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Source Code</button>
                  </>
                ) : isPython ? (
                  <>
                    <button onClick={() => setPreviewMode("pyscript")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode === "pyscript" ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Run Python</button>
                    <button onClick={() => setPreviewMode("code")} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${previewMode === "code" ? "bg-indigo-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Source Code</button>
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{langLabel}</span>
                    <span className="text-xs text-gray-400 ml-1">{lines.length} lines</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => { setIsEditing(false); setEditedContent(codeContent); }}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                      disabled={savingCode}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCode}
                      disabled={savingCode || editedContent === codeContent}
                      className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {savingCode ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      Edit Code
                    </button>
                    <button
                      onClick={() => codeContent && navigator.clipboard.writeText(codeContent)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex max-h-[65vh] min-h-[40vh] overflow-hidden bg-slate-950 flex-1 relative">
              {/* Line numbers */}
              <div className="select-none shrink-0 border-r border-slate-800 bg-slate-900 px-3 py-4 text-right font-mono text-xs text-slate-600 leading-relaxed overflow-hidden">
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              {isEditing ? (
                <textarea
                  value={editedContent || ""}
                  onChange={(e) => setEditedContent(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full h-full p-4 font-mono text-sm text-emerald-400 leading-relaxed bg-transparent border-none outline-none resize-none"
                />
              ) : (
                <pre className="flex-1 overflow-auto p-4 text-left font-mono text-sm text-emerald-400 leading-relaxed">
                  <code>{codeContent ?? "No content"}</code>
                </pre>
              )}
            </div>
          </div>
        );
      }

      case "archive":
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-14">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl">
              <Archive className="h-10 w-10 text-white" />
            </div>
            <p className="text-base font-semibold text-gray-800 dark:text-white">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Archive · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <a
              href={downloadUrl}
              download
              className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Archive
            </a>
          </div>
        );

      case "installer": {
        const installerExt = file.name.split(".").pop()?.toLowerCase() ?? "";
        const platformMap: Record<string, { label: string; color: string; from: string; to: string }> = {
          apk:        { label: "Android Package",   color: "text-white", from: "from-green-500",  to: "to-emerald-600" },
          aab:        { label: "Android App Bundle", color: "text-white", from: "from-green-600",  to: "to-teal-700" },
          ipa:        { label: "iOS App",            color: "text-white", from: "from-blue-500",   to: "to-indigo-600" },
          exe:        { label: "Windows Executable", color: "text-white", from: "from-cyan-500",   to: "to-blue-600" },
          msi:        { label: "Windows Installer",  color: "text-white", from: "from-cyan-600",   to: "to-sky-700" },
          appx:       { label: "Windows App",        color: "text-white", from: "from-sky-500",    to: "to-blue-600" },
          appxbundle: { label: "Windows App Bundle", color: "text-white", from: "from-sky-600",    to: "to-indigo-700" },
          msix:       { label: "Windows Package",    color: "text-white", from: "from-sky-500",    to: "to-blue-700" },
          dmg:        { label: "macOS Disk Image",   color: "text-white", from: "from-slate-500",  to: "to-gray-700" },
          pkg:        { label: "macOS Package",      color: "text-white", from: "from-gray-500",   to: "to-slate-700" },
          deb:        { label: "Debian Package",     color: "text-white", from: "from-orange-500", to: "to-red-600" },
          rpm:        { label: "RPM Package",        color: "text-white", from: "from-red-500",    to: "to-rose-700" },
        };
        const platform = platformMap[installerExt] ?? { label: installerExt.toUpperCase() + " Package", color: "text-white", from: "from-indigo-500", to: "to-purple-600" };
        return (
          <div className="flex flex-col items-center justify-center gap-5 py-10">
            <div className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${platform.from} ${platform.to} shadow-2xl`}>
              <Smartphone className={`h-12 w-12 ${platform.color}`} />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{file.name}</p>
              <span className="mt-1 inline-block rounded-full bg-cyan-100 px-3 py-0.5 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                {platform.label}
              </span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
              <span>📦 {(file.size / 1024 / 1024).toFixed(2)} MB</span>
              <span>📁 {file.folder}</span>
            </div>
            {file.hash && (
              <div className="w-full max-w-md rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">SHA-256 Checksum</p>
                <p className="font-mono text-[11px] text-gray-700 dark:text-slate-300 break-all">{file.hash}</p>
              </div>
            )}
            <a
              href={downloadUrl}
              download
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              <Download className="h-5 w-5" />
              Download {platform.label}
            </a>
          </div>
        );
      }

      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No inline preview available for this file type.
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative flex w-full sm:max-w-5xl flex-col rounded-t-2xl sm:rounded-2xl border-0 sm:border border-slate-200/60 bg-white shadow-2xl dark:border-slate-800/60 dark:bg-gray-900 overflow-hidden max-h-[95dvh] sm:max-h-[90dvh]">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 sm:px-5 py-2.5 sm:py-3 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{file.name}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              📁 {file.folder} · {(file.size / 1024 / 1024).toFixed(2)} MB
              {file.downloads > 0 && ` · ${file.downloads} views`}
              {file.pinned && " · 📌 Pinned"}
              {!file.isPublic && " · 🔒 Private"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Info toggle */}
            <button
              onClick={() => setShowInfo(v => !v)}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg border px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
                showInfo
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                  : "border-slate-200 bg-white text-gray-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-slate-700"
              }`}
            >
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Info</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy URL"}</span>
            </button>
            <a
              href={downloadUrl}
              download
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-gray-400 hover:bg-slate-50 hover:text-gray-600 dark:border-slate-700 dark:bg-gray-800 dark:hover:bg-slate-700 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body — content + optional info sidebar */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Content */}
          <div className="flex-1 overflow-auto p-2 sm:p-5">
            {renderContent()}
          </div>

          {/* Info Sidebar */}
          {showInfo && (
            <div className="w-full md:w-64 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 p-4 overflow-y-auto dark:border-slate-700 dark:bg-slate-800/50 max-h-[40vh] md:max-h-none">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">File Info</p>
              <dl className="space-y-3 text-xs">
                <div>
                  <dt className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-300 mb-0.5"><AlignLeft className="h-3 w-3" /> Name</dt>
                  <dd className="text-gray-800 dark:text-gray-200 break-all">{file.name}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-300 mb-0.5"><ChevronRight className="h-3 w-3" /> Folder</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{file.folder}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-300 mb-0.5"><Calendar className="h-3 w-3" /> Created</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{new Date(file.createdAt).toLocaleString()}</dd>
                </div>
                {file.expiresAt && (
                  <div>
                    <dt className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 mb-0.5"><Calendar className="h-3 w-3" /> Expires</dt>
                    <dd className="text-amber-700 dark:text-amber-300">{new Date(file.expiresAt).toLocaleString()}</dd>
                  </div>
                )}
                {file.tags && file.tags.length > 0 && (
                  <div>
                    <dt className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-300 mb-1"><Tag className="h-3 w-3" /> Tags</dt>
                    <dd className="flex flex-wrap gap-1">
                      {file.tags.map((tag, i) => (
                        <span key={i} className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{tag}</span>
                      ))}
                    </dd>
                  </div>
                )}
                {file.note && (
                  <div>
                    <dt className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-300 mb-0.5"><AlignLeft className="h-3 w-3" /> Note</dt>
                    <dd className="text-gray-800 dark:text-gray-200 italic">{file.note}</dd>
                  </div>
                )}
                {file.hash && (
                  <div>
                    <dt className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-300 mb-0.5"><Hash className="h-3 w-3" /> SHA-256</dt>
                    <dd className="text-gray-500 dark:text-gray-400 font-mono break-all text-[10px]">{file.hash}</dd>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <a href={downloadUrl} download className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors">
                    <Download className="h-3.5 w-3.5" /> Download File
                  </a>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
