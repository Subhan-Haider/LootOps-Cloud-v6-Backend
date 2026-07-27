"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api, FileData, getAuthToken } from "@/lib/api";
import { MapPin, ScanSearch, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

// React-leaflet requires window to be defined, so we dynamically import it
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });

export default function MapPage() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    api.getFiles().then((data) => {
      // Filter only images that have GPS coordinates
      const mapFiles = data.filter(f => f.exif?.latitude && f.exif?.longitude);
      setFiles(mapFiles);
      setLoading(false);
    });
  };

  useEffect(() => {
    getAuthToken().then(t => setToken(t));
    // Fix for missing default icons in leaflet
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });

    loadData();
  }, []);

  const handleScanExif = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const result: any = await api.post("/admin/map/scan-exif", {});
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
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm z-10 gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <MapPin className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Photo Map</h1>
            <p className="text-sm text-slate-500">
              {files.length} photos with GPS metadata
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {scanMsg && <span className="text-sm text-indigo-600">{scanMsg}</span>}
          <button
            onClick={handleScanExif}
            disabled={scanning}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-3 sm:py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
            {scanning ? "Scanning..." : "Scan Existing Photos"}
          </button>
        </div>
      </div>

      <div className="flex-1 relative z-0">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {files.map((file) => (
            <Marker
              key={`${file.folder}/${file.name}`}
              position={[file.exif!.latitude!, file.exif!.longitude!]}
            >
              <Popup className="custom-popup">
                <div className="w-48 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(file.thumbnailUrl || file.url) + (!file.isPublic && token ? `?token=${token}` : '')}
                    alt={file.name}
                    className="w-full h-32 object-cover rounded-md mb-2 shadow-sm"
                  />
                  <p className="text-sm font-semibold truncate text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 truncate">{file.folder}</p>
                  {file.exif?.cameraMake && (
                    <p className="text-xs text-indigo-600 mt-1">📸 {file.exif.cameraMake} {file.exif.cameraModel}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
