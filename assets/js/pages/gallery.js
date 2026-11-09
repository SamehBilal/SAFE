import { L, T, esc, img, pageHead, related, App, $, $$ } from '../shell.js';

export default {
	title: { ar: 'ألبوم الصور', en: 'Photo album' },
	render(s) {
		const list = s.gallery || [];
		const albums = [...new Map(list.filter((g) => g.album).map((g) => [App.t(g.album), g.album])).values()];
		return `
		${pageHead(L('ألبوم الصور', 'Photo album'), L('دوسوا على أي صورة عشان تكبر', 'Tap any photo to see it bigger'), [{ href: 'gallery.html', ar: 'ألبوم الصور', en: 'Photo album' }])}
		<section class="sec sec--top"><div class="wrap">
			${albums.length > 1 ? `<div class="chips" role="toolbar" aria-label="${L('الألبومات', 'Albums')}">
				<button class="chip is-on" type="button" data-album="">${L('الكل', 'All')} <small>${list.length}</small></button>
				${albums.map((a) => `<button class="chip" type="button" data-album="${esc(App.t(a))}">${T(a)} <small>${list.filter((g) => App.t(g.album) === App.t(a)).length}</small></button>`).join('')}
			</div>` : ''}
			<div class="gallery" id="gallery">${list.map((g) => `
				<figure class="shot" data-media-box data-album="${esc(App.t(g.album))}">${img(g.photo, App.t(g.caption), 'zoom')}${g.caption ? `<figcaption>${T(g.caption)}${g.date ? ` <time>${g.date.slice(0, 4)}</time>` : ''}</figcaption>` : ''}</figure>`).join('')}
			</div>
			${list.length ? '' : `<p class="empty">${L('حطوا صور في private/media وضيفوها في gallery', 'Add photos to private/media and list them under gallery')}</p>`}
		</div></section>
		${related(['notes', 'places', 'chapters'])}`;
	},
	after(main) {
		for (const c of $$('.chip', main)) {
			c.onclick = () => {
				$$('.chip', main).forEach((x) => x.classList.toggle('is-on', x === c));
				for (const f of $$('.shot', $('#gallery', main))) f.hidden = !!c.dataset.album && f.dataset.album !== c.dataset.album;
			};
		}
	}
};
