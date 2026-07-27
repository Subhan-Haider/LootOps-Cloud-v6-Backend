"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Activity, Server, Network, Shield, AlertTriangle, CheckCircle, RefreshCcw, Settings as SettingsIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/ToastProvider";

export default function WatchdogPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [state, setState] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>({
    checkIntervalMs: 30000,
    maxRecoveryAttempts: 3,
    rebootOnMaxFailures: false
  });

  const loadData = async () => {
    try {
      const [statusData, logsData] = await Promise.all([
        api.watchdog.getStatus(),
        api.watchdog.getLogs()
      ]);
      setState(statusData);
      setLogs(logsData);
      if (statusData?.config) {
        setSettingsForm({
          checkIntervalMs: statusData.config.checkIntervalMs || 30000,
          maxRecoveryAttempts: statusData.config.maxRecoveryAttempts || 3,
          rebootOnMaxFailures: statusData.config.rebootOnMaxFailures || false
        });
      }
    } catch {
      toastError("Failed to load watchdog data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerAction = async (action: string, service?: string) => {
    if (!confirm(`Are you sure you want to perform: ${action}?`)) return;
    try {
      await api.watchdog.triggerAction(action, service);
      toastSuccess(`Action ${action} initiated`);
    } catch {
      toastError(`Failed to perform ${action}`);
    }
  };

  const saveSettings = async () => {
    try {
      await api.watchdog.updateSettings({
        checkIntervalMs: Number(settingsForm.checkIntervalMs),
        maxRecoveryAttempts: Number(settingsForm.maxRecoveryAttempts),
        rebootOnMaxFailures: Boolean(settingsForm.rebootOnMaxFailures)
      });
      toastSuccess("Watchdog settings updated");
      setIsSettingsOpen(false);
      loadData();
    } catch {
      toastError("Failed to save settings");
    }
  };

  const StatusBadge = ({ isOk }: { isOk: boolean }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {isOk ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {isOk ? "Online" : "Offline"}
    </span>
  );

  return (
    <>
      <Topbar onRefresh={loadData} />
      <div className="min-h-full bg-slate-100 dark:bg-slate-900 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Server Watchdog</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Live monitoring and automatic recovery system.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${state?.liveStatus === 'Healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <Activity className="h-4 w-4" />
                {state?.liveStatus || 'Loading...'}
              </span>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 md:py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <SettingsIcon className="h-4 w-4" /> Settings
              </button>
            </div>
          </div>

          {!loading && state && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">CPU Usage</div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{state.stats?.cpu?.toFixed(1) || 0}%</div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full ${state.stats.cpu > 80 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${state.stats.cpu}%` }}></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">RAM Usage</div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{state.stats?.ram?.toFixed(1) || 0}%</div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full ${state.stats.ram > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${state.stats.ram}%` }}></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Network (Internet)</div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge isOk={state.network?.internet} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Auto-Recovery Stats</div>
                <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{state.recoveryAttemptsToday} attempts today</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-900">Monitored Services</h3>
              </div>
              <div className="divide-y divide-slate-100 p-0">
                {state?.services && Object.keys(state.services).length > 0 ? (
                  Object.entries(state.services).map(([service, isActive]: any) => (
                    <div key={service} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium text-slate-700 capitalize">{service}</span>
                      </div>
                      <button 
                        onClick={() => triggerAction("restart_service", service)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Restart Service"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-slate-500">No services configured.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-900">Recent Watchdog Logs</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {logs.length > 0 ? logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {log.action} <span className="text-xs text-slate-400 font-normal">({log.category})</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{log.message}</p>
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )) : (
                  <div className="p-6 text-center text-sm text-slate-500">No recent logs.</div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 dark:border dark:border-slate-700 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Watchdog Settings</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure automated monitoring behavior.</p>
            
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Check Interval (ms)</label>
                <input 
                  type="number" 
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  value={settingsForm.checkIntervalMs}
                  onChange={(e) => setSettingsForm({...settingsForm, checkIntervalMs: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Max Recovery Attempts</label>
                <input 
                  type="number" 
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  value={settingsForm.maxRecoveryAttempts}
                  onChange={(e) => setSettingsForm({...settingsForm, maxRecoveryAttempts: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="rebootOpt"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={settingsForm.rebootOnMaxFailures}
                  onChange={(e) => setSettingsForm({...settingsForm, rebootOnMaxFailures: e.target.checked})}
                />
                <label htmlFor="rebootOpt" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Allow System Reboot on critical failure
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={saveSettings}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
