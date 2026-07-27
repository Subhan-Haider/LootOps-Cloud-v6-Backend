"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as TerminalIcon, Wifi, WifiOff, Maximize2, Minimize2, RefreshCw, X, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/firebase";
import "@xterm/xterm/css/xterm.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function getWsUrl(token: string) {
  const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
  // Force the production backend URL if accessed from the public domain, even if env vars are misconfigured
  const httpBase = isDev ? "http://localhost:5000" : "https://storage.lootops.me";
  const wsBase = httpBase.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
  return `${wsBase}/terminal?token=${encodeURIComponent(token)}`;
}

type ConnStatus = "connecting" | "connected" | "disconnected" | "error" | "auth_error";

export default function TerminalPage() {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsAvailable, setWsAvailable] = useState<boolean | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        setStatus("auth_error");
        setError("Not logged in.");
        return;
      }
      const token = await user.getIdToken();
      const wsUrl = getWsUrl(token);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        setWsAvailable(true);
        xtermRef.current?.clear();
        xtermRef.current?.writeln("\x1b[1;32m✔ Connected to server terminal\x1b[0m");
        xtermRef.current?.writeln("\x1b[90mType commands and press Enter. Type 'exit' to disconnect.\x1b[0m\r\n");
        // Sync size with backend immediately
        if (xtermRef.current) {
          ws.send(JSON.stringify({ type: "resize", cols: xtermRef.current.cols, rows: xtermRef.current.rows }));
        }
        // Nudge the shell to output its first prompt
        setTimeout(() => {
          ws.send(JSON.stringify({ type: "input", data: "\r" }));
        }, 300);
        // Focus xterm so keyboard input works immediately
        requestAnimationFrame(() => xtermRef.current?.focus());
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "output" && xtermRef.current) {
            xtermRef.current.write(msg.data);
          } else if (msg.type === "exit") {
            xtermRef.current?.writeln("\r\n\x1b[1;33m[Process exited]\x1b[0m");
            setStatus("disconnected");
          }
        } catch {
          xtermRef.current?.write(evt.data);
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setWsAvailable(false);
        setError("WebSocket connection failed. Make sure ws and node-pty are installed on the server.");
      };

      ws.onclose = (e) => {
        if (e.code === 1006) {
          setStatus("error");
          setError("Connection refused. Install ws and node-pty on the server.");
          setWsAvailable(false);
        } else if (status === "connected") {
          setStatus("disconnected");
        }
      };
    } catch (e) {
      setStatus("error");
      setError(String(e));
    }
  }, [status]);

  useEffect(() => {
    let term: import("@xterm/xterm").Terminal;
    let fitAddon: import("@xterm/addon-fit").FitAddon;

    const initTerminal = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      term = new Terminal({
        theme: {
          background: '#ffffff',
          foreground: '#333333',
          cursor: '#000000',
          selectionBackground: '#c1deff',
          black: '#000000',
          red: '#cc0000',
          green: '#4e9a06',
          yellow: '#c4a000',
          blue: '#3465a4',
          magenta: '#75507b',
          cyan: '#06989a',
          white: '#d3d7cf',
          brightBlack: '#555753',
          brightRed: '#ef2929',
          brightGreen: '#8ae234',
          brightYellow: '#fce94f',
          brightBlue: '#729fcf',
          brightMagenta: '#ad7fa8',
          brightCyan: '#34e2e2',
          brightWhite: '#eeeeee'
        },
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontSize: 16,
        lineHeight: 1.2,
        letterSpacing: 0,
        cursorBlink: true,
        cursorStyle: "bar",
        scrollback: 5000,
        allowTransparency: false,
        convertEol: true,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      xtermRef.current = term;
      fitRef.current = fitAddon;

      if (termRef.current) {
        term.open(termRef.current);
        // Fit after a tiny delay to ensure DOM layout is complete
        setTimeout(() => {
          fitAddon.fit();
          term.focus();
        }, 50);

        // Right-click to paste
        termRef.current.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          navigator.clipboard.readText().then(text => {
            if (wsRef.current?.readyState === WebSocket.OPEN && text) {
              wsRef.current.send(JSON.stringify({ type: "input", data: text }));
            }
          }).catch(() => {});
        });
      }

      // Handle Ctrl+C (copy if selected) and Ctrl+V (paste)
      term.attachCustomKeyEventHandler((e) => {
        if (e.type === "keydown") {
          if (e.ctrlKey && e.code === "KeyC") {
            const selection = term.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection);
              term.clearSelection();
              return false; // Prevent SIGINT
            }
          }
          if (e.ctrlKey && e.code === "KeyV") {
            navigator.clipboard.readText().then(text => {
              if (wsRef.current?.readyState === WebSocket.OPEN && text) {
                wsRef.current.send(JSON.stringify({ type: "input", data: text }));
              }
            }).catch(() => {});
            return false;
          }
        }
        return true;
      });

      term.onData((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "input", data }));
        }
      });

      term.onResize(({ cols, rows }) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      });

      term.writeln("\x1b[90mInitializing terminal...\x1b[0m");
      await connect();
    };

    initTerminal();

    const handleResize = () => fitRef.current?.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      wsRef.current?.close();
      term?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisconnect = () => {
    wsRef.current?.close();
    setStatus("disconnected");
    xtermRef.current?.writeln("\r\n\x1b[1;33m[Disconnected]\x1b[0m");
  };

  const handleReconnect = () => {
    wsRef.current?.close();
    xtermRef.current?.clear();
    connect();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(f => !f);
    setTimeout(() => fitRef.current?.fit(), 100);
  };

  const statusConfig: Record<ConnStatus, { label: string; color: string; dot: string }> = {
    connecting:   { label: "Connecting...", color: "text-amber-600", dot: "bg-amber-500 animate-pulse" },
    connected:    { label: "Connected",     color: "text-emerald-600", dot: "bg-emerald-500" },
    disconnected: { label: "Disconnected",  color: "text-slate-500",   dot: "bg-slate-400" },
    error:        { label: "Error",         color: "text-red-600",     dot: "bg-red-500" },
    auth_error:   { label: "Auth Error",    color: "text-red-600",     dot: "bg-red-500" },
  };

  const s = statusConfig[status];

  return (
    <div className={`flex flex-col bg-white ${isFullscreen ? "fixed inset-0 z-[100]" : "h-[calc(100vh-2rem)] min-h-[500px]"}`}>
      <style>{`
        .xterm-viewport::-webkit-scrollbar {
          width: 14px !important;
        }
        .xterm-viewport::-webkit-scrollbar-track {
          background: #f1f5f9 !important;
          border-left: 1px solid #e2e8f0 !important;
        }
        .xterm-viewport::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 4px !important;
          border: 3px solid #f1f5f9 !important;
        }
        .xterm-viewport::-webkit-scrollbar-thumb:hover {
          background: #94a3b8 !important;
        }
      `}</style>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Traffic lights */}
            <span className="h-3 w-3 rounded-full border border-red-200 bg-red-500 shadow-sm" />
            <span className="h-3 w-3 rounded-full border border-amber-200 bg-amber-400 shadow-sm" />
            <span className="h-3 w-3 rounded-full border border-emerald-200 bg-emerald-500 shadow-sm" />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <TerminalIcon className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Server Terminal</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            <span className={`text-[10px] uppercase tracking-wider font-bold ${s.color}`}>{s.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "connected" ? (
            <button
              onClick={handleDisconnect}
              title="Disconnect"
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2.5 md:py-1 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm"
            >
              <WifiOff className="h-3 w-3" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleReconnect}
              title="Reconnect"
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2.5 md:py-1 text-xs font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <RefreshCw className="h-3 w-3" />
              Reconnect
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2.5 md:py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2.5 md:py-1 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {(status === "error" || status === "auth_error") && error && (
        <div className="shrink-0 flex items-start gap-3 border-b border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Terminal Unavailable</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            {wsAvailable === false && (
              <div className="mt-2 flex flex-col gap-1 font-mono text-xs text-slate-700 bg-white border border-red-100 rounded px-3 py-2 shadow-sm">
                <span>cd ~/storage-server</span>
                <span>npm install ws node-pty</span>
                <span>pm2 restart storage</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* xterm.js container */}
      <div
        className="flex-1 overflow-hidden p-3 bg-white relative"
        onClick={() => xtermRef.current?.focus()}
        tabIndex={0}
        onFocus={() => xtermRef.current?.focus()}
      >
        <div
          ref={termRef}
          className="absolute inset-3 cursor-text"
          style={{ fontFeatureSettings: "'calt' 1" }}
        />
      </div>

      {/* Bottom status bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-slate-50 border-t border-slate-200 text-slate-500">
        <div className="flex items-center gap-3">
          {status === "connected" ? (
            <Wifi className="h-3 w-3 text-emerald-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-slate-400" />
          )}
          <span className="text-[10px] font-medium font-mono">bash · UTF-8 · xterm-256color</span>
        </div>
        <span className="text-[10px] font-medium font-mono tracking-wide">storage.lootops.me</span>
      </div>
    </div>
  );
}
