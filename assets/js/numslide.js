/* The band above the numbers page, after Chris Gannon's «Science Slider» (codepen.io/chrisgannon/pen/rvBMmM): a
   test tube rides along a line, its liquid sloshing behind it, little bubbles streaming up as it goes; when it stops,
   a big bubble carrying the number floats up out of it and pops, and the number lands in the readout above.
   Here it slides by itself from one of our numbers to the next (a stop on the line for each); tap a stop, or drag
   the tube, to go there. Drawn in the journal's ink and highlighters, no background of its own.
   numSlider(box, slides) — slides: [{ n: '٦٬٣٦٥', label: 'يوم من أول سلام' }, …] — returns stop(). */
import { App, REDUCE } from './shell.js';

const NS = 'http://www.w3.org/2000/svg';
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.append(e); return e; };
// the pen's test tube, its mouth at the top, centred on x 150
const TUBE = 'M166.91,253H134.45a2.72,2.72,0,0,0-2.71,2.71v2.7a2.72,2.72,0,0,0,2.71,2.71h2.77c0,.44-.07.89-.07,1.35V304.4a13.53,13.53,0,0,0,27,0V262.47c0-.46,0-.91-.07-1.35h2.78a2.72,2.72,0,0,0,2.7-2.71v-2.7A2.72,2.72,0,0,0,166.91,253Z';
const HOLD = 4.6;      // seconds on each number before sliding on

export function numSlider(box, slides) {
	if (!slides.length) return () => {};
	const rtl = App.lang === 'ar';
	const uid = Math.random().toString(36).slice(2, 7);
	box.innerHTML = `
		<div class="ns-read" aria-live="polite"><b class="ns-read__n"></b><span class="ns-read__l"></span></div>
		<svg class="ns-svg" viewBox="0 0 800 340" preserveAspectRatio="xMidYMax meet" aria-hidden="true"></svg>
		<p class="ns-tip"></p>`;
	const svg = box.querySelector('svg');
	const read = box.querySelector('.ns-read'), readN = read.firstElementChild, readL = read.lastElementChild;
	box.querySelector('.ns-tip').textContent = rtl ? 'دوس على أي نقطة، أو اسحب الأنبوبة' : 'Tap a stop, or drag the tube';

	const defs = el('defs', {}, svg);
	el('path', { id: `nst-${uid}`, d: TUBE }, defs);
	const clip = el('clipPath', { id: `nsc-${uid}` }, defs);
	el('use', { href: `#nst-${uid}` }, clip);

	// the line, with a stop for every number
	const X0 = 90, X1 = 710, Y = 300;
	const n = slides.length;
	const stopX = (i) => { const f = n === 1 ? 0.5 : i / (n - 1); return rtl ? X1 - f * (X1 - X0) : X0 + f * (X1 - X0); };
	el('path', { class: 'ns-track', d: `M${X0 - 30} ${Y}C${(X0 + X1) / 2 - 120} ${Y - 3} ${(X0 + X1) / 2 + 120} ${Y + 3} ${X1 + 30} ${Y}` }, svg);
	const stops = slides.map((s, i) => {
		const g = el('g', { class: 'ns-stop', role: 'button', tabindex: '0', 'aria-label': `${s.n} ${s.label}` }, svg);
		el('circle', { cx: stopX(i), cy: Y, r: 7 }, g);
		el('circle', { class: 'ns-stop__hit', cx: stopX(i), cy: Y, r: 18 }, g);
		const t = el('text', { x: stopX(i), y: Y + 30 }, g);
		t.textContent = (i + 1).toLocaleString(rtl ? 'ar-EG' : 'en');
		return g;
	});
	const bubbles = el('g', { class: 'ns-bubbles' }, svg);

	// the tube: liquid (clipped to the glass), the glass, its scale and shine
	const tube = el('g', { class: 'ns-tube' }, svg);
	const liquidBox = el('g', { 'clip-path': `url(#nsc-${uid})` }, tube);
	const liquid = el('rect', { class: 'ns-liquid', x: 31, y: 276, width: 238, height: 143 }, liquidBox);
	el('use', { href: `#nst-${uid}`, class: 'ns-glass' }, tube);
	const scale = el('g', { class: 'ns-scale' }, tube);
	el('line', { x1: 144, y1: 270, x2: 144, y2: 305, class: 'ns-shine' }, scale);
	for (const y of [269.23, 282.76, 296.28]) el('line', { x1: 163.53, y1: y, x2: 158.12, y2: y }, scale);

	/* ---------- state ---------- */
	let cur = 0, x = stopX(0), from = x, to = x, t0 = 0, moving = false, dragging = false;
	let fx = x, fv = 0, ang = 0, av = 0;          // the pen's "follower" spring, and the slosh it gives the liquid
	let held = 0, launched = false;
	const live = [];                              // bubbles in the air

	function show(i) {
		const s = slides[i];
		readN.textContent = s.n;
		readL.textContent = s.label;
		read.classList.remove('is-in'); void read.offsetWidth; read.classList.add('is-in');
		stops.forEach((g, k) => g.classList.toggle('is-on', k === i));
	}
	function go(i, now = performance.now()) {
		cur = (i + n) % n;
		from = x; to = stopX(cur); t0 = now; moving = Math.abs(to - from) > 0.5; held = 0; launched = false;
		stops.forEach((g, k) => g.classList.toggle('is-on', k === cur));
		if (REDUCE) { x = to; place(); show(cur); }
	}
	function place() {
		tube.setAttribute('transform', `translate(${x - 150} 0)`);
		liquid.setAttribute('transform', `rotate(${ang} 150 276)`);
	}

	/* a little bubble streaming up from the mouth of the tube */
	function fizz() {
		const c = el('circle', { class: `ns-fizz ns-fizz--${Math.floor(Math.random() * 3)}`, r: rnd(2, 7) }, bubbles);
		live.push({ el: c, kind: 'fizz', x: x + rnd(-6, 6), y: rnd(250, 268), vx: rnd(-25, 25), vy: -rnd(60, 140), life: rnd(0.6, 2.4), t: 0 });
	}
	/* the big one, carrying the number, and the pop at the top */
	function carry(i) {
		const g = el('g', { class: 'ns-carry' }, bubbles);
		const len = [...slides[i].n].length;
		const r = Math.max(26, Math.min(46, 12 + len * 6));
		el('circle', { r, class: 'ns-carry__b' }, g);
		el('circle', { r: r - 6, class: 'ns-carry__shine', 'stroke-dasharray': `${r * 0.7} ${r * 6}`, 'stroke-dashoffset': r * 3 }, g);
		const tx = el('text', { y: 1, class: 'ns-carry__t' }, g);
		tx.textContent = slides[i].n;
		tx.setAttribute('font-size', Math.min(28, (r * 2.6) / Math.max(len, 2)));
		live.push({ el: g, kind: 'carry', i, x: x + rnd(-4, 4), y: 262, x1: x + rnd(-30, 30), y1: rnd(70, 110), life: 2.2, t: 0 });
	}
	function pop(px, py) {
		const g = el('g', { class: 'ns-pop', transform: `translate(${px} ${py})` }, bubbles);
		for (let k = 0; k < 8; k++) {
			const a = (k / 8) * Math.PI * 2;
			el('line', { x1: Math.cos(a) * 14, y1: Math.sin(a) * 14, x2: Math.cos(a) * 34, y2: Math.sin(a) * 34 }, g);
		}
		setTimeout(() => g.remove(), 700);
	}

	/* ---------- the loop ---------- */
	let raf = 0, last = 0, on = false;
	function frame(now) {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(0.05, (now - (last || now)) / 1000);
		last = now;
		const px = x;
		if (moving && !dragging) {
			const f = Math.min(1, (now - t0) / 1400);
			x = from + (to - from) * ease(f);
			if (f >= 1) { moving = false; x = to; }
		}
		// the follower chases the tube on a spring; how far it lags is how hard the liquid sloshes
		fv += (x - fx) * 0.3; fv *= 0.9; fx += fv;
		av += (-(x - fx) * 0.9 - ang) * 0.12; av *= 0.86; ang += av;
		place();
		const speed = Math.abs(x - px) / Math.max(dt, 0.001);
		if (speed > 40 && Math.random() < Math.min(0.9, speed / 600)) fizz();
		if (!moving && !dragging) {
			held += dt;
			if (!launched && held > 0.15) { launched = true; carry(cur); }
			if (held > HOLD) go(cur + 1, now);
		}
		for (let k = live.length - 1; k >= 0; k--) {
			const b = live[k];
			b.t += dt;
			const f = Math.min(1, b.t / b.life);
			if (b.kind === 'fizz') {
				b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.98;
				b.el.setAttribute('cx', b.x); b.el.setAttribute('cy', b.y);
				b.el.setAttribute('opacity', (1 - f) * 0.9);
			} else {
				// grows in with a wobble (the pen's elastic), then drifts up and pops
				const g = Math.min(1, b.t / 0.9);
				const wob = 1 + Math.sin(g * Math.PI * 3) * (1 - g) * 0.35;
				const s = Math.min(1, g * 1.4) * wob;
				const cx = b.x + (b.x1 - b.x) * f, cy = b.y + (b.y1 - b.y) * f;
				b.el.setAttribute('transform', `translate(${cx} ${cy}) scale(${s.toFixed(3)} ${(s * (2 - wob)).toFixed(3)})`);
				if (f >= 1) { pop(cx, cy); if (b.i === cur) show(b.i); }
			}
			if (f >= 1) { b.el.remove(); live.splice(k, 1); }
		}
	}

	/* ---------- tap a stop, or drag the tube ---------- */
	const toSvgX = (clientX) => { const p = svg.createSVGPoint(); p.x = clientX; p.y = 0; return p.matrixTransform(svg.getScreenCTM().inverse()).x; };
	stops.forEach((g, i) => {
		g.addEventListener('click', () => go(i));
		g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i); } });
	});
	tube.addEventListener('pointerdown', (e) => {
		e.preventDefault();
		dragging = true; moving = false;
		try { tube.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
		const move = (m) => { x = Math.max(X0, Math.min(X1, toSvgX(m.clientX))); };
		const up = () => {
			tube.removeEventListener('pointermove', move);
			dragging = false;
			// settle on the nearest stop
			let best = 0;
			slides.forEach((_, i) => { if (Math.abs(stopX(i) - x) < Math.abs(stopX(best) - x)) best = i; });
			go(best);
		};
		tube.addEventListener('pointermove', move);
		tube.addEventListener('pointerup', up, { once: true });
		tube.addEventListener('pointercancel', up, { once: true });
	});

	function start() { if (on || REDUCE) return; on = true; last = 0; raf = requestAnimationFrame(frame); }
	function pause() { on = false; cancelAnimationFrame(raf); }
	const io = new IntersectionObserver(([en]) => (en.isIntersecting && !document.hidden ? start() : pause()));
	io.observe(box);
	const vis = () => (document.hidden ? pause() : box.isConnected && start());
	document.addEventListener('visibilitychange', vis);

	place();
	show(0);
	if (REDUCE) { const tick = setInterval(() => go(cur + 1), HOLD * 1000); return () => { clearInterval(tick); io.disconnect(); document.removeEventListener('visibilitychange', vis); }; }
	return () => { pause(); io.disconnect(); document.removeEventListener('visibilitychange', vis); };
}
