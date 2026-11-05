export const STORAGE_KEY = 'oreumoreum.records.v1';

export function restoreRecords(catalog, raw) {
  let saved = [];
  try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) saved = parsed; } catch { /* Start from the catalog if JSON is damaged. */ }
  return catalog.map(oreum => {
    const record = saved.find(item => item && item.id === oreum.id);
    return { ...oreum, favorite: record?.favorite === true, visited: record?.visited === true };
  });
}

export function toggleRecord(records, id, field) {
  if (!['favorite', 'visited'].includes(field)) throw new Error('Unknown record field');
  return records.map(item => item.id === id ? { ...item, [field]: !item[field] } : item);
}

export function filterRecords(records, region = '전체', view = 'all') {
  return records.filter(item => (region === '전체' || item.region === region)
    && (view !== 'favorites' || item.favorite) && (view !== 'visited' || item.visited));
}
