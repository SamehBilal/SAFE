/* A memory wall: polaroids clipped with wooden pegs to wavy strings of warm lights, on a night background.
   Adapted from the hang.html template. hangWall(items) where each item is
   { html: '<img …>', caption, sub, href?, tilt? } — two polaroids hang on each string. */
import { esc } from './shell.js';

const WIRE = '<svg class="hang__wire" viewBox="0 0 37 996" preserveAspectRatio="none" aria-hidden="true"><path d="M21.2 3C28.7 25.6 40.9 121 29.1 186.9 13.3 257.5 4.2 253.1 21.2 351.6c8.6 50.1 13.4 58.8 7.9 98.6-15.1 50-39.3 48.5-15.8 151.5 17.8 92.7-1.2 55.9-9.1 170.6-3.9 57.4 2.8 80 9.1 100 7.9 31.9 0 88.3 7.5 120.6" fill="none" stroke="#fff3e8" stroke-width="3" stroke-linecap="round"/></svg>';
const LIGHTS = [[5, -15, 120], [20, 90, -50], [35, -10, -5], [50, -90, -105], [65, -70, 15], [80, -100, -105], [96, -50, 0]];

export function hangWall(items, { empty = '' } = {}) {
	const wires = [];
	for (let i = 0; i < Math.max(items.length, 1); i += 2) wires.push(items.slice(i, i + 2));
	return `<div class="hang">${wires.map((pair, w) => `
		<div class="hang__col" style="--w:${w}">
			${WIRE}
			${LIGHTS.map(([top, x, r], k) => `<i class="hang__light" style="top:${top}%;--x:${x}%;--r:${r}deg;--k:${(w * 7 + k) % 9}"></i>`).join('')}
			${pair.length ? pair.map((it, k) => polaroid(it, k, w)).join('') : `<div class="polaroid polaroid--empty" style="--top:22%;--tilt:-2deg"><span class="polaroid__ph">✈️</span><span class="polaroid__cap">${esc(empty)}</span></div>`}
		</div>`).join('')}
	</div>`;
}

function polaroid(it, k, w) {
	const top = k ? 58 + ((w * 7) % 3) * 4 : 14 + ((w * 5) % 3) * 5;
	const tilt = it.tilt ?? [-2, 2.5, -1, 3, 1.5, -3][(w * 2 + k) % 6];
	const peg = [-25, 15, 35, -10, 20, 18][(w + k * 3) % 6];
	const tag = it.href ? 'a' : 'figure';
	return `<${tag} class="polaroid"${it.href ? ` href="${esc(it.href)}"` : ''} style="--top:${top}%;--tilt:${tilt}deg;--peg:${peg}deg" data-media-box>
		<span class="polaroid__pic">${it.html || '<span class="polaroid__ph">♥</span>'}</span>
		<span class="polaroid__cap">${esc(it.caption || '')}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>
	</${tag}>`;
}
