const BASE_URL = '/api';

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiUpload(path, formData, method = 'POST') {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    body: formData,
  });
  if (!res.ok) throw new Error(`UPLOAD ${path} failed: ${res.status}`);
  return res.json();
}
