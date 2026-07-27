"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Copy, Trash2, File, Image as ImageIcon, Video, FileText,
  MoreVertical, Edit3, Move, Share2, Eye, ShieldAlert,
  ShieldCheck, Download, Check, Music, Archive, Code2,
  QrCode, Pin, PinOff, ExternalLink, Clock, X, ZoomIn, ZoomOut, Mail, Smartphone, Lock
} from "lucide-react";
import { FileData, api } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { useToast } from "@/components/ui/ToastProvider";

interface FileCardProps {
  file: FileData;
  isSelected: boolean;
  viewMode: "grid" | "list";
  onSelect: () => void;
  onDelete: (folder: string, name: string) => void;
  onRename: (file: FileData) => void;
  onMove: (file: FileData) => void;
  onShare: (file: FileData) => void;
  onTogglePrivacy: (file: FileData) => void;
  onPreview: (file: FileData) => void;
  onMoveToVault?: (file: FileData) => void;
  onRefresh?: () => void;
  readOnly?: boolean;
}

function FileTypeIcon({ type, className }: { type: FileData["type"]; className?: string }) {
  const base = className ?? "h-8 w-8";
  switch (type) {
    case "image":     return <ImageIcon className={`${base} text-blue-400`} />;
    case "video":     return <Video className={`${base} text-pink-400`} />;
    case "audio":     return <Music className={`${base} text-purple-400`} />;
    case "pdf":       return <FileText className={`${base} text-red-400`} />;
    case "code":      return <Code2 className={`${base} text-emerald-400`} />;
    case "html":      return <Code2 className={`${base} text-orange-500`} />;
    case "archive":   return <Archive className={`${base} text-amber-400`} />;
    case "installer": return <Smartphone className={`${base} text-cyan-400`} />;
    default:          return <File className={`${base} text-gray-400`} />;
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── QR Code Modal ──────────────────────────────────────────────────────────────
function QrCodeModal({ file, onClose }: { file: FileData; onClose: () => void }) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  useEffect(() => {
    // Generate QR using a free public API — no server needed
    const url = encodeURIComponent(file.url);
    setQrSrc(`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${url}&color=6366f1&bgcolor=0d0f1a`);
  }, [file.url]);

  const handleDownloadQr = () => {
    if (!qrSrc) return;
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = `qr-${file.name}.png`;
    a.click();
    success("QR code downloaded!");
  };

  const handleCopyUrl = () => {
    let copyUrl = file.url;
    if (copyUrl.startsWith("/")) {
      copyUrl = window.location.origin + copyUrl;
    }
    navigator.clipboard.writeText(copyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/8 bg-[#0d1017] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <QrCode className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">QR Code</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/8 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* File info */}
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
            <FileTypeIcon type={file.type} className="h-5 w-5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-slate-400">{formatBytes(file.size)} · {file.folder}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f1a] p-4 shadow-2xl shadow-indigo-500/10 cursor-zoom-in"
              style={{ transform: `scale(${zoom})`, transition: "transform 0.2s" }}
            >
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="QR Code" className="h-56 w-56 rounded-lg" />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
                </div>
              )}
              {/* Subtle corner marks for aesthetics */}
              <div className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-indigo-500/40 rounded-tl" />
              <div className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-indigo-500/40 rounded-tr" />
              <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-indigo-500/40 rounded-bl" />
              <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-indigo-500/40 rounded-br" />
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setZoom(z => Math.max(0.75, z - 0.25))} className="rounded-lg border border-white/8 p-1.5 text-slate-400 hover:bg-white/8 hover:text-white transition-colors">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="rounded-lg border border-white/8 p-1.5 text-slate-400 hover:bg-white/8 hover:text-white transition-colors">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* URL display */}
          <div className="flex gap-2">
            <div className="flex-1 overflow-hidden rounded-xl border border-white/8 bg-white/5 px-3 py-2">
              <p className="truncate text-xs text-slate-400 font-mono">{file.url}</p>
            </div>
            <button
              onClick={handleCopyUrl}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                copied
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/8 bg-white/5 text-slate-300 hover:bg-white/8"
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadQr}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              <Download className="h-3.5 w-3.5" />
              Download QR
            </button>
            <button
              onClick={() => { window.open(file.url, "_blank"); }}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/8 transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Expiry Modal ───────────────────────────────────────────────────────────────
function SetExpiryModal({ file, onClose, onSet }: { file: FileData; onClose: () => void; onSet: (date: string | null) => void }) {
  const [date, setDate] = useState(file.expiresAt ? file.expiresAt.slice(0, 16) : "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await onSet(date || null);
    setLoading(false);
    onClose();
  };

  const presets = [
    { label: "1 hour",  getValue: () => new Date(Date.now() + 1 * 3600000).toISOString().slice(0, 16) },
    { label: "1 day",   getValue: () => new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16) },
    { label: "7 days",  getValue: () => new Date(Date.now() + 7 * 24 * 3600000).toISOString().slice(0, 16) },
    { label: "30 days", getValue: () => new Date(Date.now() + 30 * 24 * 3600000).toISOString().slice(0, 16) },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl border border-white/8 bg-[#0d1017] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Set Expiry</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/8 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400">File will be automatically deleted after the expiry time.</p>

          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-2">
            {presets.map(p => (
              <button key={p.label} onClick={() => setDate(p.getValue())}
                className={`rounded-lg border py-1.5 text-xs font-semibold transition-all ${
                  date && Math.abs(new Date(date).getTime() - new Date(p.getValue()).getTime()) < 60000
                    ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                    : "border-white/8 bg-white/5 text-slate-400 hover:bg-white/8 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Custom date &amp; time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 [color-scheme:dark]"
            />
          </div>

          {file.expiresAt && (
            <button onClick={() => setDate("")} className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all">
              Remove expiry
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={onClose} className="rounded-xl border border-white/8 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-bold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all">
              {loading ? "Saving..." : "Set Expiry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Email Share Modal ────────────────────────────────────────────────────────
function EmailShareModal({ file, onClose }: { file: FileData; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [attachFile, setAttachFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      await api.sendShareEmail(file.folder, file.name, email.trim(), file.url, attachFile);
      success(`Email sent to ${email}`);
      onClose();
    } catch {
      error("Failed to send email. Ensure SMTP is configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl border border-white/8 bg-[#0d1017] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Share via Email</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/8 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4">
          <p className="text-xs text-slate-400">Send a secure download link directly to someone's inbox.</p>
          
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Recipient Email</label>
            <input
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-500"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={attachFile}
              onChange={(e) => setAttachFile(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-slate-600 bg-transparent text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200">Attach file directly</span>
              <span className="text-[10px] text-slate-400">File will be attached if it is under 25MB</span>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-white/8 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading || !email}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20">
              {loading ? "Sending..." : "Send Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

  // ── Main FileCard ──────────────────────────────────────────────────────────────
export function FileCard({
  file, isSelected, viewMode, onSelect, onDelete,
  onRename, onMove, onShare, onTogglePrivacy, onPreview, onMoveToVault, onRefresh, readOnly,
}: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState<"left" | "right">("right");
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [showEmailShare, setShowEmailShare] = useState(false);
  const [pinned, setPinned] = useState(file.pinned ?? false);
  const [imageFailed, setImageFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    auth.currentUser?.getIdToken().then(setToken).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  let thumbUrl = file.thumbnailUrl ?? file.url;
  if (!file.isPublic && token) {
    thumbUrl += `?token=${token}`;
  }

  const handleCopy = useCallback(() => {
    let copyUrl = file.url;
    if (copyUrl.startsWith("/")) {
      copyUrl = window.location.origin + copyUrl;
    }
    navigator.clipboard.writeText(copyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false);
    success("URL copied to clipboard!");
  }, [file.url, success]);

  const handleOpenNewTab = useCallback(() => {
    window.open(file.url, "_blank");
    setMenuOpen(false);
  }, [file.url]);

  const handlePin = useCallback(async () => {
    setMenuOpen(false);
    try {
      const isPinned = await api.togglePin(file.folder, file.name);
      setPinned(isPinned);
      success(isPinned ? "File pinned to top!" : "File unpinned");
      onRefresh?.();
    } catch {
      toastError("Failed to update pin");
    }
  }, [file.folder, file.name, success, toastError, onRefresh]);

  const handleSetExpiry = useCallback(async (expiresAt: string | null) => {
    try {
      await api.setFileExpiry(file.folder, file.name, expiresAt);
      success(expiresAt ? `Expires ${new Date(expiresAt).toLocaleString()}` : "Expiry removed");
      onRefresh?.();
    } catch {
      toastError("Failed to set expiry");
    }
  }, [file.folder, file.name, success, toastError, onRefresh]);

  const handleDragStart = (e: React.DragEvent) => {
    if (readOnly) return;
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "file", file }));
    e.dataTransfer.effectAllowed = "move";
  };

  const toggleMenu = () => {
    if (!menuOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      // If the button is too close to the left edge (e.g. first column), align left instead of right
      if (rect.left < 220) {
        setMenuAlign("left");
      } else {
        setMenuAlign("right");
      }
    }
    setMenuOpen(!menuOpen);
  };

  const MenuItems = () => (
    <div className={`absolute ${menuAlign === "left" ? "left-0" : "right-0"} top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/50 dark:border-slate-700/60 dark:bg-[#0d1017] dark:shadow-black/60`}>
      {/* Group 1: View */}
      <div className="px-2 pt-2 pb-1">
        <p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Actions</p>
        {[
          { icon: Eye,       label: "Preview",       action: () => { onPreview(file); setMenuOpen(false); }, color: "" },
          { icon: ExternalLink, label: "Open in New Tab", action: handleOpenNewTab, color: "" },
          ...(!readOnly ? [
            { icon: Edit3,     label: "Rename",        action: () => { onRename(file); setMenuOpen(false); }, color: "" },
            { icon: Move,      label: "Move to...",    action: () => { onMove(file); setMenuOpen(false); }, color: "" },
            { icon: pinned ? PinOff : Pin, label: pinned ? "Unpin File" : "Pin to Top", action: handlePin, color: pinned ? "text-amber-500 dark:text-amber-400" : "" }
          ] : [])
        ].map((item, i) => (
          <button key={i} onClick={item.action} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${item.color || "text-gray-700 dark:text-gray-300"}`}>
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mx-2 my-1 border-t border-slate-100 dark:border-white/5" />

      {/* Group 2: Share */}
      <div className="px-2 py-1">
        <p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Share</p>
        {[
          { icon: Share2,              label: "Share Link",   action: () => { onShare(file); setMenuOpen(false); } },
          { icon: Mail,                label: "Email Link",   action: () => { setShowEmailShare(true); setMenuOpen(false); } },
          { icon: copied ? Check : Copy, label: copied ? "Copied!" : "Copy URL", action: handleCopy },
          { icon: QrCode,              label: "QR Code",      action: () => { setShowQr(true); setMenuOpen(false); } },
        ].map((item, i) => (
          <button key={i} onClick={item.action} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-white/5">
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mx-2 my-1 border-t border-slate-100 dark:border-white/5" />

      {/* Group 3: Manage */}
      <div className="px-2 py-1">
        <p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Manage</p>
        {[
          { icon: Download,      label: "Download",     action: () => { window.open(file.url.replace("/file-serve/", "/file-download/")); setMenuOpen(false); } },
          ...(!readOnly ? [
            { icon: Clock,         label: file.expiresAt ? "Edit Expiry" : "Set Expiry", action: () => { setShowExpiry(true); setMenuOpen(false); }, color: file.expiresAt ? "text-amber-500 dark:text-amber-400" : "" },
            { icon: file.isPublic ? ShieldAlert : ShieldCheck, label: file.isPublic ? "Make Private" : "Make Public", action: () => { onTogglePrivacy(file); setMenuOpen(false); }, color: file.isPublic ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400" },
            { icon: Lock,          label: "Move to Vault", action: () => { onMoveToVault?.(file); setMenuOpen(false); }, color: "text-purple-600 dark:text-purple-400" }
          ] : [])
        ].map((item, i) => (
          <button key={i} onClick={item.action} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${item.color || "text-gray-700 dark:text-gray-300"}`}>
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Delete (Admin Only) */}
      {!readOnly && (
        <>
          <div className="mx-2 my-1 border-t border-slate-100 dark:border-white/5" />
          <div className="px-2 pb-2">
            <button
              onClick={() => { onDelete(file.folder, file.name); setMenuOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Delete File
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {showQr && <QrCodeModal file={file} onClose={() => setShowQr(false)} />}
      {showExpiry && <SetExpiryModal file={file} onClose={() => setShowExpiry(false)} onSet={handleSetExpiry} />}
      {showEmailShare && <EmailShareModal file={file} onClose={() => setShowEmailShare(false)} />}

      {/* ─── GRID VIEW ──────────────────────────────────────────────── */}
      {viewMode === "grid" ? (
        <div 
          draggable={!readOnly}
          onDragStart={handleDragStart}
          className={`group relative flex flex-col rounded-2xl border transition-all duration-200 overflow-visible ${
          isSelected
            ? "border-indigo-400 ring-2 ring-indigo-400/30 dark:border-indigo-500"
            : "border-slate-200/60 hover:border-slate-300 dark:border-slate-800/60 dark:hover:border-slate-700"
        } bg-white dark:bg-gray-900 card-hover ${menuOpen ? "z-50" : "z-0"}`}>

          {/* Checkbox */}
          <input type="checkbox" checked={isSelected} onChange={onSelect}
            className="absolute left-3 top-3 z-10 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity cursor-pointer" />

          {/* Pin badge */}
          {pinned && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              <Pin className="h-2.5 w-2.5" /> Pinned
            </div>
          )}

          {/* Expiry badge */}
          {file.expiresAt && (
            <div className="absolute left-3 bottom-14 z-10 flex items-center gap-1 rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <Clock className="h-2.5 w-2.5" />
              Expires {new Date(file.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          )}

          {/* Privacy badge */}
          {!file.isPublic && (
            <div className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              Private
            </div>
          )}

          {/* Thumbnail */}
          <div className="relative h-44 cursor-pointer overflow-hidden rounded-t-[14px] bg-slate-100 dark:bg-slate-800" onClick={() => onPreview(file)}>
            {file.type === "image" && !imageFailed ? (
              <img src={thumbUrl} alt={file.name} loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                onError={(e) => { 
                  const t = e.currentTarget; 
                  if (!t.dataset.fallback) { 
                    t.dataset.fallback = "1"; 
                    t.src = file.url + (!file.isPublic && token ? `?token=${token}` : ""); 
                  } else {
                    setImageFailed(true);
                  }
                }} />
            ) : file.type === "video" ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg dark:bg-gray-900/90">
                  <Video className="h-7 w-7 text-pink-500 ml-0.5" />
                </div>
              </div>
            ) : file.type === "audio" ? (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
                  <Music className="h-7 w-7 text-purple-500" />
                </div>
              </div>
            ) : file.type === "code" ? (
              <div className="flex h-full items-center justify-center bg-slate-900">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/40">
                  <Code2 className="h-7 w-7 text-emerald-400" />
                </div>
              </div>
            ) : file.type === "archive" ? (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-900/20 to-orange-900/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                  <Archive className="h-7 w-7 text-amber-500" />
                </div>
              </div>
            ) : file.type === "installer" ? (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-cyan-900/20 to-blue-900/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
                  <Smartphone className="h-7 w-7 text-cyan-500" />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <FileTypeIcon type={file.type} className="h-12 w-12" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col p-3">
            <div className="flex items-start gap-1">
              <p className="flex-1 cursor-pointer truncate text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title={file.name} onClick={() => onPreview(file)}>
                {file.name}
              </p>
              <div className="relative shrink-0" ref={menuRef}>
                <button onClick={toggleMenu}
                  className="rounded-lg p-1 text-gray-400 hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && <MenuItems />}
              </div>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">📁 {file.folder} · {formatBytes(file.size)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{file.downloads} views</p>
          </div>
        </div>
      ) : (
        /* ─── LIST VIEW ─────────────────────────────────────────────── */
        <div 
          draggable={!readOnly}
          onDragStart={handleDragStart}
          className={`relative flex items-center gap-3 border-b px-4 py-3 transition-colors ${
          isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/10" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/20"
        } border-slate-100 dark:border-slate-800/60 ${menuOpen ? "z-50" : "z-0"}`}>
          <input type="checkbox" checked={isSelected} onChange={onSelect}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />

          <div className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 relative"
            onClick={() => onPreview(file)}>
            <FileTypeIcon type={file.type} className="h-5 w-5" />
            {pinned && <Pin className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="cursor-pointer truncate text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              onClick={() => onPreview(file)}>
              {file.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">📁 {file.folder} · {formatDate(file.createdAt)}</p>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatBytes(file.size)}</span>
            <span>{file.downloads} views</span>
            {file.expiresAt && (
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="h-3 w-3" />
                {new Date(file.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 font-medium ${
              file.isPublic ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
            }`}>
              {file.isPublic ? "Public" : "Private"}
            </span>
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button onClick={toggleMenu}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && <MenuItems />}
          </div>
        </div>
      )}
    </>
  );
}
