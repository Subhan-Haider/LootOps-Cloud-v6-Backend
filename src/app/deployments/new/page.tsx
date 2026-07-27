"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ArrowLeft, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateProjectPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [newProject, setNewProject] = useState({ 
    name: "", repository: "", branch: "main", framework: "auto", domains: [] as string[],
    rootDir: "", installCmd: "", buildCmd: "", startCmd: "", envVars: "", rawContent: "", database: "none"
  });
  const [customRepoUrl, setCustomRepoUrl] = useState("");
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [githubBranches, setGithubBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadProjects();
    checkGithubConnection();
  }, []);

  const checkGithubConnection = async () => {
    try {
      const { connected } = await api.github.checkConnection();
      setGithubConnected(connected);
      if (connected) {
        const { repos } = await api.github.getRepos();
        setGithubRepos(repos || []);
      }
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
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedEnv: Record<string, string> = {};
      if (newProject.envVars) {
        newProject.envVars.split("\n").forEach(line => {
          const [k, ...v] = line.split("=");
          if (k && v.length) parsedEnv[k.trim()] = v.join("=").trim();
        });
      }
      const generatedDomain = newProject.name ? `${newProject.name.toLowerCase().replace(/[^a-z0-9-]/g, '')}.subhan.tech` : '';
      const isDomainAvailable = generatedDomain ? !projects.some(p => p.domain === generatedDomain) : true;

      let finalRepo = newProject.repository;
      if (finalRepo === "custom") finalRepo = customRepoUrl;
      const res = await api.deployments.createProject({
        ...newProject,
        domains: isDomainAvailable && generatedDomain ? [generatedDomain] : [],
        repository: finalRepo,
        env: parsedEnv
      });
      if (res.project) {
        router.push(`/deployments/${res.project.id}`);
      }
    } catch (err) {
      alert("Failed to create project");
    }
  };

  const generatedDomain = newProject.name ? `${newProject.name.toLowerCase().replace(/[^a-z0-9-]/g, '')}.subhan.tech` : '';
  const isDomainAvailable = generatedDomain ? !projects.some(p => p.domain === generatedDomain) : true;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/deployments" 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deployments
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Project</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Deploy an app from a public or private Git repository.</p>
          </div>

          <form onSubmit={handleCreate} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
              <input 
                required
                type="text" 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                placeholder="my-awesome-app"
                value={newProject.name}
                onChange={e => setNewProject({...newProject, name: e.target.value})}
              />
              {generatedDomain && (
                <p className={`text-sm mt-2 flex items-center gap-1.5 font-medium ${isDomainAvailable ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isDomainAvailable ? (
                    <>✓ <span className="font-mono">{generatedDomain}</span> is available</>
                  ) : (
                    <>✕ <span className="font-mono">{generatedDomain}</span> is already taken</>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Git Repository URL</label>
              <select 
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none transition-all"
                value={newProject.repository}
                onChange={async (e) => {
                  const repoUrl = e.target.value;
                  const repo = githubRepos.find(r => r.clone_url === repoUrl);
                  setNewProject({ 
                    ...newProject, 
                    repository: repoUrl, 
                    name: newProject.name || (repo ? repo.name : ""), 
                    branch: repo ? repo.default_branch : "main" 
                  });
                  
                  if (repo) {
                    setLoadingBranches(true);
                    try {
                      const { branches } = await api.github.getBranches(repo.full_name);
                      setGithubBranches(branches || []);
                      
                      // Auto-Scan Repo for framework and commands
                      try {
                        const { scanResult } = await api.github.scanRepo(repo.full_name, repo.default_branch, "");
                        if (scanResult) {
                          setNewProject(prev => ({
                            ...prev,
                            framework: scanResult.framework,
                            installCmd: scanResult.installCmd || prev.installCmd,
                            buildCmd: scanResult.buildCmd || prev.buildCmd,
                            startCmd: scanResult.startCmd || prev.startCmd
                          }));
                        }
                      } catch (scanErr) {
                        console.log("Auto-scan failed", scanErr);
                      }

                    } catch (err) {
                      console.error("Failed to fetch branches", err);
                      setGithubBranches([]);
                    } finally {
                      setLoadingBranches(false);
                    }
                  } else {
                    setGithubBranches([]);
                  }
                }}
              >
                <option value="" disabled>Select a repository...</option>
                {githubRepos.map(repo => (
                  <option key={repo.id} value={repo.clone_url}>
                    {repo.full_name} {repo.private ? "🔒" : ""}
                  </option>
                ))}
                <option value="custom">🌐 Enter custom Git URL...</option>
                <option value="raw">📄 Paste HTML Code / Static Site</option>
              </select>

              {newProject.repository === "custom" && (
                <div className="mt-3">
                  <input 
                    type="text" 
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                    placeholder="https://github.com/user/repo.git"
                    value={customRepoUrl}
                    onChange={async e => {
                      const url = e.target.value;
                      setCustomRepoUrl(url);
                      try {
                        const parsed = new URL(url);
                        if (parsed.hostname.includes("github.com") || parsed.hostname.includes("gitlab.com")) {
                          const parts = parsed.pathname.split('/').filter(Boolean);
                          if (parts.length >= 2) {
                            let repoName = parts[1];
                            if (repoName.endsWith(".git")) repoName = repoName.slice(0, -4);
                            
                            const updates: any = {};
                            if (!newProject.name) updates.name = repoName;

                            let extractedBranch = "main";
                            let extractedRootDir = "";

                            if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
                              updates.branch = parts[3];
                              extractedBranch = parts[3];
                              const dirParts = parts.slice(4);
                              if (dirParts.length > 0 && dirParts[dirParts.length - 1].includes(".")) {
                                dirParts.pop();
                              }
                              if (dirParts.length > 0) {
                                updates.rootDir = "./" + decodeURIComponent(dirParts.join("/"));
                                extractedRootDir = updates.rootDir;
                              } else {
                                updates.rootDir = "./";
                                extractedRootDir = "./";
                              }
                            }
                            
                            setNewProject(prev => ({ ...prev, ...updates }));

                            if (url.length > 20) {
                              setLoadingBranches(true);
                              try {
                                const repoFullName = `${parts[0]}/${repoName}`;
                                const { scanResult } = await api.github.scanRepo(repoFullName, extractedBranch, extractedRootDir);
                                if (scanResult) {
                                  setNewProject(prev => ({
                                    ...prev,
                                    framework: scanResult.framework,
                                    installCmd: scanResult.installCmd || prev.installCmd,
                                    buildCmd: scanResult.buildCmd || prev.buildCmd,
                                    startCmd: scanResult.startCmd || prev.startCmd
                                  }));
                                }
                              } catch (e) {
                                console.log("Scan failed", e);
                              } finally {
                                setLoadingBranches(false);
                              }
                            }
                          }
                        }
                      } catch(err) {}
                    }}
                  />
                </div>
              )}

              {newProject.repository === "raw" && (
                <div className="mt-3">
                  <textarea 
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-mono text-sm transition-all h-64"
                    placeholder="<!DOCTYPE html>\n<html>\n<head><title>My Site</title></head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>"
                    value={newProject.rawContent}
                    onChange={e => setNewProject({...newProject, rawContent: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-2">Paste your HTML, CSS, or JS code here. It will be served as index.html.</p>
                </div>
              )}
            </div>

            <div className={`grid grid-cols-1 ${newProject.repository === "raw" ? '' : 'md:grid-cols-2'} gap-6`}>
              {newProject.repository !== "raw" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    Branch {loadingBranches && <span className="text-xs text-indigo-500 ml-2 animate-pulse">Scanning Repo...</span>}
                  </label>
                  {githubBranches.length > 0 ? (
                    <select
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white appearance-none transition-all"
                      value={newProject.branch}
                      onChange={e => setNewProject({...newProject, branch: e.target.value})}
                    >
                      {githubBranches.map(b => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      required
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                      placeholder="main"
                      value={newProject.branch}
                      onChange={e => setNewProject({...newProject, branch: e.target.value})}
                    />
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Domain (Optional)</label>
                <input 
                  type="text" 
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                  placeholder="app.subhan.tech"
                  value={newProject.domains[0] || ""}
                  onChange={e => setNewProject({...newProject, domains: e.target.value ? [e.target.value] : []})}
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 focus:outline-none flex items-center gap-2"
              >
                {showAdvanced ? (
                  <>
                    <span>Hide Advanced Settings</span>
                  </>
                ) : (
                  <>
                    <span>Show Advanced Settings</span>
                  </>
                )}
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-4 duration-300">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Framework / Runtime</label>
                  <select 
                    id="framework" 
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all [&>option]:bg-white dark:[&>option]:bg-gray-800"
                    value={newProject.framework}
                    onChange={e => setNewProject({...newProject, framework: e.target.value})}
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="node">Node.js (Generic)</option>
                    <option value="nextjs">Next.js</option>
                    <option value="react">React</option>
                    <option value="vue">Vue</option>
                    <option value="vite">Vite</option>
                    <option value="express">Express</option>
                    <option value="astro">Astro</option>
                    <option value="static">Static Site (HTML/JS/CSS)</option>
                    <option value="python">Python Backend</option>
                    <option value="docker">Docker Container</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Root Directory</label>
                  <input 
                    type="text" 
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                    placeholder="./ (Optional)"
                    value={newProject.rootDir}
                    onChange={e => setNewProject({...newProject, rootDir: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Install Command</label>
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                      placeholder="npm install (Default)"
                      value={newProject.installCmd}
                      onChange={e => setNewProject({...newProject, installCmd: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Build Command</label>
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                      placeholder="npm run build (Default)"
                      value={newProject.buildCmd}
                      onChange={e => setNewProject({...newProject, buildCmd: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Command</label>
                    <input 
                      type="text" 
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                      placeholder="npm start (Default)"
                      value={newProject.startCmd}
                      onChange={e => setNewProject({...newProject, startCmd: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Database Provisioning</label>
                  <select 
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all [&>option]:bg-white dark:[&>option]:bg-gray-800"
                    value={(newProject as any).database || "none"}
                    onChange={e => setNewProject({...newProject, database: e.target.value})}
                  >
                    <option value="none">None</option>
                    <option value="postgres">PostgreSQL Container</option>
                    <option value="sqlite">SQLite Database (Local)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">Automatically provisions a database and injects DATABASE_URL into your application's environment.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment Variables</label>
                  <textarea 
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white font-mono text-sm transition-all"
                    placeholder={"API_KEY=your_key_here\nDATABASE_URL=postgres://..."}
                    rows={4}
                    value={newProject.envVars}
                    onChange={e => setNewProject({...newProject, envVars: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-2">One per line, in KEY=VALUE format</p>
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-4">
              <Link 
                href="/deployments"
                className="w-full sm:w-auto text-center px-6 py-3 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancel
              </Link>
              <button 
                type="submit"
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-medium transition-colors shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                Deploy Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
