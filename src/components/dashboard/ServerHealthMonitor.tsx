"use client";

import { useEffect, useState, useRef } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Cpu, MemoryStick, Clock } from "lucide-react";
import { auth } from "@/lib/firebase";

interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
}

export function ServerHealthMonitor() {
  const [data, setData] = useState<MetricPoint[]>([]);
  const [latestCpu, setLatestCpu] = useState(0);
  const [latestMem, setLatestMem] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connectSSE = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          retryTimeout = setTimeout(connectSSE, 1000);
          return;
        }

        // SSE must connect DIRECTLY to the Express backend — Next.js rewrites
        // buffer responses and break streaming, so we bypass the proxy here.
        const backendBase = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
        const sseUrl = `${backendBase}/admin/system/stream?token=${token}`;

        const sse = new EventSource(sseUrl);
        eventSourceRef.current = sse;

        sse.onopen = () => setConnected(true);

        sse.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const now = new Date(parsed.timestamp);
            const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

            setLatestCpu(parsed.cpu);
            setLatestMem(parsed.memory);
            setUptime(parsed.uptime);

            setData((prev) => {
              const next = [...prev, { time: timeString, cpu: parsed.cpu, memory: parsed.memory }];
              if (next.length > 60) next.shift();
              return next;
            });
          } catch { /* ignore parse errors */ }
        };

        sse.onerror = () => {
          setConnected(false);
          sse.close();
          retryTimeout = setTimeout(connectSSE, 5000);
        };
      } catch {
        retryTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      clearTimeout(retryTimeout);
      eventSourceRef.current?.close();
    };
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const cpuColor = latestCpu > 80 ? "#ef4444" : latestCpu > 50 ? "#f59e0b" : "#6366f1";
  const memColor = latestMem > 80 ? "#ef4444" : latestMem > 50 ? "#f59e0b" : "#8b5cf6";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

      {/* CPU Card */}
      <div className="card-hover rounded-2xl border border-slate-200/60 bg-white p-5 dark:border-slate-800/60 dark:bg-gray-900">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">CPU Load</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{latestCpu}%</p>
            <p className="mt-1 text-xs font-medium" style={{ color: cpuColor }}>
              {latestCpu > 80 ? "High load" : latestCpu > 50 ? "Moderate" : "Normal"}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm">
            <Cpu className="h-5 w-5 text-white" />
          </div>
        </div>
        {data.length > 0 ? (
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cpuColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={cpuColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="cpu" stroke={cpuColor} strokeWidth={2} fill="url(#cpuGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-14 flex items-center">
            <span className="text-[11px] text-gray-300 dark:text-gray-600">Waiting for data...</span>
          </div>
        )}
      </div>

      {/* Memory Card */}
      <div className="card-hover rounded-2xl border border-slate-200/60 bg-white p-5 dark:border-slate-800/60 dark:bg-gray-900">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Memory</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{latestMem}%</p>
            <p className="mt-1 text-xs font-medium" style={{ color: memColor }}>
              {latestMem > 80 ? "High usage" : latestMem > 50 ? "Moderate" : "Normal"}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-sm">
            <MemoryStick className="h-5 w-5 text-white" />
          </div>
        </div>
        {data.length > 0 ? (
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={memColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={memColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="memory" stroke={memColor} strokeWidth={2} fill="url(#memGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-14 flex items-center">
            <span className="text-[11px] text-gray-300 dark:text-gray-600">Waiting for data...</span>
          </div>
        )}
      </div>

      {/* Uptime Card */}
      <div className="card-hover rounded-2xl border border-slate-200/60 bg-white p-5 dark:border-slate-800/60 dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Server Uptime</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {uptime > 0 ? formatUptime(uptime) : "—"}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              {connected ? "Live streaming" : "Connecting..."}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
            <Clock className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Mini bar indicators */}
        <div className="mt-4 space-y-2">
          <div>
            <div className="flex justify-between text-[10px] font-medium text-gray-400 mb-1">
              <span>CPU</span><span>{latestCpu}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${latestCpu}%`, backgroundColor: cpuColor }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-medium text-gray-400 mb-1">
              <span>RAM</span><span>{latestMem}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${latestMem}%`, backgroundColor: memColor }} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
