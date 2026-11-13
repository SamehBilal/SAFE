import { App, L, Y, T, esc, num, pageHead, related, $, parseDate, yearsBetween, daysBetween, age, fmtDate, occasions } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';

/* Us in numbers: a clock running since the first hello, everything we've collected counted on journal cards, a
   hand-drawn bar for every year of us (how many moments each one holds, the big days pinned on it), and the next
   round numbers coming up. The story gives the dates; the shared lists (journal, songs, films, books) add their
   counts once they've loaded. */

const DAY = 864e5;
/* years, months, days, hours, minutes, seconds from a to b, the way a calendar counts them */
function since(a, b = new Date()) {
	let y = b.getFullYear() - a.getFullYear();
	let m = b.getMonth() - a.getMonth();
	let d = b.getDate() - a.getDate();
	if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
	if (m < 0) { y--; m += 12; }
	const t = b.getHours() * 3600 + b.getMinutes() * 60 + b.getSeconds();
	return { y, m, d, h: Math.floor(t / 3600), min: Math.floor((t % 3600) / 60), s: t % 60 };
}
const pad = (n) => num(n).padStart(2, App.lang === 'ar' ? '٠' : '0');
/* Arabic counts: ١ سنة، ٢ سنتين، ٣–١٠ سنين، ١١+ سنة */
const count = (n, [one, two, few, many], en) => (App.lang === 'ar' ? (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${num(n)} ${few}` : `${num(n)} ${many}`) : `${n} ${en}${n === 1 ? '' : 's'}`);
const DAYS = ['يوم واحد', 'يومين', 'أيام', 'يوم'];

export default {
	title: { ar: 'إحنا بالأرقام', en: 'Us in numbers' },

	render(s) {
		const met = parseDate(s.met || '2009-06-10');
		return `
		${pageHead(L('إحنا بالأرقام', 'Us in numbers'), L('كل يوم، وكل سنة، وكل حاجة جمعناها سوا — متعدّة واحدة واحدة ♥', 'Every day, every year, everything we’ve gathered together — counted one by one ♥'), [{ href: 'numbers.html', ar: 'إحنا بالأرقام', en: 'Us in numbers' }], { icons: [['calendar', 'من أول يوم', 'Since day one'], ['heart', 'بنعد', 'Counting'], ['star', 'ولسه', 'And more']] })}
		<section class="sec sec--top"><div class="wrap">

			<article class="nums-clock reveal" aria-labelledby="nc-t">
				<p class="nums-clock__k" id="nc-t">${L('من أول سلام', 'Since our first hello')} · <time datetime="${esc(s.met || '')}">${fmtDate(s.met || '2009-06-10')}</time></p>
				<div class="nums-clock__row" id="nc-row" aria-live="off"></div>
				<p class="nums-clock__total">${L('يعني', 'That’s')} <b id="nc-days">${num(daysBetween(met))}</b> ${L('يوم، و', 'days, and')} <b id="nc-hours">${num(Math.floor((Date.now() - met) / 36e5))}</b> ${L('ساعة', 'hours')}</p>
			</article>

			<h2 class="sec__title reveal">${L('في حكايتنا', 'In our story')}</h2>
			<div class="counters nums-grid" id="nums-story"></div>

			<h2 class="sec__title reveal">${L('اللي جمعناه سوا', 'What we’ve gathered')}</h2>
			<p class="sec__sub reveal">${L('من الدفتر والأغاني والأفلام والكتب — بيزيدوا كل ما حد فينا يضيف حاجة', 'From the journal, songs, films and books — they grow each time one of us adds something')}</p>
			<div class="counters nums-grid" id="nums-live"><p class="empty">${L('بنعد…', 'Counting…')}</p></div>

			<h2 class="sec__title reveal">${L('سنة ورا سنة', 'Year after year')}</h2>
			<p class="sec__sub reveal">${L('كل عمود سنة من عمرنا سوا، وطوله على قد اللحظات اللي فيها في حكايتنا', 'Each bar is a year of us, as tall as the moments it holds in our story')}</p>
			<figure class="nums-chart reveal" id="nums-chart"></figure>

			<h2 class="sec__title reveal">${L('جاي قريب', 'Coming up')}</h2>
			<div class="nums-next" id="nums-next"></div>
		</div></section>
		${related(['story', 'birthday', 'chapters'])}`;
	},

	async after(main, s) {
		const met = parseDate(s.met || '2009-06-10');
		const married = s.married ? parseDate(s.married) : null;
		const members = s.family?.members || [];
		const kids = members.filter((m) => m.kid && m.born);

		/* the clock, ticking every second */
		const UNITS = [['y', L('سنين', 'years')], ['m', L('شهور', 'months')], ['d', L('أيام', 'days')], ['h', L('ساعات', 'hours')], ['min', L('دقايق', 'minutes')], ['s', L('ثواني', 'seconds')]];
		const row = $('#nc-row', main);
		row.innerHTML = UNITS.map(([k, l]) => `<span class="nc nc--${k}"><b data-u="${k}">0</b><small>${l}</small></span>`).join('');
		const tick = () => {
			const t = since(met);
			for (const [k] of UNITS) { const el = row.querySelector(`[data-u="${k}"]`); const v = k === 'y' ? num(t[k]) : pad(t[k]); if (el.textContent !== v) el.textContent = v; }
			$('#nc-days', main).textContent = num(daysBetween(met));
			$('#nc-hours', main).textContent = num(Math.floor((Date.now() - met) / 36e5));
		};
		tick();
		const clock = setInterval(tick, 1000);
		this.leave = () => clearInterval(clock);

		/* the story's own numbers */
		const photos = (s.gallery || []).length;
		const card = ([n, l, icon]) => `<div class="counter reveal is-in">${icon ? `<i aria-hidden="true">${doodle(icon, 26)}</i>` : ''}<b>${n}</b><span>${esc(l)}</span></div>`;
		$('#nums-story', main).innerHTML = [
			[num(daysBetween(met)), L('يوم من أول سلام', 'days since hello'), 'heart'],
			[num(yearsBetween(met)), L('سنة مع بعض', 'years of us'), 'calendar'],
			married && [num(daysBetween(married)), L('يوم جواز', 'days married'), 'ring'],
			married && [num(yearsBetween(married)), L('سنة جواز', 'years married'), 'couple'],
			[num(2 + kids.length), L('أفراد في العيلة', 'of us now'), 'family'],
			...kids.map((k) => [age(k.born), L(`عمر ${App.t(k.name)}`, `${App.t(k.name)}’s age`), 'baby']),
			(s.chapters || []).length && [num(s.chapters.length), L('يوم فارق', 'big days'), 'party'],
			(s.timeline || []).length && [num(s.timeline.length), L('لحظة في حكايتنا', 'moments in our story'), 'star'],
			(s.places || []).length && [num(s.places.length), L('مكان ليه حكاية', 'places with a story'), 'pin'],
			(s.trips || []).length && [num(s.trips.length), L('رحلة عيد جواز', 'anniversary trips'), 'suitcase'],
			photos && [num(photos), L('صورة في الألبوم', 'photos in the album'), 'camera'],
			(s.notes || []).length && [num(s.notes.length), L('رسالة حب', 'love notes'), 'chat'],
			(s.letters || []).length && [num(s.letters.length), L('جواب', 'letters'), 'letter']
		].filter(Boolean).map(card).join('');

		/* a bar for every year since we met: its moments, and the big days pinned on top */
		const first = met.getFullYear(), now = new Date().getFullYear();
		const years = Array.from({ length: now - first + 1 }, (_, k) => first + k);
		const per = Object.fromEntries(years.map((y) => [y, 0]));
		for (const x of s.timeline || []) { const y = +String(x.date || '').slice(0, 4); if (y in per) per[y]++; }
		const pins = {};
		const pin = (iso, icon, label) => { const y = +String(iso || '').slice(0, 4); if (y in per) (pins[y] ||= []).push([icon, label]); };
		pin(s.met, 'heart', L('أول سلام', 'First hello'));
		for (const c of s.chapters || []) pin(c.date, c.icon || 'ring', T(c.title));
		for (const k of kids) pin(k.born, 'baby', App.t(k.name));
		const top = Math.max(1, ...Object.values(per));
		$('#nums-chart', main).innerHTML = `
			<div class="nums-chart__plot" style="--n:${years.length}">${years.map((y, k) => `
				<div class="nb" style="--h:${Math.round(12 + (88 * per[y]) / top)}%;--k:${k}" title="${y}: ${per[y]}">
					${(pins[y] || []).length ? `<span class="nb__pins">${pins[y].map(([ic, l]) => `<i title="${esc(l)}">${doodle(ic, 16)}</i>`).join('')}</span>` : ''}
					<span class="nb__bar"><em>${per[y] ? num(per[y]) : ''}</em></span>
					<small>${App.lang === 'ar' ? num(y).replace(/[٬,]/g, '') : y}</small>
				</div>`).join('')}
			</div>
			<figcaption>${doodle('star', 14)} ${L('الأيقونات فوق العواميد: أيامنا الفارقة', 'The little icons on top: our big days')}</figcaption>`;

		/* the next round numbers and dates */
		const today = new Date(); today.setHours(0, 0, 0, 0);
		const inDays = (d) => Math.round((d - today) / DAY);
		const next = [];
		const dHello = daysBetween(met);
		const round = Math.ceil((dHello + 1) / 1000) * 1000;
		next.push({ icon: 'sparkle', big: num(round), what: L('يوم من أول سلام', 'days since hello'), days: round - dHello });
		const anniv = (d) => { const a = new Date(today.getFullYear(), d.getMonth(), d.getDate()); if (a < today) a.setFullYear(a.getFullYear() + 1); return a; };
		const hello = anniv(met);
		next.push({ icon: 'heart', big: num(hello.getFullYear() - met.getFullYear()), what: L('سنة على أول سلام', 'years since hello'), days: inDays(hello) });
		if (married) {
			const w = anniv(married);
			next.push({ icon: 'ring', big: num(w.getFullYear() - married.getFullYear()), what: L('سنة جواز', 'years married'), days: inDays(w) });
			const dWed = daysBetween(married), r = Math.ceil((dWed + 1) / 1000) * 1000;
			next.push({ icon: 'couple', big: num(r), what: L('يوم جواز', 'days married'), days: r - dWed });
		}
		for (const o of occasions(s).filter((o) => o.kind === 'birthday').slice(0, 2)) next.push({ icon: o.emoji, big: '', what: o.title, sub: o.sub, days: o.days });
		next.sort((a, b) => a.days - b.days);
		$('#nums-next', main).innerHTML = next.slice(0, 6).map((x) => `
			<article class="nn reveal is-in">
				<span class="nn__ic" aria-hidden="true">${doodle(x.icon, 30)}</span>
				${x.big ? `<b class="nn__big">${x.big}</b>` : ''}
				<p class="nn__what">${esc(x.what)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</p>
				<p class="nn__when">${x.days === 0 ? L('النهارده ♥', 'today ♥') : L(`كمان ${count(x.days, DAYS)}`, `in ${count(x.days, DAYS, 'day')}`)}</p>
			</article>`).join('');

		/* what we've gathered in the shared lists */
		const kinds = [
			['journal', 'pen', (d) => [[num((d.items || []).length), L('صفحة في الدفتر', 'journal pages')]]],
			['music', 'music', (d) => [[num((d.items || []).length), L('أغنية بتاعتنا', 'songs of ours')]]],
			['movies', 'popcorn', (d) => {
				const it = d.items || [];
				return [[num(it.length), L('فيلم ومسلسل', 'films & series')], [num(Math.round(it.reduce((a, x) => a + (+x.mins || 0), 0) / 60)), L('ساعة فرجة سوا', 'hours watched together')]];
			}],
			['books', 'book', (d) => [[num((d.items || []).length), L('كتاب', 'books')]]]
		];
		const got = await Promise.all(kinds.map(([k, ic, f]) => live.load(k).then((d) => f(d || {}).map(([n, l]) => [n, l, ic])).catch(() => [])));
		const flat = got.flat();
		$('#nums-live', main).innerHTML = flat.length ? flat.map(card).join('') : `<p class="empty">${Y('لسه مضفناش حاجة — ابدأ من الدفتر ♥', 'لسه مضفناش حاجة — ابدئي من الدفتر ♥', 'Nothing added yet — start with the journal ♥')}</p>`;
	}
};
