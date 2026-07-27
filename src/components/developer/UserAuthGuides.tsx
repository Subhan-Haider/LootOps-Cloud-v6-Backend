"use client";

import { Terminal, Shield, User, Key } from "lucide-react";

export function UserAuthGuides({ config, handleCopy, copied }: {
  config: { apiKey: string; baseUrl: string };
  handleCopy: (t: string, i: string) => void;
  copied: string | null;
}) {
  const base = config.baseUrl;

  return (
    <div className="space-y-6">

      {/* Intro */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-indigo-500" />
          User Auth Database — Connect From Any Website
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Full user registration, login, profile management — backed by Firebase Auth + Firestore. 
          Drop this into any website, app, or script.
        </p>

        {/* Setup note */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">⚙️ One-time setup required</p>
          <p className="text-amber-700 dark:text-amber-300 text-xs">
            The <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">/auth/login</code> endpoint requires your <strong>Firebase Web API Key</strong>.
            Find it in <strong>Firebase Console → Project Settings → General → Web API Key</strong>, then add it to your server&apos;s <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env.local</code>:
          </p>
          <pre className="mt-2 rounded bg-amber-100 dark:bg-amber-900/50 p-2 text-xs font-mono text-amber-800 dark:text-amber-300">FIREBASE_WEB_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXX</pre>
        </div>

        {/* Endpoint table */}
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">Method</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">Path</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">Auth</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { method: "POST", path: "/auth/register", auth: "None", desc: "Create a new user account" },
                { method: "POST", path: "/auth/login", auth: "None", desc: "Sign in → get token" },
                { method: "POST", path: "/auth/forgot-password", auth: "None", desc: "Send password reset email" },
                { method: "POST", path: "/auth/verify-email", auth: "Bearer token", desc: "Resend verification email" },
                { method: "GET", path: "/auth/me", auth: "Bearer token", desc: "Get my profile" },
                { method: "PUT", path: "/auth/me", auth: "Bearer token", desc: "Update my profile" },
                { method: "DELETE", path: "/auth/me", auth: "Bearer token", desc: "Delete my account" },
                { method: "GET", path: "/admin/users", auth: "x-api-key", desc: "List all users" },
                { method: "PUT", path: "/admin/users/:uid", auth: "x-api-key", desc: "Update any user" },
                { method: "DELETE", path: "/admin/users/:uid", auth: "x-api-key", desc: "Delete any user" },
              ].map(row => (
                <tr key={row.method + row.path}>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-bold font-mono ${row.method === "GET" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : row.method === "DELETE" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"}`}>
                      {row.method}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{row.path}</td>
                  <td className="px-3 py-2 text-gray-500">{row.auth}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Register */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-400" />
            1. Register a New User
          </h3>
          <button onClick={() => handleCopy(`fetch("${base}/auth/register", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({\n    email: "user@example.com",\n    password: "secure123",\n    name: "John Doe",\n    metadata: { plan: "free", source: "mywebsite" }\n  })\n})\n  .then(r => r.json())\n  .then(console.log);\n// → { success: true, uid: "...", email: "...", message: "Account created..." }`, "auth-register")} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {copied === "auth-register" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">No auth required. Sends a verification email automatically.</p>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800">
          <code>{`fetch("${base}/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "secure123",
    name: "John Doe",
    metadata: { plan: "free", source: "mywebsite" }
  })
})
  .then(r => r.json())
  .then(console.log);
// → { success: true, uid: "...", email: "...", message: "Account created." }`}</code>
        </pre>
      </div>

      {/* 2. Login */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-400" />
            2. Login — Get Token
          </h3>
          <button onClick={() => handleCopy(`fetch("${base}/auth/login", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({\n    email: "user@example.com",\n    password: "secure123"\n  })\n})\n  .then(r => r.json())\n  .then(data => {\n    // Save token for future requests\n    localStorage.setItem("token", data.token);\n    console.log("Logged in!", data.profile);\n  });`, "auth-login")} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {copied === "auth-login" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Returns a Firebase ID token. Save it — use it as <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Authorization: Bearer &lt;token&gt;</code> on protected requests.</p>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800">
          <code>{`fetch("${base}/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "secure123"
  })
})
  .then(r => r.json())
  .then(data => {
    localStorage.setItem("token", data.token); // Save token
    console.log("Logged in!", data.profile);
  });
// → { success: true, token: "eyJ...", uid: "...", profile: { name, email, role, ... } }`}</code>
        </pre>
      </div>

      {/* 3. Get My Profile */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">3. Get My Profile</h3>
          <button onClick={() => handleCopy(`const token = localStorage.getItem("token");\n\nfetch("${base}/auth/me", {\n  headers: { "Authorization": "Bearer " + token }\n})\n  .then(r => r.json())\n  .then(data => console.log(data.profile));`, "auth-me-get")} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {copied === "auth-me-get" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800 mt-3">
          <code>{`const token = localStorage.getItem("token");

fetch("${base}/auth/me", {
  headers: { "Authorization": "Bearer " + token }
})
  .then(r => r.json())
  .then(data => console.log(data.profile));
// → { uid, email, name, avatar, role, createdAt, lastLogin, metadata }`}</code>
        </pre>
      </div>

      {/* 4. Update Profile */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">4. Update My Profile</h3>
          <button onClick={() => handleCopy(`const token = localStorage.getItem("token");\n\nfetch("${base}/auth/me", {\n  method: "PUT",\n  headers: {\n    "Authorization": "Bearer " + token,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    name: "Jane Doe",\n    avatar: "https://example.com/avatar.jpg",\n    metadata: { plan: "pro", theme: "dark" }\n  })\n})\n  .then(r => r.json())\n  .then(console.log);`, "auth-me-put")} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {copied === "auth-me-put" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800 mt-3">
          <code>{`const token = localStorage.getItem("token");

fetch("${base}/auth/me", {
  method: "PUT",
  headers: {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "Jane Doe",
    avatar: "https://example.com/avatar.jpg",
    metadata: { plan: "pro", theme: "dark" }
  })
})
  .then(r => r.json())
  .then(console.log);`}</code>
        </pre>
      </div>

      {/* 5. Forgot Password */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">5. Forgot Password</h3>
          <button onClick={() => handleCopy(`fetch("${base}/auth/forgot-password", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ email: "user@example.com" })\n})\n  .then(r => r.json())\n  .then(console.log);\n// → { success: true, message: "Password reset email sent." }`, "auth-forgot")} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {copied === "auth-forgot" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800 mt-3">
          <code>{`fetch("${base}/auth/forgot-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com" })
})
  .then(r => r.json())
  .then(console.log);
// → { success: true, message: "Password reset email sent." }`}</code>
        </pre>
      </div>

      {/* 6. Admin: List Users */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">6. Admin — List All Users</h3>
          <button onClick={() => handleCopy(`fetch("${base}/admin/users?limit=50", {\n  headers: { "x-api-key": "${config.apiKey}" }\n})\n  .then(r => r.json())\n  .then(data => console.log(data.users));`, "auth-list-users")} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {copied === "auth-list-users" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Uses your <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">x-api-key</code> — admin only.</p>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800">
          <code>{`fetch("${base}/admin/users?limit=50", {
  headers: { "x-api-key": "${config.apiKey}" }
})
  .then(r => r.json())
  .then(data => console.log(data.users));
// → { success: true, count: 12, users: [...] }`}</code>
        </pre>
      </div>

      {/* 7. Python full flow */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">7. Python — Full Auth Flow</h3>
          <button onClick={() => handleCopy(`import requests\n\nBASE = "${base}"\n\n# Register\nreg = requests.post(f"{BASE}/auth/register", json={\n    "email": "user@example.com",\n    "password": "secure123",\n    "name": "Alice"\n})\nprint(reg.json())\n\n# Login\nlogin = requests.post(f"{BASE}/auth/login", json={\n    "email": "user@example.com",\n    "password": "secure123"\n})\ntoken = login.json()["token"]\n\n# Get profile\nme = requests.get(f"{BASE}/auth/me",\n    headers={"Authorization": f"Bearer {token}"}\n)\nprint(me.json())`, "auth-python")} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {copied === "auth-python" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800 mt-3">
          <code>{`import requests

BASE = "${base}"

# Register
reg = requests.post(f"{BASE}/auth/register", json={
    "email": "user@example.com",
    "password": "secure123",
    "name": "Alice"
})
print(reg.json())

# Login → get token
login = requests.post(f"{BASE}/auth/login", json={
    "email": "user@example.com",
    "password": "secure123"
})
token = login.json()["token"]

# Get profile
me = requests.get(f"{BASE}/auth/me",
    headers={"Authorization": f"Bearer {token}"}
)
print(me.json())`}</code>
        </pre>
      </div>

    </div>
  );
}
