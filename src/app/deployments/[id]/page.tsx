"use client";

import React, { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { ArrowLeft, Play, Square, Settings, RefreshCw, Terminal, Globe, HardDrive, GitFork, ExternalLink, GitBranch, GitCommit, PlusCircle, Eye, EyeOff, Copy, Trash2, CheckCircle2, Download, ClipboardList, Zap, Shield, Clock, GitPullRequest, ToggleLeft, ToggleRight, Key, AlertCircle, MessageSquare, Sparkles, Folder, File, Save, Code2, LineChart as LineChartIcon, Activity, Database } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [tunnelCname, setTunnelCname] = useState("tunnel.lootops.me");
  const [revealedEnv, setRevealedEnv] = useState<Record<string, boolean>>({});
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [cicd, setCicd] = useState<{ autoDeploy: boolean; discordNotify: boolean; webhookSecret: boolean; deploymentHistory: any[] } | null>(null);
  const [webhookSecretInput, setWebhookSecretInput] = useState("");
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [cicdSaving, setCicdSaving] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [setupWebhookLoading, setSetupWebhookLoading] = useState(false);
  const [setupWebhookResult, setSetupWebhookResult] = useState<{ok: boolean; msg: string} | null>(null);
  const [codeContent, setCodeContent] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [aiFixing, setAiFixing] = useState(false);

  // Web IDE State
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>("");
  const [ideLoading, setIdeLoading] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [committingFile, setCommittingFile] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [uptimeData, setUptimeData] = useState<any[]>([]);
  const [previews, setPreviews] = useState<any[]>([]);
  const [formsData, setFormsData] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [metrics, setMetrics] = useState<{cpu: string; ram: string} | null>(null);
  const [isRawEnv, setIsRawEnv] = useState(false);
  const [rawEnvText, setRawEnvText] = useState("");

  const loadFileTree = async () => {
    try {
      const files = await api.deployments.getFiles(id);
      setFileTree(files || []);
    } catch (err) {}
  };

  const loadAnalytics = async () => {
    try {
      const stats = await api.deployments.getAnalytics(id);
      setAnalytics(stats);
    } catch (err) {}
  };

  const loadUptime = async () => {
    try {
      const data = await api.deployments.getUptime(id);
      setUptimeData(data);
    } catch (err) {}
  };

  const openFile = async (path: string) => {
    try {
      setIdeLoading(true);
      const content = await api.deployments.getFile(id, path);
      setActiveFileContent(content);
      setActiveFile(path);
    } catch (err) {
      alert("Failed to load file");
    } finally {
      setIdeLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!activeFile || !project) return;
    try {
      setSavingFile(true);
      await api.deployments.saveFile(id, activeFile, activeFileContent);
      alert("File saved successfully!");
      // Optionally trigger redeploy if they want it applied
    } catch(err: any) {
      alert(err.response?.data?.error || "Failed to save file");
    } finally {
      setSavingFile(false);
    }
  };

  const handleCommitFile = async () => {
    if (!activeFile || !project || !commitMessage) return;
    try {
      setCommittingFile(true);
      await api.deployments.commitFile(id, activeFile, activeFileContent, commitMessage);
      alert("File committed and pushed successfully!");
      setShowCommitModal(false);
      setCommitMessage("");
      loadProject(); // Refresh to see the new commit in the UI
    } catch(err: any) {
      alert(err.response?.data?.error || "Failed to commit file");
    } finally {
      setCommittingFile(false);
    }
  };

  const handleCopyCode = () => {
    if (activeFileContent) {
      navigator.clipboard.writeText(activeFileContent);
      alert("Code copied to clipboard!");
    }
  };

  const handleDownloadFile = () => {
    if (activeFile && activeFileContent) {
      const blob = new Blob([activeFileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.split('/').pop() || 'file.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadFormTemplate = () => {
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contact Us</title>
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --primary-accent: #2563eb;
      --primary-hover: #1d4ed8;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --input-bg: #f8fafc;
      --input-border: #cbd5e1;
      --radius: 12px;
      --transition: all 0.25s ease-in-out;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-gradient); padding: 20px; color: var(--text-main); }
    .form-card { width: 100%; max-width: 480px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 40px 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .form-header { margin-bottom: 28px; }
    .form-header h2 { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; }
    .form-header p { color: var(--text-muted); font-size: 0.95rem; }
    .form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.875rem; font-weight: 600; }
    input[type="text"], input[type="email"], textarea { width: 100%; padding: 12px 16px; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 8px; font-size: 0.95rem; outline: none; transition: var(--transition); }
    input:focus, textarea:focus { border-color: var(--primary-accent); background: #ffffff; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
    textarea { resize: vertical; min-height: 120px; }
    .submit-btn { width: 100%; padding: 14px; background: var(--primary-accent); color: #ffffff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: var(--transition); margin-top: 8px; }
    .submit-btn:hover { background: var(--primary-hover); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    #formStatus { margin-top: 16px; font-size: 0.9rem; text-align: center; border-radius: 6px; padding: 10px; display: none; }
    #formStatus.success { display: block; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    #formStatus.error { display: block; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    #formStatus.loading { display: block; background: #f1f5f9; color: var(--text-muted); border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="form-card">
    <div class="form-header">
      <h2>Get in Touch</h2>
      <p>Send us a message and we'll get back to you shortly.</p>
    </div>
    <form id="contactForm" action="${apiUrl}/api/forms/submit/${project?.id}" method="POST">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" placeholder="John Doe" required />
      </div>
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="john@example.com" required />
      </div>
      <div class="form-group">
        <label for="message">Message</label>
        <textarea id="message" name="message" placeholder="How can we help you?"></textarea>
      </div>
      <button type="submit" class="submit-btn">Send Message</button>
    </form>
    <div id="formStatus"></div>
  </div>
  <script>
    document.getElementById('contactForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      const form = event.target;
      const statusDiv = document.getElementById('formStatus');
      const submitBtn = form.querySelector('button[type="submit"]');

      statusDiv.className = 'loading';
      statusDiv.textContent = 'Sending message...';
      submitBtn.disabled = true;

      try {
        const response = await fetch(form.action, {
          method: form.method,
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });

        if (response.ok) {
          statusDiv.className = 'success';
          statusDiv.textContent = 'Thank you! Your message has been received.';
          form.reset();
        } else {
          statusDiv.className = 'error';
          statusDiv.textContent = 'Submission failed (' + response.status + '). Please try again.';
        }
      } catch (error) {
        statusDiv.className = 'error';
        statusDiv.textContent = 'Network error. Please check your connection.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`;
    const blob = new Blob([template], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact-form.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiUrl(window.location.origin);
    }
    loadProject();
    const setupLogs = async () => {
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : "";
      const evtSource = new EventSource(`/api/deployments/logs/${id}?token=${token}`);
      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLogs(data.logs);
          // Auto scroll
          setTimeout(() => {
            if (logsEndRef.current) {
              logsEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
          }, 100);
        } catch (e) {}
      };
      return evtSource;
    };
    
    let source: EventSource | null = null;
    setupLogs().then(s => source = s);

    let pollInterval: any;
    if (project?.status === 'building') {
      pollInterval = setInterval(() => {
        loadProject();
      }, 3000);
    }

    let metricsInterval: any;
    if (project?.status === 'running') {
      const fetchMetrics = async () => {
        try {
          const data = await api.deployments.getMetrics(id);
          if (data) setMetrics(data);
        } catch(e) {}
      };
      fetchMetrics();
      metricsInterval = setInterval(fetchMetrics, 5000);
    }

    return () => {
      if (source) source.close();
      if (pollInterval) clearInterval(pollInterval);
      if (metricsInterval) clearInterval(metricsInterval);
    };
  }, [id, project?.status]);

  useEffect(() => {
    loadCicd();
    loadFileTree();
  }, [id]);

  const loadCicd = async () => {
    try {
      const data = await api.deployments.getWebhookStatus(id);
      setCicd(data);
    } catch(e) {}
  };

  const refreshForms = async () => {
    try {
      const fData = await api.deployments.getForms(id);
      setFormsData(Array.isArray(fData) ? fData : []);
    } catch (e) {
      console.error('[Forms] Failed to load form submissions:', e);
    }
  };

  const loadProject = async () => {
    try {
      const data = await api.deployments.get(id);
      setProject(data);
      
      // Load previews if it's a main project
      if (!data.isPreview) {
        const previewData = await api.deployments.getPreviews(id);
        setPreviews(previewData);
      }
      // Load forms data independently so errors don't swallow the result
      await refreshForms();
      
      try {
        const cname = await api.deployments.getTunnelCname();
        if (cname) setTunnelCname(cname);
      } catch (e) {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Automatically update input fields if backend auto-detected values (like Root Directory)
  useEffect(() => {
    if (project) {
      const updateField = (id: string, value: string) => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el && !el.value && value) {
          el.value = value;
        }
      };
      updateField("updateBranch", project.branch);
      updateField("updateFramework", project.framework);
      updateField("updateRootDir", project.rootDir);
      updateField("updateInstallCmd", project.installCmd);
      updateField("updateBuildCmd", project.buildCmd);
      updateField("updateStartCmd", project.startCmd);
    }
  }, [project?.branch, project?.framework, project?.rootDir, project?.installCmd, project?.buildCmd, project?.startCmd]);

  const triggerDeploy = async () => {
    try {
      await api.deployments.triggerDeploy(id);
      loadProject();
      setActiveTab("logs");
    } catch (err) {
      alert("Failed to deploy");
    }
  };

  const stopProject = async () => {
    try {
      await api.deployments.stopDeploy(id);
      loadProject();
    } catch(err) {
      alert("Failed to stop");
    }
  };

  const togglePreviewDeployments = async () => {
    if (!project) return;
    try {
      await api.deployments.updatePreviewSettings(id, !project.previewDeploymentsEnabled);
      loadProject();
    } catch(err: any) {
      alert("Failed to update settings");
    }
  };

  const triggerAiFix = async () => {
    setAiFixing(true);
    try {
      const res = await api.deployments.autoFix(id, logs);
      if (res.fix) {
        alert(`✨ AI Fix Applied Successfully!\n\nExplanation: ${res.fix.explanation}\nModified File: ${res.fix.fileToModify}\n\nThe project is now automatically redeploying with the fix.`);
        loadProject();
      }
    } catch(err: any) {
      alert(err.response?.data?.error || err.message || "Failed to generate AI fix.");
    } finally {
      setAiFixing(false);
    }
  };

  const triggerRollback = async () => {
    if (confirm("Are you sure you want to rollback to the previous version?")) {
      try {
        await api.deployments.rollback(id);
        loadProject();
        setActiveTab("logs");
      } catch(err: any) {
        alert(err.response?.data?.error || "Failed to rollback");
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!project) return <div className="p-8 text-center text-red-500">Project not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-8 pt-8">
          <Link href="/deployments" className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Deployments
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-3">
                {project.name}
                {project.isPreview && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                    Preview Branch
                  </span>
                )}
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  project.status === 'running' ? 'bg-emerald-100 text-emerald-700' :
                  project.status === 'building' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.status.toUpperCase()}
                </span>
                {project.status === 'running' && (
                  <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 ${
                    project.isOnline !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${project.isOnline !== false ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    {project.isOnline !== false ? 'ONLINE' : 'OFFLINE'}
                  </span>
                )}
              </h1>
              <a href={project.repository} target="_blank" className="mt-2 text-sm text-gray-500 hover:underline inline-flex items-center gap-1 break-all">
                {project.repository} • {project.branch}
              </a>
              {project.isPreview && project.parentProjectId && (
                <div className="mt-1">
                  <Link href={`/deployments/${project.parentProjectId}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Return to Main Project
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button onClick={triggerDeploy} className="flex-1 md:flex-none justify-center items-center flex gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 md:py-2 rounded-xl font-medium shadow-sm">
                <Play className="h-4 w-4" /> Deploy
              </button>
              <button onClick={triggerRollback} className="flex-1 md:flex-none justify-center items-center flex gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-3 md:py-2 rounded-xl font-medium">
                <RefreshCw className="h-4 w-4" /> Rollback
              </button>
              <button onClick={stopProject} className="flex-1 md:flex-none justify-center items-center flex gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-3 md:py-2 rounded-xl font-medium">
                <Square className="h-4 w-4" /> Stop
              </button>
            </div>
          </div>

          <div className="flex gap-6 mt-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {['overview', 'code', 'environment', 'ci/cd', 'logs', 'analytics', 'uptime', 'forms', 'settings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-2 text-sm font-medium border-b-2 capitalize transition-colors ${
                  activeTab === tab ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'code' ? 'Code (Web IDE)' : tab === 'ci/cd' ? 'CI/CD' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="font-semibold text-gray-900 dark:text-white">Production Deployment</h3>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  <a 
                    href={project.repository} 
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <GitFork className="h-4 w-4" /> Repository
                  </a>
                  <button 
                    onClick={triggerRollback}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" /> Instant Rollback
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row">
                {/* Left Side: Preview Image Placeholder */}
                <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 p-6 bg-gray-50/30 dark:bg-gray-800/30 flex flex-col items-center justify-center min-h-[300px]">
                  {project.status === 'running' && project.domains?.length > 0 ? (
                      <iframe 
                        src={`https://${project.domains[0]}`} 
                        className="w-full h-full min-h-[250px] rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                        style={{ transform: "scale(0.9)", transformOrigin: "center" }}
                      />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                      <Globe className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-sm font-medium">Preview not available</p>
                    </div>
                  )}
                </div>

                {/* Right Side: Details */}
                <div className="w-full md:w-3/5 p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Deployment</h4>
                    {project.domains?.length > 0 ? (
                      <a href={`https://${project.domains[0]}`} target="_blank" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5 text-lg">
                        {project.domains[0]} <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">No domains assigned</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                      Domains <button onClick={() => setActiveTab('settings')}><PlusCircle className="h-4 w-4 text-gray-400 hover:text-indigo-500 cursor-pointer" /></button>
                    </h4>
                    {project.domains?.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-900 dark:text-white">
                        {project.domains.map((domain: string) => (
                          <a key={domain} href={`https://${domain}`} target="_blank" className="hover:underline bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{domain}</a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-8 sm:gap-16">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h4>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                        <span className="relative flex h-2.5 w-2.5">
                          {project.status === 'running' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                          {project.status === 'building' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            project.status === 'running' ? 'bg-emerald-500' :
                            project.status === 'building' ? 'bg-amber-500' :
                            project.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                          }`}></span>
                        </span>
                        <span className="capitalize">{project.status === 'running' ? 'Ready' : project.status}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created</h4>
                      <div className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        {project.lastDeployment ? new Date(project.lastDeployment).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Never'}
                      </div>
                    </div>

                    {project.deploymentHistory && project.deploymentHistory.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Source</h4>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
                            <GitBranch className="h-4 w-4 text-gray-500" />
                            <span className="font-mono">{project.branch}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white mt-0.5">
                            <GitCommit className="h-4 w-4 text-gray-500 shrink-0" />
                            <span className="font-mono text-gray-500 shrink-0 mr-1">
                              {project.deploymentHistory[0].commitHash ? project.deploymentHistory[0].commitHash.substring(0, 7) : 'manual'}
                            </span>
                            <span className="truncate max-w-[250px] text-gray-500 italic" title={project.deploymentHistory[0].commitMessage || project.deploymentHistory[0].commit || "No commit message"}>
                              {project.deploymentHistory[0].commitMessage || project.deploymentHistory[0].commit || "No commit message"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {metrics && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Live Resources</h4>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
                            <Activity className="h-4 w-4 text-emerald-500" />
                            <span>CPU: {metrics.cpu}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white mt-0.5">
                            <HardDrive className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span>RAM: {metrics.ram}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!project.isPreview && previews.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-purple-500" />
                    Active Preview Deployments
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {previews.map((preview: any) => (
                    <div key={preview.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          preview.status === 'running' ? 'bg-green-500' :
                          preview.status === 'building' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <Link href={`/deployments/${preview.id}`} className="font-medium text-indigo-600 hover:underline flex items-center gap-2">
                            {preview.branch}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <div className="text-xs text-gray-500 mt-0.5">Updated {new Date(preview.updatedAt).toLocaleString()}</div>
                        </div>
                      </div>
                      {preview.port && preview.status === 'running' && (
                        <a 
                          href={project.customBaseUrl ? `http://${project.customBaseUrl}:${preview.port}` : `http://localhost:${preview.port}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Visit
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row h-[700px]">
            {/* Sidebar File Explorer */}
            <div className="w-full md:w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-[#252526]">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-[#252526]">
                <h3 className="font-semibold text-gray-800 dark:text-gray-300 text-xs uppercase tracking-wider">Explorer</h3>
                <button onClick={loadFileTree} className="text-gray-500 hover:text-indigo-500 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {fileTree.length === 0 ? (
                  <div className="text-center py-8 px-4 text-xs text-gray-500">
                    No files found or project not deployed yet.
                  </div>
                ) : (
                  <div className="text-sm">
                    {(() => {
                      const renderTree = (nodes: any[], depth = 0) => {
                        return nodes.map((node) => (
                          <div key={node.path}>
                            <div 
                              className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-sm hover:bg-gray-200 dark:hover:bg-[#2a2d2e] transition-colors ${activeFile === node.path ? 'bg-indigo-100 dark:bg-[#37373d] text-indigo-700 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                              style={{ paddingLeft: `${depth * 1 + 0.75}rem` }}
                              onClick={() => node.type === 'file' && openFile(node.path)}
                            >
                              {node.type === 'directory' ? (
                                <Folder className="h-4 w-4 text-amber-500 opacity-80" />
                              ) : (
                                <File className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="truncate">{node.name}</span>
                            </div>
                            {node.children && renderTree(node.children, depth + 1)}
                          </div>
                        ));
                      };
                      return renderTree(fileTree);
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1e1e1e]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#2d2d2d]">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
                  <Code2 className="h-4 w-4 text-indigo-500" />
                  {activeFile ? activeFile : 'No file selected'}
                  {ideLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin ml-2 text-gray-400" />}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleCopyCode}
                    className="flex items-center gap-2 bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#3d3d3d] text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    title="Copy to Clipboard"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  <button 
                    onClick={handleDownloadFile}
                    className="flex items-center gap-2 bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#3d3d3d] text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    title="Download File"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                  <button 
                    onClick={handleSaveFile}
                    disabled={savingFile}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Save className="h-4 w-4" />
                    {savingFile ? 'Saving...' : 'Save File'}
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setShowCommitModal(!showCommitModal)}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      <GitCommit className="h-4 w-4" />
                      Commit & Push
                    </button>
                    {showCommitModal && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-50">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Commit to GitHub</h4>
                        <input 
                          type="text" 
                          placeholder="Commit message..." 
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 mb-3 text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => setShowCommitModal(false)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleCommitFile}
                            disabled={!commitMessage || committingFile}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                          >
                            {committingFile ? 'Pushing...' : 'Push'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {project.repository === 'raw' && (
                    <button
                      disabled={savingFile}
                      onClick={async () => {
                        try {
                          await api.deployments.triggerDeploy(id);
                          loadProject();
                          setActiveTab("logs");
                        } catch (err) {
                          alert("Failed to redeploy");
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      Redeploy
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 p-0 relative">
                {!activeFile ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                    <Code2 className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select a file from the explorer to view or edit</p>
                  </div>
                ) : activeFile && ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].some(ext => activeFile.toLowerCase().endsWith(ext)) ? (
                  <div className="absolute inset-0 flex items-center justify-center p-8 bg-gray-100 dark:bg-[#151515]">
                    <img 
                      src={`data:image/${activeFile.split('.').pop() === 'jpg' ? 'jpeg' : activeFile.split('.').pop()};base64,${activeFileContent}`} 
                      className="max-w-full max-h-full object-contain drop-shadow-lg" 
                      alt={activeFile} 
                    />
                  </div>
                ) : (
                  <textarea
                    value={activeFileContent}
                    onChange={e => setActiveFileContent(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full p-4 font-mono text-sm bg-transparent text-gray-800 dark:text-[#d4d4d4] resize-none outline-none leading-relaxed whitespace-pre"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Custom Server Requirements</p>
                <p>If your framework uses a custom server script (like <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">server.ts</code> or <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">server.cjs</code>), you <strong>must</strong> configure it to listen on <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded font-bold">process.env.PORT</code>. If you use a hardcoded port like 3000, your app will crash with a 502 Bad Gateway error. The Cloud-Backend auto-patcher will attempt to intercept and fix hardcoded ports dynamically to prevent this.</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-800">
              <div className="bg-gray-50 dark:bg-[#2d2d2d] px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Live Build & Runtime Logs</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={triggerAiFix}
                  disabled={aiFixing || !logs}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 font-medium shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiFixing ? "AI is analyzing..." : "Auto-Fix with AI"}
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(logs || "");
                    setCopiedLogs(true);
                    setTimeout(() => setCopiedLogs(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {copiedLogs ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedLogs ? <span className="text-emerald-500">Copied</span> : <span>Copy</span>}
                </button>
              </div>
            </div>
            <div className="p-6 text-sm font-mono overflow-auto h-[600px] whitespace-pre-wrap bg-white dark:bg-[#1e1e1e]">
              {logs ? (
                logs.split('\n').map((line, i) => {
                  let cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
                  
                  let dateHtml = null;
                  const dateMatch = cleanLine.match(/^(\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\])\s*/);
                  if (dateMatch) {
                    dateHtml = <span className="text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0">{dateMatch[1]}</span>;
                    cleanLine = cleanLine.substring(dateMatch[0].length);
                  }

                  let tagHtml = null;
                  const tagMatch = cleanLine.match(/^(\[INFO\]|\[WARN\]|\[ERROR\]|\[CMD\]|\[SUCCESS\]|\[PM2\]|\[CLOUD-BACKEND WARNING\])\s*/);
                  if (tagMatch) {
                    const tag = tagMatch[1];
                    let tagColor = "text-gray-500";
                    if (tag === '[INFO]') tagColor = "text-blue-500 font-bold dark:text-blue-400";
                    if (tag.includes('WARN')) tagColor = "text-amber-500 font-bold dark:text-amber-400";
                    if (tag === '[ERROR]') tagColor = "text-red-500 font-bold dark:text-red-400";
                    if (tag === '[SUCCESS]') tagColor = "text-emerald-500 font-bold dark:text-emerald-400";
                    if (tag === '[CMD]') tagColor = "text-purple-500 font-bold dark:text-purple-400";
                    if (tag === '[PM2]') tagColor = "text-cyan-500 font-bold dark:text-cyan-400";
                    
                    tagHtml = <span className={`${tagColor} mr-2 flex-shrink-0`}>{tag}</span>;
                    cleanLine = cleanLine.substring(tagMatch[0].length);
                  }

                  let textColor = "text-gray-800 dark:text-gray-300";
                  if (tagMatch && tagMatch[1] === '[ERROR]') textColor = "text-red-600 dark:text-red-400 font-medium";
                  if (tagMatch && tagMatch[1].includes('WARN')) textColor = "text-amber-600 dark:text-amber-400";
                  if (cleanLine.includes('ERR!') || cleanLine.includes('Error:')) textColor = "text-red-600 dark:text-red-400 font-medium";
                  if (cleanLine.includes('npm warn')) textColor = "text-amber-600 dark:text-amber-400";
                  if (cleanLine.startsWith('> ')) textColor = "text-gray-500 dark:text-gray-400 italic";
                  if (cleanLine.includes('✓') || cleanLine.includes('Done in')) textColor = "text-emerald-600 dark:text-emerald-400";
                  if (cleanLine.includes('http://') || cleanLine.includes('https://')) textColor = "text-blue-600 dark:text-blue-400 underline";

                  return (
                    <div key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 py-0.5 rounded flex items-start">
                      {dateHtml}
                      {tagHtml}
                      <span className={`${textColor} break-all`}>{cleanLine}</span>
                    </div>
                  );
                })
              ) : project?.status === 'building' 
                  ? <span className="animate-pulse text-amber-500">⏳ Deployment in progress, waiting for logs...</span>
                  : <span className="text-gray-500">No logs available yet. Deploy the project to generate logs.</span>}
              <div ref={logsEndRef} />
            </div>
          </div>
          </div>
        )}

        {activeTab === 'environment' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Environment Variables</h2>
                  <p className="text-sm text-gray-500 mt-1">Provide environment variables to your build and runtime environments.</p>
                </div>
                {Object.keys(project.env || {}).length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const envContent = Object.entries(project.env).map(([k, v]) => `${k}=${v}`).join('\n');
                        navigator.clipboard.writeText(envContent);
                        alert("Copied to clipboard!");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                    >
                      <Copy className="h-4 w-4" /> Copy All
                    </button>
                    <button 
                      onClick={() => {
                        const envContent = Object.entries(project.env).map(([k, v]) => `${k}=${v}`).join('\n');
                        const blob = new Blob([envContent], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = '.env';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                    <button 
                      onClick={() => {
                        setIsRawEnv(!isRawEnv);
                        if (!isRawEnv) {
                          setRawEnvText(Object.entries(project.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'));
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                    >
                      <File className="h-4 w-4" /> {isRawEnv ? 'UI Editor' : 'Raw Editor'}
                    </button>
                  </div>
                )}
              </div>
              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50">
                {isRawEnv ? (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Raw .env Text</label>
                    <textarea 
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white min-h-[200px]"
                      value={rawEnvText}
                      onChange={e => setRawEnvText(e.target.value)}
                      placeholder="KEY=VALUE"
                      spellCheck={false}
                    />
                    <div className="flex justify-end">
                      <button onClick={async () => {
                        const lines = rawEnvText.split('\n');
                        let newEnv: Record<string, string> = {};
                        for (const line of lines) {
                          const trimmed = line.trim();
                          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                            const eqIdx = trimmed.indexOf('=');
                            const k = trimmed.substring(0, eqIdx).trim();
                            let v = trimmed.substring(eqIdx + 1).trim();
                            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                              v = v.substring(1, v.length - 1);
                            }
                            if (k) newEnv[k] = v;
                          }
                        }
                        await api.deployments.updateEnv(id, newEnv);
                        loadProject();
                        alert("Raw environment saved successfully!");
                      }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors">
                        Save Raw .env
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                        Key <span className="text-xs text-gray-400 font-normal border border-gray-200 dark:border-gray-700 px-1.5 rounded bg-white dark:bg-gray-900">Smart Paste supported</span>
                      </label>
                      <input 
                        type="text" 
                        id="envKey" 
                        placeholder="EXAMPLE_NAME (or paste multiple KEY=VALUE lines here)" 
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white placeholder:font-sans"
                        onPaste={async (e) => {
                          const pasted = e.clipboardData.getData('text');
                          if (pasted.includes('=')) {
                            e.preventDefault();
                            const lines = pasted.split('\n');
                            let newEnv = { ...project.env };
                            let count = 0;
                            for (const line of lines) {
                              const trimmed = line.trim();
                              if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                                const eqIdx = trimmed.indexOf('=');
                                const k = trimmed.substring(0, eqIdx).trim();
                                let v = trimmed.substring(eqIdx + 1).trim();
                                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                                  v = v.substring(1, v.length - 1);
                                }
                                if (k) { newEnv[k] = v; count++; }
                              }
                            }
                            if (count > 0) {
                              await api.deployments.updateEnv(id, newEnv);
                              loadProject();
                              alert(`Smart Paste: Successfully imported ${count} environment variables.`);
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
                      <input type="text" id="envVal" placeholder="V3rc3l!123" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" />
                    </div>
                    <button onClick={async () => {
                      const keyEl = document.getElementById("envKey") as HTMLInputElement;
                      const valEl = document.getElementById("envVal") as HTMLInputElement;
                      if (!keyEl.value || !valEl.value) return;
                      await api.deployments.updateEnv(id, { ...project.env, [keyEl.value]: valEl.value });
                      keyEl.value = "";
                      valEl.value = "";
                      loadProject();
                    }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors w-full md:w-auto">
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>

            {Object.keys(project.env || {}).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 min-w-[500px]">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4 font-medium">Key</th>
                      <th className="px-6 py-4 font-medium">Value</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(project.env || {}).map(([key, val]) => (
                      <tr key={key} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-900 dark:text-white font-medium">{key}</td>
                        <td className="px-6 py-4 font-mono">
                          {revealedEnv[key] ? (val as string) : '••••••••••••••••'}
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          <button 
                            onClick={() => setRevealedEnv(prev => ({...prev, [key]: !prev[key]}))}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                          >
                            {revealedEnv[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={() => navigator.clipboard.writeText(val as string)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              const newEnv = { ...project.env };
                              delete newEnv[key];
                              await api.deployments.updateEnv(id, newEnv);
                              loadProject();
                            }}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ci/cd' && (
          <div className="space-y-6 max-w-4xl">
            {/* Status Banner */}
            <div className={`rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border ${
              cicd?.autoDeploy
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30'
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}>
              <div className={`p-3 rounded-full ${
                cicd?.autoDeploy ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <Zap className={`h-6 w-6 ${ cicd?.autoDeploy ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400' }`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Auto-Deploy is {cicd?.autoDeploy ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {cicd?.autoDeploy
                    ? `Every push to the "${project.branch}" branch will automatically trigger a deployment.`
                    : 'Pushes to GitHub will NOT automatically trigger deployments.'}
                </p>
              </div>
              <button
                onClick={async () => {
                  setCicdSaving(true);
                  try {
                    await api.deployments.updateCicd(id, { autoDeploy: !cicd?.autoDeploy });
                    await loadCicd();
                  } finally { setCicdSaving(false); }
                }}
                disabled={cicdSaving}
                className={`sm:ml-auto w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  cicd?.autoDeploy
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {cicd?.autoDeploy
                  ? <ToggleRight className="h-4 w-4" />
                  : <ToggleLeft className="h-4 w-4" />}
                {cicdSaving ? 'Saving...' : (cicd?.autoDeploy ? 'Disable' : 'Enable')}
              </button>
            </div>

            {/* Discord Notifications Toggle */}
            <div className={`rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border ${
              cicd?.discordNotify
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/30'
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}>
              <div className={`p-3 rounded-full ${
                cicd?.discordNotify ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <MessageSquare className={`h-6 w-6 ${ cicd?.discordNotify ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400' }`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Discord Notifications are {cicd?.discordNotify ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {cicd?.discordNotify
                    ? 'You will receive Discord alerts and emails when automated deployments succeed or fail.'
                    : 'Alerts will be silenced for automated deployments of this project.'}
                </p>
              </div>
              <button
                onClick={async () => {
                  setCicdSaving(true);
                  try {
                    await api.deployments.updateCicd(id, { discordNotify: !cicd?.discordNotify });
                    await loadCicd();
                  } finally { setCicdSaving(false); }
                }}
                disabled={cicdSaving}
                className={`sm:ml-auto w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  cicd?.discordNotify
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {cicd?.discordNotify
                  ? <ToggleRight className="h-4 w-4" />
                  : <ToggleLeft className="h-4 w-4" />}
                {cicdSaving ? 'Saving...' : (cicd?.discordNotify ? 'Disable' : 'Enable')}
              </button>
            </div>

            {/* Deploy Hook URL */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-indigo-500" /> Deploy Hook
                </h2>
                <p className="text-sm text-gray-500 mt-1">POST to this URL from any CI system or GitHub Webhook to trigger a deployment.</p>
              </div>
              <div className="p-6 space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/deployments/webhook?projectId=${id}` : ''}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm text-gray-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/deployments/webhook?projectId=${id}`);
                      setWebhookCopied(true);
                      setTimeout(() => setWebhookCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
                  >
                    {webhookCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {webhookCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    disabled={setupWebhookLoading}
                    onClick={async () => {
                      setSetupWebhookLoading(true);
                      setSetupWebhookResult(null);
                      try {
                        const webhookUrl = `${window.location.origin}/api/deployments/webhook?projectId=${id}`;
                        const res = await api.github.setupWebhook(project.repository, webhookUrl);
                        setSetupWebhookResult({ ok: true, msg: res.message || "Webhook created! GitHub will now auto-deploy on every push." });
                      } catch(err: any) {
                        const msg = err?.response?.data?.error || err?.message || "Unknown error";
                        setSetupWebhookResult({ ok: false, msg });
                      } finally {
                        setSetupWebhookLoading(false);
                      }
                    }}
                    className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm whitespace-nowrap"
                  >
                    <Zap className="h-4 w-4" />
                    {setupWebhookLoading ? 'Setting up...' : 'Auto Setup on GitHub'}
                  </button>
                </div>
                {setupWebhookResult && (
                  <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${
                    setupWebhookResult.ok
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>
                    {setupWebhookResult.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {setupWebhookResult.msg}
                  </div>
                )}
              </div>
            </div>

            {/* Webhook Secret */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-500" /> Webhook Secret
                </h2>
                <p className="text-sm text-gray-500 mt-1">An optional HMAC secret to verify that incoming webhook payloads are genuine.</p>
              </div>
              <div className="p-6 space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3 text-sm">
                  {cicd?.webhookSecret
                    ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-gray-600 dark:text-gray-400">A webhook secret is <strong className="text-emerald-600">configured</strong>. All requests without a valid signature will be rejected.</span></>
                    : <><AlertCircle className="h-4 w-4 text-amber-500" /><span className="text-gray-600 dark:text-gray-400">No webhook secret set. Anyone who knows the URL can trigger a deployment.</span></>}
                </div>
                {!showSecretInput ? (
                  <button
                    onClick={() => setShowSecretInput(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Key className="h-4 w-4" /> {cicd?.webhookSecret ? 'Update Secret' : 'Set Secret'}
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={webhookSecretInput}
                      onChange={e => setWebhookSecretInput(e.target.value)}
                      placeholder="Enter a secure random string..."
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                    <button
                      onClick={async () => {
                        if (!webhookSecretInput) return;
                        setCicdSaving(true);
                        try {
                          await api.deployments.updateCicd(id, { webhookSecret: webhookSecretInput });
                          setWebhookSecretInput("");
                          setShowSecretInput(false);
                          await loadCicd();
                        } finally { setCicdSaving(false); }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
                    >
                      {cicdSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setShowSecretInput(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Deployment History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" /> Deployment History
                </h2>
                <p className="text-sm text-gray-500 mt-1">Last 20 webhook-triggered deployments for this project.</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {(!cicd?.deploymentHistory || cicd.deploymentHistory.length === 0) ? (
                  <div className="p-12 text-center text-gray-400">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">No webhook deployments yet</p>
                    <p className="text-xs mt-1">Setup the GitHub webhook and push some code to see history here.</p>
                  </div>
                ) : (
                  cicd.deploymentHistory.map((entry: any) => (
                    <div key={entry.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <div className={`p-2 rounded-full flex-shrink-0 ${
                        entry.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : entry.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        {entry.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : entry.status === 'failed' ? <AlertCircle className="h-4 w-4 text-red-600" />
                          : <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            entry.triggeredBy === 'github-push'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {entry.triggeredBy === 'github-push' ? '🔀 Git Push' : '🔗 Deploy Hook'}
                          </span>
                          <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                            entry.status === 'success' ? 'text-emerald-700 dark:text-emerald-400'
                            : entry.status === 'failed' ? 'text-red-700 dark:text-red-400'
                            : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                        {entry.commit && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                            💬 {entry.commit}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <LineChartIcon className="h-5 w-5 text-indigo-500" />
                    Visitor Analytics
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Lightweight, privacy-friendly analytics for your deployment.</p>
                </div>
                <button onClick={loadAnalytics} className="text-gray-500 hover:text-indigo-600">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {!analytics ? (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No analytics data recorded yet.</p>
                  <p className="text-sm mt-2">Visits to your deployment will show up here automatically.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Top Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="text-sm font-medium text-gray-500 mb-1">Total Pageviews</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.views.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="text-sm font-medium text-gray-500 mb-1">Unique Visitors</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.uniqueVisitors.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="text-sm font-medium text-gray-500 mb-1">Avg Load Speed</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {analytics.avgLoadTime ? `${(analytics.avgLoadTime / 1000).toFixed(2)}s` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  {analytics.history && analytics.history.length > 0 && (
                    <div className="h-[300px] w-full mt-8">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Traffic over time</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.history}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="date" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                          <YAxis fontSize={12} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                          />
                          <Bar dataKey="views" fill="#6366f1" radius={[4, 4, 0, 0]} name="Pageviews" />
                          <Bar dataKey="unique" fill="#a8a29e" radius={[4, 4, 0, 0]} name="Unique" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Pages</h3>
                      <div className="space-y-3">
                        {Object.entries(analytics.topPages || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([page, views]: any) => (
                          <div key={page} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate pr-4">{page}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{views}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Referrers</h3>
                      <div className="space-y-3">
                        {Object.entries(analytics.referrers || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([ref, views]: any) => (
                          <div key={ref} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate pr-4">{ref}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{views}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Countries</h3>
                      <div className="space-y-3">
                        {Object.entries(analytics.countries || {}).length > 0 ? (
                          Object.entries(analytics.countries || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([country, visitors]: any) => (
                            <div key={country} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400 truncate pr-4">{country}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{visitors}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400 italic">No location data</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Operating Systems</h3>
                      <div className="space-y-3">
                        {Object.entries(analytics.os || {}).length > 0 ? (
                          Object.entries(analytics.os || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([os, hits]: any) => (
                            <div key={os} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400 truncate pr-4">{os}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{hits}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400 italic">No OS data</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Screen Resolutions</h3>
                      <div className="space-y-3">
                        {Object.entries(analytics.resolutions || {}).length > 0 ? (
                          Object.entries(analytics.resolutions || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([res, hits]: any) => (
                            <div key={res} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400 truncate pr-4">{res}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{hits}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400 italic">No resolution data</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'uptime' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Uptime Monitoring</h2>
                <p className="text-sm text-gray-500 mt-1">Live status and ping history (checked every 1m)</p>
              </div>
              <button onClick={loadUptime} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
            
            {uptimeData.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Uptime Data Yet</h3>
                <p className="text-gray-500 text-sm">The watchdog script pings the deployment every minute. Check back soon!</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="text-sm font-medium text-gray-500 mb-1">Current Status</div>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${uptimeData[uptimeData.length-1].isUp ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-3 h-3 rounded-full ${uptimeData[uptimeData.length-1].isUp ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      {uptimeData[uptimeData.length-1].isUp ? 'ONLINE' : 'OFFLINE'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="text-sm font-medium text-gray-500 mb-1">Uptime % (Last 24h)</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {((uptimeData.filter(d => d.isUp).length / uptimeData.length) * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="text-sm font-medium text-gray-500 mb-1">Avg Latency</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {Math.round(uptimeData.reduce((acc, curr) => acc + curr.latency, 0) / uptimeData.length)}ms
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-64 mt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={uptimeData.slice(-60)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}ms`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="latency" 
                        stroke="#4f46e5" 
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'forms' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                Form Submissions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                You can submit forms directly from your static HTML site to LootOps without a backend.
              </p>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-8 overflow-x-auto">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">How to use (HTML snippet)</h3>
                  <button onClick={handleDownloadFormTemplate} className="text-xs flex items-center gap-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded-md transition-colors dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900">
                    <Download className="w-3 h-3" /> Download Advanced Template
                  </button>
                </div>
                <pre className="text-xs text-gray-800 dark:text-gray-200 font-mono">
{`<form action="${apiUrl}/api/forms/submit/${project.id}" method="POST">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your Message"></textarea>
  
  <!-- Optional: Redirect after submission -->
  <input type="hidden" name="_redirect" value="https://yourdomain.com/thanks.html" />
  
  <button type="submit">Submit</button>
</form>`}
                </pre>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formsData.length} submission{formsData.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={refreshForms}
                  className="text-sm px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Refresh
                </button>
              </div>

              {/* Submission Detail Modal */}
              {selectedForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedForm(null)}>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Form Submission</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(selectedForm.timestamp).toLocaleString()} · {selectedForm.ip?.split(',')[0]}</p>
                      </div>
                      <button onClick={() => setSelectedForm(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="space-y-3 mb-6">
                      {Object.entries(selectedForm.data || {}).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{key}</p>
                          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      {selectedForm.data?.email && (
                        <a
                          href={`mailto:${selectedForm.data.email}?subject=Re: Your message&body=Hi ${selectedForm.data.name || ''},\n\nThank you for reaching out.\n\n`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Reply via Email
                        </a>
                      )}
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this submission?')) return;
                          try {
                            await api.deployments.deleteForm(id, selectedForm.id);
                            setSelectedForm(null);
                            await refreshForms();
                          } catch (e) { alert('Failed to delete submission.'); }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {formsData.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No submissions yet</h3>
                  <p className="text-gray-500 text-sm">When users submit your form, their data will appear here.</p>
                  <button onClick={refreshForms} className="mt-3 text-sm text-blue-500 hover:underline">Click to refresh</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...formsData].reverse().map((form) => {
                    const name = form.data?.name || form.data?.Name || null;
                    const email = form.data?.email || form.data?.Email || null;
                    const message = form.data?.message || form.data?.Message || null;
                    const preview = message ? (message.length > 80 ? message.slice(0, 80) + '…' : message) : Object.entries(form.data || {}).map(([k,v]) => `${k}: ${v}`).join(' · ').slice(0, 80);
                    return (
                      <div key={form.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {name ? name.charAt(0).toUpperCase() : '?'}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{name || 'Anonymous'}</span>
                            {email && <span className="text-xs text-gray-400">{email}</span>}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{preview}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(form.timestamp).toLocaleString()} · {form.ip?.split(',')[0]}</p>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => setSelectedForm(form)}
                            title="View full message"
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          {email && (
                            <a
                              href={`mailto:${email}?subject=Re: Your message&body=Hi ${name || ''},\n\nThank you for reaching out.\n\n`}
                              title="Reply via email"
                              className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </a>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm('Delete this submission?')) return;
                              try {
                                await api.deployments.deleteForm(id, form.id);
                                await refreshForms();
                              } catch (e) { alert('Failed to delete.'); }
                            }}
                            title="Delete submission"
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 max-w-4xl">
            {/* Domains Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Domains</h2>
                <p className="text-sm text-gray-500 mt-1">Manage the custom domains mapped to this deployment.</p>
              </div>
              <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input type="text" className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white text-sm" placeholder="app.example.com" id="domainInput" />
                  <button onClick={async () => {
                    const el = document.getElementById("domainInput") as HTMLInputElement;
                    const val = el.value.trim();
                    if (!val) return;
                    const newDomains = [...(project.domains || []), val];
                    await api.deployments.updateProject(id, { domains: newDomains });
                    el.value = "";
                    loadProject();
                  }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm whitespace-nowrap">Add Domain</button>
                </div>
                
                {project.domains?.length > 0 && (
                  <div className="space-y-4">
                    {project.domains.map((domain: string) => (
                      <div key={domain} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <a href={`https://${domain}`} target="_blank" className="text-lg font-bold text-gray-900 dark:text-white hover:underline flex items-center gap-2">
                              {domain} <ExternalLink className="h-4 w-4 text-gray-400" />
                            </a>
                            <div className="flex items-center gap-2 mt-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Valid Configuration</span>
                            </div>
                          </div>
                          <button onClick={async () => {
                            const newDomains = project.domains.filter((d: string) => d !== domain);
                            await api.deployments.updateProject(id, { domains: newDomains });
                            loadProject();
                          }} className="text-red-500 hover:text-red-700 font-medium px-3 text-sm">Remove</button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">DNS Configuration</h4>
                          <p className="text-sm text-gray-500 mb-4">Set the following record on your DNS provider to continue:</p>
                          
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                                <tr>
                                  <th className="px-4 py-3 font-medium">Type</th>
                                  <th className="px-4 py-3 font-medium">Name</th>
                                  <th className="px-4 py-3 font-medium">Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-white font-mono">
                                <tr>
                                  <td className="px-4 py-3">CNAME</td>
                                  <td className="px-4 py-3">{domain.split('.').length > 2 ? domain.split('.')[0] : '@'}</td>
                                  <td className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400 select-all">{tunnelCname}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-6 pt-4">
                      <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5" /> Note: Ensure your custom domain points to the CNAME value above.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Branch Previews Section */}
            {!project.isPreview && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-purple-500" />
                      Branch Previews
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                      Automatically create preview deployments when code is pushed to a non-main branch on GitHub. Previews stay online until the branch is deleted.
                    </p>
                  </div>
                  <button
                    onClick={togglePreviewDeployments}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      project.previewDeploymentsEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      project.previewDeploymentsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* General Settings Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Build & Development Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Configure how your project is built and started.</p>
              </div>
              <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
                    <input 
                      type="text" 
                      id="updateProjectName"
                      defaultValue={project.name}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      placeholder="My Project"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Git Branch</label>
                    <input 
                      type="text" 
                      id="updateBranch"
                      defaultValue={project.branch}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      placeholder="main"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Framework / Runtime</label>
                    <select 
                      id="updateFramework"
                      defaultValue={project.framework}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white [&>option]:bg-white dark:[&>option]:bg-gray-800"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Root Directory</label>
                    <input 
                      type="text" 
                      id="updateRootDir"
                      defaultValue={project.rootDir}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      placeholder="./"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Install Command</label>
                    <input 
                      type="text" 
                      id="updateInstallCmd"
                      defaultValue={project.installCmd}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      placeholder="npm install"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Build Command</label>
                    <input 
                      type="text" 
                      id="updateBuildCmd"
                      defaultValue={project.buildCmd}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      placeholder="npm run build"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Command</label>
                    <input 
                      type="text" 
                      id="updateStartCmd"
                      defaultValue={project.startCmd}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      placeholder="npm start"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Port</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        id="updatePort"
                        defaultValue={project.port || ""}
                        className="w-48 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        placeholder="Leave blank for auto"
                      />
                      <button 
                        type="button"
                        onClick={async () => {
                          const val = (document.getElementById("updatePort") as HTMLInputElement).value;
                          if (!val) return alert("Please enter a port to check");
                          try {
                            const res = await api.deployments.checkPort(Number(val));
                            if (res.free) alert(`✅ Port ${val} is available!`);
                            else alert(`❌ Port ${val} is already in use by another project or service.`);
                          } catch(err:any) {
                            alert("Error checking port");
                          }
                        }}
                        className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm border border-gray-200 dark:border-gray-700"
                      >
                        Check Availability
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">The port your app runs on locally. Changing this requires a manual redeploy.</p>
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={async () => {
                    await api.deployments.updateProject(id, {
                      name: (document.getElementById("updateProjectName") as HTMLInputElement).value,
                      branch: (document.getElementById("updateBranch") as HTMLInputElement).value,
                      framework: (document.getElementById("updateFramework") as HTMLSelectElement).value,
                      rootDir: (document.getElementById("updateRootDir") as HTMLInputElement).value,
                      installCmd: (document.getElementById("updateInstallCmd") as HTMLInputElement).value,
                      buildCmd: (document.getElementById("updateBuildCmd") as HTMLInputElement).value,
                      startCmd: (document.getElementById("updateStartCmd") as HTMLInputElement).value,
                      port: (document.getElementById("updatePort") as HTMLInputElement).value ? Number((document.getElementById("updatePort") as HTMLInputElement).value) : null,
                    });
                    loadProject();
                    alert("Configuration saved. Redeploy to apply changes.");
                  }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm">
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>

            {/* Git Integration & Deploy Hooks */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Git Integration & Webhooks</h2>
                <p className="text-sm text-gray-500 mt-1">Configure automatic deployments when you push to GitHub.</p>
              </div>
              <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Deploy Hook URL</h4>
                  <p className="text-sm text-gray-500 mb-4">You can copy this unique URL and add it to your GitHub repository Webhooks (or any CI/CD platform). Sending a POST request to this URL will instantly trigger a deployment for this specific project.</p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/deployments/webhook?projectId=${id}` : ''}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 px-4 py-2 font-mono text-sm text-gray-500 outline-none"
                    />
                    <button 
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/deployments/webhook?projectId=${id}`)}
                      className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
                    >
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const webhookUrl = `${window.location.origin}/api/deployments/webhook?projectId=${id}`;
                          const res = await api.github.setupWebhook(project.repository, webhookUrl);
                          alert("✅ " + (res.message || "Webhook created! GitHub will now auto-deploy on every push."));
                        } catch(err:any) {
                          const msg = err?.response?.data?.error || err?.message || "Unknown error";
                          if (msg.includes("scope") || msg.includes("Permission")) {
                            if (confirm("❌ Your GitHub token needs the 'admin:repo_hook' permission.\n\nClick OK to re-connect GitHub with the correct permissions.")) {
                              window.location.href = "/api/github/login";
                            }
                          } else {
                            alert("❌ " + msg);
                          }
                        }
                      }}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
                    >
                      Auto Setup Webhook
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">GitHub App Integration</h4>
                      <p className="text-sm text-gray-500 mt-1">If the LootOps GitHub App is installed on this repository, pushes to <code>{project.branch}</code> will deploy automatically.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800/30">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 overflow-hidden mt-6">
              <div className="px-6 py-5 border-b border-red-100 dark:border-red-900/30">
                <h2 className="text-xl font-bold text-red-600 dark:text-red-500">Danger Zone</h2>
              </div>
              <div className="p-6 space-y-6 bg-red-50/30 dark:bg-red-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Project</h4>
                    <p className="text-sm text-gray-500 mt-1">Permanently remove this project, delete all build files, and release its domain and port. This action cannot be undone.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (confirm("Are you absolutely sure you want to delete this project? This will permanently delete all associated files and stop the deployment.")) {
                        try {
                          await api.deployments.deleteProject(id);
                          window.location.href = "/deployments";
                        } catch (err: any) {
                          alert(`Failed to delete project: ${err.message}`);
                        }
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm whitespace-nowrap"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
