const fs = require('fs');
let content = fs.readFileSync('src/app/passwords/page.tsx', 'utf8');

content = content.replace('ListChecks\n} from "lucide-react";', 'ListChecks,\n  CreditCard,\n  User,\n  Folder,\n  RotateCcw,\n  ChevronDown\n} from "lucide-react";');

content = content.replace(
  'const [totpProgress, setTotpProgress] = useState(0);',
  'const [totpProgress, setTotpProgress] = useState(0);\n  const [entryType, setEntryType] = useState<"password"|"credit_card"|"identity">("password");\n  const [category, setCategory] = useState("Personal");\n  const [customFields, setCustomFields] = useState<any>({});\n  const [filterCategory, setFilterCategory] = useState("All");\n  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);'
);

content = content.replace(
  'setTotpSecret("");\n    setIsEditing(true);',
  'setTotpSecret("");\n    setEntryType("password");\n    setCategory(filterCategory !== "All" && filterCategory !== "Trash" ? filterCategory : "Personal");\n    setCustomFields({});\n    setIsEditing(true);'
);

content = content.replace(
  'setTotpSecret(entry.totpSecret || "");\n    setIsEditing(false);',
  'setTotpSecret(entry.totpSecret || "");\n    setEntryType(entry.type || "password");\n    setCategory(entry.category || "Personal");\n    setCustomFields(entry.customFields || {});\n    setIsEditing(false);'
);

content = content.replace(
  'const payload = { title, username, password, website, notes, totpSecret };',
  'const payload = { title, username, password, website, notes, totpSecret, type: entryType, category, customFields };'
);

content = content.replace(
  'await api.passwords.delete(vaultToken, selectedEntry.id);\n      setPasswords(passwords.filter(p => p.id !== selectedEntry.id));',
  'await api.passwords.delete(vaultToken, selectedEntry.id);\n      setPasswords(passwords.map(p => p.id === selectedEntry.id ? { ...p, deletedAt: Date.now() } : p));'
);

content = content.replace(
  'const filteredPasswords = passwords.filter(p => \n    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || \n    p.website.toLowerCase().includes(searchQuery.toLowerCase()) ||\n    p.username.toLowerCase().includes(searchQuery.toLowerCase())\n  );',
  'const filteredPasswords = passwords.filter(p => {\n    if (filterCategory === "Trash") return p.deletedAt;\n    if (p.deletedAt) return false;\n    if (filterCategory !== "All" && p.category !== filterCategory) return false;\n    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) || \n    p.website.toLowerCase().includes(searchQuery.toLowerCase()) ||\n    p.username.toLowerCase().includes(searchQuery.toLowerCase());\n  });'
);

fs.writeFileSync('src/app/passwords/page.tsx', content);
console.log('Patched phase 1');
