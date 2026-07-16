// Simple localStorage-backed data layer with revision history.
// Each customer record:
// {
//   id, createdAt, updatedAt,
//   data: { basic:{}, products:[], productDetails:{}, gmp:{}, communication:{} },
//   history: [ { version: 'R1', savedAt, data } , ... ]  // snapshots BEFORE each edit save
// }

const STORAGE_KEY = 'customer_registration_records_v1';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read records', e);
    return [];
  }
}

function writeAll(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function listRecords() {
  return readAll().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getRecord(id) {
  return readAll().find((r) => r.id === id) || null;
}

export function createRecord(data) {
  const records = readAll();
  const now = new Date().toISOString();
  const record = {
    id: 'C' + Date.now().toString(36).toUpperCase(),
    createdAt: now,
    updatedAt: now,
    data,
    history: [],
  };
  records.push(record);
  writeAll(records);
  return record;
}

// Saves an edit to an existing record, pushing the PREVIOUS state into history
// tagged with the next revision number (R1, R2, R3, ...).
export function updateRecord(id, newData) {
  const records = readAll();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const record = records[idx];
  const nextVersionNumber = record.history.length + 1;
  const versionTag = 'R' + nextVersionNumber;
  record.history.push({
    version: versionTag,
    savedAt: new Date().toISOString(),
    data: record.data, // snapshot of state prior to this edit
  });
  record.data = newData;
  record.updatedAt = new Date().toISOString();
  records[idx] = record;
  writeAll(records);
  return record;
}

export function deleteRecord(id) {
  const records = readAll().filter((r) => r.id !== id);
  writeAll(records);
}

export function currentVersionLabel(record) {
  if (!record) return '';
  return record.history.length === 0 ? '原始版 / Original' : 'R' + record.history.length;
}
