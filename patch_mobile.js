const fs = require('fs');

let pageContent = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

// 1. Sidebar Wrapper
const sidebarRegex = /<div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 bg-white \\r?\\ndark:bg-slate-900">/;
pageContent = pageContent.replace(/<div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 bg-white \r?\ndark:bg-slate-900">/g, 
  "<div className={`border-r border-slate-200 dark:border-slate-800 flex-col h-full shrink-0 bg-white dark:bg-slate-900 w-full md:w-80 ${(selectedEntry || activeTab !== 'vault') ? 'hidden md:flex' : 'flex'}`}>\n");

// If the regex above failed because of newlines, try string replace:
if (!pageContent.includes("w-full md:w-80")) {
  pageContent = pageContent.replace('<div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 bg-white \ndark:bg-slate-900">', 
    "<div className={`border-r border-slate-200 dark:border-slate-800 flex-col h-full shrink-0 bg-white dark:bg-slate-900 w-full md:w-80 ${(selectedEntry || activeTab !== 'vault') ? 'hidden md:flex' : 'flex'}`}>\n");
}
if (!pageContent.includes("w-full md:w-80")) {
  pageContent = pageContent.replace('<div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 bg-white \r\ndark:bg-slate-900">', 
    "<div className={`border-r border-slate-200 dark:border-slate-800 flex-col h-full shrink-0 bg-white dark:bg-slate-900 w-full md:w-80 ${(selectedEntry || activeTab !== 'vault') ? 'hidden md:flex' : 'flex'}`}>\n");
}

// 2. Editor Wrapper
pageContent = pageContent.replace(/<div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 relative overflow-y-auto">/, 
  "<div className={`flex-1 flex-col h-full bg-white dark:bg-slate-950 relative overflow-y-auto ${(selectedEntry || activeTab !== 'vault') ? 'flex' : 'hidden md:flex'}`}>\n");

// 3. Settings Back Button
pageContent = pageContent.replace(/<h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">/, 
  `<h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                <button onClick={() => setActiveTab('vault')} className="md:hidden mr-2 p-2 -ml-2 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={24} className="rotate-180" /></button>`);

// 4. Health Back Button
pageContent = pageContent.replace(/<ShieldCheck className="text-amber-500" size=\{32\} \/> Security Health\n              <\/h2>/, 
  `<button onClick={() => setActiveTab('vault')} className="md:hidden mr-2 p-2 -ml-2 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={24} className="rotate-180" /></button>
                <ShieldCheck className="text-amber-500" size={32} /> Security Health
              </h2>`);

// 5. Editor Back Button
// The editor has a sticky header: <div className="p-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/50 sticky top-0 z-10">
// Inside it, <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
pageContent = pageContent.replace(/<h2 className="text-2xl font-bold text-slate-900 dark:text-white">/, 
  `<div className="flex items-center">
              <button onClick={() => setSelectedEntry(null)} className="md:hidden mr-3 p-2 -ml-2 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={24} className="rotate-180" /></button>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">`);
pageContent = pageContent.replace(/\{\/\* Action Buttons \*\/\}/, `</div>\n            {/* Action Buttons */}`);

// We need ChevronLeft, but lucide-react might not have it imported. Let's just use `<ChevronRight size={24} className="rotate-180" />` as I did above, since ChevronRight is definitely imported for the Accordions.

fs.writeFileSync('src/app/passwords/page.tsx', pageContent);
console.log("Patched layout");
