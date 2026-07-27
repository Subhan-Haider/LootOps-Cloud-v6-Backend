const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isWindows = process.platform === 'win32';

function getUploadPath() {
  return process.env.UPLOAD_PATH || (isWindows ? path.join(__dirname, "../uploads") : "/var/www/storage/uploads");
}

function getPasswordsPath() {
  return path.join(getUploadPath(), "passwords.enc");
}

function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || "default_unsafe_secret_key_change_me_in_production";
  return crypto.createHash('sha256').update(secret).digest();
}

const ALGORITHM = 'aes-256-gcm';

function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptData(encryptedStr) {
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) throw new Error("Invalid encryption format");
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (err) {
    console.error("[PasswordsEngine] Decryption failed:", err.message);
    return [];
  }
}

function ensurePasswordsFile() {
  const filePath = getPasswordsPath();
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, encryptData([]));
  }
  return filePath;
}

function getPasswords() {
  const filePath = ensurePasswordsFile();
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    let passwords = decryptData(rawData);
    
    let needsSave = false;
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    // Process items: auto-purge old items, and enforce schema
    const filtered = [];
    for (let p of passwords) {
      if (p.deletedAt && now - p.deletedAt > thirtyDaysMs) {
        needsSave = true; // Item expired, discard it
        continue; 
      }
      // Migrate old data
      if (!p.type) { p.type = 'password'; needsSave = true; }
      if (!p.category) { p.category = 'Personal'; needsSave = true; }
      if (!p.customFields) { p.customFields = {}; needsSave = true; }
      filtered.push(p);
    }
    
    if (needsSave) {
      savePasswords(filtered);
    }
    return filtered;
  } catch (err) {
    console.error("[PasswordsEngine] Error reading passwords:", err);
    return [];
  }
}

function savePasswords(passwords) {
  const filePath = ensurePasswordsFile();
  fs.writeFileSync(filePath, encryptData(passwords));
}

function createPassword(title, username, password, website, notes, totpSecret, type = 'password', category = 'Personal', customFields = {}, favorite = false) {
  const passwords = getPasswords();
  const newEntry = {
    id: crypto.randomUUID(),
    title: title || "Untitled",
    username: username || "",
    password: password || "",
    website: website || "",
    notes: notes || "",
    totpSecret: totpSecret || "",
    type: type, favorite: favorite || false,
    category: category,
    customFields: customFields,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  passwords.push(newEntry);
  savePasswords(passwords);
  return newEntry;
}

function updatePassword(id, title, username, password, website, notes, totpSecret, type, category, customFields, favorite) {
  const passwords = getPasswords();
  const index = passwords.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  if (title !== undefined) passwords[index].title = title;
  if (username !== undefined) passwords[index].username = username;
  if (password !== undefined) passwords[index].password = password;
  if (website !== undefined) passwords[index].website = website;
  if (notes !== undefined) passwords[index].notes = notes;
  if (totpSecret !== undefined) passwords[index].totpSecret = totpSecret;
  if (type !== undefined) passwords[index].type = type;
  if (category !== undefined) passwords[index].category = category;
  if (customFields !== undefined) passwords[index].customFields = customFields;
    if (favorite !== undefined) passwords[index].favorite = favorite;
  
  passwords[index].updatedAt = new Date().toISOString();
  
  savePasswords(passwords);
  return passwords[index];
}

function deletePassword(id) {
  const passwords = getPasswords();
  const index = passwords.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  passwords[index].deletedAt = Date.now();
  savePasswords(passwords);
  return true;
}

function bulkDelete(ids) {
  let passwords = getPasswords();
  let changed = false;
  passwords.forEach(p => {
    if (ids.includes(p.id) && !p.deletedAt) {
      p.deletedAt = Date.now();
      changed = true;
    }
  });
  
  if (changed) {
    savePasswords(passwords);
    return true;
  }
  return false;
}

function restorePassword(id) {
  const passwords = getPasswords();
  const index = passwords.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  delete passwords[index].deletedAt;
  savePasswords(passwords);
  return true;
}

function bulkRestore(ids) {
  let passwords = getPasswords();
  let changed = false;
  passwords.forEach(p => {
    if (ids.includes(p.id) && p.deletedAt) {
      delete p.deletedAt;
      changed = true;
    }
  });
  if (changed) {
    savePasswords(passwords);
    return true;
  }
  return false;
}

function permanentDelete(id) {
  const passwords = getPasswords();
  const index = passwords.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  passwords.splice(index, 1);
  savePasswords(passwords);
  return true;
}

function bulkPermanentDelete(ids) {
  let passwords = getPasswords();
  const initialLength = passwords.length;
  passwords = passwords.filter(p => !ids.includes(p.id));
  
  if (passwords.length !== initialLength) {
    savePasswords(passwords);
    return true;
  }
  return false;
}

module.exports = {
  getPasswords,
  createPassword,
  updatePassword,
  deletePassword,
  bulkDelete,
  restorePassword,
  bulkRestore,
  permanentDelete,
  bulkPermanentDelete
};
