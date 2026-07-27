const fs = require('fs');
let content = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

const handleRestore = `
  const handleRestore = async () => {
    if (!vaultToken || !selectedEntry?.id) return;
    try {
      await api.passwords.restore(vaultToken, selectedEntry.id);
      setPasswords(passwords.map(p => p.id === selectedEntry.id ? { ...p, deletedAt: null } : p));
      setSelectedEntry(null);
    } catch (err) {
      console.error("Failed to restore", err);
    }
  };

  const handlePermanentDelete = async () => {
    if (!vaultToken || !selectedEntry?.id) return;
    if (!confirm("Permanently delete this credential forever? This cannot be undone.")) return;
    try {
      await api.passwords.permanentDelete(vaultToken, selectedEntry.id);
      setPasswords(passwords.filter(p => p.id !== selectedEntry.id));
      setSelectedEntry(null);
    } catch (err) {
      console.error("Failed to delete permanently", err);
    }
  };
`;
content = content.replace('const handleDelete = async () => {', handleRestore + '\n  const handleDelete = async () => {');

const buttonsRegex = /<div className="flex gap-2">[\s\S]*?<\/div>\n            <\/div>\n\n            <div className="space-y-6">/;
const buttonsReplacement = `<div className="flex gap-2">
                {selectedEntry?.deletedAt ? (
                  <>
                    <button onClick={handleRestore} className="px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30 transition-colors flex items-center gap-1.5">
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button onClick={handlePermanentDelete} className="px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5">
                      <Trash2 size={16} /> Delete Forever
                    </button>
                  </>
                ) : isEditing ? (
                  <>
                    <button onClick={() => isEditing && selectedEntry.id !== 'new' ? handleSelectEntry(selectedEntry) : setSelectedEntry(null)} className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
                      {saving ? "Saving..." : <><Check size={16} /> Save</>}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Edit">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={handleDelete} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete to Trash">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {isEditing && (
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                  <select value={entryType} onChange={(e: any) => setEntryType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="password">Login / Password</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="identity">Identity / Social Security</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                    <option value="Finance">Finance</option>
                    <option value="Gaming">Gaming</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-6">`;
content = content.replace(buttonsRegex, buttonsReplacement);


// Dynamic Fields Logic
const usernameFieldRegex = /<div>\s*<label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1\.5">Username \/ Email<\/label>[\s\S]*?<\/div>\s*<\/div>/;
const dynamicFieldsReplacement = `<div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  {entryType === 'password' ? 'Username / Email' : entryType === 'credit_card' ? 'Cardholder Name' : 'Full Name'}
                </label>
                <div className="flex items-center">
                  {isEditing ? (
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">
                      {username || <span className="text-slate-400 italic">None</span>}
                    </div>
                  )}
                  {!isEditing && username && (
                    <button onClick={() => copyToClipboard(username, 'username')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                      {copiedField === 'username' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  )}
                </div>
              </div>`;
content = content.replace(usernameFieldRegex, dynamicFieldsReplacement);

// We need to inject additional fields before the Password block if credit_card or identity
const passwordFieldRegex = /{[\s\S]*?\/\* Password Field \*\//;
const dynamicPropsInjection = `{/* Dynamic Custom Fields */}
              {entryType === 'credit_card' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Card Number</label>
                    <div className="flex items-center">
                      {isEditing ? (
                        <input
                          type="text"
                          value={customFields?.cardNumber || ""}
                          onChange={(e) => setCustomFields({ ...customFields, cardNumber: e.target.value })}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                          placeholder="0000 0000 0000 0000"
                        />
                      ) : (
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">
                          {customFields?.cardNumber || <span className="text-slate-400 italic">None</span>}
                        </div>
                      )}
                      {!isEditing && customFields?.cardNumber && (
                        <button onClick={() => copyToClipboard(customFields.cardNumber, 'cardNumber')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                          {copiedField === 'cardNumber' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Exp</label>
                      {isEditing ? (
                        <input type="text" value={customFields?.exp || ""} onChange={e => setCustomFields({...customFields, exp: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono" placeholder="MM/YY"/>
                      ) : <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">{customFields?.exp || "-"}</div>}
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">CVV</label>
                      {isEditing ? (
                        <input type="text" value={customFields?.cvv || ""} onChange={e => setCustomFields({...customFields, cvv: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono" placeholder="123"/>
                      ) : <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">{customFields?.cvv ? "***" : "-"}</div>}
                    </div>
                  </div>
                </div>
              )}

              {entryType === 'identity' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">SSN / Passport Number</label>
                  <div className="flex items-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={customFields?.identityNumber || ""}
                        onChange={(e) => setCustomFields({ ...customFields, identityNumber: e.target.value })}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    ) : (
                      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-sm">
                        {customFields?.identityNumber ? (showPassword ? customFields.identityNumber : '***-**-****') : <span className="text-slate-400 italic">None</span>}
                      </div>
                    )}
                    {!isEditing && customFields?.identityNumber && (
                      <button onClick={() => copyToClipboard(customFields.identityNumber, 'idNum')} className="ml-2 p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                        {copiedField === 'idNum' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Password Field */`;
content = content.replace('              {/* Password Field */}', dynamicPropsInjection);

const pwdTitleRegex = /<label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1\.5 flex justify-between">\s*Password/m;
const pwdTitleReplacement = `<label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  {entryType === 'credit_card' ? 'Card PIN' : 'Password'}`;
content = content.replace(pwdTitleRegex, pwdTitleReplacement);

fs.writeFileSync('src/app/passwords/page.tsx', content);
console.log('Patched phase 3');
