import { getApiBase } from './env';

async function parseMaybeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text; // not JSON
  }
}

export async function httpGet(path, { headers = {} } = {}) {
  const base = getApiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', ...headers },
    credentials: 'omit',
  });
  const data = await parseMaybeJson(res);
  if (!res.ok) {
    const msg = typeof data === 'string' ? data : (data?.message || res.statusText);
    throw new Error(`GET ${url} failed (${res.status}): ${msg}`);
  }
  return data;
}

export async function httpPost(path, body, { headers = {} } = {}) {
  const base = getApiBase();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body ?? {}),
    credentials: 'omit',
  });
  const data = await parseMaybeJson(res);
  if (!res.ok) {
    const msg = typeof data === 'string' ? data : (data?.message || res.statusText);
    throw new Error(`POST ${url} failed (${res.status}): ${msg}`);
  }
  return data;
}
