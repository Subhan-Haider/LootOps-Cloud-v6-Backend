const fs = require('fs');
let content = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

// 1. Add Settings icon
content = content.replace(/Star\n} from "lucide-react";/, 'Star,\n  Settings\n} from "lucide-react";');

// 2. Update activeTab
content = content.replace(/const \[activeTab, setActiveTab\] = useState<"vault" \| "health">\("vault"\);/,
  'const [activeTab, setActiveTab] = useState<"vault" | "health" | "settings">("vault");');

// 3. Insert Settings Button & View
// Let's inject it right after: <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative overflow-y-auto">
const editorAreaRegex = /\{\/\* Editor Area \*\/\}\s*<div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative overflow-y-auto">/;
const settingsInjection = `{/* Editor Area */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative overflow-y-auto">
          
          <div className="absolute top-6 right-8 z-10">
            <button 
              onClick={() => { setActiveTab(activeTab === 'settings' ? 'vault' : 'settings'); setSelectedEntry(null); }}
              className={\`p-2.5 rounded-xl transition-all shadow-sm border \${activeTab === 'settings' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:text-indigo-400'}\`}
              title="Vault Settings"
            >
              <Settings size={20} />
            </button>
          </div>
          
          {activeTab === 'settings' ? (
            <div className="max-w-3xl w-full mx-auto p-8 h-full flex flex-col">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                <Settings className="text-indigo-500" size={32} /> Vault Settings
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Manage your master password, security policies, and UI preferences.</p>
              
              <div className="space-y-6">
                
                {/* Security Preferences */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Security Policies</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Auto-Lock Timeout</label>
                      <select className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="1">1 Minute</option>
                        <option value="5">5 Minutes (Default)</option>
                        <option value="15">15 Minutes</option>
                        <option value="never">Never (Not Recommended)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Automatically lock the vault after inactivity.</p>
                    </div>
                  </div>
                </div>

                {/* Master Password */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Change Master PIN</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current PIN</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New PIN</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                      Update Master PIN
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === 'health' ? (`;

content = content.replace(editorAreaRegex, settingsInjection);
content = content.replace(/\{activeTab === 'health' \? \(/, ""); // Clean up the old ternary operator condition we just subsumed

fs.writeFileSync('src/app/passwords/page.tsx', content);
console.log('Patched settings');
