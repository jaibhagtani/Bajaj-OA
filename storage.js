const fs = require('fs');

function loadFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read storage file, starting fresh:', err.message);
    return [];
  }
}

function saveFile(filePath, arr) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to write storage file:', err.message);
    return false;
  }
}

function saveRecord(filePath, record) {
  const arr = loadFile(filePath);
  arr.push(record);
  saveFile(filePath, arr);
}

module.exports = {
  loadFile,
  saveFile,
  saveRecord
};
