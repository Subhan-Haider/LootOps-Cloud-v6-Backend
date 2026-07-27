const fs = require('fs');
let content = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

const oldBulkDelete = `const handleBulkDelete = async () => {
    if (!vaultToken || selectedIds.size === 0) return;
    if (!confirm(\`Are you sure you want to permanently delete \${selectedIds.size} credentials?\`)) return;
    
    try {
      await api.passwords.bulkDelete(vaultToken, Array.from(selectedIds));
      setPasswords(passwords.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setSelectionMode(false);
      setSelectedEntry(null);
    } catch (err) {
      console.error("Failed to bulk delete", err);
      alert("Failed to delete credentials.");
    }
  };`;

const newBulkLogic = `
  const handleBulkAction = async (action: 'delete' | 'permanent' | 'restore') => {
    if (!vaultToken || selectedIds.size === 0) return;
    
    if (action === 'permanent') {
      if (!confirm(\`Permanently delete \${selectedIds.size} credentials forever? This cannot be undone.\`)) return;
      await api.passwords.bulkPermanentDelete(vaultToken, Array.from(selectedIds));
      setPasswords(passwords.filter(p => !selectedIds.has(p.id)));
    } else if (action === 'restore') {
      await api.passwords.bulkRestore(vaultToken, Array.from(selectedIds));
      setPasswords(passwords.map(p => selectedIds.has(p.id) ? { ...p, deletedAt: null } : p));
    } else {
      if (!confirm(\`Move \${selectedIds.size} credentials to Trash?\`)) return;
      await api.passwords.bulkDelete(vaultToken, Array.from(selectedIds));
      setPasswords(passwords.map(p => selectedIds.has(p.id) ? { ...p, deletedAt: Date.now() } : p));
    }
    
    setSelectedIds(new Set());
    setSelectionMode(false);
    setSelectedEntry(null);
  };
`;
content = content.replace(oldBulkDelete, newBulkLogic);

const oldBulkButton = `<button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-medium transition-colors"
              >
                <Trash2 size={16} /> Delete {selectedIds.size > 0 ? selectedIds.size : ''} Selected
              </button>`;

const newBulkButton = `
              {filterCategory === 'Trash' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('restore')}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white font-medium transition-colors"
                  >
                    <RotateCcw size={16} /> Restore
                  </button>
                  <button
                    onClick={() => handleBulkAction('permanent')}
                    disabled={selectedIds.size === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-medium transition-colors"
                  >
                    <Trash2 size={16} /> Delete Forever
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={selectedIds.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-medium transition-colors"
                >
                  <Trash2 size={16} /> Delete {selectedIds.size > 0 ? selectedIds.size : ''} Selected
                </button>
              )}
`;
content = content.replace(oldBulkButton, newBulkButton);

fs.writeFileSync('src/app/passwords/page.tsx', content);
console.log('Patched phase 4');
