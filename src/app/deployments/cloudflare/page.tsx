"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ArrowLeft, Server, Activity, RefreshCw, Trash2, Plus, AlertCircle, Play, Pencil, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CloudflareTunnelPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [newRoute, setNewRoute] = useState({ hostname: "", port: "" });
  const [editingRoute, setEditingRoute] = useState<{ originalHostname: string; hostname: string; port: string } | null>(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const [tunnelCname, setTunnelCname] = useState("");

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const data = await api.cloudflare.getRoutes();
      setRoutes(data.routes || []);
      try {
        const cname = await api.deployments.getTunnelCname();
        setTunnelCname(cname);
      } catch (e) {
        console.error("Failed to load cname", e);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load Cloudflare configuration: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await api.cloudflare.restartTunnel();
      alert("Tunnel restarted successfully!");
    } catch (err: any) {
      alert("Failed to restart tunnel: " + (err.response?.data?.error || err.message));
    } finally {
      setIsRestarting(false);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.cloudflare.addRoute(newRoute.hostname, newRoute.port);
      setIsAddingRoute(false);
      setNewRoute({ hostname: "", port: "" });
      loadRoutes();
    } catch (err: any) {
      alert("Failed to add route: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteRoute = async (hostname: string) => {
    if (!confirm(`Are you sure you want to remove the route for ${hostname}?`)) return;
    try {
      await api.cloudflare.deleteRoute(hostname);
      loadRoutes();
    } catch (err: any) {
      alert("Failed to delete route: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    try {
      await api.cloudflare.deleteRoute(editingRoute.originalHostname);
      await api.cloudflare.addRoute(editingRoute.hostname, editingRoute.port);
      setEditingRoute(null);
      loadRoutes();
    } catch (err: any) {
      alert("Failed to edit route: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/deployments" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Deployments
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Server className="h-8 w-8 text-orange-500" /> 
            Cloudflare Tunnel Manager
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your reverse proxy routes and ingress rules securely.</p>
          
          {tunnelCname && (
            <div className="mt-4 flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-3 py-2 rounded-lg text-sm border border-orange-100 dark:border-orange-900/30 w-fit">
              <span className="font-semibold">CNAME Target:</span>
              <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded font-mono select-all">
                {tunnelCname}
              </code>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRestart}
            disabled={isRestarting}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRestarting ? "animate-spin" : ""}`} /> 
            {isRestarting ? "Restarting..." : "Restart Tunnel"}
          </button>
          <button 
            onClick={() => setIsAddingRoute(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Route
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hostname</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service (Internal)</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">Loading configuration...</td>
              </tr>
            ) : routes.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">No routes configured yet.</td>
              </tr>
            ) : (
              routes
                .filter(route => 
                  (route.hostname && route.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (route.service && route.service.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((route, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    {route.hostname ? (
                      <a href={`https://${route.hostname}`} target="_blank" rel="noreferrer" className="text-orange-600 dark:text-orange-400 font-medium hover:underline flex items-center gap-2">
                        {route.hostname} <Play className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-gray-500 italic">Fallback (Catch-all)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-sm">
                    {route.service}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {route.hostname && (
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setEditingRoute({
                            originalHostname: route.hostname,
                            hostname: route.hostname,
                            port: route.service.replace("http://localhost:", "")
                          })}
                          className="text-indigo-500 hover:text-indigo-700 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Edit Route"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {route.hostname !== "storage.lootops.me" && (
                          <button 
                            onClick={() => handleDeleteRoute(route.hostname)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete Route"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Add Tunnel Route</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Map a public hostname to a local port. This will restart the tunnel.</p>
            
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hostname</label>
                <input 
                  required
                  type="text" 
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                  placeholder="app.subhan.tech"
                  value={newRoute.hostname}
                  onChange={e => setNewRoute({...newRoute, hostname: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local Port</label>
                <input 
                  required
                  type="number" 
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                  placeholder="3000"
                  value={newRoute.port}
                  onChange={e => setNewRoute({...newRoute, port: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddingRoute(false)}
                  className="flex-1 py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-white bg-orange-500 hover:bg-orange-600 font-medium"
                >
                  Add Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Edit Tunnel Route</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Modify the mapping for {editingRoute.originalHostname}.</p>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hostname</label>
                <input 
                  required
                  type="text" 
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                  placeholder="app.subhan.tech"
                  value={editingRoute.hostname}
                  onChange={e => setEditingRoute({...editingRoute, hostname: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local Port</label>
                <input 
                  required
                  type="number" 
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                  placeholder="3000"
                  value={editingRoute.port}
                  onChange={e => setEditingRoute({...editingRoute, port: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="flex-1 py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
