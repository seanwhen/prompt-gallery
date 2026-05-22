const OLD_DB_NAME = 'PromptGalleryDB';
const OLD_DB_VERSION = 5;
const META_STORE = 'items_meta';
const MEDIA_STORE = 'items_media';
const THUMB_STORE = 'items_thumbs';

function openOldDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OLD_DB_NAME, OLD_DB_VERSION);
    req.onupgradeneeded = () => resolve(req.result);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function deleteDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(OLD_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Check if old IndexedDB has data that needs migration.
 */
export async function hasOldData() {
  try {
    const db = await openOldDB();
    const items = await getAllFromStore(db, META_STORE);
    db.close();
    return items.length > 0;
  } catch {
    return false;
  }
}

/**
 * Migrate all items from old IndexedDB to the new backend API.
 * Returns { migrated: number, failed: number }.
 */
export async function migrateToAPI(onProgress) {
  const db = await openOldDB();
  const metaItems = await getAllFromStore(db, META_STORE);
  const mediaItems = await getAllFromStore(db, MEDIA_STORE);
  const thumbItems = await getAllFromStore(db, THUMB_STORE);

  // Build lookup maps
  const mediaMap = new Map(mediaItems.map((m) => [m.id, m.data]));
  const thumbMap = new Map(thumbItems.map((t) => [t.id, t.data]));

  let migrated = 0;
  let failed = 0;

  for (const meta of metaItems) {
    try {
      const formData = new FormData();

      // Attach media file if exists
      const mediaData = mediaMap.get(meta.id);
      if (mediaData instanceof Blob) {
        const ext = getExtFromFileName(meta.fileName);
        const fileName = meta.fileName || `file${ext}`;
        formData.append('file', mediaData, fileName);
        formData.append('item_type', meta.type || 'image');
      }

      formData.append('prompt', meta.prompt || '');
      formData.append('tags', JSON.stringify(meta.tags || []));
      if (meta.workflowName) formData.append('workflow_name', meta.workflowName);

      // Attach reference image if exists
      const refData = mediaMap.get(meta.id + '_ref');
      if (refData instanceof Blob) {
        formData.append('reference_image', refData, 'reference.png');
      }

      const res = await fetch('/api/items', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      migrated++;
      if (onProgress) onProgress(migrated, metaItems.length);
    } catch (e) {
      console.error('Migration failed for item:', meta.id, e);
      failed++;
    }
  }

  db.close();

  // Delete old database after successful migration
  if (migrated > 0) {
    await deleteDB();
  }

  return { migrated, failed, total: metaItems.length };
}

function getExtFromFileName(fileName) {
  if (!fileName) return '.bin';
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.substring(dot) : '.bin';
}
