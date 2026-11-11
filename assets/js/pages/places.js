import { L, T, esc, img, fmtDate, pageHead, related, App, $, $$, REDUCE, hydrate } from '../shell.js';

/* Our places on a map, after Codrops' «Interactive Points»: a faded street map with a pin for every place we've been.
   Bring the mouse near a pin and that place's photo shows through the map; click it and the photo fills the map with
   its story. A place goes on the map when it has `"at": "lat, lng"` in story.json (right-click the spot in Google Maps
   and the first line is exactly that). Places without it are still in the cards below. */

const TILE = 256;
const TILES = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const MAX_Z = 16, MIN_Z = 3;

/** "30.0731, 31.3456" (or [lat, lng], or { lat, lng }) → { lat, lng }, or null. */
function where(m) {
	let v = m.at ?? (m.lat != null ? [m.lat, m.lng] : null);
	if (typeof v === 'string') v = v.split(/[,\s،]+/).filter(Boolean).map(Number);
	if (v && !Array.isArray(v)) v = [v.lat, v.lng];
	if (!v || v.length < 2 || !isFinite(v[0]) || !isFinite(v[1]) || Math.abs(v[0]) > 85 || Math.abs(v[1]) > 180) return null;
	return { lat: +v[0], lng: +v[1] };
}

/** Web Mercator, in pixels at zoom 0. */
const world = ({ lat, lng }) => {
	const s = Math.sin((lat * Math.PI) / 180);
	return { x: ((lng + 180) / 360) * TILE, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE };
};

const subtitle = (m) => [T(m.where), m.date ? fmtDate(m.date) : ''].filter(Boolean).map(esc).join(' · ');

export default {
	title: { ar: 'أماكننا', en: 'Our places' },
	render(s) {
		const list = s.places || [];
		const pinned = list.map((m) => ({ m, at: where(m) })).filter((p) => p.at);
		return `
		${pageHead(L('أماكننا', 'Our places'), L('أماكن فيها حتة مننا', 'Places that hold a piece of us'), [{ href: 'places.html', ar: 'أماكننا', en: 'Our places' }])}
		${pinned.length ? `<section class="sec sec--top"><div class="wrap">
			<p class="ip-hint" data-touch="${L('دوسي على أي دبوس على الخريطة', 'Tap any pin on the map')}">${L('قرّبي من أي دبوس على الخريطة… واضغطي عليه', 'Bring the mouse near a pin on the map… then click it')}</p>
			<div class="ip" tabindex="-1" aria-label="${L('خريطة أماكننا', 'Map of our places')}">
				<div class="ip__map" aria-hidden="true"></div>
				<div class="ip__bgs" aria-hidden="true">${pinned.map(({ m }) => `<div class="ip__bg">${img(m.photo, '', 'ip__photo')}</div>`).join('')}</div>
				<div class="ip__pins">${pinned.map(({ m }, k) => `
					<button class="ip__pin" type="button" data-k="${k}" aria-label="${esc(T(m.title))}${T(m.where) ? ` — ${esc(T(m.where))}` : ''}">
						<svg viewBox="0 0 32 44" aria-hidden="true"><path d="M16 43C13 34 2 27 2 16a14 14 0 0 1 28 0c0 11-11 18-14 27Z"/><circle cx="16" cy="16" r="5.5"/></svg>
					</button>`).join('')}
				</div>
				<div class="ip__tips" aria-hidden="true">${pinned.map(({ m }) => `
					<div class="ip__tip"><b>${esc(T(m.title))}</b>${subtitle(m) ? `<span>${subtitle(m)}</span>` : ''}</div>`).join('')}
				</div>
				<div class="ip__content" role="dialog" aria-modal="false" aria-label="${L('المكان', 'The place')}">${pinned.map(({ m }) => `
					<div class="ip__story">
						<h3>${esc(T(m.title))}</h3>
						${subtitle(m) ? `<p class="ip__sub">${subtitle(m)}</p>` : ''}
						${m.place ? `<p class="ip__line">${esc(T(m.place))}</p>` : ''}
						${m.text ? `<p class="ip__text">${esc(T(m.text))}</p>` : ''}
					</div>`).join('')}
					<button class="ip__close" type="button" aria-label="${L('اقفلي', 'Close')}">✕</button>
				</div>
				<p class="ip__credit">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p>
			</div>
		</div></section>` : ''}
		<section class="sec${pinned.length ? '' : ' sec--top'}"><div class="wrap">
			<div class="places">${list.map((m, k) => `
				<article class="moment reveal" data-media-box style="--delay:${(k % 2) * 0.1}s">
					${img(m.photo, App.t(m.title), 'zoom')}
					<h3>${T(m.title)}</h3>
					<div class="moment__blur"></div>
					<div class="moment__meta"><b>${T(m.where) || T(m.place)}</b>${m.date ? `<span>${fmtDate(m.date)}</span>` : ''}${m.where && m.place ? `<span>${T(m.place)}</span>` : ''}${m.text ? `<span>${T(m.text)}</span>` : ''}</div>
				</article>`).join('')}
			</div>
		</div></section>
		${related(['story', 'chapters', 'gallery'])}`;
	},
	after(main, s) {
		const box = $('.ip', main);
		if (box) points(box, (s.places || []).map(where).filter(Boolean));
		if (REDUCE) return;
		const cards = $$('.moment', main);
		addEventListener('pointermove', (e) => {
			if (e.pointerType !== 'mouse') return;
			for (const c of cards) {
				const r = c.getBoundingClientRect();
				if (r.bottom < 0 || r.top > innerHeight) continue;
				c.style.setProperty('--x', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
				c.style.setProperty('--y', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
			}
		}, { passive: true });
	}
};

/** The map, the pins, and the hover/click effect. */
function points(box, spots) {
	const mapEl = $('.ip__map', box), pins = $$('.ip__pin', box), bgs = $$('.ip__bg', box), tips = $$('.ip__tip', box);
	const content = $('.ip__content', box), stories = $$('.ip__story', box);
	const MAX_OP = 0.55, ACTIVE_ON = 30;
	let pos = [], dmax = 100, active = -1, open = -1, drawn = '';

	// Fit every pin in the box at the biggest zoom that holds them all, and lay the tiles out under them.
	function layout() {
		const W = box.clientWidth, H = box.clientHeight;
		if (!W || !H) return;
		const w0 = spots.map(world);
		const xs = w0.map((p) => p.x), ys = w0.map((p) => p.y);
		const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
		const fit = Math.min((W - 120) / Math.max(maxX - minX, 1e-9), (H - 150) / Math.max(maxY - minY, 1e-9));
		const z = Math.max(MIN_Z, Math.min(MAX_Z, Math.floor(Math.log2(fit))));
		const k = 2 ** z, cx = ((minX + maxX) / 2) * k, cy = ((minY + maxY) / 2) * k + 20; // a little room above for the pins
		const ox = cx - W / 2, oy = cy - H / 2;
		pos = w0.map((p) => ({ x: p.x * k - ox, y: p.y * k - oy }));
		pins.forEach((el, i) => { el.style.left = `${pos[i].x}px`; el.style.top = `${pos[i].y}px`; });
		dmax = Math.max(W / 7, ACTIVE_ON + 40);

		const key = `${z}/${Math.round(ox)}/${Math.round(oy)}/${W}/${H}`;
		if (key === drawn) return;
		drawn = key;
		const n = 2 ** z, x0 = Math.floor(ox / TILE), y0 = Math.floor(oy / TILE), x1 = Math.floor((ox + W) / TILE), y1 = Math.floor((oy + H) / TILE);
		let html = '';
		for (let ty = Math.max(0, y0); ty <= Math.min(n - 1, y1); ty++) {
			for (let tx = x0; tx <= x1; tx++) {
				const wx = ((tx % n) + n) % n;
				html += `<img src="${TILES(z, wx, ty)}" alt="" width="${TILE}" height="${TILE}" draggable="false" referrerpolicy="origin" style="left:${tx * TILE - ox}px;top:${ty * TILE - oy}px" onerror="this.remove()">`;
			}
		}
		mapEl.innerHTML = html;
	}

	const setActive = (i) => {
		if (i === active) return;
		active = i;
		pins.forEach((p, j) => { p.classList.toggle('is-on', j === i); p.classList.toggle('is-hidden', i >= 0 && j !== i); });
		tips.forEach((t, j) => {
			t.classList.toggle('is-on', j === i);
			if (j === i) { t.style.left = `${pos[j].x}px`; t.style.top = `${pos[j].y}px`; }
		});
	};

	// The closer the pointer, the more of that place's photo shows through the map.
	function near(x, y) {
		let best = -1;
		pos.forEach((p, i) => {
			const d = Math.hypot(x - p.x, y - (p.y - 22));
			const op = Math.min(MAX_OP, Math.max(0, MAX_OP * (dmax - d) / (dmax - ACTIVE_ON)));
			bgs[i].style.opacity = op.toFixed(3);
			if (op >= MAX_OP) best = i;
		});
		setActive(best);
	}

	function show(i) {
		open = i;
		setActive(-1);
		pins.forEach((p) => p.classList.add('is-hidden'));
		bgs.forEach((b, j) => { b.style.opacity = j === i ? '1' : '0'; });
		stories.forEach((st, j) => st.classList.toggle('is-on', j === i));
		box.classList.add('is-open');
		$('.ip__close', box).focus({ preventScroll: true });
	}
	function close() {
		if (open < 0) return;
		const was = open;
		open = -1;
		box.classList.remove('is-open');
		stories.forEach((st) => st.classList.remove('is-on'));
		bgs.forEach((b) => { b.style.opacity = '0'; });
		pins.forEach((p) => p.classList.remove('is-hidden'));
		pins[was].focus({ preventScroll: true });
	}

	box.addEventListener('pointermove', (e) => {
		if (open >= 0 || e.pointerType !== 'mouse') return;
		const r = box.getBoundingClientRect();
		requestAnimationFrame(() => near(e.clientX - r.left, e.clientY - r.top));
	});
	box.addEventListener('pointerleave', () => {
		if (open >= 0) return;
		bgs.forEach((b) => { b.style.opacity = '0'; });
		setActive(-1);
	});
	pins.forEach((p, i) => {
		p.addEventListener('click', (e) => { e.stopPropagation(); show(i); });
		p.addEventListener('focus', () => { if (open < 0 && !p.matches(':hover')) { bgs.forEach((b, j) => { b.style.opacity = j === i ? String(MAX_OP) : '0'; }); setActive(i); } });
		p.addEventListener('blur', () => { if (open < 0) { bgs[i].style.opacity = '0'; setActive(-1); } });
	});
	content.addEventListener('click', close);
	box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

	if (REDUCE) box.classList.add('is-still');
	layout();
	new ResizeObserver(() => { if (open < 0) setActive(-1); layout(); }).observe(box);
	hydrate(box);
}
