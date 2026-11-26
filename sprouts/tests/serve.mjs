// Tiny static server for local play and tests. Serves the WHOLE repository root so the game is
// reached at the same subpath as on the live site: http://localhost:8790/sprouts/
//   node tests/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

export function serve(port = 8790) {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = normalize(join(repo, p));
      if (!file.startsWith(repo)) { res.writeHead(403).end(); return; }
      let s = await stat(file).catch(() => null);
      if (s && s.isDirectory()) {
        if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }).end(); return; }
        file = join(file, 'index.html'); s = await stat(file).catch(() => null);
      }
      if (!s) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(await readFile(file));
    } catch (e) { res.writeHead(500).end(String(e)); }
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +process.argv[2] || 8790;
  await serve(port);
  console.log(`Sprout Pals: http://localhost:${port}/sprouts/`);
}
