#!/usr/bin/env node
/* Tiny static server for testing on this PC (and on your phone over Wi-Fi).
   Run:  node tools/serve.mjs   then open http://localhost:5174 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 5174;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
	const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	let file = path.join(ROOT, url);
	if (!file.startsWith(ROOT) || /[\\/](private|tools|\.git)([\\/]|$)/.test(path.relative(ROOT, file).replace(/^/, '/'))) {
		res.writeHead(403).end('no');
		return;
	}
	try {
		if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
		const body = await readFile(file);
		res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
		res.end(body);
	} catch {
		res.writeHead(404).end('not found');
	}
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
