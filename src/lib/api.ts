import axios from "axios";
import { auth } from "./firebase";

// When deployed on Vercel: leave NEXT_PUBLIC_API_URL empty (or unset) and Next.js
// rewrites in next.config.ts will proxy all API calls to the Express server.
// When self-hosted (VPS): set NEXT_PUBLIC_API_URL to the Express server URL (e.g. https://server.lootops.me)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export const apiInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Always send cookies (needed for MFA token)
});


// Attach Firebase ID token to every request
apiInstance.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  // Attach MFA token from localStorage as a header fallback
  // (needed when Vercel proxy strips Set-Cookie headers from Express responses)
  if (typeof window !== "undefined") {
    const mfaToken = localStorage.getItem("mfa_token");
    if (mfaToken) {
      config.headers["x-mfa-token"] = mfaToken;
    }
  }
  return config;
});

/** Get a fresh Firebase ID token (for use in image src URLs) */
export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ==============================
// TYPES
// ==============================
export interface FileData {
  name: string;
  folder: string;
  url: string;
  thumbnailUrl: string | null;
  size: number;
  type: "image" | "video" | "audio" | "pdf" | "html" | "code" | "archive" | "installer" | "unknown";
  createdAt: string;
  isPublic: boolean;
  downloads: number;
  pinned?: boolean;
  expiresAt?: string | null;
  hash?: string | null;
  tags?: string[];
  note?: string;
  faceIds?: string[];
  exif?: {
    latitude?: number;
    longitude?: number;
    dateTimeOriginal?: string;
    cameraMake?: string;
    cameraModel?: string;
  } | null;
}

export interface SystemStats {
  totalFiles: number;
  totalFolders: number;
  totalSizeMB: string;
  mostUploadedFolder: string;
  filesByType: Record<string, number>;
  foldersBreakdown: Record<string, { count: number; sizeBytes: number }>;
  disk?: {
    total: number;
    free: number;
    used: number;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  details: Record<string, unknown>;
}

export interface AdminUser {
  username: string;
  apiKey: string;
}

// ==============================
// API METHODS
// ==============================

export interface NotificationPreferences {
  onUpload: boolean;
  onDelete: boolean;
  onLogin: boolean;
  onDownload: boolean;
  onShare: boolean;
}

export interface FolderTreeNode {
  name: string;
  path: string;
  fileCount: number;
  sizeBytes: number;
  children: FolderTreeNode[];
}

export interface SystemSettings {
  allowedOrigins: string[];
  allowedEmails: string[];
  notificationEmails: string[];
  emailNotificationsEnabled?: boolean;
  discordNotificationsEnabled?: boolean;
  notificationPreferences: NotificationPreferences;
  customBaseUrl?: string;
  discordWebhookUrl?: string;
}
export const api = {
  // Generic request for Vault auth
  request: async (url: string, config?: any) => {
    let method = config?.method || "GET";
    let data = config?.body ? JSON.parse(config.body) : undefined;
    const res = await apiInstance.request({ url, method, data });
    return res.data;
  },

  // Files
  getFiles: async (): Promise<FileData[]> => {
    const { data } = await apiInstance.get("/admin/files");
    return data.map((f: FileData) => ({
      ...f,
      url: f.url.startsWith("http") ? f.url : `${API_BASE}${f.url}`,
      thumbnailUrl: f.thumbnailUrl ? (f.thumbnailUrl.startsWith("http") ? f.thumbnailUrl : `${API_BASE}${f.thumbnailUrl}`) : null
    }));
  },

  getPublicFiles: async (): Promise<FileData[]> => {
    // Note: this endpoint is public and does not require auth headers, but we use apiInstance for consistency.
    const { data } = await apiInstance.get("/api/public-files");
    return data.map((f: FileData) => ({
      ...f,
      url: f.url.startsWith("http") ? f.url : `${API_BASE}${f.url}`,
      thumbnailUrl: f.thumbnailUrl ? (f.thumbnailUrl.startsWith("http") ? f.thumbnailUrl : `${API_BASE}${f.thumbnailUrl}`) : null
    }));
  },

  getStats: async (): Promise<SystemStats> => {
    const { data } = await apiInstance.get("/admin/stats");
    return data;
  },

  deleteFile: async (folder: string, name: string): Promise<void> => {
    await apiInstance.delete("/admin/file", { data: { folder, name } });
  },

  uploadFile: async (
    file: File,
    folder: string,
    onProgress?: (pct: number) => void
  ): Promise<FileData> => {
    const formData = new FormData();
    formData.append("folder", folder);
    formData.append("file", file);
    const { data } = await apiInstance.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return {
      ...data,
      url: data.url.startsWith("http") ? data.url : `${API_BASE}${data.url}`,
      thumbnailUrl: data.thumbnailUrl ? (data.thumbnailUrl.startsWith("http") ? data.thumbnailUrl : `${API_BASE}${data.thumbnailUrl}`) : null
    };
  },

  getFaces: async (): Promise<{id: string, name: string}[]> => {
    const { data } = await apiInstance.get("/admin/faces");
    return data;
  },

  renameFace: async (id: string, name: string): Promise<void> => {
    await apiInstance.post("/admin/faces/rename", { id, name });
  },

  // Generic helpers for arbitrary API calls
  get: async <T = unknown>(url: string): Promise<T> => {
    const { data } = await apiInstance.get(url);
    return data;
  },

  post: async <T = unknown>(url: string, body: unknown): Promise<T> => {
    const { data } = await apiInstance.post(url, body);
    return data;
  },

  // Folder ops
  createFolder: async (folder: string): Promise<void> => {
    await apiInstance.post("/create-folder", { folder });
  },

  getFolderTree: async (): Promise<FolderTreeNode[]> => {
    const { data } = await apiInstance.get("/admin/folder-tree");
    return data;
  },

  // File ops
  renameFile: async (oldPath: string, newPath: string): Promise<void> => {
    await apiInstance.post("/rename", { oldPath, newPath });
  },

  moveFile: async (
    file: string,
    sourceFolder: string,
    destinationFolder: string
  ): Promise<void> => {
    await apiInstance.post("/move-file", { file, sourceFolder, destinationFolder });
  },

  moveFolder: async (
    sourceFolder: string,
    destinationFolder: string
  ): Promise<void> => {
    await apiInstance.post("/admin/move-folder", { sourceFolder, destinationFolder });
  },

  togglePrivacy: async (
    folder: string,
    name: string,
    isPublic: boolean
  ): Promise<void> => {
    await apiInstance.post("/admin/toggle-privacy", { folder, name, isPublic });
  },

  createShare: async (
    folder: string,
    name: string,
    durationMs: number | null,
    password?: string
  ): Promise<string> => {
    const { data } = await apiInstance.post("/admin/create-share", {
      folder,
      name,
      durationMs,
      password,
    });
    return data.shareUrl;
  },

  sendShareEmail: async (
    folder: string,
    name: string,
    email: string,
    url: string,
    attachFile: boolean = false
  ): Promise<void> => {
    await apiInstance.post("/admin/share/email", { folder, name, email, url, attachFile });
  },

  bulkShareEmail: async (
    files: { folder: string; name: string }[],
    email: string,
    durationMs: number | null,
    password?: string
  ): Promise<{ success: boolean; count: number }> => {
    const { data } = await apiInstance.post("/admin/bulk-share-email", {
      files,
      email,
      durationMs,
      password,
    });
    return data;
  },

  // Logs
  getLogs: async (): Promise<AuditLog[]> => {
    const { data } = await apiInstance.get("/admin/logs");
    return data;
  },

  // Users
  getUsers: async (): Promise<AdminUser[]> => {
    const { data } = await apiInstance.get("/admin/users");
    return data;
  },

  createUser: async (username: string): Promise<{ username: string; apiKey: string }> => {
    const { data } = await apiInstance.post("/admin/users", { username });
    return data;
  },

  deleteUser: async (username: string): Promise<void> => {
    await apiInstance.delete(`/admin/users/${username}`);
  },

  getDeveloperConfig: async (): Promise<{ apiKey: string; baseUrl: string }> => {
    const { data } = await apiInstance.get("/admin/developer");
    return data;
  },

  // ── NEW ENDPOINTS ──────────────────────────────────────────────

  bulkDelete: async (files: { folder: string; name: string }[]): Promise<{ deleted: number }> => {
    const { data } = await apiInstance.post("/admin/bulk-delete", { files });
    return data;
  },

  bulkMove: async (files: { folder: string; name: string }[], destinationFolder: string): Promise<{ moved: number }> => {
    const { data } = await apiInstance.post("/admin/bulk-move", { files, destinationFolder });
    return data;
  },

  bulkTogglePin: async (files: { folder: string; name: string }[], isPinned: boolean): Promise<void> => {
    await apiInstance.post("/admin/bulk-pin", { files, isPinned });
  },

  bulkTogglePrivacy: async (files: { folder: string; name: string }[], isPublic: boolean): Promise<void> => {
    await apiInstance.post("/admin/bulk-privacy", { files, isPublic });
  },

  bulkSetExpiry: async (files: { folder: string; name: string }[], expiresAt: string | null): Promise<void> => {
    await apiInstance.post("/admin/bulk-expiry", { files, expiresAt });
  },

  deleteFolder: async (folder: string): Promise<void> => {
    await apiInstance.delete("/admin/folder", { data: { folder } });
  },

  renameFolder: async (oldName: string, newName: string): Promise<void> => {
    await apiInstance.post("/admin/rename-folder", { oldName, newName });
  },

  copyFile: async (file: string, sourceFolder: string, destinationFolder: string): Promise<{ newName: string }> => {
    const { data } = await apiInstance.post("/admin/copy-file", { file, sourceFolder, destinationFolder });
    return data;
  },

  searchFiles: async (q: string, type?: string, folder?: string): Promise<FileData[]> => {
    const { data } = await apiInstance.get("/admin/search", { params: { q, type, folder } });
    return data.map((f: FileData) => ({
      ...f,
      url: f.url.startsWith("http") ? f.url : `${API_BASE}${f.url}`,
      thumbnailUrl: f.thumbnailUrl ? (f.thumbnailUrl.startsWith("http") ? f.thumbnailUrl : `${API_BASE}${f.thumbnailUrl}`) : null
    }));
  },

  updateFileMeta: async (folder: string, name: string, tags?: string[], note?: string): Promise<void> => {
    await apiInstance.post("/admin/file-meta", { folder, name, tags, note });
  },

  saveFileContent: async (folder: string, name: string, content: string): Promise<void> => {
    await apiInstance.post("/admin/save-file", { folder, name, content });
  },

  runPython: async (folder: string, name: string): Promise<{ output: string; error: string; exitCode: number }> => {
    const { data } = await apiInstance.post("/admin/run-python", { folder, name });
    return data;
  },

  cleanupStorage: async (): Promise<{ orphansRemoved: number }> => {
    const { data } = await apiInstance.post("/admin/cleanup");
    return data;
  },

  getRecentFiles: async (limit = 20): Promise<FileData[]> => {
    const { data } = await apiInstance.get("/admin/recent", { params: { limit } });
    return data.map((f: FileData) => ({
      ...f,
      url: f.url.startsWith("http") ? f.url : `${API_BASE}${f.url}`,
      thumbnailUrl: f.thumbnailUrl ? (f.thumbnailUrl.startsWith("http") ? f.thumbnailUrl : `${API_BASE}${f.thumbnailUrl}`) : null
    }));
  },

  getDiskInfo: async (): Promise<{
    totalBytes: number; totalMB: string; totalFiles: number;
    typeBreakdown: Record<string, number>; folderBreakdown: Record<string, { count: number; bytes: number }>;
  }> => {
    const { data } = await apiInstance.get("/admin/disk-info");
    return data;
  },

  clearLogs: async (): Promise<void> => {
    await apiInstance.delete("/admin/logs");
  },

  getTrash: async (): Promise<any[]> => {
    const { data } = await apiInstance.get("/admin/trash");
    return data;
  },

  restoreFromTrash: async (trashedName: string): Promise<void> => {
    await apiInstance.post("/admin/trash/restore", { trashedName });
  },

  emptyTrash: async (): Promise<void> => {
    await apiInstance.delete("/admin/trash/empty");
  },

  togglePin: async (folder: string, name: string): Promise<boolean> => {
    const { data } = await apiInstance.post("/admin/toggle-pin", { folder, name });
    return data.pinned;
  },

  updateFolderMeta: async (folder: string, color: string, icon: string, note?: string): Promise<void> => {
    await apiInstance.post("/admin/folder-meta", { folder, color, icon, note });
  },

  setFileExpiry: async (folder: string, name: string, expiresAt: string | null): Promise<string | null> => {
    const { data } = await apiInstance.post("/admin/set-expiry", { folder, name, expiresAt });
    return data.expiresAt;
  },

  configureWebhook: async (webhookUrl: string): Promise<string> => {
    const { data } = await apiInstance.post("/admin/webhook-config", { webhookUrl });
    return data.webhookUrl;
  },

  getWebhookUrl: async (): Promise<string> => {
    const { data } = await apiInstance.get("/admin/webhook-config");
    return data.webhookUrl;
  },

  verifyFileIntegrity: async (folder: string, name: string): Promise<{ intact: boolean; calculatedHash: string; storedHash: string; size: number }> => {
    const { data } = await apiInstance.get("/admin/file-integrity", { params: { folder, name } });
    return data;
  },

  zipFiles: async (files: { folder: string; name: string }[], zipName?: string): Promise<Blob> => {
    const { data } = await apiInstance.post("/admin/zip", { files, zipName }, { responseType: "blob" });
    return data;
  },

  // ── SYSTEM SETTINGS ────────────────────────────────────────────────────────
  systemSettings: {
    get: async (): Promise<SystemSettings> => {
      const { data } = await apiInstance.get("/admin/settings");
      return data;
    },
    addOrigin: async (origin: string): Promise<{ success: boolean; allowedOrigins: string[] }> => {
      const { data } = await apiInstance.post("/admin/settings/origins", { origin });
      return data;
    },
    removeOrigin: async (origin: string): Promise<{ success: boolean; allowedOrigins: string[] }> => {
      const { data } = await apiInstance.delete("/admin/settings/origins", { data: { origin } });
      return data;
    },
    addEmail: async (email: string): Promise<{ success: boolean; allowedEmails: string[] }> => {
      const { data } = await apiInstance.post("/admin/settings/emails", { email });
      return data;
    },
    removeEmail: async (email: string): Promise<{ success: boolean; allowedEmails: string[] }> => {
      const { data } = await apiInstance.delete("/admin/settings/emails", { data: { email } });
      return data;
    },
    toggleNotifications: async (type: 'email' | 'discord', enabled: boolean): Promise<{ success: boolean; emailNotificationsEnabled: boolean; discordNotificationsEnabled: boolean }> => {
      const { data } = await apiInstance.post("/admin/settings/notifications/toggle", { type, enabled });
      return data;
    },
    addNotificationEmail: async (email: string): Promise<{ success: boolean; notificationEmails: string[] }> => {
      const { data } = await apiInstance.post("/admin/settings/notifications/emails", { email });
      return data;
    },
    removeNotificationEmail: async (email: string): Promise<{ success: boolean; notificationEmails: string[] }> => {
      const { data } = await apiInstance.delete("/admin/settings/notifications/emails", { data: { email } });
      return data;
    },
    setCustomBaseUrl: async (customBaseUrl: string): Promise<{ success: boolean; customBaseUrl: string }> => {
      const { data } = await apiInstance.post("/admin/settings/base-url", { customBaseUrl });
      return data;
    },
    setDiscordWebhook: async (discordWebhookUrl: string): Promise<{ success: boolean; discordWebhookUrl: string }> => {
      const { data } = await apiInstance.post("/admin/settings/discord-webhook", { discordWebhookUrl });
      return data;
    },
    updateNotificationPreferences: async (preferences: Partial<NotificationPreferences>): Promise<{ success: boolean; notificationPreferences: NotificationPreferences }> => {
      const { data } = await apiInstance.post("/admin/settings/notifications/preferences", { preferences });
      return data;
    },
  },

  // ── 2FA / MFA ──────────────────────────────────────────────────────────────
  mfa: {
    /** Check if the current user has 2FA enabled (before full auth) */
    status: async (): Promise<{ mfaEnabled: boolean; mfaMethod: "app" | "email" | null }> => {
      const { data } = await apiInstance.get("/api/auth/2fa/status");
      return data;
    },

    /** Generate a TOTP secret + QR code PNG (base64 data URL) */
    generate: async (): Promise<{ secret: string; qrCode: string }> => {
      const { data } = await apiInstance.post("/api/auth/2fa/generate");
      return data;
    },

    /** Generate and send a 6-digit code via email */
    sendEmailCode: async (): Promise<void> => {
      await apiInstance.post("/api/auth/2fa/send-email");
    },

    /** Verify the 6-digit code and permanently enable 2FA for the user */
    verifySetup: async (token: string, secret?: string, method: "app" | "email" = "app"): Promise<void> => {
      await apiInstance.post("/api/auth/2fa/verify-setup", { token, secret, method });
    },

    /** Disable 2FA (requires valid 6-digit code to confirm) */
    disable: async (token: string): Promise<void> => {
      await apiInstance.post("/api/auth/2fa/disable", { token });
    },

    /** Submit a 6-digit login code to receive the MFA session cookie */
    login: async (code: string): Promise<void> => {
      const { data } = await apiInstance.post("/api/auth/2fa/login", { code }, { withCredentials: true });
      // Also store in localStorage as fallback when Vercel proxy strips Set-Cookie
      if (data.mfaToken && typeof window !== "undefined") {
        localStorage.setItem("mfa_token", data.mfaToken);
      }
    },

    /** Clear the MFA session cookie on logout */
    logout: async (): Promise<void> => {
      await apiInstance.post("/api/auth/logout", {}, { withCredentials: true });
      if (typeof window !== "undefined") {
        localStorage.removeItem("mfa_token");
      }
    },
  },

  // ── ALERTS ─────────────────────────────────────────────────────────────────
  alerts: {
    /** Trigger an admin login alert email */
    login: async (): Promise<void> => {
      await apiInstance.post("/api/alerts/login");
    },
    /** Trigger a website visit alert email (rate limited on server) */
    visit: async (): Promise<void> => {
      await apiInstance.post("/api/alerts/visit").catch(() => {});
    }
  },

  // ── Python Studio ────────────────────────────────────────────────────────────
  /** List all files in a specific folder */
  getFolderFiles: async (folder: string): Promise<FileData[]> => {
    const { data } = await apiInstance.get("/admin/files");
    return (data as FileData[])
      .filter((f: FileData) => f.folder === folder)
      .map((f: FileData) => ({
        ...f,
        url: f.url.startsWith("http") ? f.url : `${API_BASE}${f.url}`,
        thumbnailUrl: f.thumbnailUrl
          ? f.thumbnailUrl.startsWith("http") ? f.thumbnailUrl : `${API_BASE}${f.thumbnailUrl}`
          : null,
      }));
  },

  /** Fetch the raw text content of a file (authenticated) */
  getFileContent: async (folder: string, name: string): Promise<string> => {
    const { data } = await apiInstance.get("/admin/file-content", {
      params: { folder, name },
      responseType: "text",
    });
    return typeof data === "string" ? data : JSON.stringify(data);
  },

  // ── BACKUPS ──────────────────────────────────────────────────────────────────
  getBackups: async (): Promise<{ name: string; size: number; createdAt: string }[]> => {
    const { data } = await apiInstance.get("/admin/backups");
    return data;
  },
  createBackup: async (): Promise<{ success: boolean; filename: string; sizeBytes: number }> => {
    const { data } = await apiInstance.post("/admin/backups/create");
    return data;
  },
  deleteBackup: async (filename: string): Promise<void> => {
    await apiInstance.delete(`/admin/backups/${filename}`);
  },
  downloadBackup: async (filename: string): Promise<void> => {
    const token = await getAuthToken();
    const url = `${API_BASE}/admin/backups/download/${filename}?token=${token}`;
    window.open(url, "_blank");
  },

  // ── SYSTEM CONTROLS ──────────────────────────────────────────────────────────
  system: {
    reboot: async (): Promise<{ success: boolean; message: string }> => {
      const { data } = await apiInstance.post("/admin/system/reboot");
      return data;
    },
    shutdown: async (): Promise<{ success: boolean; message: string }> => {
      const { data } = await apiInstance.post("/admin/system/shutdown");
      return data;
    },
    rescanFiles: async (): Promise<{ success: boolean; message: string; added: number; foldersAdded: number }> => {
      const { data } = await apiInstance.post("/admin/rescan-files");
      return data;
    },
  },

  // ── WATCHDOG ─────────────────────────────────────────────────────────────────
  watchdog: {
    getStatus: async () => {
      const { data } = await apiInstance.get("/api/watchdog/status");
      return data;
    },
    getLogs: async () => {
      const { data } = await apiInstance.get("/api/watchdog/logs");
      return data;
    },
    updateSettings: async (config: any) => {
      const { data } = await apiInstance.post("/api/watchdog/settings", { config });
      return data;
    },
    triggerAction: async (action: string, service?: string) => {
      const { data } = await apiInstance.post("/api/watchdog/action", { action, service });
      return data;
    },
  },

  // ── DEPLOYMENTS ──────────────────────────────────────────────────────────────
  deployments: {
    getProjects: async () => {
      const { data } = await apiInstance.get("/api/deployments/projects");
      return data;
    },
    get: async (id: string) => {
      const { data } = await apiInstance.get(`/api/deployments/${id}`);
      return data.project;
    },
    getMetrics: async (id: string) => {
      const { data } = await apiInstance.get(`/api/deployments/metrics/${id}`);
      return data;
    },
    getAnalytics: async (id: string) => {
      const { data } = await apiInstance.get(`/api/deployments/analytics/${id}`);
      return data.stats;
    },
    getUptime: async (id: string) => {
      const { data } = await apiInstance.get(`/api/deployments/uptime/${id}`);
      return data.history;
    },
    getPreviews: async (id: string) => {
      const { data } = await apiInstance.get(`/api/deployments/${id}/previews`);
      return data.previews;
    },
    getForms: async (id: string) => {
      const { data } = await apiInstance.get(`/api/deployments/forms/${id}`);
      return data.forms;
    },
    deleteForm: async (projectId: string, submissionId: string) => {
      const { data } = await apiInstance.delete(`/api/deployments/forms/${projectId}/${submissionId}`);
      return data;
    },
    updatePreviewSettings: async (id: string, enabled: boolean) => {
      const { data } = await apiInstance.post(`/api/deployments/${id}/settings/previews`, { enabled });
      return data.project;
    },
    getFiles: async (id: string) => {
      const { data } = await apiInstance.get(`/api/deployments/files/${id}`);
      return data.files;
    },
    getFile: async (id: string, path: string) => {
      const { data } = await apiInstance.get(`/api/deployments/file/${id}?path=${encodeURIComponent(path)}`);
      return data.content;
    },
    saveFile: async (id: string, path: string, content: string) => {
      const { data } = await apiInstance.post(`/api/deployments/file/${id}`, { path, content });
      return data;
    },
    commitFile: async (id: string, path: string, content: string, message: string) => {
      const { data } = await apiInstance.post(`/api/deployments/commit/${id}`, { path, content, message });
      return data;
    },
    getTunnelCname: async () => {
      const { data } = await apiInstance.get("/api/deployments/tunnel-cname");
      return data.cname;
    },
    createProject: async (projectData: any) => {
      const { data } = await apiInstance.post("/api/deployments/projects", projectData);
      return data;
    },
    updateProject: async (id: string, updates: any) => {
      const { data } = await apiInstance.post(`/api/deployments/projects/${id}`, updates);
      return data;
    },
    checkPort: async (port: number) => {
      const { data } = await apiInstance.get(`/api/deployments/check-port?port=${port}`);
      return data;
    },
    triggerDeploy: async (id: string) => {
      const { data } = await apiInstance.post(`/api/deployments/trigger/${id}`);
      return data;
    },
    deleteProject: async (id: string) => {
      const { data } = await apiInstance.delete(`/api/deployments/projects/${id}`);
      return data;
    },
    stopDeploy: async (id: string) => {
      const { data } = await apiInstance.post(`/api/deployments/stop/${id}`);
      return data;
    },
    updateEnv: async (id: string, env: Record<string, string>) => {
      const { data } = await apiInstance.post(`/api/deployments/env/${id}`, { env });
      return data;
    },
    rollback: async (id: string) => {
      const { data } = await apiInstance.post(`/api/deployments/rollback/${id}`);
      return data;
    },
    getWebhookStatus: async (id: string): Promise<{ autoDeploy: boolean; discordNotify: boolean; webhookSecret: boolean; deploymentHistory: any[] }> => {
      const { data } = await apiInstance.get(`/api/deployments/webhook-status/${id}`);
      return data;
    },
    updateCicd: async (id: string, settings: { autoDeploy?: boolean; discordNotify?: boolean; webhookSecret?: string }) => {
      const { data } = await apiInstance.post(`/api/deployments/projects/${id}`, settings);
      return data;
    },
    autoFix: async (id: string, logs: string) => {
      const { data } = await apiInstance.post(`/api/deployments/fix/${id}`, { logs });
      return data;
    }
  },
  
  // ── GITHUB INTEGRATIONS ──────────────────────────────────────────────────────
  github: {
    checkConnection: async () => {
      const { data } = await apiInstance.get("/api/integrations/github");
      return data;
    },
    connect: async (token: string) => {
      const { data } = await apiInstance.post("/api/integrations/github", { token });
      return data;
    },
    getRepos: async () => {
      const { data } = await apiInstance.get("/api/github/repos");
      return data;
    },
    getBranches: async (repoFullName: string) => {
      const { data } = await apiInstance.get(`/api/github/branches?repo=${encodeURIComponent(repoFullName)}`);
      return data;
    },
    setupWebhook: async (repoUrl: string, webhookUrl: string) => {
      const { data } = await apiInstance.post("/api/github/webhook/setup", { repoUrl, webhookUrl });
      return data;
    },
    scanRepo: async (repoFullName: string, branch: string = "main", rootDir: string = "") => {
      const { data } = await apiInstance.get(`/api/github/scan?repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}&rootDir=${encodeURIComponent(rootDir)}`);
      return data;
    }
  },

  // ── CLOUDFLARE TUNNELS ──────────────────────────────────────────────────────
  cloudflare: {
    getRoutes: async () => {
      const { data } = await apiInstance.get("/api/cloudflare/routes");
      return data;
    },
    addRoute: async (hostname: string, port: string | number) => {
      const { data } = await apiInstance.post("/api/cloudflare/routes", { hostname, port });
      return data;
    },
    deleteRoute: async (hostname: string) => {
      const { data } = await apiInstance.delete("/api/cloudflare/routes", { data: { hostname } });
      return data;
    },
    restartTunnel: async () => {
      const { data } = await apiInstance.post("/api/cloudflare/restart");
      return data;
    }
  },

  // ── AUTHENTICATION ────────────────────────────────────────────────────────────
  auth: {
    getMe: async () => {
      const { data } = await apiInstance.get("/auth/me");
      return data;
    },
    updateMe: async (updates: { name?: string; avatar?: string; metadata?: any }) => {
      const { data } = await apiInstance.put("/auth/me", updates);
      return data;
    },
    register: async (payload: { email: string; password: string; name?: string; inviteToken?: string }) => {
      const { data } = await axios.post(`${API_BASE}/auth/register`, payload);
      return data;
    }
  },

  // ── AI AUTO-FIX ─────────────────────────────────────────────────────────────
  ai: {
    getSettings: async () => {
      const { data } = await apiInstance.get("/api/settings/ai");
      return data;
    },
    updateSettings: async (settings: any) => {
      const { data } = await apiInstance.post("/api/settings/ai", { settings });
      return data;
    },
    getOllamaModels: async () => {
      const { data } = await apiInstance.get("/api/settings/ai/ollama-models");
      return data;
    }
  },

  // ── RBAC & USER MANAGEMENT ──────────────────────────────────────────────────
  users: {
    getUsers: async () => {
      const { data } = await apiInstance.get("/api/users");
      return data;
    },
    changeRole: async (email: string, role: string) => {
      const { data } = await apiInstance.put(`/api/users/${email}/role`, { role });
      return data;
    },
    updatePermissions: async (email: string, permissions: Record<string, boolean>) => {
      const { data } = await apiInstance.put(`/api/users/${email}/permissions`, { permissions });
      return data;
    },
    deleteUser: async (email: string) => {
      const { data } = await apiInstance.delete(`/api/users/${email}`);
      return data;
    },
    generateInvite: async (role: string) => {
      const { data } = await apiInstance.post("/api/invites/generate", { role });
      return data;
    },
    deleteInvite: async (token: string) => {
      const { data } = await apiInstance.delete(`/api/invites/${token}`);
      return data;
    }
  },

  // ── SECURE VAULT ────────────────────────────────────────────────────────────
  vault: {
    status: async (): Promise<{ enabled: boolean }> => {
      const { data } = await apiInstance.get("/api/vault/status").catch(() => ({ data: { enabled: false } }));
      return data;
    },
    setup: async (pin: string): Promise<void> => {
      await apiInstance.post("/api/vault/setup", { pin });
    },
    changePin: async (currentPin: string, newPin: string): Promise<void> => {
      await apiInstance.post("/api/vault/change-pin", { currentPin, newPin });
    },
    forgotPin: async (): Promise<void> => {
      await apiInstance.post("/api/vault/forgot-pin");
    },
    resetPin: async (code: string, newPin: string): Promise<void> => {
      await apiInstance.post("/api/vault/reset-pin", { code, newPin });
    },
    verify: async (pin: string): Promise<{ token: string }> => {
      const { data } = await apiInstance.post("/api/vault/verify", { pin });
      return data;
    },
    disable: async (pin: string): Promise<void> => {
      await apiInstance.post("/api/vault/disable", { pin });
    },
    moveToVault: async (folder: string, name: string): Promise<void> => {
      await apiInstance.post("/api/vault/move-in", { folder, name });
    },
    bulkMoveToVault: async (files: { folder: string; name: string }[]): Promise<{ moved: number }> => {
      const { data } = await apiInstance.post("/api/vault/bulk-move-in", { files });
      return data;
    },
    moveFromVault: async (folder: string, name: string): Promise<void> => {
      await apiInstance.post("/api/vault/move-out", { folder, name });
    },
    deleteFromVault: async (name: string): Promise<void> => {
      await apiInstance.post("/api/vault/delete", { name });
    },
    getFiles: async (token: string): Promise<FileData[]> => {
      const { data } = await apiInstance.get("/api/vault/files", { headers: { "x-vault-token": token } });
      return data.map((f: FileData) => ({
        ...f,
        url: f.url.startsWith("http") ? f.url : `${API_BASE}${f.url}`,
        thumbnailUrl: f.thumbnailUrl ? (f.thumbnailUrl.startsWith("http") ? f.thumbnailUrl : `${API_BASE}${f.thumbnailUrl}`) : null
      }));
    },
    getNotes: async (token: string): Promise<any[]> => {
      const { data } = await apiInstance.get("/api/notes/vault", { headers: { "x-vault-token": token } });
      return data.notes || [];
    }
  },

  // Passwords API (Vault Protected)
  passwords: {
    getAll: async (token: string): Promise<any[]> => {
      const { data } = await apiInstance.get("/api/passwords", { headers: { "x-vault-token": token } });
      return data.passwords || [];
    },
    create: async (token: string, payload: any): Promise<any> => {
      const { data } = await apiInstance.post("/api/passwords", payload, { headers: { "x-vault-token": token } });
      return data.password;
    },
    update: async (token: string, id: string, payload: any): Promise<any> => {
      const { data } = await apiInstance.put(`/api/passwords/${id}`, payload, { headers: { "x-vault-token": token } });
      return data.password;
    },
    delete: async (token: string, id: string): Promise<void> => {
      await apiInstance.delete(`/api/passwords/${id}`, { headers: { "x-vault-token": token } });
    },
    bulkDelete: async (token: string, ids: string[]): Promise<void> => {
      await apiInstance.post("/api/passwords/bulk-delete", { ids }, { headers: { "x-vault-token": token } });
    },
    restore: async (token: string, id: string): Promise<void> => {
      await apiInstance.post(`/api/passwords/${id}/restore`, {}, { headers: { "x-vault-token": token } });
    },
    bulkRestore: async (token: string, ids: string[]): Promise<void> => {
      await apiInstance.post("/api/passwords/bulk-restore", { ids }, { headers: { "x-vault-token": token } });
    },
    permanentDelete: async (token: string, id: string): Promise<void> => {
      await apiInstance.delete(`/api/passwords/${id}/permanent`, { headers: { "x-vault-token": token } });
    },
    bulkPermanentDelete: async (token: string, ids: string[]): Promise<void> => {
      await apiInstance.post("/api/passwords/bulk-permanent", { ids }, { headers: { "x-vault-token": token } });
    }
  }
};
