"use client";

import { useEffect, useState } from "react";
import { api, FileData, getAuthToken } from "@/lib/api";
import { UserCircle, Edit3, Check, ScanSearch, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Terminal } from "lucide-react";

interface MlStatus {
  available: boolean;
  modelsReady: boolean;
  reason?: string;
}

export default function FacesPage() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [faces, setFaces] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [mlStatus, setMlStatus] = useState<MlStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getFiles(), api.getFaces()]).then(([filesData, facesData]) => {
      setFiles(filesData);
      setFaces(facesData);
      setLoading(false);
    });
  };

  useEffect(() => {
    getAuthToken().then(t => setToken(t));
    loadData();

    // Check ML status
    api.get("/admin/faces/ml-status").then((s: any) => setMlStatus(s as MlStatus)).catch(() => {});
  }, []);

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await api.renameFace(id, editName);
    setFaces(faces.map(f => f.id === id ? { ...f, name: editName } : f));
    setEditingId(null);
  };

  const handleScanAll = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const result: any = await api.post("/admin/faces/scan-all", {});
      setScanMsg(result.message || "Scan started!");
    } catch (e) {
      setScanMsg("Failed to start scan.");
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-y-auto">
      <div className="bg-white border-b border-slate-200 px-6 py-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <UserCircle className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">People & Faces</h1>
              <p className="text-slate-500 mt-1">
                AI automatically groups similar faces from your photos.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={loadData}
              className="flex-1 md:flex-none justify-center items-center gap-2 px-3 py-3 md:py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {mlStatus?.available && mlStatus?.modelsReady && (
              <button
                onClick={handleScanAll}
                disabled={scanning}
                className="flex-1 md:flex-none justify-center items-center gap-2 px-4 py-3 md:py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
                {scanning ? "Scanning..." : "Scan All Photos"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* ML Status Banner */}
        {mlStatus !== null && (
          <div className={`rounded-xl border px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
            mlStatus.available && mlStatus.modelsReady
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            {mlStatus.available && mlStatus.modelsReady ? (
              <>
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <p className="font-semibold">AI Face Detection is Ready</p>
                  <p className="text-sm opacity-80">face-api.js models are installed. New uploads are scanned automatically. Click &quot;Scan All Photos&quot; to process existing photos.</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold">AI Face Detection is not set up on this server</p>
                  {!mlStatus.available && (
                    <p className="text-sm mt-1 opacity-80">
                      Run these commands on your Linux server (in the <code className="bg-amber-100 px-1 rounded">~/storage-server</code> folder):
                    </p>
                  )}
                  {!mlStatus.available && (
                    <div className="mt-2 bg-slate-900 text-emerald-400 rounded-lg px-4 py-3 font-mono text-xs flex gap-2 items-start">
                      <Terminal className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div>npm install face-api.js canvas</div>
                        <div>node download-models.js</div>
                        <div>pm2 restart storage</div>
                      </div>
                    </div>
                  )}
                  {mlStatus.available && !mlStatus.modelsReady && (
                    <div className="mt-2 bg-slate-900 text-emerald-400 rounded-lg px-4 py-3 font-mono text-xs flex gap-2 items-start">
                      <Terminal className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>node download-models.js</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Scan status message */}
        {scanMsg && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-5 py-3 text-indigo-800 text-sm flex items-center gap-2">
            <ScanSearch className="w-4 h-4" />
            {scanMsg}
            {scanning && " Refresh the page in a few minutes to see results."}
          </div>
        )}

        {faces.length === 0 ? (
          <div className="text-center py-20">
            <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">No faces detected yet</h3>
            <p className="text-slate-500 mt-1">
              {mlStatus?.available && mlStatus?.modelsReady
                ? 'Click "Scan All Photos" above to detect faces in your existing photos.'
                : "Set up the AI on your server (see banner above), then scan your photos."}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {faces.map(face => {
              const facePhotos = files.filter(f => f.faceIds?.includes(face.id));
              if (facePhotos.length === 0) return null;

              return (
                <div key={face.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      {editingId === face.id ? (
                        <div className="flex items-center space-x-2">
                          <input 
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="text-xl font-bold border-b-2 border-indigo-500 focus:outline-none text-slate-800 bg-slate-50 px-2 py-1"
                            onKeyDown={e => e.key === 'Enter' && handleRename(face.id)}
                          />
                          <button onClick={() => handleRename(face.id)} className="p-1 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200">
                            <Check className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 group">
                          <h2 className="text-2xl font-bold text-slate-800">{face.name}</h2>
                          <button 
                            onClick={() => { setEditingId(face.id); setEditName(face.name); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm px-3 py-1 rounded-full font-medium">
                      {facePhotos.length} Photos
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {facePhotos.map(photo => (
                      <div key={photo.url} className="aspect-square relative group overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={(photo.thumbnailUrl || photo.url) + (!photo.isPublic && token ? `?token=${token}` : '')} 
                          alt="Face" 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
