const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const illustrationsDir = path.join(root, 'illustrations');
const port = Number(process.env.PORT || 4242);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, body, headers = {}) {
  send(res, status, JSON.stringify(body), {
    'Content-Type': mime['.json'],
    'Cache-Control': 'no-store, max-age=0',
    ...headers
  });
}

function safeJoin(base, target) {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(path.resolve(base))) return null;
  return resolved;
}

async function listIllustrations(dir = illustrationsDir, prefix = 'illustrations') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await listIllustrations(full, rel));
    else if (/\.(svg|png|jpe?g|gif)$/i.test(entry.name)) files.push(rel);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function parseMultipart(buffer, contentType = '') {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2];
  if (!boundary) return null;
  const raw = buffer.toString('binary');
  const part = raw.split(`--${boundary}`).find(chunk => /name="file"/.test(chunk));
  if (!part) return null;
  const headerEnd = part.indexOf('\r\n\r\n');
  if (headerEnd < 0) return null;
  const header = part.slice(0, headerEnd);
  const filename = header.match(/filename="([^"]+)"/)?.[1] || `asset-${Date.now()}.svg`;
  const body = part.slice(headerEnd + 4).replace(/\r\n$/, '');
  return { filename, data: Buffer.from(body, 'binary') };
}

function safeAssetName(name) {
  const ext = path.extname(name).toLowerCase();
  if (!['.svg', '.png', '.jpg', '.jpeg', '.gif'].includes(ext)) return null;
  const base = path.basename(name, ext).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
  return `${base}${ext}`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/illustrations' && req.method === 'GET') {
      await fs.mkdir(illustrationsDir, { recursive: true });
      sendJson(res, 200, { files: await listIllustrations() });
      return;
    }
    if (url.pathname === '/api/illustrations' && req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const parsed = parseMultipart(Buffer.concat(chunks), req.headers['content-type']);
      const name = parsed && safeAssetName(parsed.filename);
      if (!parsed || !name) {
        sendJson(res, 400, { error: 'Expected svg, png, jpg, or gif file.' });
        return;
      }
      await fs.mkdir(illustrationsDir, { recursive: true });
      await fs.writeFile(path.join(illustrationsDir, name), parsed.data);
      sendJson(res, 200, { path: `illustrations/${name}` });
      return;
    }

    if (url.pathname === '/api/locales' && req.method === 'GET') {
      const localesDir = path.join(root, 'js', 'locales');
      try {
        const files = await fs.readdir(localesDir);
        const codes = files.filter(f => /^[a-z]{2,8}\.js$/.test(f)).map(f => f.slice(0, -3));
        sendJson(res, 200, codes);
      } catch { sendJson(res, 200, []); }
      return;
    }

    if (url.pathname === '/api/save-poem' && req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { body = null; }
      if (!body?.id || !Array.isArray(body.blocks)) { sendJson(res, 400, { error: 'Invalid config' }); return; }
      // `label` is a manifest-only field (the scene-selector name); keep it out of the scene file.
      const requestedLabel = typeof body.label === 'string' ? body.label.trim() : '';
      delete body.label;
      // Resolve filename from poems.json manifest; register new scenes on the fly.
      const manifestPath = path.join(root, 'js', 'poems.json');
      let manifest = [];
      try {
        const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
        if (Array.isArray(parsed)) manifest = parsed;
      } catch {}
      // Legacy: the bundled poem keeps id 'tirita-poema' under manifest key 'tirita'.
      let entry = manifest.find(e => (body.id === 'tirita-poema' && e.key === 'tirita') || e.key === body.id);
      let createdEntry = false;
      if (!entry) {
        const safeId = String(body.id).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'poem';
        entry = { key: body.id, label: requestedLabel || body.title || body.id, src: `./js/${safeId}.json` };
        manifest.push(entry);
        createdEntry = true;
      }
      const destPath = entry.src ? safeJoin(root, entry.src.replace(/^\.\//, '')) : null;
      if (!destPath || path.extname(destPath).toLowerCase() !== '.json') { sendJson(res, 400, { error: 'Unsafe destination' }); return; }
      await fs.writeFile(destPath, JSON.stringify(body, null, 2), 'utf8');
      if (createdEntry) await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      sendJson(res, 200, { ok: true, path: path.relative(root, destPath), created: createdEntry });
      return;
    }

    if (url.pathname === '/api/save-locale' && req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { body = {}; }
      const { lang, label, strings, wordTriggers } = body || {};
      if (!lang || !/^[a-z]{2,8}$/.test(lang)) { sendJson(res, 400, { error: 'Invalid language code' }); return; }
      const constName = `TIRITA_LOCALE_${lang.toUpperCase()}`;
      const strLines = Object.entries(strings || {}).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(String(v))}`).join(',\n');
      const wtLines = Object.entries(wordTriggers || {}).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
      const content = `export const ${constName} = {\n  lang: ${JSON.stringify(lang)},\n  label: ${JSON.stringify(label || lang)},\n  strings: {\n${strLines}\n  },\n  wordTriggers: {\n${wtLines}\n  }\n};\n`;
      await fs.writeFile(path.join(root, 'js', 'locales', `${lang}.js`), content, 'utf8');
      sendJson(res, 200, { ok: true, path: `js/locales/${lang}.js` });
      return;
    }

    const requested = url.pathname === '/' ? 'tirita.html' : decodeURIComponent(url.pathname.slice(1));
    const filePath = safeJoin(root, requested);
    if (!filePath) {
      send(res, 403, 'Forbidden');
      return;
    }
    let resolvedPath = filePath;
    try {
      await fs.access(resolvedPath);
    } catch (err) {
      const migratedIllustration = requested.replace(/^illustrations\/(t_[^/]+)$/i, 'illustrations/tirita/$1');
      if (migratedIllustration !== requested) {
        const fallbackPath = safeJoin(root, migratedIllustration);
        if (fallbackPath) resolvedPath = fallbackPath;
      }
    }
    const data = await fs.readFile(resolvedPath);
    send(res, 200, data, {
      'Content-Type': mime[path.extname(resolvedPath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, max-age=0'
    });
  } catch (err) {
    send(res, err.code === 'ENOENT' ? 404 : 500, err.code === 'ENOENT' ? 'Not found' : err.message);
  }
});

server.listen(port, () => {
  console.log(`PeelType running at http://localhost:${port}/`);
});
