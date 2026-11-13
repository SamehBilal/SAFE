/* Big photos (over 1.5 MB, straight off a camera) get a smaller copy for the site: at most 2000px on the long side,
   JPEG at 85%. The copies live in private/.cache/shrunk/ (named by the original's hash, so each photo is shrunk
   once); the originals in private/media are never touched. Uses the Edge or Chrome already on this PC, headless,
   through its DevTools protocol, so there's nothing to install. If neither is found, the originals are used. */

import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

const LIMIT = 1.5 * 1024 * 1024, SIDE = 2000, QUALITY = 0.85;
const IMG = /\.(jpe?g|png|webp)$/i;
const BROWSERS = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
	'/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/microsoft-edge'
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** files: paths relative to mediaDir. Returns Map(relative path → path of the copy to use instead). */
export async function shrinkBig(mediaDir, files, cacheDir) {
	const out = new Map();
	const big = files.filter((f) => IMG.test(f) && statSync(path.join(mediaDir, f)).size > LIMIT);
	if (!big.length) return out;
	await mkdir(cacheDir, { recursive: true });
	const todo = [];
	for (const f of big) {
		const hash = createHash('sha256').update(await readFile(path.join(mediaDir, f))).digest('hex').slice(0, 24);
		const copy = path.join(cacheDir, `${hash}-${SIDE}.jpg`);
		if (existsSync(copy)) out.set(f, copy);
		else todo.push({ f, copy });
	}
	if (!todo.length) return out;

	const exe = BROWSERS.find((b) => existsSync(b));
	if (!exe) { console.warn(`! ${todo.length} big photo(s) used as they are (no Edge or Chrome found to shrink them)`); return out; }
	const prof = path.join(os.tmpdir(), `us-shrink-${process.pid}`);
	const port = 9400 + (process.pid % 400);
	const browser = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
	try {
		let page;
		for (let i = 0; i < 60 && !page; i++) {
			try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
			if (!page) await sleep(250);
		}
		if (!page) throw new Error('the browser did not start');
		const ws = new WebSocket(page.webSocketDebuggerUrl);
		await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
		let id = 0;
		const wait = new Map();
		ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } };
		const run = (expression) => new Promise((res, rej) => {
			const n = ++id;
			wait.set(n, (m) => (m.error || m.result?.exceptionDetails ? rej(new Error(m.error?.message || m.result.exceptionDetails.exception?.description || 'failed')) : res(m.result.result.value)));
			ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
		});
		for (const { f, copy } of todo) {
			const bytes = await readFile(path.join(mediaDir, f));
			const type = /\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg';
			try {
				// hand the photo over in pieces: one huge message is more than the browser takes in one go
				const b64in = bytes.toString('base64'), STEP = 4 * 1024 * 1024;
				await run('window.__parts = []; true');
				for (let i = 0; i < b64in.length; i += STEP) await run(`window.__parts.push('${b64in.slice(i, i + STEP)}'); true`);
				const b64 = await run(`(async () => {
					const blob = new Blob(window.__parts.map((p) => Uint8Array.from(atob(p), (ch) => ch.charCodeAt(0))), { type: '${type}' });
					window.__parts = [];
					const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
					const k = Math.min(1, ${SIDE} / Math.max(bmp.width, bmp.height));
					const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
					const g = c.getContext('2d');
					g.imageSmoothingQuality = 'high';
					g.drawImage(bmp, 0, 0, c.width, c.height);
					const out = await c.convertToBlob({ type: 'image/jpeg', quality: ${QUALITY} });
					const buf = new Uint8Array(await out.arrayBuffer());
					let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
					return btoa(s);
				})()`);
				const small = Buffer.from(b64, 'base64');
				await writeFile(copy, small);
				out.set(f, copy);
				console.log(`• Shrank ${f}: ${(bytes.length / 1048576).toFixed(1)} MB → ${(small.length / 1048576).toFixed(1)} MB`);
			} catch (e) {
				console.warn(`! Couldn't shrink ${f} (${e.message.split('\n')[0]}) — using it as it is`);
			}
		}
		ws.close();
	} catch (e) {
		console.warn(`! Big photos used as they are: ${e.message}`);
	} finally {
		browser.kill();
		await sleep(600);
		await rm(prof, { recursive: true, force: true }).catch(() => {});
	}
	return out;
}
