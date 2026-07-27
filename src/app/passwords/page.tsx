"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { 
  Lock, 
  ShieldAlert, 
  Key, 
  Plus, 
  Copy, 
  ExternalLink, 
  Search, 
  Trash2, 
  Eye, 
  EyeOff, 
  Edit3, 
  Check, 
  X,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Clock,
  CheckSquare,
  Square,
  ListChecks,
  CreditCard,
  User,
  Folder,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Star,
  Settings,
  Terminal,
  Globe
} from "lucide-react";
import * as OTPAuth from "otpauth";
import Papa from "papaparse";
import { startAuthentication } from "@simplewebauthn/browser";

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes

export default function PasswordsPage() {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [groupByWebsite, setGroupByWebsite] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"vault" | "health" | "settings">("vault");
  const [autoLockTimer, setAutoLockTimer] = useState("5");
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [pinChangeStatus, setPinChangeStatus] = useState("");
  const lastActivity = useRef(Date.now());


  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Form State
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [currentTotp, setCurrentTotp] = useState("");
  const [totpProgress, setTotpProgress] = useState(0);
  const [entryType, setEntryType] = useState<"password"|"credit_card"|"identity"|"api_key">("password");
  const [category, setCategory] = useState("Personal");
  const [customFields, setCustomFields] = useState<any>({});
  const [filterCategory, setFilterCategory] = useState("All");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Vault State
  const [vaultToken, setVaultToken] = useState<string | null>(null);
  const [pinError, setPinError] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Auto-lock Ref
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateActivity = () => { lastActivity.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    
    const interval = setInterval(() => {
      if (!vaultToken || autoLockTimer === 'never') return;
      const timeoutMs = parseInt(autoLockTimer) * 60 * 1000;
      if (Date.now() - lastActivity.current > timeoutMs) {
        setVaultToken(null);
        setActiveTab("vault");
      }
    }, 10000); // Check every 10s
    
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      clearInterval(interval);
    };
  }, [vaultToken, autoLockTimer]);

  const handleChangePin = async () => {
    if (newPinInput.length < 4) { setPinChangeStatus("New PIN must be at least 4 chars."); return; }
    try {
      setPinChangeStatus("Updating...");
      await api.vault.changePin(currentPinInput, newPinInput);
      setPinChangeStatus("Success! Master PIN Updated.");
      setCurrentPinInput("");
      setNewPinInput("");
      setTimeout(() => setPinChangeStatus(""), 3000);
    } catch(err: any) {
      setPinChangeStatus(err.response?.data?.error || "Failed to update PIN");
    }
  };
  // Auto-Lock Logic
  useEffect(() => {
    if (!vaultToken) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        setVaultToken(null);
        setSelectedEntry(null);
        setPasswords([]);
      }, AUTO_LOCK_MS);
    };

    resetTimer(); // Start timer

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [vaultToken]);

  // Load Passwords
  useEffect(() => {
    if (vaultToken) {
      loadPasswords();
    }
  }, [vaultToken]);

  // TOTP Generator Logic
  useEffect(() => {
    if (!totpSecret || isEditing || !selectedEntry) {
      setCurrentTotp("");
      setTotpProgress(0);
      return;
    }

    let interval: NodeJS.Timeout;
    try {
      const totp = new OTPAuth.TOTP({
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(totpSecret.replace(/\s+/g, '').toUpperCase()),
      });

      const updateTotp = () => {
        setCurrentTotp(totp.generate());
        const epoch = Math.floor(Date.now() / 1000);
        const remaining = 30 - (epoch % 30);
        setTotpProgress((remaining / 30) * 100);
      };

      updateTotp();
      interval = setInterval(updateTotp, 1000);
    } catch (err) {
      console.error("Invalid TOTP Secret", err);
      setCurrentTotp("INVALID");
      setTotpProgress(0);
    }

    return () => clearInterval(interval);
  }, [totpSecret, isEditing, selectedEntry]);


  const loadPasswords = async () => {
    if (!vaultToken) return;
    setLoading(true);
    try {
      const data = await api.passwords.getAll(vaultToken);
      setPasswords(data);
    } catch (err) {
      console.error("Failed to load passwords", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWebAuthn = async () => {
    setIsVerifyingPin(true);
    setPinError("");
    try {
      const options = await api.request("/api/vault/webauthn/authenticate", { method: "GET" });
      const asseResp = await startAuthentication({ optionsJSON: options });

      const verifyRes = await api.request("/api/vault/webauthn/authenticate", {
        method: "POST",
        body: JSON.stringify(asseResp),
      });

      if (verifyRes.token) {
        setVaultToken(verifyRes.token);
      } else {
        setPinError("Invalid authentication");
      }
    } catch (err: any) {
      setPinError(err.response?.data?.error || err.message || "Authentication cancelled or failed");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setPinError("");
    try {
      await api.request("/api/vault/email/send", { method: "POST" });
      setShowOtp(true);
    } catch (err: any) {
      setPinError(err.message || "Failed to send code");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setPinError("Code must be 6 digits"); return; }
    setIsVerifyingPin(true);
    setPinError("");
    try {
      const verifyRes = await api.request("/api/vault/email/verify", {
        method: "POST",
        body: JSON.stringify({ code: otp }),
      });
      if (verifyRes.token) {
        setVaultToken(verifyRes.token);
      }
    } catch (err: any) {
      setPinError(err.message || "Invalid or expired code");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedEntry({ id: 'new' });
    setTitle("");
    setUsername("");
    setPassword("");
    setWebsite("");
    setNotes("");
    setTotpSecret("");
    setEntryType("password");
    setCategory(filterCategory !== "All" && filterCategory !== "Trash" ? filterCategory : "Personal");
    setCustomFields({});
    setIsEditing(true);
    setShowPassword(true);
    setActiveTab("vault");
  };

  const handleSelectEntry = (entry: any) => {
    setSelectedEntry(entry);
    setTitle(entry.title);
    setUsername(entry.username);
    setPassword(entry.password);
    setWebsite(entry.website);
    setNotes(entry.notes);
    setTotpSecret(entry.totpSecret || "");
    setEntryType(entry.type || "password");
    setCategory(entry.category || "Personal");
    setCustomFields(entry.customFields || {});
    setIsEditing(false);
    setShowPassword(false);
  };

  const handleSave = async () => {
    if (!vaultToken) return;
    try {
      setSaving(true);
      const payload = { title, username, password, website, notes, totpSecret, type: entryType, category, customFields, favorite: selectedEntry?.favorite || false };
      
      if (selectedEntry?.id === 'new') {
        const newEntry = await api.passwords.create(vaultToken, payload);
        setPasswords([...passwords, newEntry]);
        handleSelectEntry(newEntry);
      } else if (selectedEntry?.id) {
        const updatedEntry = await api.passwords.update(vaultToken, selectedEntry.id, payload);
        setPasswords(passwords.map(p => p.id === updatedEntry.id ? updatedEntry : p));
        handleSelectEntry(updatedEntry);
      }
    } catch (err) {
      console.error("Failed to save password", err);
      alert("Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  
  const handleRestore = async () => {
    if (!vaultToken || !selectedEntry?.id) return;
    try {
      await api.passwords.restore(vaultToken, selectedEntry.id);
      setPasswords(passwords.map(p => p.id === selectedEntry.id ? { ...p, deletedAt: null } : p));
      setSelectedEntry(null);
    } catch (err) {
      console.error("Failed to restore", err);
    }
  };

  const handlePermanentDelete = async () => {
    if (!vaultToken || !selectedEntry?.id) return;
    if (!confirm("Permanently delete this credential forever? This cannot be undone.")) return;
    try {
      await api.passwords.permanentDelete(vaultToken, selectedEntry.id);
      setPasswords(passwords.filter(p => p.id !== selectedEntry.id));
      setSelectedEntry(null);
    } catch (err) {
      console.error("Failed to delete permanently", err);
    }
  };

  const handleDelete = async () => {
    if (!vaultToken || !selectedEntry?.id || selectedEntry.id === 'new') return;
    if (!confirm("Are you sure you want to permanently delete this credential?")) return;
    
    try {
      await api.passwords.delete(vaultToken, selectedEntry.id);
      setPasswords(passwords.map(p => p.id === selectedEntry.id ? { ...p, deletedAt: Date.now() } : p));
      setSelectedEntry(null);
    } catch (err) {
      console.error("Failed to delete password", err);
      alert("Failed to delete entry.");
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let pwd = "";
    const array = new Uint32Array(16);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) {
      pwd += chars[array[i] % chars.length];
    }
    setPassword(pwd);
  };

  const exportCsv = () => {
    const csv = Papa.unparse(passwords.map(p => ({
      title: p.title,
      username: p.username,
      password: p.password,
      website: p.website,
      notes: p.notes,
      totpSecret: p.totpSecret
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `storage_passwords_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const importCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vaultToken) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let imported = 0;
        for (const row of results.data as any[]) {
          // Try to map common CSV fields from Bitwarden/Chrome
          const title = row.title || row.name || row.url || "Imported Entry";
          const username = row.username || row.login_username || row.email || "";
          const password = row.password || row.login_password || "";
          const website = row.website || row.login_uri || row.url || "";
          const notes = row.notes || "";
          const totpSecret = row.totp || row.totpSecret || row.login_totp || "";
          
          if (password || username) {
            try {
              await api.passwords.create(vaultToken, { title, username, password, website, notes, totpSecret });
              imported++;
            } catch (err) {
              console.error("Failed to import entry", err);
            }
          }
        }
        alert(`Successfully imported ${imported} credentials!`);
        loadPasswords(); // Refresh list
      }
    });
  };

  
  
  const toggleFavorite = async (e: React.MouseEvent, entry: any) => {
    e.stopPropagation();
    if (!vaultToken) return;
    try {
      const updatedEntry = await api.passwords.update(vaultToken, entry.id, { ...entry, favorite: !entry.favorite });
      setPasswords(passwords.map(p => p.id === entry.id ? updatedEntry : p));
      if (selectedEntry?.id === entry.id) setSelectedEntry(updatedEntry);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'permanent' | 'restore') => {
    if (!vaultToken || selectedIds.size === 0) return;
    
    if (action === 'permanent') {
      if (!confirm(`Permanently delete ${selectedIds.size} credentials forever? This cannot be undone.`)) return;
      await api.passwords.bulkPermanentDelete(vaultToken, Array.from(selectedIds));
      setPasswords(passwords.filter(p => !selectedIds.has(p.id)));
    } else if (action === 'restore') {
      await api.passwords.bulkRestore(vaultToken, Array.from(selectedIds));
      setPasswords(passwords.map(p => selectedIds.has(p.id) ? { ...p, deletedAt: null } : p));
    } else {
      if (!confirm(`Move ${selectedIds.size} credentials to Trash?`)) return;
      await api.passwords.bulkDelete(vaultToken, Array.from(selectedIds));
      setPasswords(passwords.map(p => selectedIds.has(p.id) ? { ...p, deletedAt: Date.now() } : p));
    }
    
    setSelectedIds(new Set());
    setSelectionMode(false);
    setSelectedEntry(null);
  };


  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Health Data
  const weakPasswords = passwords.filter(p => p.password && p.password.length < 10);
  const reusedPasswords = passwords.filter(p => p.password && passwords.filter(p2 => p2.password === p.password).length > 1);

  const existingCategories = Array.from(new Set(passwords.filter((p: any) => p.category && !p.deletedAt).map((p: any) => p.category)));
  const allCategories = Array.from(new Set(["Personal", "Work", "Finance", "Gaming", ...existingCategories]));

  const filteredPasswords = passwords.filter(p => {
    if (filterCategory === "Trash") return p.deletedAt;
    if (p.deletedAt) return false;
    if (filterCategory === "Favorites" && !p.favorite) return false;
    if (filterCategory !== "All" && filterCategory !== "Favorites" && p.category !== filterCategory) return false;
    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!vaultToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-950 relative">
        <div className="absolute top-4 right-4 text-xs text-slate-500 flex items-center gap-1">
          <Lock size={12} /> Auto-locks after 5 minutes of inactivity
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-xl dark:shadow-2xl flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
            <Key size={40} className="text-indigo-600 dark:text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Password Manager</h1>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8">
            Your credentials are heavily encrypted on the server. Unlock using your passkey or email code.
          </p>
          
          {showOtp ? (
            <form onSubmit={handleVerifyOtp} className="w-full">
              <input
                type="text"
                inputMode="numeric"
                placeholder="6-Digit Code"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                maxLength={6}
                autoFocus
              />
              {pinError && <p className="text-red-500 dark:text-red-400 text-sm text-center mb-4">{pinError}</p>}
              <button
                type="submit"
                disabled={isVerifyingPin || otp.length < 6}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 font-medium disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20 mb-3"
              >
                {isVerifyingPin ? "Verifying..." : "Unlock Vault"}
              </button>
              <button
                type="button"
                onClick={() => setShowOtp(false)}
                className="w-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium py-2"
              >
                Back to Passkey
              </button>
            </form>
          ) : (
            <div className="w-full space-y-3">
              <button
                onClick={handleVerifyWebAuthn}
                disabled={isVerifyingPin}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 font-bold disabled:opacity-50 transition-colors shadow-lg shadow-indigo-500/20"
              >
                {isVerifyingPin ? "Waiting for device..." : "Unlock with Windows Hello / Touch ID"}
              </button>
              <button
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSendingOtp ? "Sending code..." : "Use Email Code Fallback"}
              </button>
              {pinError && <p className="text-red-500 dark:text-red-400 text-sm text-center mt-4">{pinError}</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950">
      {/* Sidebar List */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 bg-white dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex justify-between items-center">
            <div className="relative">
              <button 
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 hover:opacity-80"
              >
                {filterCategory === 'Trash' ? <Trash2 size={18} className="text-red-500" /> : <Folder size={18} className="text-indigo-500" />}
                {filterCategory === 'All' ? 'All Items' : filterCategory}
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                  {['All', ...allCategories].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setFilterCategory(cat); setShowCategoryDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      {cat}
                    </button>
                  ))}
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                  <button
                    onClick={() => { setFilterCategory('Trash'); setShowCategoryDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-red-500 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Trash
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setSelectionMode(!selectionMode)}
                className={`p-1.5 rounded-lg transition-colors shadow-sm ${selectionMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title={selectionMode ? "Cancel Selection" : "Select Multiple"}
              >
                <ListChecks size={16} />
              </button>
              <button 
                onClick={() => { setActiveTab("health"); setSelectedEntry(null); setSelectionMode(false); }}
                className={`p-1.5 rounded-lg transition-colors shadow-sm ${activeTab === 'health' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Security Health"
              >
                <ShieldCheck size={16} />
              </button>
              <button 
                onClick={handleCreateNew}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                title="New Credential"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search credentials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">Decrypting vault...</div>
          ) : filteredPasswords.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 mt-4">
              <ShieldAlert className="mx-auto mb-3 opacity-30 text-indigo-500" size={36} />
              {passwords.length === 0 ? "Your vault is empty" : "No matches found"}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              
              {(() => {
                const renderItem = (entry: any) => {
                  const isWeak = weakPasswords.includes(entry);
                  const isReused = reusedPasswords.includes(entry);
                  return (
                    <div 
                      key={entry.id}
                      onClick={(e) => { 
                        if (selectionMode) {
                          toggleSelection(e, entry.id);
                        } else {
                          handleSelectEntry(entry); 
                          setActiveTab("vault"); 
                        }
                      }}
                      className={`p-4 cursor-pointer transition-colors group relative flex justify-between items-center
                        hover:bg-slate-50 dark:hover:bg-slate-800/50
                        ${selectedEntry?.id === entry.id && !selectionMode
                          ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-500' 
                          : 'border-l-4 border-transparent'}
                        ${selectionMode && selectedIds.has(entry.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        {selectionMode && (
                          <div className="shrink-0 text-indigo-500">
                            {selectedIds.has(entry.id) ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300 dark:text-slate-600" />}
                          </div>
                        )}
                        {!selectionMode && (
                          <div className="shrink-0 text-slate-400 dark:text-slate-500 w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                             {entry.type === 'credit_card' ? <CreditCard size={14} /> : 
                              entry.type === 'identity' ? <User size={14} /> :
                              entry.type === 'api_key' ? <Terminal size={14} className="text-emerald-500" /> :
                              entry.website ? (
                                <img src={`https://www.google.com/s2/favicons?domain=${entry.website}&sz=64`} alt="" className="w-4 h-4 rounded-sm" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                              ) : <Key size={14} />}
                             {entry.website && entry.type !== 'api_key' && <Key size={14} className="hidden" />}
                          </div>
                        )}
                        <div className="overflow-hidden flex items-center">
                          <h3 className={`font-medium text-slate-900 dark:text-slate-100 truncate text-sm ${entry.deletedAt ? 'line-through opacity-50' : ''}`}>
                            {entry.title || entry.website || "Untitled"}
                          </h3>
                          {entry.favorite && <Star size={14} className="text-amber-400 shrink-0 ml-2" fill="currentColor" />}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {(isWeak || isReused) && (
                          <span title="Security Warning"><ShieldAlert size={14} className="text-amber-500" /></span>
                        )}
                        {!selectionMode && (
                          <button onClick={(e) => toggleFavorite(e, entry)} className={`p-1.5 rounded-md transition-opacity ${entry.favorite ? 'opacity-100 text-amber-400 hover:text-amber-500' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400'}`}>
                            <Star size={16} fill={entry.favorite ? 'currentColor' : 'none'} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                };

                if (!groupByWebsite) {
                  return filteredPasswords.map(renderItem);
                }

                // Group by website/title
                const groups: Record<string, any[]> = {};
                filteredPasswords.forEach(p => {
                  const key = p.website || p.title || "Untitled";
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(p);
                });

                return Object.entries(groups).map(([groupName, items]) => {
                  if (items.length === 1) return renderItem(items[0]);
                  
                  const isExpanded = expandedGroups.has(groupName);
                  return (
                    <div key={groupName} className="border-b border-slate-100 dark:border-slate-800/50">
                      <div 
                        onClick={() => {
                          const next = new Set(expandedGroups);
                          if (next.has(groupName)) next.delete(groupName);
                          else next.add(groupName);
                          setExpandedGroups(next);
                        }}
                        className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex justify-between items-center group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                           <div className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500">
                             <Folder size={14} />
                           </div>
                           <div>
                             <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{groupName}</h3>
                             <p className="text-xs text-slate-500">{items.length} accounts</p>
                           </div>
                        </div>
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                      {isExpanded && (
                         <div className="bg-slate-50/30 dark:bg-slate-900/10 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4 divide-y divide-slate-100 dark:divide-slate-800/50">
                           {items.map(renderItem)}
                         </div>
                      )}
                    </div>
                  );
                });
              })()}

            </div>
          )}
          
          {selectionMode && filteredPasswords.length > 0 && (
            <div className="sticky bottom-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedIds.size} selected</span>
                <button onClick={() => {
                  if (selectedIds.size === filteredPasswords.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(filteredPasswords.map(p => p.id)));
                  }
                }} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  {selectedIds.size === filteredPasswords.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              {filterCategory === 'Trash' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('restore')}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white font-medium transition-colors"
                  >
                    <RotateCcw size={16} /> Restore
                  </button>
                  <button
                    onClick={() => handleBulkAction('permanent')}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-medium transition-colors"
                  >
                    <Trash2 size={16} /> Delete Forever
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={selectedIds.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-medium transition-colors"
                >
                  <Trash2 size={16} /> Delete {selectedIds.size > 0 ? selectedIds.size : ''} Selected
                </button>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
        <div className={`flex-1 flex-col h-full bg-white dark:bg-slate-950 relative overflow-y-auto ${(selectedEntry || activeTab !== 'vault') ? 'flex' : 'hidden md:flex'}`}>

          
          <div className="absolute top-6 right-8 z-10">
            <button 
              onClick={() => { setActiveTab(activeTab === 'settings' ? 'vault' : 'settings'); setSelectedEntry(null); }}
              className={`p-2.5 rounded-xl transition-all shadow-sm border ${activeTab === 'settings' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:text-indigo-400'}`}
              title="Vault Settings"
            >
              <Settings size={20} />
            </button>
          </div>
          
          {activeTab === 'settings' ? (
            <div className="max-w-3xl w-full mx-auto p-8 h-full flex flex-col">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                <button onClick={() => setActiveTab('vault')} className="md:hidden mr-2 p-2 -ml-2 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={24} className="rotate-180" /></button>
                <Settings className="text-indigo-500" size={32} /> Vault Settings
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Manage your master password, security policies, and UI preferences.</p>
              
              <div className="space-y-6">
                
                {/* Security Preferences */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Security Policies</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Auto-Lock Timeout</label>
                      <select value={autoLockTimer} onChange={e => setAutoLockTimer(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="1">1 Minute</option>
                        <option value="5">5 Minutes (Default)</option>
                        <option value="15">15 Minutes</option>
                        <option value="never">Never (Not Recommended)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Automatically lock the vault after inactivity.</p>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Group by Website</label>
                          <p className="text-xs text-slate-500 mt-0.5">Automatically organize multiple accounts for the same website into folders.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={groupByWebsite} onChange={() => setGroupByWebsite(!groupByWebsite)} />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Master Password */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Change Master PIN</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current PIN</label>
                      <input type="password" value={currentPinInput} onChange={e => setCurrentPinInput(e.target.value)} placeholder="••••••••" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New PIN</label>
                      <input type="password" value={newPinInput} onChange={e => setNewPinInput(e.target.value)} placeholder="••••••••" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                    {pinChangeStatus && (
                      <p className={`text-sm ${pinChangeStatus.includes('Success') ? 'text-green-500' : pinChangeStatus.includes('Updating') ? 'text-indigo-500' : 'text-red-500'}`}>{pinChangeStatus}</p>
                    )}
                    <button onClick={handleChangePin} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                      Update Master PIN
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === 'health' ? (
        
        
          <div className="max-w-4xl w-full mx-auto p-8 h-full flex flex-col">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
              <ShieldCheck className="text-amber-500" size={32} /> Security Health
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Scan your vault for vulnerabilities and maintain strong credential hygiene.</p>
            
            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="text-3xl font-bold text-amber-500 mb-1">{weakPasswords.length}</div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Weak Passwords</h3>
                <p className="text-sm text-slate-500 mt-1">Passwords under 10 characters.</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="text-3xl font-bold text-red-500 mb-1">{new Set(reusedPasswords.map(p=>p.password)).size}</div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Reused Passwords</h3>
                <p className="text-sm text-slate-500 mt-1">Found {reusedPasswords.length} accounts sharing these passwords.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">Import / Export</h3>
              <div className="flex gap-4">
                <button onClick={exportCsv} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-2 font-medium transition-colors">
                  <Download size={18} /> Export Vault (CSV)
                </button>
                <div className="relative">
                  <input type="file" accept=".csv" onChange={importCsv} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-2 font-medium transition-colors">
                    <Upload size={18} /> Import from CSV
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 max-w-lg">
                Import supports CSV files exported from Chrome, Bitwarden, or 1Password. Ensure your CSV has headers like "title", "username", "password", "website".
              </p>
            </div>
          </div>
        ) : selectedEntry ? (
          <div className="max-w-3xl w-full mx-auto p-8 flex flex-col min-h-max">
            <div className="flex justify-between items-start mb-8">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-3xl font-bold bg-transparent border-none outline-none focus:ring-0 text-slate-900 dark:text-white w-full placeholder-slate-300 dark:placeholder-slate-700 p-0"
                    placeholder="Title (e.g. Gmail)"
                  />
                ) : (
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{title || "Untitled"}</h2>
                )}
                
                {website && !isEditing && (
                    <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:text-indigo-600 mt-1 flex items-center gap-1 w-fit max-w-full">
                      <span className="break-all">{website}</span> <ExternalLink size={12} className="shrink-0" />
                    </a>
                  )}
                {isEditing && (
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="text-sm bg-transparent border-none outline-none focus:ring-0 text-indigo-500 w-full placeholder-indigo-300 dark:placeholder-indigo-800 p-0 mt-1"
                    placeholder="Website URL (e.g. https://google.com)"
                  />
                )}
              </div>
              
              <div className="flex gap-2">
                {selectedEntry?.deletedAt ? (
                  <>
                    <button onClick={handleRestore} className="px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30 transition-colors flex items-center gap-1.5">
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button onClick={handlePermanentDelete} className="px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5">
                      <Trash2 size={16} /> Delete Forever
                    </button>
                  </>
                ) : isEditing ? (
                  <>
                    <button onClick={() => isEditing && selectedEntry.id !== 'new' ? handleSelectEntry(selectedEntry) : setSelectedEntry(null)} className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
                      {saving ? "Saving..." : <><Check size={16} /> Save</>}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Edit">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={handleDelete} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete to Trash">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {isEditing && (
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                  <select value={entryType} onChange={(e: any) => setEntryType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="password">Login / Password</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="identity">Identity / Social Security</option>
                    <option value="api_key">API Key / Token</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <input type="text" list="category-options" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Type or select new folder..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <datalist id="category-options">
                    {allCategories.map(cat => (
                      <option key={cat as string} value={cat as string} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  {entryType === 'password' ? 'Username / Email' : entryType === 'credit_card' ? 'Cardholder Name' : entryType === 'api_key' ? 'Service / Provider Name' : 'Full Name'}
                </label>
                <div className="flex items-center">
                  {isEditing ? (
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">
                      {username || <span className="text-slate-400 italic">None</span>}
                    </div>
                  )}
                  {!isEditing && username && (
                    <button onClick={() => copyToClipboard(username, 'username')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                      {copiedField === 'username' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  )}
                </div>
              </div>

{/* Dynamic Custom Fields */}
              {entryType === 'credit_card' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Card Number</label>
                    <div className="flex items-center">
                      {isEditing ? (
                        <input
                          type="text"
                          value={customFields?.cardNumber || ""}
                          onChange={(e) => setCustomFields({ ...customFields, cardNumber: e.target.value })}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          placeholder="0000 0000 0000 0000"
                        />
                      ) : (
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">
                          {customFields?.cardNumber || <span className="text-slate-400 italic">None</span>}
                        </div>
                      )}
                      {!isEditing && customFields?.cardNumber && (
                        <button onClick={() => copyToClipboard(customFields.cardNumber, 'cardNumber')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                          {copiedField === 'cardNumber' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Exp</label>
                      {isEditing ? (
                        <input type="text" value={customFields?.exp || ""} onChange={e => setCustomFields({...customFields, exp: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono" placeholder="MM/YY"/>
                      ) : <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">{customFields?.exp || "-"}</div>}
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">CVV</label>
                      {isEditing ? (
                        <input type="text" value={customFields?.cvv || ""} onChange={e => setCustomFields({...customFields, cvv: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono" placeholder="123"/>
                      ) : <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">{customFields?.cvv ? "***" : "-"}</div>}
                    </div>
                  </div>
                </div>
              )}

              {entryType === 'identity' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">SSN / Passport Number</label>
                  <div className="flex items-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={customFields?.identityNumber || ""}
                        onChange={(e) => setCustomFields({ ...customFields, identityNumber: e.target.value })}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    ) : (
                      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">
                        {customFields?.identityNumber ? (showPassword ? customFields.identityNumber : '***-**-****') : <span className="text-slate-400 italic">None</span>}
                      </div>
                    )}
                    {!isEditing && customFields?.identityNumber && (
                      <button onClick={() => copyToClipboard(customFields.identityNumber, 'idNum')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                        {copiedField === 'idNum' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* API Key Fields */}
              {entryType === 'api_key' && (
                <div className="space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Terminal size={12} /> API Key / Token</label>
                    <div className="flex items-center">
                      {isEditing ? (
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={customFields?.apiKey || ""}
                          onChange={(e) => setCustomFields({ ...customFields, apiKey: e.target.value })}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      ) : (
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">
                          {customFields?.apiKey ? (showPassword ? customFields.apiKey : '••••••••••••••••••••••••') : <span className="text-slate-400 italic">None</span>}
                        </div>
                      )}
                      {!isEditing && customFields?.apiKey && (
                        <button onClick={() => copyToClipboard(customFields.apiKey, 'apiKey')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                          {copiedField === 'apiKey' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                        </button>
                      )}
                      {!isEditing && customFields?.apiKey && (
                        <button onClick={() => setShowPassword(!showPassword)} className="ml-1 p-2 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Client Secret */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Client Secret (optional)</label>
                    <div className="flex items-center">
                      {isEditing ? (
                        <input
                          type="password"
                          value={customFields?.clientSecret || ""}
                          onChange={(e) => setCustomFields({ ...customFields, clientSecret: e.target.value })}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          placeholder="Client secret or OAuth secret"
                        />
                      ) : (
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">
                          {customFields?.clientSecret ? '••••••••••••••••' : <span className="text-slate-400 italic">None</span>}
                        </div>
                      )}
                      {!isEditing && customFields?.clientSecret && (
                        <button onClick={() => copyToClipboard(customFields.clientSecret, 'clientSecret')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                          {copiedField === 'clientSecret' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Base URL + Environment */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Globe size={12} /> Base URL</label>
                      {isEditing ? (
                        <input type="text" value={customFields?.baseUrl || ""} onChange={e => setCustomFields({...customFields, baseUrl: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm" placeholder="https://api.example.com"/>
                      ) : <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm truncate">{customFields?.baseUrl || <span className="text-slate-400 italic">None</span>}</div>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Environment</label>
                      {isEditing ? (
                        <select value={customFields?.environment || 'production'} onChange={e => setCustomFields({...customFields, environment: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100">
                          <option value="production">Production</option>
                          <option value="staging">Staging</option>
                          <option value="development">Development</option>
                          <option value="test">Test</option>
                        </select>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            customFields?.environment === 'production' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            customFields?.environment === 'staging' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>{customFields?.environment || 'production'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Password Field */}
              {entryType !== 'api_key' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  {entryType === 'credit_card' ? 'Card PIN' : 'Password'}
                  {isEditing && (
                    <button onClick={generatePassword} type="button" className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1 normal-case tracking-normal">
                      <RefreshCw size={12} /> Generate Strong
                    </button>
                  )}
                </label>
                <div className="flex items-center">
                  {isEditing ? (
                    <div className="flex-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono pr-10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm flex items-center justify-between">
                      <span>{showPassword ? password : '••••••••••••••••'}</span>
                      {password && (
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                  )}
                  {!isEditing && password && (
                    <button onClick={() => copyToClipboard(password, 'password')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                      {copiedField === 'password' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  )}
                </div>
              </div>
              )}

              {/* Authenticator (TOTP) Field */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 flex gap-1 items-center">
                  <Clock size={12}/> Authenticator (TOTP)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={totpSecret}
                    onChange={(e) => setTotpSecret(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="2FA Setup Key (Secret)"
                  />
                ) : (
                  totpSecret ? (
                    <div className="flex items-center">
                      <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg px-4 py-3 text-indigo-700 dark:text-indigo-300 font-mono text-2xl tracking-[0.2em] font-bold flex items-center justify-between relative overflow-hidden">
                        {currentTotp || "------"}
                        
                        {/* Progress Bar indicator at bottom */}
                        <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/30 w-full">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${totpProgress}%`, backgroundColor: totpProgress < 15 ? '#ef4444' : undefined }}
                          />
                        </div>
                      </div>
                      <button onClick={() => copyToClipboard(currentTotp, 'totp')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                        {copiedField === 'totp' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                    </div>
                  ) : (
                    <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-4 py-3 text-slate-400 italic text-sm">
                      No 2FA secret configured.
                    </div>
                  )
                )}
              </div>

              {/* Notes Field */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Secure Notes</label>
                {isEditing ? (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-y"
                    placeholder="Security questions, recovery codes, etc."
                  />
                ) : (
                  <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-4 py-3 text-slate-700 dark:text-slate-300 text-sm min-h-[120px] whitespace-pre-wrap">
                    {notes || <span className="text-slate-400 italic">No additional notes.</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-slate-100 dark:bg-slate-900">
              <Key size={32} className="text-slate-300 dark:text-slate-700" />
            </div>
            <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-2">Vault Unlocked</h2>
            <p className="text-sm">Select a credential or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
