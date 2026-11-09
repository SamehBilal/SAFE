/* The part of the site you both write from your phones: the journal, the songs, the draw lists and sketches.

   Each collection is one file in the repo, content/live/<kind>.bin, encrypted with the same master key as the
   story (so only the right answers can read it). Sketches are one file each: content/live/s/<id>.bin.

   - Writing goes through the GitHub API with a token kept on this phone only (settings.html). A write reads the
     latest file, applies the change, and saves with its sha; if the other phone saved in between, it retries.
   - Reading uses the API when there's a token (instant), otherwise the published file (a minute or two behind).
   - The last copy read is kept, still encrypted, so pages open offline. */
import { seal, open, toB64, fromB64 } from './core.js';
import { App, getKey, store } from './shell.js';

const CFG = 'us.gh';
const ME = 'us.me';
const API = 'https://api.github.com';
const enc = new TextEncoder();
const dec = new TextDecoder();

export function config() {
	let c = {};
	try { c = JSON.parse(store.get(CFG) || '{}'); } catch { c = {}; }
	const d = App.story?.sync || {};
	return { owner: c.owner || d.owner || '', repo: c.repo || d.repo || '', branch: c.branch || d.branch || 'main', token: c.token || '' };
}
export function setConfig(c) { store.set(CFG, JSON.stringify(c)); }
export const me = () => (store.get(ME) === 'her' ? 'her' : store.get(ME) === 'him' ? 'him' : '');
export const setMe = (v) => store.set(ME, v);
export const canWrite = () => { const c = config(); return !!(c.token && c.owner && c.repo && me()); };

export class SyncError extends Error {
	constructor(code, msg) { super(msg); this.code = code; }
}

/* ---- encoding: JSON <-> encrypted base64 text (what the file holds) ---- */
async function lock(bytes) { return toB64(await seal(getKey(), bytes)); }
async function unlockText(text) { return open(getKey(), fromB64(text.trim())); }
const toJSON = async (text) => JSON.parse(dec.decode(await unlockText(text)));
const b64 = (s) => btoa(s); // file text is already ASCII

/* ---- GitHub API ---- */
async function gh(path, opts = {}) {
	const c = config();
	if (!c.token) throw new SyncError('token', 'no token');
	let r;
	try {
		r = await fetch(`${API}/repos/${c.owner}/${c.repo}/${path}`, {
			...opts,
			cache: 'no-store',
			headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${c.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) }
		});
	} catch {
		throw new SyncError('offline', 'offline');
	}
	if (r.status === 401) throw new SyncError('auth', 'bad token');
	if (r.status === 403) throw new SyncError('forbidden', 'no permission');
	return r;
}

async function readFile(path) {
	const c = config();
	const r = await gh(`contents/${path}?ref=${encodeURIComponent(c.branch)}`);
	if (r.status === 404) return { text: null, sha: undefined };
	if (!r.ok) throw new SyncError('http', String(r.status));
	const j = await r.json();
	return { text: atob((j.content || '').replace(/\s/g, '')), sha: j.sha };
}

async function writeFile(path, text, sha, message) {
	const c = config();
	const r = await gh(`contents/${path}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message, content: b64(text), sha, branch: c.branch })
	});
	if (r.status === 409 || r.status === 422) return false; // someone saved first
	if (!r.ok) throw new SyncError('http', String(r.status));
	return true;
}

/** Test the settings: can we see the repo, and may we write to it? */
export async function check() {
	const r = await gh('');
	if (r.status === 404) throw new SyncError('repo', 'repo not found');
	if (!r.ok) throw new SyncError('http', String(r.status));
	const j = await r.json();
	return { push: !!j.permissions?.push, private: j.private };
}

/* ---- collections ---- */
const mem = new Map();
const cacheKey = (k) => 'us.live.' + k;

/** The collection, as fresh as we can get it. `init` is used when nothing was saved yet. */
export async function load(kind, init = () => ({ items: [] })) {
	let text = null;
	try {
		if (config().token) text = (await readFile(`content/live/${kind}.bin`)).text;
		else {
			const r = await fetch(`content/live/${kind}.bin`, { cache: 'no-store' });
			text = r.ok ? await r.text() : null;
			if (r.status === 404) text = '';
		}
	} catch { text = null; }
	if (text === null) text = store.get(cacheKey(kind)); // offline: the last copy we saw
	else store.set(cacheKey(kind), text || '');
	let data;
	try { data = text ? await toJSON(text) : init(); } catch { data = init(); }
	mem.set(kind, data);
	return data;
}

export const peek = (kind) => mem.get(kind);

/** Change a collection: `mutate(data)` is applied to the latest saved copy, then saved. */
export async function save(kind, mutate, init = () => ({ items: [] })) {
	if (!canWrite()) throw new SyncError('setup', 'not set up');
	const path = `content/live/${kind}.bin`;
	for (let attempt = 0; attempt < 4; attempt++) {
		const { text, sha } = await readFile(path);
		let data;
		try { data = text ? await toJSON(text) : init(); } catch { throw new SyncError('key', 'cannot read saved data'); }
		mutate(data);
		const out = await lock(enc.encode(JSON.stringify(data)));
		if (await writeFile(path, out, sha, `Update ${kind}`)) {
			store.set(cacheKey(kind), out);
			mem.set(kind, data);
			return data;
		}
	}
	throw new SyncError('busy', 'kept colliding');
}

/* ---- sketches ---- */
export async function putSketch(blob) {
	if (!canWrite()) throw new SyncError('setup', 'not set up');
	const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
	const text = await lock(new Uint8Array(await blob.arrayBuffer()));
	if (!(await writeFile(`content/live/s/${id}.bin`, text, undefined, 'Add sketch'))) throw new SyncError('http', 'exists');
	urls.set(id, Promise.resolve(URL.createObjectURL(blob)));
	return id;
}

const urls = new Map();
export function sketchURL(id) {
	if (!urls.has(id)) {
		urls.set(id, (async () => {
			let text = null;
			// fresh from GitHub when this phone has a token; otherwise, or if that fails, the published copy
			if (config().token) {
				try {
					const r = await gh(`contents/content/live/s/${id}.bin?ref=${encodeURIComponent(config().branch)}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
					if (r.ok) text = await r.text();
				} catch { /* fall back below */ }
			}
			if (text === null) {
				const r = await fetch(`content/live/s/${id}.bin`);
				if (!r.ok) throw new Error('missing');
				text = await r.text();
			}
			return URL.createObjectURL(new Blob([await unlockText(text)], { type: 'image/webp' }));
		})());
		// a failure (offline, a slow deploy) isn't remembered: the next page tries again
		urls.get(id).catch(() => urls.delete(id));
	}
	return urls.get(id);
}

/** Fill <img data-sketch="id"> in a block. */
export function hydrateSketches(root) {
	for (const el of root.querySelectorAll('img[data-sketch]:not([src])')) {
		sketchURL(el.dataset.sketch).then((u) => { el.src = u; }).catch(() => el.remove());
	}
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** A friendly message for a failed save. */
export function why(err) {
	const L = App.L;
	switch (err?.code) {
		case 'setup': return L('لازم تظبطي المزامنة الأول من صفحة الإعدادات', 'Set up syncing on the settings page first');
		case 'token': case 'auth': return L('الـ token مش شغال — راجعيه في الإعدادات', 'The token isn’t working — check it in settings');
		case 'forbidden': return L('الـ token مالوش صلاحية كتابة على الريبو', 'The token can’t write to the repo');
		case 'offline': return L('مفيش نت — جربي تاني لما النت يرجع', 'You’re offline — try again when you’re back online');
		case 'key': return L('مش قادر أقرا الملف المحفوظ (المفتاح اتغير؟)', 'Can’t read the saved file (did the key change?)');
		case 'busy': return L('التليفون التاني كان بيحفظ في نفس الوقت — جربي تاني', 'The other phone was saving at the same time — try again');
		default: return L('حصلت مشكلة في الحفظ', 'Something went wrong while saving') + (err?.message ? ` (${err.message})` : '');
	}
}
