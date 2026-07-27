const fs = require('fs');
let content = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

// 1. Add states
const stateRegex = /const \[passwords, setPasswords\] = useState<any\[\]>\(\[\]\);/;
content = content.replace(stateRegex, `const [passwords, setPasswords] = useState<any[]>([]);
  const [groupByWebsite, setGroupByWebsite] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());`);

// 2. Add toggle in the filter bar
const filterBarRegex = /<select value={filterCategory}[\s\S]*?<\/select>/;
content = content.replace(filterBarRegex, 
`<select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  { ['All', 'Favorites', 'Trash', 'Personal', 'Work', 'Finance', 'Gaming'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setGroupByWebsite(!groupByWebsite)} 
                  className={\`p-1.5 rounded-md border \${groupByWebsite ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'}\`}
                  title="Group by Website"
                >
                  <Folder size={16} />
                </button>`);

// 3. Add Folder import if missing (It's probably already imported since I used it before, wait, Folder might not be imported! Let's just import it)
// It was imported in previous steps or I can just add it to lucide-react imports.
content = content.replace(/ChevronDown,/, "ChevronDown,\n  Folder,\n  ChevronRight,");

// 4. Grouping logic and rendering
// We replace the entire filteredPasswords.map(...) with a new grouped rendering block
const renderRegex = /\{filteredPasswords\.map\(entry => \{[\s\S]*?\}\)\}/;

const groupedRender = `
              {(() => {
                const renderItem = (entry: any) => {
                  const isWeak = weakPasswords.includes(entry);
                  const isReused = reusedPasswords.includes(entry);
                  return (
                    <div 
                      key={entry.id}
                      onClick={(e) => { 
                        if (selectionMode) {
                          toggleSelection(e, entry.id);
                        } else {
                          handleSelectEntry(entry); 
                          setActiveTab("vault"); 
                        }
                      }}
                      className={\`p-4 cursor-pointer transition-colors group relative flex justify-between items-center
                        hover:bg-slate-50 dark:hover:bg-slate-800/50
                        \${selectedEntry?.id === entry.id && !selectionMode
                          ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-500' 
                          : 'border-l-4 border-transparent'}
                        \${selectionMode && selectedIds.has(entry.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}\`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        {selectionMode && (
                          <div className="shrink-0 text-indigo-500">
                            {selectedIds.has(entry.id) ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300 dark:text-slate-600" />}
                          </div>
                        )}
                        {!selectionMode && (
                          <div className="shrink-0 text-slate-400 dark:text-slate-500 w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                            {entry.type === 'credit_card' ? <CreditCard size={14} /> : 
                             entry.type === 'identity' ? <User size={14} /> : 
                             entry.website ? (
                               <img src={\`https://www.google.com/s2/favicons?domain=\${entry.website}&sz=64\`} alt="" className="w-4 h-4 rounded-sm" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                             ) : <Key size={14} />}
                             {entry.website && <Key size={14} className="hidden" />}
                          </div>
                        )}
                        <div className="overflow-hidden flex items-center">
                          <h3 className={\`font-medium text-slate-900 dark:text-slate-100 truncate text-sm \${entry.deletedAt ? 'line-through opacity-50' : ''}\`}>
                            {entry.title || entry.website || "Untitled"}
                          </h3>
                          {entry.favorite && <Star size={14} className="text-amber-400 shrink-0 ml-2" fill="currentColor" />}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {(isWeak || isReused) && (
                          <span title="Security Warning"><ShieldAlert size={14} className="text-amber-500" /></span>
                        )}
                        {!selectionMode && (
                          <button onClick={(e) => toggleFavorite(e, entry)} className={\`p-1.5 rounded-md transition-opacity \${entry.favorite ? 'opacity-100 text-amber-400 hover:text-amber-500' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-400'}\`}>
                            <Star size={16} fill={entry.favorite ? 'currentColor' : 'none'} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                };

                if (!groupByWebsite) {
                  return filteredPasswords.map(renderItem);
                }

                // Group by website/title
                const groups: Record<string, any[]> = {};
                filteredPasswords.forEach(p => {
                  const key = p.website || p.title || "Untitled";
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(p);
                });

                return Object.entries(groups).map(([groupName, items]) => {
                  if (items.length === 1) return renderItem(items[0]);
                  
                  const isExpanded = expandedGroups.has(groupName);
                  return (
                    <div key={groupName} className="border-b border-slate-100 dark:border-slate-800/50">
                      <div 
                        onClick={() => {
                          const next = new Set(expandedGroups);
                          if (next.has(groupName)) next.delete(groupName);
                          else next.add(groupName);
                          setExpandedGroups(next);
                        }}
                        className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex justify-between items-center group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                           <div className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500">
                             <Folder size={14} />
                           </div>
                           <div>
                             <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{groupName}</h3>
                             <p className="text-xs text-slate-500">{items.length} accounts</p>
                           </div>
                        </div>
                        <ChevronRight size={16} className={\`text-slate-400 transition-transform \${isExpanded ? 'rotate-90' : ''}\`} />
                      </div>
                      {isExpanded && (
                         <div className="bg-slate-50/30 dark:bg-slate-900/10 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4 divide-y divide-slate-100 dark:divide-slate-800/50">
                           {items.map(renderItem)}
                         </div>
                      )}
                    </div>
                  );
                });
              })()}
`;
content = content.replace(renderRegex, groupedRender);

fs.writeFileSync('src/app/passwords/page.tsx', content);
console.log('Patched grouping');
