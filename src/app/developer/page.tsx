"use client";

import { useEffect, useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Code, Terminal, Key, Copy, Check, Send, ChevronDown, ChevronRight,
  Upload, Mail, Share2, Download, Trash2, Lock, Clock, Search, Link,
  PlayCircle, BookOpen, Zap, AlertCircle, CheckCircle2, Loader2
} from "lucide-react";
import { api, apiInstance } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";
import { LegacyGuides } from "@/components/developer/LegacyGuides";
import { EmailGuides } from "@/components/developer/EmailGuides";
import { UserAuthGuides } from "@/components/developer/UserAuthGuides";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Endpoint {
  id: string;
  method: "GET" | "POST" | "DELETE";
  path: string;
  summary: string;
  auth: "api-key" | "session";
  category: string;
  params?: { name: string; in: "body" | "query"; type: string; required: boolean; description: string }[];
  bodyType?: "multipart" | "json";
  responseExample: string;
}

interface TestResult {
  status: number;
  ok: boolean;
  body: string;
  duration: number;
}

// ─── Endpoint Definitions ─────────────────────────────────────────────────────
const ENDPOINTS: Endpoint[] = [
  // Upload
  {
    id: "upload",
    method: "POST",
    path: "/upload",
    summary: "Upload a file",
    auth: "api-key",
    category: "Files",
    bodyType: "multipart",
    params: [
      { name: "file", in: "body", type: "File", required: true, description: "The file to upload (multipart/form-data)" },
      { name: "folder", in: "body", type: "string", required: false, description: "Target folder (defaults to root)" },
    ],
    responseExample: `{
  "success": true,
  "name": "image.jpg",
  "folder": "root",
  "url": "/file-serve/root/image.jpg",
  "thumbnailUrl": "/thumbnails/image.jpg-thumb.webp",
  "sha256": "8a32f..."
}`,
  },
  {
    id: "list-files",
    method: "GET",
    path: "/admin/files",
    summary: "List all files",
    auth: "session",
    category: "Files",
    params: [],
    responseExample: `[
  {
    "name": "photo.jpg",
    "folder": "root",
    "url": "/file-serve/root/photo.jpg",
    "size": 204800,
    "type": "image",
    "isPublic": true,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
]`,
  },
  {
    id: "delete-file",
    method: "DELETE",
    path: "/admin/file",
    summary: "Delete a file",
    auth: "session",
    category: "Files",
    bodyType: "json",
    params: [
      { name: "folder", in: "body", type: "string", required: true, description: "Folder the file is in (use 'root' for top level)" },
      { name: "name", in: "body", type: "string", required: true, description: "File name" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "search",
    method: "GET",
    path: "/admin/search",
    summary: "Search files",
    auth: "session",
    category: "Files",
    params: [
      { name: "q", in: "query", type: "string", required: true, description: "Search query" },
      { name: "type", in: "query", type: "string", required: false, description: "Filter by file type (image, video, pdf, etc.)" },
      { name: "folder", in: "query", type: "string", required: false, description: "Filter by folder" },
    ],
    responseExample: `[{ "name": "photo.jpg", "folder": "root", ... }]`,
  },
  // Share
  {
    id: "create-share",
    method: "POST",
    path: "/admin/create-share",
    summary: "Create a share link",
    auth: "session",
    category: "Share",
    bodyType: "json",
    params: [
      { name: "folder", in: "body", type: "string", required: true, description: "Folder of the file" },
      { name: "name", in: "body", type: "string", required: true, description: "File name" },
      { name: "durationMs", in: "body", type: "number", required: false, description: "Expiry duration in milliseconds (null = never)" },
      { name: "password", in: "body", type: "string", required: false, description: "Optional password to protect the link" },
    ],
    responseExample: `{
  "success": true,
  "shareUrl": "https://server.example.com/share/abc123"
}`,
  },
  // Email
  {
    id: "share-email",
    method: "POST",
    path: "/admin/share/email",
    summary: "Send a file link via email",
    auth: "api-key",
    category: "Email",
    bodyType: "json",
    params: [
      { name: "folder", in: "body", type: "string", required: true, description: "File folder" },
      { name: "name", in: "body", type: "string", required: true, description: "File name" },
      { name: "email", in: "body", type: "string", required: true, description: "Recipient email address" },
      { name: "url", in: "body", type: "string", required: true, description: "The share URL to embed in the email" },
      { name: "attachFile", in: "body", type: "boolean", required: false, description: "Attach the file directly (max 25 MB)" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "bulk-share-email",
    method: "POST",
    path: "/admin/bulk-share-email",
    summary: "Send multiple file links in one email",
    auth: "api-key",
    category: "Email",
    bodyType: "json",
    params: [
      { name: "files", in: "body", type: "array", required: true, description: 'Array of { folder, name } objects e.g. [{"folder":"root","name":"file.jpg"}]' },
      { name: "email", in: "body", type: "string", required: true, description: "Recipient email address" },
      { name: "durationMs", in: "body", type: "number", required: false, description: "Expiry for auto-generated share links" },
      { name: "password", in: "body", type: "string", required: false, description: "Optional password for each share link" },
    ],
    responseExample: `{ "success": true, "count": 3 }`,
  },
  // Bulk ops
  {
    id: "bulk-delete",
    method: "POST",
    path: "/admin/bulk-delete",
    summary: "Delete multiple files",
    auth: "session",
    category: "Bulk",
    bodyType: "json",
    params: [
      { name: "files", in: "body", type: "array", required: true, description: 'Array of { folder, name } e.g. [{"folder":"root","name":"a.jpg"}]' },
    ],
    responseExample: `{ "success": true, "deleted": 3, "errors": [] }`,
  },
  {
    id: "bulk-move",
    method: "POST",
    path: "/admin/bulk-move",
    summary: "Move multiple files to a folder",
    auth: "session",
    category: "Bulk",
    bodyType: "json",
    params: [
      { name: "files", in: "body", type: "array", required: true, description: 'Array of { folder, name }' },
      { name: "destinationFolder", in: "body", type: "string", required: true, description: "Target folder name" },
    ],
    responseExample: `{ "success": true, "moved": 3 }`,
  },
  {
    id: "bulk-pin",
    method: "POST",
    path: "/admin/bulk-pin",
    summary: "Pin or unpin multiple files",
    auth: "session",
    category: "Bulk",
    bodyType: "json",
    params: [
      { name: "files", in: "body", type: "array", required: true, description: 'Array of { folder, name }' },
      { name: "isPinned", in: "body", type: "boolean", required: true, description: "true to pin, false to unpin" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "bulk-privacy",
    method: "POST",
    path: "/admin/bulk-privacy",
    summary: "Set privacy for multiple files",
    auth: "session",
    category: "Bulk",
    bodyType: "json",
    params: [
      { name: "files", in: "body", type: "array", required: true, description: 'Array of { folder, name }' },
      { name: "isPublic", in: "body", type: "boolean", required: true, description: "true for public, false for private" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "bulk-expiry",
    method: "POST",
    path: "/admin/bulk-expiry",
    summary: "Set expiry for multiple files",
    auth: "session",
    category: "Bulk",
    bodyType: "json",
    params: [
      { name: "files", in: "body", type: "array", required: true, description: 'Array of { folder, name }' },
      { name: "expiresAt", in: "body", type: "string", required: false, description: "ISO date string for expiry, or null to clear" },
    ],
    responseExample: `{ "success": true }`,
  },
  // Folder ops
  {
    id: "create-folder",
    method: "POST",
    path: "/create-folder",
    summary: "Create a new folder",
    auth: "session",
    category: "Folders",
    bodyType: "json",
    params: [
      { name: "folder", in: "body", type: "string", required: true, description: "Folder name to create" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "rename-folder",
    method: "POST",
    path: "/admin/rename-folder",
    summary: "Rename a folder",
    auth: "session",
    category: "Folders",
    bodyType: "json",
    params: [
      { name: "oldName", in: "body", type: "string", required: true, description: "Current folder name" },
      { name: "newName", in: "body", type: "string", required: true, description: "New folder name" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "delete-folder",
    method: "DELETE",
    path: "/admin/folder",
    summary: "Delete a folder and all its files",
    auth: "session",
    category: "Folders",
    bodyType: "json",
    params: [
      { name: "folder", in: "body", type: "string", required: true, description: "Folder name to delete" },
    ],
    responseExample: `{ "success": true }`,
  },
  // File management
  {
    id: "rename-file",
    method: "POST",
    path: "/rename",
    summary: "Rename a file",
    auth: "session",
    category: "File Management",
    bodyType: "json",
    params: [
      { name: "oldPath", in: "body", type: "string", required: true, description: "Old path e.g. root/image.jpg" },
      { name: "newPath", in: "body", type: "string", required: true, description: "New path e.g. root/renamed.jpg" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "move-file",
    method: "POST",
    path: "/move-file",
    summary: "Move a file to another folder",
    auth: "session",
    category: "File Management",
    bodyType: "json",
    params: [
      { name: "file", in: "body", type: "string", required: true, description: "File name" },
      { name: "sourceFolder", in: "body", type: "string", required: true, description: "Source folder" },
      { name: "destinationFolder", in: "body", type: "string", required: true, description: "Destination folder" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "toggle-privacy",
    method: "POST",
    path: "/admin/toggle-privacy",
    summary: "Toggle file public/private",
    auth: "session",
    category: "File Management",
    bodyType: "json",
    params: [
      { name: "folder", in: "body", type: "string", required: true, description: "File folder" },
      { name: "name", in: "body", type: "string", required: true, description: "File name" },
      { name: "isPublic", in: "body", type: "boolean", required: true, description: "true for public, false for private" },
    ],
    responseExample: `{ "success": true }`,
  },
  {
    id: "set-expiry",
    method: "POST",
    path: "/admin/set-expiry",
    summary: "Set file auto-delete expiry",
    auth: "session",
    category: "File Management",
    bodyType: "json",
    params: [
      { name: "folder", in: "body", type: "string", required: true, description: "File folder" },
      { name: "name", in: "body", type: "string", required: true, description: "File name" },
      { name: "expiresAt", in: "body", type: "string", required: false, description: "ISO date string, or null to clear" },
    ],
    responseExample: `{ "success": true, "expiresAt": "2024-02-01T00:00:00.000Z" }`,
  },
  // Stats / Analytics
  {
    id: "stats",
    method: "GET",
    path: "/admin/stats",
    summary: "Get system statistics",
    auth: "session",
    category: "Analytics",
    params: [],
    responseExample: `{
  "totalFiles": 42,
  "totalFolders": 5,
  "totalSizeMB": "128.5",
  "mostUploadedFolder": "photos",
  "filesByType": { "image": 30, "video": 10, "pdf": 2 }
}`,
  },
  {
    id: "disk-info",
    method: "GET",
    path: "/admin/disk-info",
    summary: "Get disk usage info",
    auth: "session",
    category: "Analytics",
    params: [],
    responseExample: `{
  "totalBytes": 134217728,
  "totalMB": "128.00",
  "totalFiles": 42
}`,
  },
  {
    id: "health",
    method: "GET",
    path: "/api/health",
    summary: "Check server health",
    auth: "api-key",
    category: "System",
    params: [],
    responseExample: `{ "status": "ok", "uptime": 3600 }`,
  },
  // Auth DB
  {
    id: "auth-register",
    method: "POST",
    path: "/auth/register",
    summary: "Register a new user account",
    auth: "api-key",
    category: "Auth DB",
    bodyType: "json",
    params: [
      { name: "email", in: "body", type: "string", required: true, description: "User email address" },
      { name: "password", in: "body", type: "string", required: true, description: "Password (min 6 chars)" },
      { name: "name", in: "body", type: "string", required: false, description: "Display name" },
      { name: "metadata", in: "body", type: "string", required: false, description: 'JSON object e.g. {"plan":"free"}' },
    ],
    responseExample: `{ "success": true, "uid": "abc123", "email": "user@example.com", "message": "Account created." }`,
  },
  {
    id: "auth-login",
    method: "POST",
    path: "/auth/login",
    summary: "Sign in and receive an ID token",
    auth: "api-key",
    category: "Auth DB",
    bodyType: "json",
    params: [
      { name: "email", in: "body", type: "string", required: true, description: "User email" },
      { name: "password", in: "body", type: "string", required: true, description: "User password" },
    ],
    responseExample: `{ "success": true, "token": "eyJ...", "uid": "abc123", "profile": { "name": "...", "role": "user" } }`,
  },
  {
    id: "auth-forgot-password",
    method: "POST",
    path: "/auth/forgot-password",
    summary: "Send a password reset email",
    auth: "api-key",
    category: "Auth DB",
    bodyType: "json",
    params: [
      { name: "email", in: "body", type: "string", required: true, description: "User email" },
    ],
    responseExample: `{ "success": true, "message": "Password reset email sent." }`,
  },
  {
    id: "auth-me-get",
    method: "GET",
    path: "/auth/me",
    summary: "Get the current user's profile",
    auth: "session",
    category: "Auth DB",
    params: [],
    responseExample: `{ "success": true, "profile": { "uid": "...", "email": "...", "name": "...", "role": "user", "metadata": {} } }`,
  },
  {
    id: "admin-list-users",
    method: "GET",
    path: "/admin/users",
    summary: "List all registered users",
    auth: "api-key",
    category: "Auth DB",
    params: [
      { name: "limit", in: "query", type: "number", required: false, description: "Max users to return (default 50)" },
    ],
    responseExample: `{ "success": true, "count": 12, "users": [ { "uid": "...", "email": "...", "name": "...", "role": "user" } ] }`,
  },
];

const CATEGORIES = Array.from(new Set(ENDPOINTS.map(e => e.category)));

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Files: Upload,
  Share: Share2,
  Email: Mail,
  Bulk: Zap,
  Folders: BookOpen,
  "File Management": Code,
  Analytics: Search,
  System: CheckCircle2,
  "Auth DB": Lock,
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DeveloperPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [config, setConfig] = useState<{ apiKey: string; baseUrl: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [testValues, setTestValues] = useState<Record<string, Record<string, string>>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    api.getDeveloperConfig()
      .then(setConfig)
      .catch(() => toastError("Failed to load developer config"));
  }, [toastError]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toastSuccess("Copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const getTestValue = (endpointId: string, param: string) =>
    testValues[endpointId]?.[param] ?? "";

  const setTestValue = (endpointId: string, param: string, value: string) => {
    setTestValues(prev => ({
      ...prev,
      [endpointId]: { ...(prev[endpointId] || {}), [param]: value },
    }));
  };

  const runTest = async (ep: Endpoint) => {
    if (!config) return;
    setTesting(ep.id);
    const start = Date.now();
    try {
      const vals = testValues[ep.id] || {};
      const queryParams = ep.params?.filter(p => p.in === "query")
        .reduce((acc, p) => vals[p.name] ? { ...acc, [p.name]: vals[p.name] } : acc, {} as Record<string, string>);

      let url = `${config.baseUrl}${ep.path}`;
      if (queryParams && Object.keys(queryParams).length > 0) {
        url += "?" + new URLSearchParams(queryParams).toString();
      }

      const headers: Record<string, string> = { "x-api-key": config.apiKey };
      let body: BodyInit | undefined;

      if (ep.method !== "GET" && ep.bodyType === "json") {
        headers["Content-Type"] = "application/json";
        const bodyObj: Record<string, any> = {};
        ep.params?.filter(p => p.in === "body").forEach(p => {
          const v = vals[p.name];
          if (!v) return;
          if (p.type === "boolean") bodyObj[p.name] = v === "true";
          else if (p.type === "number") bodyObj[p.name] = Number(v);
          else if (p.type === "array") { try { bodyObj[p.name] = JSON.parse(v); } catch { bodyObj[p.name] = v; } }
          else bodyObj[p.name] = v;
        });
        body = JSON.stringify(bodyObj);
      }

      const res = await fetch(url, { method: ep.method, headers, body });
      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* leave as-is */ }
      setTestResults(prev => ({
        ...prev,
        [ep.id]: { status: res.status, ok: res.ok, body: pretty, duration: Date.now() - start },
      }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [ep.id]: { status: 0, ok: false, body: err.message, duration: Date.now() - start },
      }));
    } finally {
      setTesting(null);
    }
  };

  const buildCurlSnippet = (ep: Endpoint, apiKey: string, baseUrl: string) => {
    const vals = testValues[ep.id] || {};
    const bodyParams = ep.params?.filter(p => p.in === "body") || [];
    const queryParams = ep.params?.filter(p => p.in === "query") || [];
    let url = `${baseUrl}${ep.path}`;
    const qStr = queryParams.filter(p => vals[p.name]).map(p => `${p.name}=${encodeURIComponent(vals[p.name])}`).join("&");
    if (qStr) url += `?${qStr}`;

    let cmd = `curl -X ${ep.method} "${url}" \\\n  -H "x-api-key: ${apiKey}"`;
    if (ep.bodyType === "json" && bodyParams.length > 0) {
      const bodyObj: Record<string, any> = {};
      bodyParams.forEach(p => { if (vals[p.name]) bodyObj[p.name] = vals[p.name]; });
      cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(bodyObj)}'`;
    }
    return cmd;
  };

  if (!config) {
    return (
      <>
        <Topbar />
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </>
    );
  }

  const categoryEndpoints = ENDPOINTS.filter(e => e.category === activeCategory);

  return (
    <>
      <Topbar />
      <div className="min-h-full bg-slate-50 dark:bg-gray-950">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 px-6 py-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
                <Terminal className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">API Reference</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Interactive documentation for all endpoints</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6">
          {/* Sidebar: Credentials + Category Nav */}
          <aside className="flex flex-col w-full md:w-56 shrink-0 gap-4">
            {/* API Credentials Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Credentials</p>
              <div>
                <p className="text-xs text-gray-500 mb-1">Base URL</p>
                <div className="flex items-center gap-1.5">
                  <code className="text-xs text-indigo-600 dark:text-indigo-400 truncate">{config.baseUrl}</code>
                  <button onClick={() => handleCopy(config.baseUrl, "url")} className="shrink-0 text-gray-400 hover:text-indigo-500 transition-colors">
                    {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">API Key</p>
                <div className="flex items-center gap-1.5">
                  <code className="text-xs font-mono text-amber-600 dark:text-amber-400 truncate max-w-[120px]">{config.apiKey.slice(0, 12)}...</code>
                  <button onClick={() => handleCopy(config.apiKey, "key")} className="shrink-0 text-gray-400 hover:text-amber-500 transition-colors">
                    {copied === "key" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Category Nav */}
            <nav className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-2 space-y-0.5">
              <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Endpoints</p>
              {CATEGORIES.map(cat => {
                const Icon = CATEGORY_ICONS[cat] || Code;
                return (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setExpandedEndpoint(null); }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all ${
                      activeCategory === cat
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {cat}
                    <span className="ml-auto text-xs text-gray-400">{ENDPOINTS.filter(e => e.category === cat).length}</span>
                  </button>
                );
              })}

              <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 mt-4">Guides</p>
              <button
                onClick={() => { setActiveCategory("Legacy Guides"); setExpandedEndpoint(null); }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all ${
                  activeCategory === "Legacy Guides"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                Legacy Guides
              </button>
              <button
                onClick={() => { setActiveCategory("Email Guides"); setExpandedEndpoint(null); }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all ${
                  activeCategory === "Email Guides"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                Email Guides
              </button>
              <button
                onClick={() => { setActiveCategory("Auth Guides"); setExpandedEndpoint(null); }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all ${
                  activeCategory === "Auth Guides"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <Lock className="h-4 w-4 shrink-0" />
                Auth Guides
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeCategory}</h2>
              <span className="text-xs text-gray-400">{categoryEndpoints.length} endpoint{categoryEndpoints.length !== 1 ? "s" : ""}</span>
            </div>

            {activeCategory === "Legacy Guides" ? (
              <LegacyGuides config={config} handleCopy={handleCopy} copied={copied} />
            ) : activeCategory === "Email Guides" ? (
              <EmailGuides config={config} handleCopy={handleCopy} copied={copied} />
            ) : activeCategory === "Auth Guides" ? (
              <UserAuthGuides config={config} handleCopy={handleCopy} copied={copied} />
            ) : (
              categoryEndpoints.map(ep => {
                const isOpen = expandedEndpoint === ep.id;
                const result = testResults[ep.id];
                const isRunning = testing === ep.id;

                return (
                  <div
                    key={ep.id}
                    className={`rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden transition-all ${
                      isOpen ? "border-indigo-300 dark:border-indigo-700 shadow-md shadow-indigo-500/5" : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {/* Endpoint Header */}
                    <button
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      onClick={() => setExpandedEndpoint(isOpen ? null : ep.id)}
                    >
                      <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold font-mono ${METHOD_COLORS[ep.method]}`}>
                        {ep.method}
                      </span>
                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300">{ep.path}</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{ep.summary}</span>
                      <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        ep.auth === "api-key"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                      }`}>
                        {ep.auth === "api-key" ? "API Key" : "Session"}
                      </span>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400 ml-1 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 ml-1 shrink-0" />}
                    </button>

                    {/* Expanded: Params + Tester */}
                    {isOpen && (
                      <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-5 space-y-5">
                        {/* Parameters */}
                        {ep.params && ep.params.length > 0 && (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-3">Parameters</p>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                              <table className="w-full text-sm min-w-[500px]">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                  <tr>
                                    {["Name", "In", "Type", "Required", "Description"].map(h => (
                                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {ep.params.map(p => (
                                    <tr key={p.name}>
                                      <td className="px-3 py-2 font-mono text-xs text-indigo-600 dark:text-indigo-400">{p.name}</td>
                                      <td className="px-3 py-2 text-xs text-gray-500">{p.in}</td>
                                      <td className="px-3 py-2 text-xs text-gray-500">{p.type}</td>
                                      <td className="px-3 py-2">
                                        {p.required
                                          ? <span className="text-xs font-semibold text-rose-500">required</span>
                                          : <span className="text-xs text-gray-400">optional</span>
                                        }
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{p.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Response Example */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-2">Response Example</p>
                          <pre className="rounded-xl bg-slate-900 p-4 text-xs text-slate-200 overflow-x-auto">
                            <code>{ep.responseExample}</code>
                          </pre>
                        </div>

                        {/* Try It Out */}
                        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Try it out</p>

                          {ep.params?.filter(p => p.in !== "body" || ep.bodyType === "json").map(p => (
                            <div key={p.name}>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {p.name}
                                {p.required && <span className="text-rose-500 ml-1">*</span>}
                              </label>
                              {p.type === "boolean" ? (
                                <select
                                  value={getTestValue(ep.id, p.name)}
                                  onChange={e => setTestValue(ep.id, p.name, e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="">Select...</option>
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={p.description}
                                  value={getTestValue(ep.id, p.name)}
                                  onChange={e => setTestValue(ep.id, p.name, e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              )}
                            </div>
                          ))}

                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <button
                              onClick={() => runTest(ep)}
                              disabled={!!isRunning}
                              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 transition-all"
                            >
                              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                              {isRunning ? "Sending..." : "Send Request"}
                            </button>
                            <button
                              onClick={() => handleCopy(buildCurlSnippet(ep, config.apiKey, config.baseUrl), `curl-${ep.id}`)}
                              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                            >
                              {copied === `curl-${ep.id}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              Copy cURL
                            </button>
                          </div>

                          {/* Result */}
                          {result && (
                            <div className={`rounded-xl border p-3 space-y-2 ${
                              result.ok
                                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                                : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {result.ok
                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    : <AlertCircle className="h-4 w-4 text-red-500" />
                                  }
                                  <span className={`text-sm font-semibold ${result.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                                    {result.status} {result.ok ? "OK" : "Error"}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400">{result.duration}ms</span>
                              </div>
                              <pre className="rounded-lg bg-slate-900 p-3 text-xs text-slate-200 overflow-x-auto max-h-48">
                                <code>{result.body}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
