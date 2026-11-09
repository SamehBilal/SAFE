#!/usr/bin/env node
/* Adds songs to our encrypted song list (content/live/music.bin), the same file the phones write.
   Usage: node tools/add-songs.mjs "Song — Artist" "Song — Artist" …
   Songs already on the list (same title and artist) are skipped. Run `git pull` first so you add to the latest list. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMaster, seal, open, toB64, fromB64 } from '../assets/js/core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'content/live/music.bin');
const args = process.argv.slice(2);
if (!args.length) { console.error('Give songs as "Title — Artist"'); process.exit(1); }

const key = await importMaster(fromB64((await readFile(path.join(ROOT, 'private/.master-key'), 'utf8')).trim()));
let data = { items: [] };
if (existsSync(FILE)) data = JSON.parse(new TextDecoder().decode(await open(key, fromB64((await readFile(FILE, 'utf8')).trim()))));
data.items ||= [];

const same = (a, b) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
let at = Date.now();
let added = 0;
for (const arg of args) {
	const [title, artist = ''] = arg.split(/\s+[—–-]\s+/);
	if (data.items.some((x) => same(x.title, title) && same(x.artist || '', artist))) { console.log('· already there:', arg); continue; }
	// the first song given ends up numbered 1 (the page lists newest first)
	data.items.push({ id: (at).toString(36) + Math.random().toString(36).slice(2, 6), title: title.trim(), artist: artist.trim(), link: '', note: '', by: 'him', at: at++ });
	added++;
}
await mkdir(path.dirname(FILE), { recursive: true });
await writeFile(FILE, toB64(await seal(key, new TextEncoder().encode(JSON.stringify(data)))));
console.log(`✓ ${added} added, ${data.items.length} on the list`);
