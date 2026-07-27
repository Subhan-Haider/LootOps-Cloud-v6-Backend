const fs = require('fs');

// 1. backend/passwords_engine.js
let pe = fs.readFileSync('backend/passwords_engine.js', 'utf8');
pe = pe.replace(/function createPassword\(title, username, password, website, notes, totpSecret, type = 'password', category =\s*'Personal', customFields = {}\) {/,
  "function createPassword(title, username, password, website, notes, totpSecret, type = 'password', category = 'Personal', customFields = {}, favorite = false) {");
pe = pe.replace(/type: type,/g, "type: type, favorite: favorite || false,");
pe = pe.replace(/function updatePassword\(id, title, username, password, website, notes, totpSecret, type, category, customFields\) {/,
  "function updatePassword(id, title, username, password, website, notes, totpSecret, type, category, customFields, favorite) {");
pe = pe.replace(/if \(customFields !== undefined\) passwords\[index\].customFields = customFields;/g, 
  "if (customFields !== undefined) passwords[index].customFields = customFields;\n    if (favorite !== undefined) passwords[index].favorite = favorite;");
fs.writeFileSync('backend/passwords_engine.js', pe);


// 2. backend/server.js
let svr = fs.readFileSync('backend/server.js', 'utf8');
svr = svr.replace(/const { title, username, password, website, notes, totpSecret, type, category, customFields } = req.body;/g, 
  "const { title, username, password, website, notes, totpSecret, type, category, customFields, favorite } = req.body;");
svr = svr.replace(/const newEntry = passwordsEngine.createPassword\(title, username, password, website, notes, totpSecret, type, category, customFields\);/g, 
  "const newEntry = passwordsEngine.createPassword(title, username, password, website, notes, totpSecret, type, category, customFields, favorite);");
svr = svr.replace(/const updatedEntry = passwordsEngine.updatePassword\(req.params.id, title, username, password, website, notes, totpSecret, type, category, customFields\);/g, 
  "const updatedEntry = passwordsEngine.updatePassword(req.params.id, title, username, password, website, notes, totpSecret, type, category, customFields, favorite);");
fs.writeFileSync('backend/server.js', svr);


// 3. src/app/passwords/page.tsx
let page = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

// Add Star import
page = page.replace('ChevronDown\n} from "lucide-react";', "ChevronDown,\n  Star\n} from \"lucide-react\";");

// Add 'Favorites' to category list
page = page.replace(/{ \['All', 'Personal', 'Work', 'Finance', 'Gaming'\]\.map\(cat => \(/, 
  "{ ['All', 'Favorites', 'Personal', 'Work', 'Finance', 'Gaming'].map(cat => (");

// Filter logic update for Favorites
page = page.replace(/if \(filterCategory === "Trash"\) return p.deletedAt;\n    if \(p.deletedAt\) return false;\n    if \(filterCategory !== "All" && p.category !== filterCategory\) return false;/m,
  `if (filterCategory === "Trash") return p.deletedAt;
    if (p.deletedAt) return false;
    if (filterCategory === "Favorites" && !p.favorite) return false;
    if (filterCategory !== "All" && filterCategory !== "Favorites" && p.category !== filterCategory) return false;`);
    
// Render Star toggle on items
// Find the closing of the h3 tag: </h3>
const h3Regex = /<\/h3>\s*<p className="text-xs text-slate-500 dark:text-slate-400 truncate">/g;
page = page.replace(h3Regex, 
  `</h3>
                        {entry.favorite && <Star size={14} className="text-amber-400 shrink-0 ml-2" fill="currentColor" />}
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">`);

// Inside handleSelectEntry, actually we don't strictly need to edit favorite via the form state since it's a direct toggle. 
// Let's add a quick toggle function that updates the backend directly.
const toggleFunction = `
  const toggleFavorite = async (e: React.MouseEvent, entry: any) => {
    e.stopPropagation();
    if (!vaultToken) return;
    try {
      const updatedEntry = await api.passwords.update(vaultToken, entry.id, { ...entry, favorite: !entry.favorite });
      setPasswords(passwords.map(p => p.id === entry.id ? updatedEntry : p));
      if (selectedEntry?.id === entry.id) setSelectedEntry(updatedEntry);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };
`;
page = page.replace('const handleBulkAction', toggleFunction + '\n  const handleBulkAction');

// Put the Star icon button right next to the ShieldAlert logic, or inside the flex box on the far right.
const shieldRegex = /\{\(isWeak \|\| isReused\) && \(\s*<span title="Security Warning"><ShieldAlert size={14} className="text-amber-500 shrink-0" \/><\/span>\s*\)\}/;
page = page.replace(shieldRegex, 
  `{(isWeak || isReused) && (
                      <span title="Security Warning"><ShieldAlert size={14} className="text-amber-500 shrink-0" /></span>
                    )}
                    {!selectionMode && (
                      <button 
                        onClick={(e) => toggleFavorite(e, entry)} 
                        className={\`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ml-2 \${entry.favorite ? 'opacity-100 text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-amber-400'}\`}
                      >
                        <Star size={16} fill={entry.favorite ? 'currentColor' : 'none'} />
                      </button>
                    )}`);

// Preserve favorite during handleSave
page = page.replace(/const payload = { title, username, password, website, notes, totpSecret, type: entryType, category, customFields };/g,
  "const payload = { title, username, password, website, notes, totpSecret, type: entryType, category, customFields, favorite: selectedEntry?.favorite || false };");

fs.writeFileSync('src/app/passwords/page.tsx', page);
console.log('Patched fav');
