"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { apiInstance } from "@/lib/api";
import { Plus, Trash2, Check, X, Eye, Edit3, Search, Tag, Pin, Lock, Unlock, ShieldAlert, FileText, ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  
  // Vault State
  const [isVaultMode, setIsVaultMode] = useState(false);
  const [vaultToken, setVaultToken] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  
  // Auto-save debounce ref
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNotes();
  }, [isVaultMode, vaultToken]);

  // Trigger auto-save when content changes
  useEffect(() => {
    if (selectedNote && (content !== selectedNote.content || title !== selectedNote.title || tags !== selectedNote.tags)) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        handleSaveNote();
      }, 1000);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [title, content, tags]);

  const loadNotes = async () => {
    setLoading(true);
    setSelectedNote(null); // Clear selection when switching modes
    try {
      if (isVaultMode && vaultToken) {
        const vaultedNotes = await api.vault.getNotes(vaultToken);
        setNotes(vaultedNotes);
      } else if (!isVaultMode) {
        const res: any = await apiInstance.get("/api/notes");
        if (res.data?.success) {
          setNotes(res.data.notes);
        }
      }
    } catch (err) {
      console.error("Failed to load notes", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) { setPinError("PIN is too short"); return; }
    setIsVerifyingPin(true);
    setPinError("");
    try {
      const res = await api.vault.verify(pin);
      if (res.token) {
        setVaultToken(res.token);
        setPin("");
      } else {
        setPinError("Invalid PIN");
      }
    } catch (err: any) {
      setPinError(err.response?.data?.error || "Invalid PIN");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const toggleVaultMode = () => {
    if (isVaultMode) {
      setIsVaultMode(false);
      // We keep the token alive so they don't have to re-enter it if they switch back during this session
    } else {
      setIsVaultMode(true);
    }
  };

  const handleSelectNote = (note: any) => {
    if (selectedNote?.id === note.id) return;
    
    // Force a save if we have pending changes before switching
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      handleSaveNote(); // Attempt to save previous note synchronously
    }

    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || []);
    setPreviewMode(false); // Reset to edit mode when switching
  };

  const handleCreateNote = async () => {
    try {
      setSaving(true);
      const headers = vaultToken ? { "x-vault-token": vaultToken } : {};
      const res: any = await apiInstance.post("/api/notes", { 
        title: "New Note", 
        content: "",
        tags: [],
        isPinned: false,
        linkedFiles: [],
        isVaulted: isVaultMode
      }, { headers });
      
      if (res.data?.success) {
        setNotes([res.data.note, ...notes]);
        handleSelectNote(res.data.note);
      }
    } catch (err) {
      console.error("Failed to create note", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    try {
      setSaving(true);
      const headers = selectedNote.isVaulted && vaultToken ? { "x-vault-token": vaultToken } : {};
      const res: any = await apiInstance.put(`/api/notes/${selectedNote.id}`, { 
        title, 
        content,
        tags,
        isPinned: selectedNote.isPinned,
        isVaulted: selectedNote.isVaulted,
        linkedFiles: selectedNote.linkedFiles
      }, { headers });
      
      if (res.data?.success) {
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? res.data.note : n));
        setSelectedNote(res.data.note);
      }
    } catch (err) {
      console.error("Failed to save note", err);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const headers = note.isVaulted && vaultToken ? { "x-vault-token": vaultToken } : {};
      const res: any = await apiInstance.put(`/api/notes/${note.id}`, { 
        isPinned: !note.isPinned 
      }, { headers });
      
      if (res.data?.success) {
        setNotes(prev => prev.map(n => n.id === note.id ? res.data.note : n));
        if (selectedNote?.id === note.id) setSelectedNote(res.data.note);
      }
    } catch (err) {
      console.error("Failed to toggle pin", err);
    }
  };

  const handleToggleVault = async (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vaultToken) {
      alert("Please unlock the vault first before moving notes into it.");
      setIsVaultMode(true);
      return;
    }
    
    try {
      const headers = { "x-vault-token": vaultToken };
      const res: any = await apiInstance.put(`/api/notes/${note.id}`, { 
        isVaulted: !note.isVaulted 
      }, { headers });
      
      if (res.data?.success) {
        // If it successfully toggled, remove it from the current view's list
        setNotes(prev => prev.filter(n => n.id !== note.id));
        if (selectedNote?.id === note.id) {
          setSelectedNote(null);
          setTitle("");
          setContent("");
        }
      }
    } catch (err) {
      console.error("Failed to toggle vault status", err);
      alert("Failed to move note. Check your vault PIN.");
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent, isVaulted: boolean) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const headers = isVaulted && vaultToken ? { "x-vault-token": vaultToken } : {};
      await apiInstance.delete(`/api/notes/${id}`, { headers });
      
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setTitle("");
        setContent("");
        setTags([]);
      }
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Filter & Sort Logic
  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = tagFilter ? (n.tags && n.tags.includes(tagFilter)) : true;
    return matchesSearch && matchesTag;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const allUniqueTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  return (
    <div className="flex h-full">
      {/* Sidebar List */}
      <div className={`border-r flex-col h-full shrink-0 w-full md:w-80 ${selectedNote ? 'hidden md:flex' : 'flex'} ${isVaultMode ? 'border-red-900/30 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
        <div className={`p-4 border-b space-y-3 ${isVaultMode ? 'border-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="flex justify-between items-center">
            <h2 className={`font-semibold ${isVaultMode ? 'text-red-700 dark:text-red-400 flex items-center gap-1.5' : 'text-gray-800 dark:text-gray-200'}`}>
              {isVaultMode && <ShieldAlert size={16} />}
              {isVaultMode ? 'Vaulted Notes' : 'Notes'}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleVaultMode}
                className={`p-1.5 rounded-lg transition-colors ${isVaultMode ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                title={isVaultMode ? "Exit Vault" : "Enter Vault"}
              >
                {isVaultMode ? <Unlock size={16} /> : <Lock size={16} />}
              </button>
              {(!isVaultMode || vaultToken) && (
                <button 
                  onClick={handleCreateNote}
                  className={`p-1.5 text-white rounded-lg transition-colors ${isVaultMode ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  title="New Note"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
          </div>
          
          {(!isVaultMode || vaultToken) && (
            <>
              <div className="relative">
                <Search className={`absolute left-2.5 top-2 ${isVaultMode ? 'text-red-300' : 'text-gray-400'}`} size={16} />
                <input 
                  type="text" 
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 ${isVaultMode ? 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-900/50 focus:ring-red-500 text-red-900 dark:text-red-100 placeholder-red-300' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-indigo-500 text-gray-800 dark:text-gray-200'}`}
                />
              </div>

              {allUniqueTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag size={14} className={isVaultMode ? 'text-red-400' : 'text-gray-400'} />
                  <select 
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className={`w-full text-xs border rounded-md py-1 px-2 ${isVaultMode ? 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    <option value="">All Tags</option>
                    {allUniqueTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isVaultMode && !vaultToken ? (
            <div className="p-6 h-full flex flex-col justify-center items-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Lock size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Vault Locked</h3>
              <p className="text-sm text-gray-500 text-center mb-6">Enter your Vault PIN to view secure notes.</p>
              
              <form onSubmit={handleVerifyPin} className="w-full max-w-xs">
                <input
                  type="password"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg tracking-widest"
                  maxLength={6}
                  autoFocus
                />
                {pinError && <p className="text-red-500 text-sm text-center mb-3">{pinError}</p>}
                <button
                  type="submit"
                  disabled={isVerifyingPin || pin.length < 4}
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50 transition-colors"
                >
                  {isVerifyingPin ? "Verifying..." : "Unlock Notes"}
                </button>
              </form>
            </div>
          ) : loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
          ) : sortedNotes.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
              {isVaultMode ? (
                <>
                  <ShieldAlert className="mx-auto mb-3 opacity-30 text-red-500" size={36} />
                  {notes.length === 0 ? "No vaulted notes yet" : "No notes found matching filters"}
                </>
              ) : (
                <>
                  <FileText className="mx-auto mb-3 opacity-30" size={36} />
                  {notes.length === 0 ? "No notes yet" : "No notes found matching filters"}
                </>
              )}
            </div>
          ) : (
            <div className={`divide-y ${isVaultMode ? 'divide-red-100 dark:divide-red-900/20' : 'divide-gray-200 dark:divide-gray-700/50'}`}>
              {sortedNotes.map(note => (
                <div 
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-4 cursor-pointer transition-colors group relative 
                    ${isVaultMode ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:bg-white dark:hover:bg-gray-800'}
                    ${selectedNote?.id === note.id 
                      ? (isVaultMode ? 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500' : 'bg-white dark:bg-gray-800 border-l-4 border-indigo-500') 
                      : 'border-l-4 border-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate pr-6 text-sm">
                      {note.isPinned && <Pin size={12} className="inline mr-1.5 text-amber-500" />}
                      {note.title || "Untitled"}
                    </h3>
                    
                    <div className="absolute right-3 top-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleTogglePin(note, e)}
                        className={`p-1 rounded ${isVaultMode ? 'hover:bg-red-200 dark:hover:bg-red-800' : 'hover:bg-gray-200 dark:hover:bg-gray-700'} ${note.isPinned ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title={note.isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleToggleVault(note, e)}
                        className={`p-1 rounded ${isVaultMode ? 'hover:bg-red-200 dark:hover:bg-red-800 text-red-400 hover:text-red-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title={note.isVaulted ? "Remove from Vault" : "Move to Vault"}
                      >
                        {note.isVaulted ? <Unlock size={14} /> : <Lock size={14} />}
                      </button>
                      <button 
                        onClick={(e) => handleDeleteNote(note.id, e, note.isVaulted)}
                        className={`p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500`}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate pr-4">
                    {note.content || "No content"}
                  </p>
                  
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {note.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className={`px-1.5 py-0.5 text-[10px] rounded-sm ${isVaultMode ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-sm ${isVaultMode ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-2">
                    {new Date(note.updatedAt).toLocaleDateString()} at {new Date(note.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className={`flex-1 bg-white dark:bg-gray-900 flex-col h-full relative overflow-hidden ${selectedNote ? 'flex' : 'hidden md:flex'} ${isVaultMode ? 'border-l-2 border-red-500/20' : ''}`}>
        {selectedNote ? (
          <>
            {/* Top Toolbar */}
            <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${isVaultMode ? 'bg-red-50/10 border-red-900/20' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedNote(null)} className="md:hidden p-2 -ml-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft size={24} /></button>
                  {selectedNote.isVaulted && <span title="This note is secured in the Vault"><ShieldAlert size={20} className="text-red-500" /></span>}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 text-gray-900 dark:text-white w-full placeholder-gray-300 dark:placeholder-gray-700 p-0"
                    placeholder="Note Title"
                  />
                </div>
                
                {/* Tag Bar */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {tags.map(tag => (
                    <span key={tag} className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${isVaultMode ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'}`}>
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className={`hover:text-${isVaultMode ? 'red' : 'indigo'}-900 dark:hover:text-${isVaultMode ? 'red' : 'indigo'}-100`}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tag..."
                    className="text-xs bg-transparent border-none outline-none focus:ring-0 text-gray-600 dark:text-gray-400 w-24 placeholder-gray-400 p-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  {saving ? (
                    <><div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div> Saving...</>
                  ) : (
                    <><Check size={14} className="text-green-500" /> Saved</>
                  )}
                </div>
                
                <div className={`flex p-1 rounded-lg ${isVaultMode ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <button
                    onClick={() => setPreviewMode(false)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${!previewMode ? (isVaultMode ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm' : 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm') : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${previewMode ? (isVaultMode ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm' : 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm') : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    <Eye size={14} /> Preview
                  </button>
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className={`flex-1 overflow-y-auto relative ${isVaultMode ? 'bg-red-50/5 dark:bg-red-900/5' : 'bg-white dark:bg-gray-900'}`}>
              {previewMode ? (
                <div className={`p-8 prose max-w-4xl mx-auto h-full ${isVaultMode ? 'prose-red dark:prose-invert' : 'prose-indigo dark:prose-invert'}`}>
                  {content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic">No content to preview.</p>
                  )}
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full p-8 bg-transparent border-none outline-none resize-none text-gray-800 dark:text-gray-200 focus:ring-0 leading-relaxed font-mono text-sm max-w-5xl mx-auto block"
                  placeholder="Write your note here... (Markdown supported)"
                  spellCheck="false"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isVaultMode ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {isVaultMode ? (
                <ShieldAlert size={32} className="text-red-300 dark:text-red-600" />
              ) : (
                <Lock size={32} className="text-gray-300 dark:text-gray-600" />
              )}
            </div>
            <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isVaultMode && !vaultToken ? "Vault Locked" : "No Note Selected"}
            </h2>
            <p className="text-sm">
              {isVaultMode && !vaultToken 
                ? "Enter your PIN in the sidebar to view vaulted notes."
                : "Select an existing note from the sidebar or create a new one."}
            </p>
            {(!isVaultMode || vaultToken) && (
              <button 
                onClick={handleCreateNote}
                className={`mt-6 px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${isVaultMode ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                <Plus size={16} /> Create New Note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
