import { L, T, esc, img, fmtDate, pageHead, related, App, $$, REDUCE } from '../shell.js';

export default {
	title: { ar: 'أماكننا', en: 'Our places' },
	render(s) {
		const list = s.places || [];
		return `
		${pageHead(L('أماكننا', 'Our places'), L('أماكن فيها حتة مننا', 'Places that hold a piece of us'), [{ href: 'places.html', ar: 'أماكننا', en: 'Our places' }])}
		<section class="sec sec--top"><div class="wrap">
			<div class="places">${list.map((m, k) => `
				<article class="moment reveal" data-media-box style="--delay:${(k % 2) * 0.1}s">
					${img(m.photo, App.t(m.title), 'zoom')}
					<h3>${T(m.title)}</h3>
					<div class="moment__blur"></div>
					<div class="moment__meta"><b>${T(m.place)}</b>${m.date ? `<span>${fmtDate(m.date)}</span>` : ''}${m.text ? `<span>${T(m.text)}</span>` : ''}</div>
				</article>`).join('')}
			</div>
		</div></section>
		${related(['story', 'chapters', 'gallery'])}`;
	},
	after(main) {
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
