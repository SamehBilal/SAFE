/* The intro's night, after "The programmer's romantic" (codepen.io/CCG/pen/aZpVVv):
   - sky(canvas): stars drifting up and right, with the odd comet and its tail
   - dust(canvas): words made of golden dust — each sentence is drawn off-screen, its pixels become targets,
     and the grains fly to them; the next sentence pulls the same grains into a new shape, and the leftovers
     drift away and fade. Works for Arabic (right-to-left, joined letters) as well as English. */

const rand = (a, b) => a + Math.random() * (b - a);
const chance = (pct) => Math.random() * 100 < pct;

function fitCanvas(canvas, ctx) {
	const dpr = Math.min(devicePixelRatio || 1, 2);
	const r = canvas.getBoundingClientRect();
	canvas.width = Math.max(1, Math.round(r.width * dpr));
	canvas.height = Math.max(1, Math.round(r.height * dpr));
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	return { w: r.width, h: r.height };
}

export function sky(canvas) {
	const ctx = canvas.getContext('2d');
	let { w, h } = fitCanvas(canvas, ctx);
	const SPEED = 0.05;
	const make = (first) => {
		const giant = chance(3);
		const comet = !giant && !first && chance(10);
		const s = {
			giant, comet,
			x: rand(0, w - 10), y: rand(0, h), r: rand(1.1, 2.6),
			dx: rand(SPEED, 6 * SPEED) + (comet ? SPEED * rand(50, 120) : 0) + SPEED * 2,
			dy: -rand(SPEED, 6 * SPEED) - (comet ? SPEED * rand(50, 120) : 0),
			o: 0, max: rand(0.2, 1 - (comet ? 0.4 : 0)), step: rand(0.0005, 0.002) + (comet ? 0.001 : 0), fadingIn: true, fadingOut: false
		};
		return s;
	};
	let stars = Array.from({ length: Math.round(w * 0.216) }, () => make(true));
	const onResize = () => { ({ w, h } = fitCanvas(canvas, ctx)); stars = Array.from({ length: Math.round(w * 0.216) }, () => make(true)); };
	addEventListener('resize', onResize);

	const frame = () => {
		if (!canvas.isConnected) { removeEventListener('resize', onResize); return; }
		ctx.clearRect(0, 0, w, h);
		for (let i = 0; i < stars.length; i++) {
			const s = stars[i];
			s.x += s.dx; s.y += s.dy;
			if (s.x > w - w / 4 || s.y < 0) s.fadingOut = true;
			if (s.fadingIn) { s.o += s.step; if (s.o > s.max) s.fadingIn = false; }
			if (s.fadingOut) { s.o -= s.step / 2; if (s.o < 0 || s.x > w || s.y < 0) { stars[i] = make(false); continue; } }
			if (s.giant) {
				ctx.fillStyle = `rgba(180,184,240,${s.o})`;
				ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2); ctx.fill();
			} else if (s.comet) {
				for (let k = 0; k < 30; k++) {
					ctx.fillStyle = `rgba(226,225,224,${Math.max(0, s.o - (s.o / 20) * k)})`;
					ctx.fillRect(s.x - (s.dx / 4) * k, s.y - (s.dy / 4) * k - 2, 2, 2);
				}
			} else {
				ctx.fillStyle = `rgba(226,225,142,${s.o})`;
				ctx.fillRect(s.x, s.y, s.r, s.r);
			}
		}
		requestAnimationFrame(frame);
	};
	requestAnimationFrame(frame);
}

export function dust(canvas, { font = 'serif' } = {}) {
	const ctx = canvas.getContext('2d');
	let { w, h } = fitCanvas(canvas, ctx);
	const N = w < 600 ? 1400 : 2200;
	const home = () => ({ x: w / 2 + (Math.random() - 0.5) * w, y: h / 2 + (Math.random() - 0.5) * (h / 4) });
	const grains = Array.from({ length: N }, () => {
		const p = home();
		return { x: p.x, y: p.y, hx: p.x, hy: p.y, s: Math.random() * 1.2, o: 0, tx: 0, ty: 0, on: false };
	});
	addEventListener('resize', () => ({ w, h } = fitCanvas(canvas, ctx)));

	/* the pixels of a sentence, wrapped to fit, as a list of points */
	async function points(text) {
		const rtl = /[؀-ۿ]/.test(text);
		// Arabic as dots reads best in a bold display face; English keeps the script
		const face = rtl ? "'Lalezar', 'Cairo', sans-serif" : font;
		try { await document.fonts.load(`48px ${face}`, text); } catch { /* fall back to whatever is loaded */ }
		const off = document.createElement('canvas');
		off.width = Math.ceil(w); off.height = Math.ceil(h);
		const o = off.getContext('2d', { willReadFrequently: true });
		o.direction = rtl ? 'rtl' : 'ltr';
		o.textAlign = 'center';
		o.textBaseline = 'middle';
		o.fillStyle = '#fff';
		const words = text.split(/\s+/).filter(Boolean);
		let size = Math.min(w * (w < 600 ? 0.11 : 0.08), 60);
		let lines;
		for (; size > 16; size -= 2) {
			o.font = `${size}px ${face}`;
			lines = [];
			let cur = '';
			for (const word of words) {
				const next = cur ? `${cur} ${word}` : word;
				if (o.measureText(next).width > w * 0.82 && cur) { lines.push(cur); cur = word; } else cur = next;
			}
			if (cur) lines.push(cur);
			if (lines.length <= 3 && lines.length * size * 1.35 < h * 0.92) break;
		}
		const lh = size * 1.35;
		lines.forEach((ln, k) => o.fillText(ln, w / 2, h / 2 + (k - (lines.length - 1) / 2) * lh));
		const data = o.getImageData(0, 0, off.width, off.height).data;
		const gap = 3;
		const pts = [];
		for (let y = 0; y < off.height; y += gap) for (let x = 0; x < off.width; x += gap) if (data[(y * off.width + x) * 4 + 3] > 128) pts.push([x, y]);
		// shuffle, then thin out if there are more points than grains
		for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
		return pts.length > N ? pts.slice(0, N) : pts;
	}

	/* the pen's own motion: a step every 60 ms (its setInterval), each grain moving 15% of the way with a random
	   0–5px quiver, fading in by 0.02 a step; grains with no place in the word drift home at half speed, fading by 0.06 */
	let raf = 0;
	let last = 0;
	const step = () => {
		for (const g of grains) {
			if (g.on) {
				g.x += (g.tx - (g.x + Math.random() * 5)) * 0.15;
				g.y += (g.ty - (g.y + Math.random() * 5)) * 0.15;
				g.o = g.o > 0.98 ? 1 : g.o + 0.02;
			} else {
				g.x += (g.hx - g.x) * 0.075;
				g.y += (g.hy - g.y) * 0.075;
				g.o = Math.max(0, g.o - 0.06);
			}
		}
	};
	const frame = (now) => {
		if (!canvas.isConnected) return;
		if (now - last >= 60) {
			// one step per 60 ms of real time, so a slow or busy phone still forms the words on time
			const steps = last ? Math.min(20, Math.floor((now - last) / 60)) : 1;
			last = now;
			for (let k = 0; k < steps; k++) step();
			ctx.clearRect(0, 0, w, h);
			for (const g of grains) {
				if (g.o <= 0 || g.s <= 0) continue;
				ctx.fillStyle = `rgba(226,225,142,${g.o})`;
				ctx.beginPath();
				ctx.arc(g.x, g.y, g.s, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		raf = requestAnimationFrame(frame);
	};
	raf = requestAnimationFrame(frame);

	return {
		async show(text) {
			const pts = await points(text);
			for (let i = 0; i < N; i++) {
				const g = grains[i];
				if (i < pts.length) { g.tx = pts[i][0]; g.ty = pts[i][1]; g.on = true; }
				else {
					g.on = false;
					const p = home(); g.hx = p.x; g.hy = p.y;
				}
			}
		},
		scatter() {
			for (const g of grains) { g.on = false; const p = home(); g.hx = p.x; g.hy = p.y; }
		},
		stop() { cancelAnimationFrame(raf); }
	};
}
