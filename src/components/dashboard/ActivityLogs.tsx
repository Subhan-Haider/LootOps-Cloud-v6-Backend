"use client";

import { useEffect, useState } from "react";
import { api, AuditLog } from "@/lib/api";
import { Clock, Eye, Trash2, Upload, RefreshCw, Lock, Move, FolderPlus } from "lucide-react";

export function ActivityLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getLogs();
      setLogs(data);
    } catch (e) {
      console.error("Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLogIcon = (event: string) => {
    switch (event) {
      case "FILE_UPLOAD":
        return <Upload className="h-5 w-5 text-green-500" />;
      case "FILE_DELETE":
        return <Trash2 className="h-5 w-5 text-red-500" />;
      case "FILE_ACCESS":
      case "SHARE_LINK_USE":
        return <Eye className="h-5 w-5 text-blue-500" />;
      case "FILE_RENAME":
        return <RefreshCw className="h-5 w-5 text-yellow-500" />;
      case "FILE_MOVE":
        return <Move className="h-5 w-5 text-indigo-500" />;
      case "FOLDER_CREATE":
        return <FolderPlus className="h-5 w-5 text-teal-500" />;
      case "PRIVACY_TOGGLE":
        return <Lock className="h-5 w-5 text-purple-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">File Activity Logs</h2>
        <button
          onClick={fetchLogs}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No logs available yet.</p>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {logs.map((logItem, idx) => (
              <li key={logItem.id}>
                <div className="relative pb-8">
                  {idx !== logs.length - 1 && (
                    <span
                      className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-800"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800">
                        {getLogIcon(logItem.event)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          <strong className="text-gray-900 dark:text-white">{logItem.event}</strong>:{" "}
                          {JSON.stringify(logItem.details)}
                        </p>
                      </div>
                      <div className="whitespace-nowrap text-right text-xs text-gray-500 dark:text-gray-400">
                        {new Date(logItem.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
