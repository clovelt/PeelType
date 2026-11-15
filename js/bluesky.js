// AT Protocol client for PeelType (dependency-free, browser only).
// Talks directly to a PDS (bsky.social) over XRPC with an App Password.
//
// Login uses the legacy App Password flow (com.atproto.server.createSession),
// which keeps this dependency-free. OAuth would be the production upgrade.

const PDS = 'https://bsky.social';
const SCENE_COLLECTION = 'com.peeltype.scene';
const SESSION_KEY = 'peeltype.bsky.session';

// ── Low-level XRPC ──────────────────────────────────────────────────────────
async function xrpc(method, path, { token, body, raw = false } = {}) {
  const url = `${PDS}/xrpc/${path}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const resp = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.text()).slice(0, 300); } catch {}
    const err = new Error(`XRPC ${path} → ${resp.status}${detail ? `: ${detail}` : ''}`);
    err.status = resp.status;
    throw err;
  }
  if (raw) return resp;
  return resp.json();
}

// ── Session ─────────────────────────────────────────────────────────────────
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export async function createSession(identifier, password) {
  // Normalize: strip a leading "@" (bsky parses "@handle" as an empty email local part).
  const id = String(identifier || '').trim().replace(/^@/, '');
  const session = await xrpc('POST', 'com.atproto.server.createSession', {
    body: { identifier: id, password }
  });
  const trimmed = {
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt,
    did: session.did,
    handle: session.handle
  };
  saveSession(trimmed);
  return trimmed;
}

export async function refreshSession(refreshJwt) {
  const session = await xrpc('POST', 'com.atproto.server.refreshSession', {
    token: refreshJwt
  });
  const trimmed = {
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt,
    did: session.did,
    handle: session.handle
  };
  saveSession(trimmed);
  return trimmed;
}

export async function deleteSession(refreshJwt) {
  try { await xrpc('POST', 'com.atproto.server.deleteSession', { token: refreshJwt }); } catch {}
  saveSession(null);
}

// ── Reading posts ───────────────────────────────────────────────────────────
export async function fetchAuthorFeed(actor, token, { limit = 30, cursor } = {}) {
  const params = new URLSearchParams({ actor, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return xrpc('GET', `app.bsky.feed.getAuthorFeed?${params.toString()}`, { token });
}

// ── Blobs (thumbnail for the post card) ─────────────────────────────────────
export async function uploadBlob(bytes, mimeType, token) {
  const resp = await fetch(`${PDS}/xrpc/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': mimeType },
    body: bytes
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.text()).slice(0, 200); } catch {}
    throw new Error(`uploadBlob → ${resp.status}${detail ? `: ${detail}` : ''}`);
  }
  return resp.json(); // { blob: { ref, mimeType, size } }
}

// ── Records ─────────────────────────────────────────────────────────────────
export function parseAtUri(uri) {
  // at://did:plc:xxx/collection/rkey
  const m = String(uri || '').match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!m) throw new Error(`Invalid at-uri: ${uri}`);
  return { did: m[1], collection: m[2], rkey: m[3] };
}

export function randomRkey() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let s = '';
  for (let i = 0; i < 13; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function createRecord(token, { repo, collection, rkey, record }) {
  return xrpc('POST', 'com.atproto.repo.createRecord', {
    token,
    body: { repo, collection, rkey, record }
  });
}

export async function getRecord(atUri) {
  const { did, collection, rkey } = parseAtUri(atUri);
  return xrpc('GET', `com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`);
}

// ── Publishing a scene as a com.peeltype.scene record ──────────────────────
export async function publishScene(token, { did, config, title, description }) {
  const rkey = randomRkey();
  const record = {
    $type: SCENE_COLLECTION,
    title: title || config?.title || 'Untitled PeelType piece',
    description: description || '',
    config, // full self-contained pieceConfig
    createdAt: new Date().toISOString()
  };
  const created = await createRecord(token, { repo: did, collection: SCENE_COLLECTION, rkey, record });
  return { uri: created.uri, rkey, record };
}

// ── Publishing a Bluesky post with an external-link card ────────────────────
export async function createPost(token, { did, text, url, title, description, thumb }) {
  const record = {
    text,
    createdAt: new Date().toISOString(),
    langs: ['es']
  };
  if (url) {
    const external = { uri: url, title: title || '', description: description || '' };
    if (thumb) external.thumb = thumb;
    record.embed = { $type: 'app.bsky.embed.external', external };
  }
  return createRecord(token, { repo: did, collection: 'app.bsky.feed.post', rkey: randomRkey(), record });
}

// ── Facets → BBCode ─────────────────────────────────────────────────────────
// Bluesky facets use UTF-8 byte offsets; JS strings use UTF-16 code units, so
// we build a byte→char map before slicing. Produces PeelType BBCode.
export function facetsToBbcode(text, facets) {
  if (!text) return '';
  if (!Array.isArray(facets) || !facets.length) return text;

  // Build byte offset → char index map (skip UTF-8 continuation bytes).
  const bytes = new TextEncoder().encode(text);
  const byteToChar = new Array(bytes.length + 1);
  let charIdx = 0;
  byteToChar[0] = 0;
  for (let b = 0; b < bytes.length; b++) {
    byteToChar[b + 1] = charIdx;
    if ((bytes[b] & 0xc0) !== 0x80) charIdx++;
  }

  const sorted = facets
    .filter(f => f?.index && f.features?.length)
    .sort((a, b) => a.index.byteStart - b.index.byteStart);

  let out = '';
  let cursor = 0;
  for (const facet of sorted) {
    const start = byteToChar[facet.index.byteStart] ?? 0;
    const end = byteToChar[facet.index.byteEnd] ?? text.length;
    if (start < cursor) continue;
    out += text.slice(cursor, start);
    const chunk = text.slice(start, end);
    const feature = facet.features[0];
    const type = feature?.$type || '';
    if (type.includes('#mention') && feature.did) {
      const label = chunk.replace(/^@/, '');
      out += `[color=#784830]@${label}[/color]`;
    } else if (type.includes('#tag')) {
      const tag = (feature.tag || chunk.replace(/^#/, '')).replace(/[\s]+/g, '');
      out += `[color=#1f6f52]#${tag}[/color]`;
    } else if (type.includes('#link') && feature.uri) {
      out += `[url=${feature.uri}]${chunk}[/url]`;
    } else {
      out += chunk;
    }
    cursor = end;
  }
  out += text.slice(cursor);
  return out;
}
