"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Server, Activity, ArrowRight, Code, Search, X, Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DeploymentsDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [githubConnected, setGithubConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    loadProjects();
    checkGithubConnection();
  }, []);

  const checkGithubConnection = async () => {
    try {
      const { connected } = await api.github.checkConnection();
      setGithubConnected(connected);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.deployments.getProjects();
      setProjects(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deployments</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Personal Deployment Manager (PaaS)</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {!githubConnected && (
            <a 
              href="/api/github/login"
              className="flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 md:py-2.5 rounded-xl font-medium transition-colors w-full md:w-auto"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Connect GitHub
            </a>
          )}
          <Link 
            href="/deployments/cloudflare"
            className="flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-3 md:py-2.5 rounded-xl font-medium transition-colors hover:bg-orange-600 w-full md:w-auto"
          >
            <Server className="h-4 w-4" /> Cloudflare Tunnel
          </Link>
          {githubConnected && (
            <Link 
              href="/deployments/new"
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 md:py-2.5 rounded-xl hover:bg-indigo-700 font-medium transition-colors w-full md:w-auto"
            >
              <Plus className="h-4 w-4" /> New Project
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Server className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Projects</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Running Apps</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{projects.filter(p => p.status === 'running').length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mr-auto">Your Projects</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-3 md:py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto py-3 md:py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="running">Running</option>
          <option value="building">Building</option>
          <option value="failed">Failed</option>
          <option value="stopped">Stopped</option>
          <option value="idle">Idle</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl"></div>)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 border-dashed">
          <svg className="h-12 w-12 fill-current text-gray-300 mx-auto mb-4" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No projects yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Connect a Git repository to deploy your first app.</p>
          {githubConnected ? (
            <Link 
              href="/deployments/new"
              className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-4 py-2 rounded-lg font-medium inline-block"
            >
              Create Project
            </Link>
          ) : (
            <a 
              href="/api/github/login"
              className="inline-flex items-center gap-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Connect GitHub
            </a>
          )}
        </div>
      ) : (() => {
        const filtered = projects.filter(p => {
          const q = searchQuery.toLowerCase();
          const matchesSearch = !q || p.name?.toLowerCase().includes(q) || p.repository?.toLowerCase().includes(q) || p.branch?.toLowerCase().includes(q);
          const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
          return matchesSearch && matchesStatus;
        });
        return filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No projects match your search</p>
            <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="mt-3 text-sm text-indigo-600 hover:underline">Clear filters</button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(project => (
            <Link 
              href={`/deployments/${project.id}`} 
              key={project.id}
              className="block bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              {/* Top row: Avatar + Name + Domain + Status dot */}
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                {(() => {
                  try {
                    const parts = new URL(project.repository).pathname.split('/').filter(Boolean);
                    const owner = parts[0];
                    const colors = ['bg-indigo-500','bg-purple-500','bg-pink-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500'];
                    const color = colors[(project.name.charCodeAt(0) || 0) % colors.length];
                    return (
                      <div className="relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                        <img
                          src={`https://github.com/${owner}.png?size=80`}
                          alt={owner}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const t = e.currentTarget;
                            t.style.display = 'none';
                            if (t.nextElementSibling) (t.nextElementSibling as HTMLElement).style.display = 'flex';
                          }}
                        />
                        <div className={`absolute inset-0 ${color} text-white font-bold text-sm items-center justify-center hidden`}>
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{project.name}</h3>
                    {/* Status dot */}
                    <span className={`flex-shrink-0 w-2 h-2 rounded-full ${
                      project.status === 'running' ? 'bg-emerald-500' :
                      project.status === 'building' ? 'bg-amber-500' :
                      project.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                    }`} title={project.status} />
                  </div>
                  {/* Live domain link */}
                  {project.domains?.length > 0 ? (
                    <span
                      onClick={e => { e.preventDefault(); window.open(`https://${project.domains[0]}`, '_blank'); }}
                      className="text-xs text-indigo-500 hover:underline cursor-pointer truncate block"
                    >
                      {project.domains[0]}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 truncate block">No domain assigned</span>
                  )}
                </div>

                {/* Extra domains */}
                {project.domains?.length > 1 && (
                  <span className="flex-shrink-0 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                    +{project.domains.length - 1}
                  </span>
                )}
              </div>

              {/* Repo tag */}
              <div className="flex items-center gap-1.5 mb-3">
                <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {(() => { try { const p = new URL(project.repository).pathname.replace(/^\//, '').replace(/\.git$/, ''); return p.length > 28 ? p.slice(0, 28) + '…' : p; } catch { return project.repository; } })()}
                </span>
              </div>

              {/* Last deploy info */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                  {project.lastDeployment
                    ? `Last deployed ${(() => { const d = Date.now() - new Date(project.lastDeployment).getTime(); const m = Math.floor(d/60000); const h = Math.floor(m/60); const days = Math.floor(h/24); return days > 0 ? `${days}d ago` : h > 0 ? `${h}h ago` : m > 1 ? `${m}m ago` : 'just now'; })()}`
                    : 'Never deployed'}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Code className="h-3 w-3 flex-shrink-0"/>
                  <span>{project.branch}</span>
                  <span className="ml-auto text-indigo-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Manage <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        );
      })()}
      </div>

  );
}
