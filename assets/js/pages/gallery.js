import { L, Y, T, esc, img, pageHead, related, App, $, $$, REDUCE, hydrate } from '../shell.js';

/* Our photos in piles, after Codrops' «Adaptive Thumbnail Pile Effect» (Stapel, demo 3: a wide gutter, a little delay
   between photos and a random tilt). Every album, and every place on the map, is a pile of its photos with the top
   one wearing its name and how many there are; tap a pile and its photos fly out into a grid one after another,
   the other piles fade away, and ← gathers them back. In a spread pile, tap a photo to see it big. */

const firstOf = (o) => [...new Set([...(o.photos || []).map((p) => (typeof p === 'string' ? p : p?.photo)), o.photo].filter(Boolean))];

function piles(s) {
	const out = new Map();
	const add = (name, photo, caption) => {
		if (!photo) return;
		if (!out.has(name)) out.set(name, []);
		out.get(name).push({ photo, caption });
	};
	for (const g of s.gallery || []) add(T(g.album) || L('صور', 'Photos'), g.photo, T(g.caption));
	for (const p of s.places || []) if (p.at) for (const ph of firstOf(p)) add(T(p.title), ph, T(p.where));
	// the gifts we gave each other (private/media/gifts/…): one pile each
	for (const g of s.gifts || []) for (const ph of g.photos || []) add(`🎁 ${T(g.title)}`, ph, [L('من', 'From'), T(g.from === 'her' ? s.her : s.him), g.note ? '— ' + T(g.note) : ''].join(' ').trim());
	return [...out.entries()].map(([name, items]) => ({ name, items }));
}

export default {
	title: { ar: 'ألبوم الصور', en: 'Photo album' },
	render(s) {
		const ps = piles(s);
		let n = 0;
		return `
		${pageHead(L('ألبوم الصور', 'Photo album'), Y('دوس على أي كومة صور عشان تتفرد', 'دوسي على أي كومة صور عشان تتفرد', 'Tap a pile of photos to spread it out'), [{ href: 'gallery.html', ar: 'ألبوم الصور', en: 'Photo album' }])}
		<section class="sec sec--top"><div class="wrap">
			<div class="tp-bar">
				<button class="tp-back" type="button" id="tp-back" hidden aria-label="${L('رجوع للكوم', 'Back to the piles')}">${App.arrow === '←' ? '→' : '←'}</button>
				<h2 class="tp-bar__h">${L('صورنا', 'Our photos')}</h2>
				<p class="tp-bar__name" id="tp-name" aria-live="polite"></p>
			</div>
			<ul class="tp" id="tp" aria-label="${L('كوم الصور', 'Piles of photos')}">${ps.map((p, k) => p.items.map((it, i) => {
				const top = i === p.items.length - 1, show = i >= p.items.length - 3;
				const pic = img(it.photo, it.caption || p.name, 'tp__img');
				return `<li class="tp__item" data-pile="${k}" data-i="${i}"${show ? '' : ' data-deep'} style="--n:${n++}">
					<button class="tp__btn" type="button" tabindex="${top ? 0 : -1}" aria-label="${top ? `${esc(p.name)} — ${p.items.length} ${L('صور', 'photos')}` : esc(it.caption || p.name)}">
						${show ? pic : pic.replace('data-m=', 'data-later=')}
						${it.caption ? `<span class="tp__info"><span>${esc(it.caption)}</span></span>` : ''}
						${top ? `<span class="tp__title"><b>${esc(p.name)}</b><i>${p.items.length.toLocaleString(App.lang === 'ar' ? 'ar-EG' : 'en')}</i></span>` : ''}
					</button>
				</li>`;
			}).join('')).join('')}</ul>
			${ps.length ? '' : `<p class="empty">${Y('حط صور في private/media وضيفها في gallery', 'حطي صور في private/media وضيفيها في gallery', 'Add photos to private/media and list them under gallery')}</p>`}
		</div></section>
		${related(['notes', 'places', 'chapters'])}`;
	},
	after(main, s) {
		const grid = $('#tp', main);
		if (!grid) return;
		const ps = piles(s);
		const items = $$('.tp__item', grid);
		const back = $('#tp-back', main), name = $('#tp-name', main);
		const rtl = () => document.documentElement.dir === 'rtl';
		const DELAY = REDUCE ? 0 : 50, SPEED = REDUCE ? 0 : 400, ANGLE = 5;
		let open = -1, size = 0, gutter = 0, spot = [];
		const byPile = (k) => items.filter((el) => +el.dataset.pile === k);
		const tilt = () => Math.floor(Math.random() * 11) - 5;

		// where each pile sits, and where each photo of the open pile goes
		function measure() {
			const W = grid.clientWidth;
			gutter = W < 560 ? 26 : W < 900 ? 44 : 70;
			size = Math.min(W < 560 ? (W - gutter) / 2 : 200, W);
			const cols = Math.max(1, Math.floor((W + gutter) / (size + gutter)));
			const used = cols * size + (cols - 1) * gutter, pad = (W - used) / 2;
			const at = (k) => {
				const c = k % cols, r = Math.floor(k / cols);
				const x = pad + c * (size + gutter);
				return { x: rtl() ? W - x - size : x, y: r * (size + gutter) };
			};
			spot = ps.map((_, k) => at(k));
			return { at, cols };
		}

		function place(animate = true) {
			const { at } = measure();
			grid.style.setProperty('--size', `${size}px`);
			for (const el of items) {
				const k = +el.dataset.pile, i = +el.dataset.i, len = ps[k].items.length;
				if (!animate) el.style.transition = 'none';
				if (k === open) {
					const p = at(len - 1 - i); // the top photo of the pile goes first
					el.style.translate = `${p.x}px ${p.y}px`;
					el.style.rotate = el.dataset.tilt || '0deg';
					el.style.transitionDelay = `${(len - i - 1) * DELAY}ms`;
				} else {
					el.style.translate = `${spot[k].x}px ${spot[k].y}px`;
					el.style.rotate = i === len - 2 ? `${ANGLE}deg` : i === len - 3 ? `-${ANGLE}deg` : '0deg';
					el.style.transitionDelay = '0ms';
				}
				if (!animate) { void el.offsetWidth; el.style.transition = ''; }
			}
			const rows = open >= 0 ? Math.ceil(ps[open].items.length / measure().cols) : Math.ceil(ps.length / measure().cols);
			grid.style.height = `${rows * (size + gutter) - gutter + 20}px`;
		}

		function spread(k) {
			open = k;
			grid.classList.add('is-open');
			name.textContent = ps[k].name;
			for (const el of items) {
				const mine = +el.dataset.pile === k;
				el.classList.toggle('is-gone', !mine);
				el.classList.toggle('is-out', mine);
				if (mine) {
					el.dataset.tilt = `${tilt()}deg`;
					for (const im of $$('[data-later]', el)) { im.dataset.m = im.dataset.later; delete im.dataset.later; }
					$('img', el)?.classList.add('zoom');
					$('.tp__btn', el).tabIndex = 0;
				}
			}
			hydrate(grid);
			place();
			back.hidden = false;
			setTimeout(() => back.focus({ preventScroll: true }), SPEED);
		}

		function gather() {
			if (open < 0) return;
			const k = open;
			open = -1;
			grid.classList.remove('is-open');
			name.textContent = '';
			for (const el of items) {
				el.classList.remove('is-gone', 'is-out');
				$('img', el)?.classList.remove('zoom');
				const top = +el.dataset.i === ps[+el.dataset.pile].items.length - 1;
				$('.tp__btn', el).tabIndex = top ? 0 : -1;
			}
			place();
			back.hidden = true;
			const front = byPile(k).at(-1);
			setTimeout(() => $('.tp__btn', front)?.focus({ preventScroll: true }), SPEED);
		}

		grid.addEventListener('click', (e) => {
			const li = e.target.closest('.tp__item');
			if (!li || open >= 0) return;
			e.preventDefault();
			e.stopPropagation();
			spread(+li.dataset.pile);
		}, true);
		back.onclick = gather;
		main.onkeydown = ((e) => { if (e.key === 'Escape' && open >= 0 && !document.querySelector('.lightbox')) gather(); });
		let w = grid.clientWidth;
		new ResizeObserver(() => { if (Math.abs(grid.clientWidth - w) > 2) { w = grid.clientWidth; place(false); } }).observe(grid);
		place(false);
		requestAnimationFrame(() => grid.classList.add('is-ready'));
	}
};
