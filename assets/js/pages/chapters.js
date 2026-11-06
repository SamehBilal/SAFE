import { L, T, esc, img, fmtDate, yearsAgo, pageHead, related, firstPhoto, App } from '../shell.js';

export default {
	title: { ar: 'أيام فارقة', en: 'Big days' },
	render(s) {
		const list = s.chapters || [];
		return `
		${pageHead(L('أيام فارقة', 'Big days'), L('الأيام اللي غيرت حياتنا', 'The days that changed our lives'), [{ href: 'chapters.html', ar: 'أيام فارقة', en: 'Big days' }])}
		<section class="sec sec--top"><div class="wrap">
			<div class="chapters">${list.map((c, k) => {
				const cover = firstPhoto(c);
				return `<a class="chapter-card reveal" href="chapter.html?id=${esc(c.id)}" style="--delay:${(k % 3) * 0.08}s">
					<span class="chapter-card__media">${cover ? `<span data-media-box>${img(cover, App.t(c.title))}</span>` : ''}<span class="chapter-card__ic">${esc(c.icon || '♥')}</span></span>
					<span class="chapter-card__body"><time>${fmtDate(c.date)}</time><b>${T(c.title)}</b><small>${T(c.sub)}</small><em>${yearsAgo(c.date)}</em></span>
				</a>`;
			}).join('')}</div>
		</div></section>
		${related(['story', 'places', 'family'])}`;
	}
};
