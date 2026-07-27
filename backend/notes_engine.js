const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isWindows = process.platform === 'win32';

function getUploadPath() {
  return process.env.UPLOAD_PATH || (isWindows ? path.join(__dirname, "../uploads") : "/var/www/storage/uploads");
}

function getNotesPath() {
  return path.join(getUploadPath(), "notes.json");
}

function ensureNotesFile() {
  const notesPath = getNotesPath();
  if (!fs.existsSync(notesPath)) {
    fs.mkdirSync(path.dirname(notesPath), { recursive: true });
    fs.writeFileSync(notesPath, JSON.stringify([]));
  }
  return notesPath;
}

function getNotes() {
  const notesPath = ensureNotesFile();
  try {
    return JSON.parse(fs.readFileSync(notesPath, 'utf8'));
  } catch (err) {
    console.error("[NotesEngine] Error reading notes:", err);
    return [];
  }
}

function saveNotes(notes) {
  const notesPath = ensureNotesFile();
  fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
}

function createNote(title, content, tags, isPinned, linkedFiles, isVaulted) {
  const notes = getNotes();
  const newNote = {
    id: crypto.randomUUID(),
    title: title || "Untitled Note",
    content: content || "",
    tags: Array.isArray(tags) ? tags : [],
    isPinned: Boolean(isPinned),
    isVaulted: Boolean(isVaulted),
    linkedFiles: Array.isArray(linkedFiles) ? linkedFiles : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  notes.push(newNote);
  saveNotes(notes);
  return newNote;
}

function updateNote(id, title, content, tags, isPinned, linkedFiles, isVaulted) {
  const notes = getNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) return null;
  
  if (title !== undefined) notes[index].title = title;
  if (content !== undefined) notes[index].content = content;
  if (tags !== undefined) notes[index].tags = Array.isArray(tags) ? tags : [];
  if (isPinned !== undefined) notes[index].isPinned = Boolean(isPinned);
  if (isVaulted !== undefined) notes[index].isVaulted = Boolean(isVaulted);
  if (linkedFiles !== undefined) notes[index].linkedFiles = Array.isArray(linkedFiles) ? linkedFiles : [];
  
  notes[index].updatedAt = new Date().toISOString();
  
  saveNotes(notes);
  return notes[index];
}

function deleteNote(id) {
  const notes = getNotes();
  const filtered = notes.filter(n => n.id !== id);
  if (filtered.length === notes.length) return false;
  
  saveNotes(filtered);
  return true;
}

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote
};
