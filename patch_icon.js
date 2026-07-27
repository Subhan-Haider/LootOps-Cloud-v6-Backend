const fs = require('fs');
let content = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

const regex = /{!selectionMode && \(\s*<div className="shrink-0 text-slate-400 dark:text-slate-500">\s*{entry\.type === 'credit_card' \? <CreditCard size={18} \/> : \s*entry\.type === 'identity' \? <User size={18} \/> : \s*<Key size={18} \/>}\s*<\/div>\s*\)}/m;

const replacement = `{!selectionMode && (
                        <div className="shrink-0 text-slate-400 dark:text-slate-500 w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                          {entry.type === 'credit_card' ? <CreditCard size={14} /> : 
                           entry.type === 'identity' ? <User size={14} /> : 
                           entry.website ? (
                             <img src={\`https://www.google.com/s2/favicons?domain=\${entry.website}&sz=64\`} alt="" className="w-4 h-4 rounded-sm" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                           ) : <Key size={14} />}
                           {entry.website && <Key size={14} className="hidden" />}
                        </div>
                      )}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/app/passwords/page.tsx', content);
console.log('Patched icon');
