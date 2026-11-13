/* The night sky above the birthdays page, after two pens put together:
   - arcs' «Happy Birthday» (codepen.io/arcs/pen/XKKYZW): fireworks keep going up on their own, trails fading into
     the dark, and a tap anywhere sends three to five more to that spot;
   - Matei Copot's «Happy birthday Tiffany!» (codepen.io/towc/pen/LGMGQG): the greeting arrives a piece at a time,
     each piece shot up as a firework that blooms into it, and after a while every piece is tied to a balloon and
     floats away, then it all starts again.
   In Arabic the pieces are words (letters on their own would lose how they join); in English, letters.
   sky(box, lines) starts it in box (lines: an array of lines, each an array of pieces) and returns stop(). */
import { App, REDUCE } from './shell.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export function sky(box, lines) {
	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	box.prepend(canvas);
	const ctx = canvas.getContext('2d');
	const rtl = App.lang === 'ar';
	const face = rtl ? 'Lalezar, Cairo, sans-serif' : '"Bebas Neue", Lalezar, sans-serif';
	let w = 0, h = 0, size = 40, k = 1;       // k: the pens were tuned for a ~1000px-wide screen
	let pieces = [], rockets = [], restart = 0, shown = 0;

	/* ---------- the greeting, laid out to fit ---------- */
	function layout() {
		ctx.font = `100px ${face}`;
		const gap = rtl ? 28 : 8;
		const widths = lines.map((l) => l.reduce((a, p) => a + ctx.measureText(p).width, 0) + gap * (l.length - 1));
		size = Math.min(100 * (w * 0.86) / Math.max(...widths, 1), h / (lines.length * 1.9), 92);
		k = Math.max(0.5, Math.min(1.4, w / 1000));
		ctx.font = `${size}px ${face}`;
		const lh = size * 1.25, g = gap * (size / 100);
		const total = lines.length * lh;
		const old = pieces;
		pieces = [];
		let n = 0;
		lines.forEach((line, li) => {
			const ws = line.map((p) => ctx.measureText(p).width);
			const lw = ws.reduce((a, b) => a + b, 0) + g * (line.length - 1);
			let x = rtl ? (w + lw) / 2 : (w - lw) / 2;
			const y = h * 0.5 - total / 2 + lh * (li + 0.5);
			line.forEach((p, i) => {
				const cx = rtl ? x - ws[i] / 2 : x + ws[i] / 2;
				x += (rtl ? -1 : 1) * (ws[i] + g);
				const hue = Math.round((cx / w) * 300 + 320) % 360;   // a rainbow across, as in the pen
				pieces.push(Object.assign(old[n] || fresh(), { text: p, x: cx, y, hue }));
				n++;
			});
		});
	}
	function fresh() { return { phase: 'wait', t: 0, wait: rnd(0, 3.2), shards: [], trail: [] }; }
	function reset() { pieces = pieces.map((p) => Object.assign(fresh(), { text: p.text, x: p.x, y: p.y, hue: p.hue })); }

	function resize() {
		const r = box.getBoundingClientRect();
		const dpr = Math.min(devicePixelRatio || 1, 2);
		w = r.width; h = r.height;
		canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
		canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = '#090d1e';
		ctx.fillRect(0, 0, w, h);
		layout();
		if (REDUCE) still();
	}

	/* ---------- arcs' fireworks ---------- */
	function rocket(tx, ty, hue = rnd(0, 360), kids = rnd(30, 110)) {
		rockets.push({ x: rnd(w * 0.38, w * 0.62), y: h, tx, ty, hue, kids: kids * k, trail: [], dead: false });
	}
	function stepRocket(r, dt) {
		const dx = r.tx - r.x, dy = r.ty - r.y;
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
			r.x += dx * 2 * dt; r.y += dy * 2 * dt;
			r.trail.push([r.x, r.y]);
			if (r.trail.length > 20) r.trail.shift();
		} else {
			if (r.kids && !r.burst) {
				const n = r.kids / 2;
				for (let i = 0; i < n; i++) rockets.push({ x: r.x, y: r.y, tx: r.x + r.kids * Math.cos((TAU * i) / n), ty: r.y + r.kids * Math.sin((TAU * i) / n), hue: r.hue, kids: 0, trail: [], dead: false });
			}
			r.burst = true;
			r.trail.shift();
		}
		if (!r.trail.length) { r.dead = true; return; }
		if (r.kids) r.trail.forEach(([x, y], i) => { ctx.fillStyle = `hsl(${r.hue},100%,${i * 2.5}%)`; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill(); });
		else { ctx.fillStyle = `hsl(${r.hue},100%,60%)`; ctx.beginPath(); ctx.arc(r.x, r.y, 1.3, 0, TAU); ctx.fill(); }
	}

	/* ---------- Matei's letters: up, bloom, wait, balloon away ---------- */
	const col = (p, l, a = 1) => `hsla(${p.hue},80%,${l}%,${a})`;
	function word(p, x, y) { ctx.fillStyle = col(p, 72); ctx.fillText(p.text, x, y); }
	function balloonPath(x, y, s) {
		ctx.moveTo(x, y);
		ctx.bezierCurveTo(x - s / 2, y - s / 2, x - s / 4, y - s, x, y - s);
		ctx.bezierCurveTo(x + s / 4, y - s, x + s / 2, y - s / 2, x, y);
	}
	/* once the whole greeting has been up for a while, every piece gets its balloon */
	function letGo(p) {
		p.phase = 'balloon'; p.t = 0; p.spawn = rnd(0, 0.35); p.inflate = rnd(0.17, 0.34); p.bs = (rnd(20, 40) * size) / 34;
		const a = -(Math.PI / 2 - 0.5) - Math.random(), v = rnd(0.4, 0.8) * 60 * k;
		p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.bx = p.x; p.by = p.y - size * 0.6;
	}
	function stepPiece(p, dt) {
		p.t += dt;
		if (p.phase === 'wait') { if (p.t >= p.wait) { p.phase = 'rise'; p.t = 0; p.reach = rnd(0.5, 1); p.sx = rnd(w * 0.35, w * 0.65); p.trail = [[p.sx, h]]; p.lw = rnd(5, 13) * k; } return; }
		if (p.phase === 'rise') {
			const f = Math.min(1, p.t / p.reach), arc = Math.sin(f * Math.PI / 2);
			const x = p.sx + (p.x - p.sx) * f, y = h + (p.y - h) * arc;
			p.trail.push([x, y, f * p.lw]);
			if (p.trail.length > 10) p.trail.shift();
			for (let i = 1; i < p.trail.length; i++) {
				ctx.strokeStyle = col(p, 50, i / p.trail.length);
				ctx.lineWidth = (p.trail[i][2] || 1) * (i / p.trail.length);
				ctx.beginPath(); ctx.moveTo(p.trail[i][0], p.trail[i][1]); ctx.lineTo(p.trail[i - 1][0], p.trail[i - 1][1]); ctx.stroke();
			}
			if (f >= 1) {
				p.phase = 'bloom'; p.t = 0; p.grow = rnd(0.5, 1); p.fade = rnd(0.17, 0.25); p.r = (rnd(20, 30) * size) / 34;
				const n = Math.round(rnd(5, 10));
				p.shards = Array.from({ length: n }, (_, i) => { const a = (TAU * i) / n, v = rnd(4, 6) * 60 * k; return { x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: rnd(3, 6) * k, trail: [] }; });
			}
			return;
		}
		if (p.phase === 'bloom' || p.phase === 'show') {
			if (p.phase === 'bloom') {
				if (p.t < p.grow) {
					const f = p.t / p.grow, e = -Math.cos(f * Math.PI) / 2 + 0.5;
					ctx.fillStyle = col(p, 50 + 50 * f, f); ctx.beginPath(); ctx.arc(p.x, p.y, e * p.r, 0, TAU); ctx.fill();
				} else {
					word(p, p.x, p.y);
					const f = Math.min(1, (p.t - p.grow) / p.fade), e = -Math.cos(f * Math.PI) / 2 + 0.5;
					ctx.fillStyle = col(p, 100, 1 - e); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
					if (f >= 1) { p.phase = 'show'; p.t = 0; }
				}
			} else word(p, p.x, p.y);
			for (const s of p.shards) {
				s.x += s.vx * dt; s.vy += 360 * k * dt; s.y += s.vy * dt;
				s.trail.push([s.x, s.y]); if (s.trail.length > 4) s.trail.shift();
				for (let i = 0; i < s.trail.length - 1; i++) {
					ctx.strokeStyle = col(p, 50, i / s.trail.length); ctx.lineWidth = (i * s.s) / s.trail.length;
					ctx.beginPath(); ctx.moveTo(s.trail[i][0], s.trail[i][1]); ctx.lineTo(s.trail[i + 1][0], s.trail[i + 1][1]); ctx.stroke();
				}
			}
			p.shards = p.shards.filter((s) => s.trail[0]?.[1] < h + 20);
			return;
		}
		if (p.phase === 'balloon') {
			ctx.strokeStyle = col(p, 80); ctx.lineWidth = 1;
			const top = p.y - size * 0.6;
			if (p.t < p.spawn) { word(p, p.x, p.y); return; }
			if (p.t < p.spawn + p.inflate) {
				const f = (p.t - p.spawn) / p.inflate, by = top - p.bs * f;
				ctx.fillStyle = `hsla(${p.hue},80%,50%,${f})`; ctx.beginPath(); balloonPath(p.x, by, p.bs * f); ctx.fill();
				ctx.beginPath(); ctx.moveTo(p.x, by); ctx.lineTo(p.x, top); ctx.stroke();
				word(p, p.x, p.y); p.by = by;
				return;
			}
			p.bx += p.vx * dt; p.vy -= 360 * k * dt * 0.6; p.by += p.vy * dt;
			ctx.fillStyle = `hsl(${p.hue},80%,50%)`; ctx.beginPath(); balloonPath(p.bx, p.by, p.bs); ctx.fill();
			ctx.beginPath(); ctx.moveTo(p.bx, p.by); ctx.lineTo(p.bx, p.by + p.bs * 0.7); ctx.stroke();
			word(p, p.bx, p.by + p.bs * 0.7 + size * 0.6);
			if (p.by + p.bs * 0.7 + size < -10 || p.bx < -w * 0.2 || p.bx > w * 1.2) p.phase = 'done';
		}
	}

	/* ---------- the loop ---------- */
	let raf = 0, then = 0, spawnIn = 0, on = false;
	function frame(now) {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(0.05, (now - (then || now)) / 1000);
		then = now;
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = `rgba(9,13,30,${Math.min(1, 9 * dt)})`;
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = 'lighter';
		spawnIn -= dt;
		if (spawnIn <= 0) { rocket(rnd(0, w), rnd(h * 0.08, h * 0.45)); spawnIn = rnd(0.45, 0.8); }
		for (const r of rockets) if (!r.dead) stepRocket(r, dt);
		if (rockets.length > 600) rockets = rockets.filter((r) => !r.dead);
		ctx.globalCompositeOperation = 'source-over';
		ctx.font = `${size}px ${face}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		for (const p of pieces) stepPiece(p, dt);
		if (pieces.every((p) => p.phase === 'show')) { shown += dt; if (shown > 6) { shown = 0; pieces.forEach(letGo); } } else shown = 0;
		if (pieces.every((p) => p.phase === 'done')) { restart += dt; if (restart > 1) { restart = 0; reset(); } }
	}
	function start() { if (on || REDUCE) return; on = true; then = 0; raf = requestAnimationFrame(frame); }
	function pause() { on = false; cancelAnimationFrame(raf); }
	/* with less motion asked for: just the greeting, still, on the night */
	function still() {
		ctx.fillStyle = '#090d1e'; ctx.fillRect(0, 0, w, h);
		ctx.font = `${size}px ${face}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		for (const p of pieces) word(p, p.x, p.y);
	}

	// a tap sends three to five to that spot, like the pen
	const tap = (e) => {
		const r = canvas.getBoundingClientRect();
		for (let i = 0, n = Math.round(rnd(3, 5)); i < n; i++) rocket(e.clientX - r.left, e.clientY - r.top, rnd(0, 260));
	};
	canvas.addEventListener('pointerdown', tap);

	const ro = new ResizeObserver(resize);
	ro.observe(box);
	const io = new IntersectionObserver(([en]) => (en.isIntersecting && !document.hidden ? start() : pause()));
	io.observe(box);
	const vis = () => (document.hidden ? pause() : box.isConnected && start());
	document.addEventListener('visibilitychange', vis);
	resize();
	// the fonts may still be on their way: lay the words out again once they're here
	document.fonts?.load(`40px ${face}`).then(() => { layout(); if (REDUCE) still(); }).catch(() => {});

	return () => { pause(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', vis); canvas.removeEventListener('pointerdown', tap); };
}
