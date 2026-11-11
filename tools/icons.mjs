#!/usr/bin/env node
/* The app's icon: the pebble tableau Sameh made for Esraa — a house of wooden sticks on a blackboard in a wooden frame,
   and the four of us inside as beach pebbles (Sameh with Abdulrahman in his arms, Esraa, Fahd).
   Writes assets/icons/icon.svg (and its maskable twin), then the PNGs if @resvg/resvg-wasm can be found:
     node tools/icons.mjs [path/to/node_modules/@resvg/resvg-wasm] */
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/icons');

const defs = `<defs>
	<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d9a6"/><stop offset=".55" stop-color="#ddbb7c"/><stop offset="1" stop-color="#c49a5a"/></linearGradient>
	<linearGradient id="frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1dcaa"/><stop offset="1" stop-color="#cfa767"/></linearGradient>
	<radialGradient id="board" cx=".45" cy=".4" r=".8"><stop offset="0" stop-color="#2a2c2a"/><stop offset="1" stop-color="#121312"/></radialGradient>
	<radialGradient id="shine" cx=".34" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></radialGradient>
</defs>`;

/* a stick: a rounded bar of wood from (x1,y1) to (x2,y2), with a little grain */
function stick(x1, y1, x2, y2, w = 26) {
	const len = Math.hypot(x2 - x1, y2 - y1), a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
	return `<g transform="translate(${x1} ${y1}) rotate(${a.toFixed(2)})">
		<rect x="0" y="${-w / 2}" width="${len.toFixed(1)}" height="${w}" rx="7" fill="url(#wood)"/>
		<rect x="0" y="${-w / 2}" width="${len.toFixed(1)}" height="${w}" rx="7" fill="none" stroke="#a87d43" stroke-opacity=".45" stroke-width="2"/>
		<path d="M${len * 0.12} ${-w * 0.12}h${len * 0.3}M${len * 0.55} ${w * 0.18}h${len * 0.3}" stroke="#a87d43" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
	</g>`;
}
/* a pebble: its colour, a soft shine and shadow, and a faint outline */
const stone = (cx, cy, rx, ry, rot, color) => `<g transform="translate(${cx} ${cy}) rotate(${rot})">
	<ellipse rx="${rx}" ry="${ry}" fill="${color}"/><ellipse rx="${rx}" ry="${ry}" fill="url(#shine)"/>
	<ellipse rx="${rx}" ry="${ry}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/></g>`;

const tableau = `
	${stick(140, 252, 140, 402)}${stick(372, 252, 372, 402)}
	${stick(116, 262, 252, 156)}${stick(260, 156, 396, 262)}
	${stick(346, 168, 346, 196, 24)}
	<g filter="url(#drop)">
		${stone(203, 346, 47, 63, -8, '#d6a65a')}
		${stone(276, 350, 39, 56, 3, '#e3ddc6')}
		${stone(334, 366, 31, 38, 5, '#dccaa0')}
		${stone(216, 254, 30, 27, 10, '#d2a24c')}
		${stone(276, 272, 27, 26, 0, '#a5a888')}
		${stone(326, 314, 19, 18, 0, '#d9973f')}
		${stone(232, 330, 17, 10, 40, '#c4873a')}
		${stone(256, 346, 15, 9, -18, '#c4873a')}
	</g>`;
const drop = `<filter id="drop" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity=".45"/></filter>`;

/* the usual icon: the frame shows as a wooden edge round the board */
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs.replace('</defs>', drop + '</defs>')}
	<rect width="512" height="512" rx="112" fill="url(#frame)"/>
	<rect x="34" y="34" width="444" height="444" rx="82" fill="url(#board)"/>
	<rect x="34" y="34" width="444" height="444" rx="82" fill="none" stroke="#8a6436" stroke-opacity=".5" stroke-width="3"/>
	<g transform="translate(256 262) scale(1.08) translate(-256 -278)">${tableau}</g>
</svg>`;

/* maskable: the phone cuts its own shape, so everything that matters sits in the middle 80% */
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs.replace('</defs>', drop + '</defs>')}
	<rect width="512" height="512" fill="url(#board)"/>
	<g transform="translate(256 262) scale(.86) translate(-256 -278)">${tableau}</g>
</svg>`;

await writeFile(path.join(OUT, 'icon.svg'), icon + '\n');
await writeFile(path.join(OUT, 'maskable.svg'), maskable + '\n');
console.log('✓ assets/icons/icon.svg, maskable.svg');

const lib = process.argv[2];
if (!lib) { console.log('(give the path to @resvg/resvg-wasm to make the PNGs too)'); process.exit(0); }
const { initWasm, Resvg } = await import(pathToFileURL(path.join(lib, 'index.mjs')).href);
await initWasm(await readFile(path.join(lib, 'index_bg.wasm')));
const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
for (const [name, svg, size] of [['icon-192', icon, 192], ['icon-512', icon, 512], ['maskable-192', maskable, 192], ['maskable-512', maskable, 512], ['apple-touch-icon', maskable, 180]]) {
	await writeFile(path.join(OUT, name + '.png'), png(svg, size));
	console.log('✓ assets/icons/' + name + '.png');
}
