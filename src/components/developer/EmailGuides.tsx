"use client";

import { Terminal } from "lucide-react";

export function EmailGuides({ config, handleCopy, copied }: { config: { apiKey: string, baseUrl: string }, handleCopy: (t: string, i: string) => void, copied: string | null }) {
  const emailEndpoint = `${config.baseUrl}/admin/share/email`;
  const bulkEndpoint = `${config.baseUrl}/admin/bulk-share-email`;

  return (
    <div className="space-y-6">

      {/* Intro */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Terminal className="h-5 w-5 text-indigo-500" />
          Email API — Connect From Any Website or App
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>
            The Email API lets you send files to any email address directly from <strong>your own website, app, or script</strong>.
            All requests use your <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 font-mono text-xs">x-api-key</code> header for authentication — no Firebase login required.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <span className="text-amber-500 text-base">🔑</span>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Your API Key</p>
              <code className="text-xs font-mono text-amber-800 dark:text-amber-300 break-all">{config.apiKey}</code>
            </div>
          </div>
        </div>
      </div>

      {/* cURL — Send Single File */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">1. Send a File Link via Email (cURL)</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Use from a terminal, shell script, or any language that supports HTTP.</p>
        <div className="flex justify-end mb-2">
          <button
            onClick={() => handleCopy(`curl -X POST "${emailEndpoint}" \\\n  -H "x-api-key: ${config.apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"folder":"root","name":"invoice.pdf","email":"client@example.com","url":"${config.baseUrl}/file-serve/root/invoice.pdf","attachFile":false}'`, "email-curl")}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {copied === "email-curl" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800">
          <code>{`curl -X POST "${emailEndpoint}" \\
  -H "x-api-key: ${config.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "folder": "root",
    "name": "invoice.pdf",
    "email": "client@example.com",
    "url": "${config.baseUrl}/file-serve/root/invoice.pdf",
    "attachFile": false
  }'`}</code>
        </pre>
      </div>

      {/* JavaScript / Fetch */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">2. JavaScript / Fetch (Browser or Node.js)</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Call this from your website frontend or any Node.js backend.</p>
        <div className="flex justify-end mb-2">
          <button
            onClick={() => handleCopy(`fetch("${emailEndpoint}", {\n  method: "POST",\n  headers: {\n    "x-api-key": "${config.apiKey}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    folder: "root",\n    name: "report.pdf",\n    email: "client@example.com",\n    url: "${config.baseUrl}/file-serve/root/report.pdf",\n    attachFile: true\n  })\n})\n  .then(r => r.json())\n  .then(data => console.log(data)); // { success: true }`, "email-js")}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {copied === "email-js" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800">
          <code>{`fetch("${emailEndpoint}", {
  method: "POST",
  headers: {
    "x-api-key": "${config.apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    folder: "root",
    name: "report.pdf",
    email: "client@example.com",
    url: "${config.baseUrl}/file-serve/root/report.pdf",
    attachFile: true // Attach directly if under 25MB
  })
})
  .then(r => r.json())
  .then(data => console.log(data)); // { success: true }`}</code>
        </pre>
      </div>

      {/* Python */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">3. Python (requests)</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Use from a Python script, Django, or Flask backend.</p>
        <div className="flex justify-end mb-2">
          <button
            onClick={() => handleCopy(`import requests\n\nresponse = requests.post(\n    "${emailEndpoint}",\n    headers={\n        "x-api-key": "${config.apiKey}",\n        "Content-Type": "application/json"\n    },\n    json={\n        "folder": "root",\n        "name": "document.pdf",\n        "email": "client@example.com",\n        "url": "${config.baseUrl}/file-serve/root/document.pdf",\n        "attachFile": False\n    }\n)\nprint(response.json())  # {'success': True}`, "email-python")}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {copied === "email-python" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800">
          <code>{`import requests

response = requests.post(
    "${emailEndpoint}",
    headers={
        "x-api-key": "${config.apiKey}",
        "Content-Type": "application/json"
    },
    json={
        "folder": "root",
        "name": "document.pdf",
        "email": "client@example.com",
        "url": "${config.baseUrl}/file-serve/root/document.pdf",
        "attachFile": False
    }
)
print(response.json())  # {'success': True}`}</code>
        </pre>
      </div>

      {/* PHP */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">4. PHP</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Integrate with any PHP site, WordPress, or Laravel app.</p>
        <div className="flex justify-end mb-2">
          <button
            onClick={() => handleCopy(`<?php\n$payload = json_encode([\n  "folder" => "root",\n  "name" => "report.pdf",\n  "email" => "client@example.com",\n  "url" => "${config.baseUrl}/file-serve/root/report.pdf",\n  "attachFile" => false\n]);\n$ch = curl_init("${emailEndpoint}");\ncurl_setopt_array($ch, [\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_POST => true,\n  CURLOPT_POSTFIELDS => $payload,\n  CURLOPT_HTTPHEADER => [\n    "x-api-key: ${config.apiKey}",\n    "Content-Type: application/json"\n  ]\n]);\necho curl_exec($ch);\ncurl_close($ch);\n// Output: {"success":true}`, "email-php")}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {copied === "email-php" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800">
          <code>{`<?php
$payload = json_encode([
  "folder" => "root",
  "name" => "report.pdf",
  "email" => "client@example.com",
  "url" => "${config.baseUrl}/file-serve/root/report.pdf",
  "attachFile" => false
]);
$ch = curl_init("${emailEndpoint}");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_HTTPHEADER => [
    "x-api-key: ${config.apiKey}",
    "Content-Type: application/json"
  ]
]);
echo curl_exec($ch);
curl_close($ch);
// Output: {"success":true}`}</code>
        </pre>
      </div>

      {/* Bulk Email */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">5. Bulk Email — Send Multiple Files at Once</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Send a list of files in one email, with optional expiry and password protection on each link.</p>
        <div className="flex justify-end mb-2">
          <button
            onClick={() => handleCopy(`fetch("${bulkEndpoint}", {\n  method: "POST",\n  headers: {\n    "x-api-key": "${config.apiKey}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    email: "team@example.com",\n    files: [\n      { folder: "root", name: "intro.pdf" },\n      { folder: "assets", name: "logo.png" },\n      { folder: "root", name: "contract.docx" }\n    ],\n    durationMs: 86400000, // Links expire in 24 hours\n    password: "secret123"  // Optional: password-protect each link\n  })\n})\n  .then(r => r.json())\n  .then(data => console.log(data)); // { success: true, count: 3 }`, "email-bulk")}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            {copied === "email-bulk" ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="rounded-lg bg-slate-900 p-4 text-sm text-slate-50 overflow-x-auto border border-slate-800">
          <code>{`fetch("${bulkEndpoint}", {
  method: "POST",
  headers: {
    "x-api-key": "${config.apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: "team@example.com",
    files: [
      { folder: "root", name: "intro.pdf" },
      { folder: "assets", name: "logo.png" },
      { folder: "root", name: "contract.docx" }
    ],
    durationMs: 86400000, // Links expire in 24 hours
    password: "secret123"  // Optional: password-protect each link
  })
})
  .then(r => r.json())
  .then(data => console.log(data)); // { success: true, count: 3 }`}</code>
        </pre>
      </div>

    </div>
  );
}
