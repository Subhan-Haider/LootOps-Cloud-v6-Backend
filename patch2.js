const fs = require('fs');
let content = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

// 8. Sidebar Header -> add Category Dropdown toggle
const sidebarHeaderRegex = /<h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">[\s\S]*?<\/h2>/m;
const sidebarHeaderReplacement = `<div className="relative">
              <button 
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 hover:opacity-80"
              >
                {filterCategory === 'Trash' ? <Trash2 size={18} className="text-red-500" /> : <Folder size={18} className="text-indigo-500" />}
                {filterCategory === 'All' ? 'All Items' : filterCategory}
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                  {['All', 'Personal', 'Work', 'Finance', 'Gaming'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setFilterCategory(cat); setShowCategoryDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      {cat}
                    </button>
                  ))}
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                  <button
                    onClick={() => { setFilterCategory('Trash'); setShowCategoryDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-red-500 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Trash
                  </button>
                </div>
              )}
            </div>`;
content = content.replace(sidebarHeaderRegex, sidebarHeaderReplacement);

// 9. Sidebar list item icon logic
const sidebarListRegex = /<div className="flex items-center gap-3 overflow-hidden pr-2">[\s\S]*?<h3 className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm mb-0\.5">/m;
const sidebarListReplacement = `<div className="flex items-center gap-3 overflow-hidden pr-2">
                      {selectionMode && (
                        <div className="shrink-0 text-indigo-500">
                          {selectedIds.has(entry.id) ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300 dark:text-slate-600" />}
                        </div>
                      )}
                      {!selectionMode && (
                        <div className="shrink-0 text-slate-400 dark:text-slate-500">
                          {entry.type === 'credit_card' ? <CreditCard size={18} /> : 
                           entry.type === 'identity' ? <User size={18} /> : 
                           <Key size={18} />}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <h3 className={\`font-medium text-slate-900 dark:text-slate-100 truncate text-sm mb-0.5 \${entry.deletedAt ? 'line-through opacity-50' : ''}\`}>`;
content = content.replace(sidebarListRegex, sidebarListReplacement);

fs.writeFileSync('src/app/passwords/page.tsx', content);
console.log('Patched phase 2');
