import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../api/client';

function normalizeItem(item) {
  const normalized = {
    ...item,
    fileName: item.file_name,
    workflowName: item.workflow_name,
    createdAt: item.created_at,
    hasAudio: item.has_audio,
    referenceImage: item.reference_image_path || null,
  };
  // Build videoMeta for backward compatibility with components
  if (item.type === 'video' && (item.width || item.height || item.duration)) {
    normalized.videoMeta = {
      width: item.width || 0,
      height: item.height || 0,
      duration: item.duration || 0,
      hasAudio: item.has_audio || false,
    };
  }
  return normalized;
}

// Load all items metadata
export async function getAllItems() {
  const items = await apiGet('/items');
  return items.map(normalizeItem);
}

/**
 * Return the API URL for an item's media file.
 */
export async function getMedia(id, suffix = '') {
  if (suffix === '_ref') return `/api/media/${id}/ref`;
  return `/api/media/${id}/original`;
}

/**
 * Return the API URL for an item's thumbnail.
 */
export async function getThumb(id) {
  return `/api/media/${id}/thumb`;
}

/**
 * Create or update an item.
 */
export async function putItem(item, isNew = false) {
  if (isNew) {
    const formData = new FormData();
    if (item.media) formData.append('file', item.media);
    formData.append('prompt', item.prompt || '');
    formData.append('tags', JSON.stringify(item.tags || []));
    if (item.workflowName) formData.append('workflow_name', item.workflowName);
    if (item.referenceImage && item.referenceImage instanceof Blob) {
      formData.append('reference_image', item.referenceImage);
    }
    const result = await apiUpload('/items', formData);
    return normalizeItem(result);
  } else if (item.referenceImage instanceof Blob) {
    // Update with reference image upload needs FormData
    const formData = new FormData();
    formData.append('prompt', item.prompt || '');
    formData.append('tags', JSON.stringify(item.tags || []));
    if (item.workflowName) formData.append('workflow_name', item.workflowName);
    formData.append('reference_image', item.referenceImage);
    const result = await apiUpload(`/items/${item.id}/ref`, formData, 'PUT');
    return normalizeItem(result);
  } else if (item.referenceImage === null && item.id) {
    // Delete reference image
    await apiDelete(`/items/${item.id}/ref`);
    const body = {};
    if (item.prompt !== undefined) body.prompt = item.prompt;
    if (item.tags !== undefined) body.tags = item.tags;
    if (item.workflowName !== undefined) body.workflow_name = item.workflowName;
    const result = await apiPut(`/items/${item.id}`, body);
    return normalizeItem(result);
  } else {
    const body = {};
    if (item.prompt !== undefined) body.prompt = item.prompt;
    if (item.tags !== undefined) body.tags = item.tags;
    if (item.workflowName !== undefined) body.workflow_name = item.workflowName;
    const result = await apiPut(`/items/${item.id}`, body);
    return normalizeItem(result);
  }
}

export async function deleteItem(id) {
  return apiDelete(`/items/${id}`);
}

export async function deleteItems(ids) {
  return apiPost('/items/batch-delete', ids);
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Migrate videos without reference_image_path to generate full-resolution first frames.
 */
export async function migrateVideoRefs() {
  return apiPost('/items/migrate-refs', {});
}
