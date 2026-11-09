#!/usr/bin/env node
/* Adds songs to our song list (private/live/music.json; the build encrypts it for the site).
   Usage: node tools/add-songs.mjs "Song — Artist" "Song — Artist" …   then   node tools/build.mjs
   Songs already on the list (same title and artist) are skipped. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'private/live/music.json');
const args = process.argv.slice(2);
if (!args.length) { console.error('Give songs as "Title — Artist"'); process.exit(1); }

let data = { items: [] };
if (existsSync(FILE)) data = JSON.parse(await readFile(FILE, 'utf8'));
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
await writeFile(FILE, JSON.stringify(data, null, '\t') + '\n');
console.log(`✓ ${added} added, ${data.items.length} on the list`);
