import { L, T, esc, img, age, longDate, parseDate, daysBetween, num, fmtDate, pageHead, related, qs, App } from '../shell.js';
import { doodle } from '../doodles.js';

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
		${pageHead(name, App.t(m.role), [{ href: 'family.html', ar: 'عيلتنا', en: 'Our family' }, { href: '#', label: m.name }], { photos: [m.photo].filter(Boolean) })}
		<section class="sec sec--top"><div class="wrap narrow">
			<div class="member reveal" style="--c:${esc(m.color || '#0e6990')}">
				<span class="fam__pic fam__pic--lg">${m.photo ? `<span data-media-box>${img(m.photo, name, 'zoom')}</span>` : `<span class="fam__emoji">${doodle(m.emoji, 52)}</span>`}</span>
				<div class="member__facts">
					${m.born ? `<p><small>${L('اتولد', 'Born')}</small><b>${longDate(m.born)}</b></p><p><small>${L('عنده', 'Age')}</small><b>${age(m.born)}</b></p><p><small>${L('يوم في الدنيا', 'Days in the world')}</small><b>${num(daysBetween(parseDate(m.born)))}</b></p>` : ''}
					${next ? `<p><small>${L('عيد ميلاده الجاي', 'Next birthday')}</small><b>${next === 0 ? L('النهارده!', 'Today!') : L(`بعد ${num(next)} يوم`, `in ${next} days`)}</b></p>` : ''}
				</div>
			</div>
			${m.text ? `<p class="lede reveal">${T(m.text)}</p>` : ''}
			${App.t(m.story || '').split(/\n{2,}/).filter(Boolean).map((p) => `<p class="prose reveal">${esc(p)}</p>`).join('')}
			${chapter ? `<a class="otd reveal" href="chapter.html?id=${esc(chapter.id)}"><span class="otd__ic">${doodle(chapter.icon, 28)}</span><span><small>${L('حكاية اليوم ده', 'The story of that day')}</small><b>${T(chapter.title)}</b></span><span aria-hidden="true">${App.arrow}</span></a>` : ''}
			${days.filter((d) => !chapter || d.chapter !== chapter.id).map((d) => `<a class="otd reveal" href="moment.html?id=${esc(d.id)}"><span class="otd__ic">${doodle(d.icon, 28)}</span><span><small>${fmtDate(d.date)}</small><b>${T(d.title)}</b></span><span aria-hidden="true">${App.arrow}</span></a>`).join('')}
		</div>
		${m.growth && m.born ? growth(m) : ''}
		${photos.length ? `<div class="wrap"><div class="gallery">${photos.map((p) => `<figure class="shot" data-media-box>${img(p.photo, App.t(p.caption), 'zoom')}${p.caption ? `<figcaption>${T(p.caption)}</figcaption>` : ''}</figure>`).join('')}</div></div>` : ''}
		</section>
		<section class="sec"><div class="wrap"><div class="fam-row fam-row--sm">${members.filter((x) => x !== m).map((x) => `
			<a class="fam reveal" href="member.html?id=${esc(x.id)}" style="--c:${esc(x.color || '#0e6990')}"><span class="fam__pic">${x.photo ? `<span data-media-box>${img(x.photo, App.t(x.name))}</span>` : `<span class="fam__emoji">${doodle(x.emoji, 52)}</span>`}</span><b>${T(x.name)}</b></a>`).join('')}
		</div></div></section>
		${related(['family', 'gallery', 'chapters'])}`;
	}
};

/* One photo a month or one a year, from the folders images/family/<id>/months|years/<n>.jpg:
   a photo shows as a polaroid, a month or year still to fill as an empty frame with its date. */
function growth(m) {
	const b = parseDate(m.born);
	const now = new Date();
	const monthly = m.growth.every === 'month';
	const at = (n) => (monthly ? new Date(b.getFullYear(), b.getMonth() + n, b.getDate()) : new Date(b.getFullYear() + n, b.getMonth(), b.getDate()));
	let done = 0;
	while (at(done + 1) <= now) done++;
	const pics = m.growth.photos || {};
	const last = Math.max(done + 1, monthly ? 12 : 1, ...Object.keys(pics).map(Number));
	const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const born = m.female ? L('يوم ما اتولدت', 'The day she was born') : L('يوم ما اتولد', 'The day he was born');
	const label = (n) => (n === 0 ? born : monthly
		? L(n === 1 ? 'الشهر الأول' : `شهر ${num(n)}`, n === 1 ? 'One month' : `${n} months`)
		: L(n === 1 ? 'سنة' : n === 2 ? 'سنتين' : `${num(n)} ${n <= 10 ? 'سنين' : 'سنة'}`, n === 1 ? 'One year old' : `${n} years old`));
	const tiles = [];
	for (let n = monthly && !pics[0] ? 1 : 0; n <= last; n++) {
		const d = at(n), p = pics[n], soon = n > done;
		tiles.push(`<figure class="grow__tile${p ? '' : ' grow__tile--empty'}${soon ? ' grow__tile--soon' : ''}"${p ? ' data-media-box' : ''}>
			${p ? img(p, label(n), 'zoom') : `<span class="grow__blank" aria-hidden="true">${doodle(soon ? 'sparkle' : 'camera', 34)}</span>`}
			<figcaption><b>${label(n)}</b><small>${fmtDate(iso(d))}</small></figcaption>
		</figure>`);
	}
	const name = T(m.name);
	const title = monthly ? L(`${name} شهر بشهر`, `${name}, month by month`) : L(`${name} سنة بسنة`, `${name}, year by year`);
	const sub = monthly
		? L('صورة كل شهر — بنشوفه بيكبر قدام عينينا', 'A photo every month — watching him grow before our eyes')
		: L('صورة في كل عيد ميلاد — من أول يوم لحد النهارده', 'A photo every birthday — from day one to today');
	return `<div class="wrap"><div class="grow reveal" style="--c:${esc(m.color || '#0e6990')}">
		<h2 class="sec__title">${title}</h2><p class="sec__sub">${sub}</p>
		<div class="grow__grid">${tiles.join('')}</div>
	</div></div>`;
}

function nextBirthday(iso) {
	const b = parseDate(iso);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	let n = new Date(today.getFullYear(), b.getMonth(), b.getDate());
	if (n < today) n = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
	return Math.round((n - today) / 864e5);
}
