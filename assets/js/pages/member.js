import { L, T, esc, img, age, longDate, parseDate, daysBetween, num, fmtDate, pageHead, related, qs, App } from '../shell.js';

/* One person: who they are, their age, their days in our timeline and their photos. */
export default {
	title: { ar: 'عيلتنا', en: 'Our family' },
	render(s) {
		const members = s.family?.members || [];
		const m = members.find((x) => x.id === qs('id')) || members[0];
		if (!m) return pageHead(L('مش لاقي', 'Not found'), '');
		this.title = m.name;
		const name = App.t(m.name);
		const days = (s.timeline || []).filter((x) => x.id === m.id || x.chapter === m.id || (x.who || []).includes(m.id));
		const chapter = (s.chapters || []).find((c) => c.id === m.id);
		const photos = [...(m.photos || []), ...(s.gallery || []).filter((g) => (g.who || []).includes(m.id))].map((p) => (typeof p === 'string' ? { photo: p } : p));
		const next = m.born ? nextBirthday(m.born) : null;
		return `
		${pageHead(name, App.t(m.role), [{ href: 'family.html', ar: 'عيلتنا', en: 'Our family' }, { href: '#', label: m.name }])}
		<section class="sec sec--top"><div class="wrap narrow">
			<div class="member reveal" style="--c:${esc(m.color || '#0e6990')}">
				<span class="fam__pic fam__pic--lg">${m.photo ? `<span data-media-box>${img(m.photo, name, 'zoom')}</span>` : `<span class="fam__emoji">${esc(m.emoji || '♥')}</span>`}</span>
				<div class="member__facts">
					${m.born ? `<p><small>${L('اتولد', 'Born')}</small><b>${longDate(m.born)}</b></p><p><small>${L('عنده', 'Age')}</small><b>${age(m.born)}</b></p><p><small>${L('يوم في الدنيا', 'Days in the world')}</small><b>${num(daysBetween(parseDate(m.born)))}</b></p>` : ''}
					${next ? `<p><small>${L('عيد ميلاده الجاي', 'Next birthday')}</small><b>${next === 0 ? L('النهارده! 🎂', 'Today! 🎂') : L(`بعد ${num(next)} يوم`, `in ${next} days`)}</b></p>` : ''}
				</div>
			</div>
			${m.text ? `<p class="lede reveal">${T(m.text)}</p>` : ''}
			${App.t(m.story || '').split(/\n{2,}/).filter(Boolean).map((p) => `<p class="prose reveal">${esc(p)}</p>`).join('')}
			${chapter ? `<a class="otd reveal" href="chapter.html?id=${esc(chapter.id)}"><span class="otd__ic">${esc(chapter.icon || '♥')}</span><span><small>${L('حكاية اليوم ده', 'The story of that day')}</small><b>${T(chapter.title)}</b></span><span aria-hidden="true">${App.arrow}</span></a>` : ''}
			${days.filter((d) => !chapter || d.chapter !== chapter.id).map((d) => `<a class="otd reveal" href="moment.html?id=${esc(d.id)}"><span class="otd__ic">${esc(d.icon || '♥')}</span><span><small>${fmtDate(d.date)}</small><b>${T(d.title)}</b></span><span aria-hidden="true">${App.arrow}</span></a>`).join('')}
		</div>
		${photos.length ? `<div class="wrap"><div class="gallery">${photos.map((p) => `<figure class="shot" data-media-box>${img(p.photo, App.t(p.caption), 'zoom')}${p.caption ? `<figcaption>${T(p.caption)}</figcaption>` : ''}</figure>`).join('')}</div></div>` : ''}
		</section>
		<section class="sec"><div class="wrap"><div class="fam-row fam-row--sm">${members.filter((x) => x !== m).map((x) => `
			<a class="fam reveal" href="member.html?id=${esc(x.id)}" style="--c:${esc(x.color || '#0e6990')}"><span class="fam__pic">${x.photo ? `<span data-media-box>${img(x.photo, App.t(x.name))}</span>` : `<span class="fam__emoji">${esc(x.emoji || '♥')}</span>`}</span><b>${T(x.name)}</b></a>`).join('')}
		</div></div></section>
		${related(['family', 'gallery', 'chapters'])}`;
	}
};

function nextBirthday(iso) {
	const b = parseDate(iso);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	let n = new Date(today.getFullYear(), b.getMonth(), b.getDate());
	if (n < today) n = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
	return Math.round((n - today) / 864e5);
}
