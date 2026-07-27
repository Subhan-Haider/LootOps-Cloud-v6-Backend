const fs = require('fs');

// --- 1. Patch Backend Server ---
let serverContent = fs.readFileSync('backend/server.js', 'utf8');

const changePinEndpoint = `app.post("/api/vault/change-pin", requireAuth, (req, res) => {
  const { currentPin, newPin } = req.body;
  const db = readDb();
  const email = req.user.email || req.user.uid;
  const vault = db.vaults?.[email];
  if (!vault) return res.status(400).json({ error: "Vault not set up" });
  
  const currentHash = crypto.createHash("sha256").update(currentPin).digest("hex");
  if (vault.pinHash !== currentHash) return res.status(401).json({ error: "Incorrect Current PIN" });
  
  const newHash = crypto.createHash("sha256").update(newPin).digest("hex");
  vault.pinHash = newHash;
  writeDb(db);
  res.json({ success: true });
});

`;

if (!serverContent.includes('app.post("/api/vault/change-pin"')) {
  serverContent = serverContent.replace('app.post("/api/vault/disable"', changePinEndpoint + 'app.post("/api/vault/disable"');
  fs.writeFileSync('backend/server.js', serverContent);
  console.log("Patched server.js");
}

// --- 2. Patch Frontend API ---
let apiContent = fs.readFileSync('src/lib/api.ts', 'utf8');
const changePinApi = `verify: async (pin: string) => {
      const { data } = await apiInstance.post("/api/vault/verify", { pin });
      return data;
    },
    changePin: async (currentPin: string, newPin: string) => {
      const { data } = await apiInstance.post("/api/vault/change-pin", { currentPin, newPin });
      return data;
    },`;
apiContent = apiContent.replace(/verify: async \(pin: string\) => \{[\s\S]*?\},/, changePinApi);
fs.writeFileSync('src/lib/api.ts', apiContent);
console.log("Patched api.ts");

// --- 3. Patch Frontend Settings UI & Auto-Lock ---
let pageContent = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

// Add autoLockTimer and PIN states
pageContent = pageContent.replace(/const \[activeTab, setActiveTab\] = useState<"vault" \| "health" \| "settings">\("vault"\);/,
  `const [activeTab, setActiveTab] = useState<"vault" | "health" | "settings">("vault");
  const [autoLockTimer, setAutoLockTimer] = useState("5");
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [pinChangeStatus, setPinChangeStatus] = useState("");
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const updateActivity = () => { lastActivity.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    
    const interval = setInterval(() => {
      if (!vaultToken || autoLockTimer === 'never') return;
      const timeoutMs = parseInt(autoLockTimer) * 60 * 1000;
      if (Date.now() - lastActivity.current > timeoutMs) {
        setVaultToken(null);
        setActiveTab("vault");
      }
    }, 10000); // Check every 10s
    
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      clearInterval(interval);
    };
  }, [vaultToken, autoLockTimer]);

  const handleChangePin = async () => {
    if (newPinInput.length < 4) { setPinChangeStatus("New PIN must be at least 4 chars."); return; }
    try {
      setPinChangeStatus("Updating...");
      await api.vault.changePin(currentPinInput, newPinInput);
      setPinChangeStatus("Success! Master PIN Updated.");
      setCurrentPinInput("");
      setNewPinInput("");
      setTimeout(() => setPinChangeStatus(""), 3000);
    } catch(err: any) {
      setPinChangeStatus(err.response?.data?.error || "Failed to update PIN");
    }
  };`);

// Also need to import useRef if not imported
if (!pageContent.includes("useRef")) {
  pageContent = pageContent.replace(/useState, useEffect/g, "useState, useEffect, useRef");
} else {
  // If useRef is not in the imports at all
  if (!pageContent.match(/import \{[^}]*useRef[^}]*\} from 'react'/)) {
    pageContent = pageContent.replace(/useState/g, "useState, useRef");
  }
}

// Hook up the inputs in the UI
const settingsBlockRegex = /\{\/\* Security Preferences \*\/\}([\s\S]*?)<div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">[\s\S]*?Change Master PIN[\s\S]*?<div className="space-y-4">[\s\S]*?Current PIN[\s\S]*?<input type="password" placeholder="••••••••" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" \/>[\s\S]*?New PIN[\s\S]*?<input type="password" placeholder="••••••••" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" \/>[\s\S]*?Update Master PIN[\s\S]*?<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const newSettingsBlock = `{/* Security Preferences */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Security Policies</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Auto-Lock Timeout</label>
                      <select value={autoLockTimer} onChange={e => setAutoLockTimer(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="1">1 Minute</option>
                        <option value="5">5 Minutes (Default)</option>
                        <option value="15">15 Minutes</option>
                        <option value="never">Never (Not Recommended)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Automatically lock the vault after inactivity.</p>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Group by Website</label>
                          <p className="text-xs text-slate-500 mt-0.5">Automatically organize multiple accounts for the same website into folders.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={groupByWebsite} onChange={() => setGroupByWebsite(!groupByWebsite)} />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Master Password */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Change Master PIN</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current PIN</label>
                      <input type="password" value={currentPinInput} onChange={e => setCurrentPinInput(e.target.value)} placeholder="••••••••" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New PIN</label>
                      <input type="password" value={newPinInput} onChange={e => setNewPinInput(e.target.value)} placeholder="••••••••" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                    {pinChangeStatus && (
                      <p className={\`text-sm \${pinChangeStatus.includes('Success') ? 'text-green-500' : pinChangeStatus.includes('Updating') ? 'text-indigo-500' : 'text-red-500'}\`}>{pinChangeStatus}</p>
                    )}
                    <button onClick={handleChangePin} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                      Update Master PIN
                    </button>
                  </div>
                </div>`;

pageContent = pageContent.replace(settingsBlockRegex, newSettingsBlock);

fs.writeFileSync('src/app/passwords/page.tsx', pageContent);
console.log("Patched page.tsx");
