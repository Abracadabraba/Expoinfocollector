// Simple localStorage-backed data layer with revision history.
// Each customer record:
// {
//   id, createdAt, updatedAt,
//   data: { basic:{}, products:[], productDetails:{}, gmp:{}, communication:{} },
//   history: [ { version: 'R1', savedAt, data } , ... ]  // snapshots BEFORE each edit save
// }

const STORAGE_KEY = 'customer_registration_records_v1';

// Thrown when localStorage is full and even after trying to reclaim space we
// still can't write. Callers (UI) should catch this and tell the user to
// export/back up and free up space, instead of failing silently.
export class StorageFullError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageFullError';
  }
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read records', e);
    return [];
  }
}

// History snapshots only exist so the "R1/R2/R3" version label + word-doc
// change log can show what a record's *text fields* used to say. The
// business-card photo is never read back out of history (exportDocx only
// ever uses the CURRENT record.data.businessCardImage), so keeping a full
// copy of the photo in every single past revision was pure wasted space —
// and on a phone with several edited records this is what fills up
// localStorage's quota and makes every future save fail.
function stripImageFromSnapshot(data) {
  if (!data || !data.basic) return data;
  const { businessCardImage, businessCardImageWidth, businessCardImageHeight, ...restBasic } = data.basic;
  return { ...data, basic: restBasic };
}

function isQuotaError(e) {
  return (
    e &&
    (e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 ||
      e.code === 1014)
  );
}

function writeAll(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    if (!isQuotaError(e)) throw e;
    // Storage is full. Most of the bloat is old business-card photos sitting
    // in history entries from previous edits — strip those out (they aren't
    // used anywhere) and retry once before giving up.
    console.warn('localStorage quota hit, pruning history photos and retrying', e);
    const pruned = records.map((r) => ({
      ...r,
      history: (r.history || []).map((h) => ({ ...h, data: stripImageFromSnapshot(h.data) })),
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch (e2) {
      throw new StorageFullError(
        '手机本地存储空间已满，无法保存新记录。请先用"导出 Word"备份重要客户资料，然后删除一些旧记录或旧照片再试。'
      );
    }
  }
}

// Runs once at app startup to reclaim space from records saved by older
// versions of the app, which kept a full copy of the business-card photo in
// every history entry. Safe to call anytime; it's a no-op if there's nothing
// to prune. This does NOT touch any record's current data/photo — only old
// history snapshots, which are never displayed or exported.
export function pruneHistoryImages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const records = JSON.parse(raw);
    let changed = false;
    const pruned = records.map((r) => {
      const history = (r.history || []).map((h) => {
        if (h.data && h.data.basic && h.data.basic.businessCardImage) {
          changed = true;
          return { ...h, data: stripImageFromSnapshot(h.data) };
        }
        return h;
      });
      return { ...r, history };
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
      console.info('Pruned old business-card photos from record history to free up storage space.');
    }
  } catch (e) {
    console.error('pruneHistoryImages failed', e);
  }
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
    // Snapshot of state prior to this edit. The business-card photo is
    // intentionally NOT kept here — exportDocx only ever uses the current
    // record's photo, and keeping a full copy on every edit was what
    // filled up phone storage after a few edits. See stripImageFromSnapshot.
    data: stripImageFromSnapshot(record.data),
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
