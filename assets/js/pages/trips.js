import { L, T, t, esc, pageHead, related, App, $, $$, num, parseDate, daysBetween, longDate, REDUCE, sleep, img, hydrate } from '../shell.js';
import * as live from '../live.js';
import { GOVERNORATES, VIEWBOX, DOTS } from '../egypt.js';
import { setupNote } from './journal.js';
import { hangWall } from '../hang.js';

/* Every wedding anniversary we travel to a governorate. Trips you add from your phones live in
   content/live/trips.bin; trips written in story.json (with photos from private/media) are merged in. */

export const GOV = Object.fromEntries(GOVERNORATES.map((g) => [g.id, g]));
export const govName = (id) => (GOV[id] ? L(GOV[id].ar, GOV[id].en) : '');

const ORD_AR = ['', 'الأول', 'التاني', 'التالت', 'الرابع', 'الخامس', 'السادس', 'السابع', 'التامن', 'التاسع', 'العاشر'];
const ORD_EN = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
export const marriedYear = (s) => parseDate(s.married || '2020-09-10').getFullYear();
export function anniversary(s, year) {
	const n = year - marriedYear(s);
	return n < 1 ? '' : App.lang === 'ar' ? `عيد جوازنا ${ORD_AR[n] || 'الـ' + num(n)}` : `Our ${ORD_EN(n)} anniversary`;
}

/** Trips from story.json and from the phones, merged by id, oldest first. */
export async function loadTrips(s) {
	const data = await live.load('trips');
	const byId = new Map();
	for (const x of s.trips || []) byId.set(x.id, { ...x, fixed: true, memories: [...(x.memories || [])] });
	for (const x of data.items || []) {
		const old = byId.get(x.id);
		byId.set(x.id, old ? { ...old, ...x, fixed: old.fixed, memories: [...old.memories, ...(x.memories || [])] } : { ...x, memories: x.memories || [] });
	}
	return [...byId.values()].sort((a, b) => a.year - b.year || (a.date || '').localeCompare(b.date || ''));
}

/** First photo of a trip: a photo from story.json (media:…) or one added from a phone (sketch store id). */
export function coverOf(x) {
	const p = (x.photos || [])[0];
	if (p) return { media: typeof p === 'string' ? p : p.photo };
	const m = (x.memories || []).find((y) => y.img);
	return m ? { live: m.img } : null;
}
export const coverHTML = (c, alt = '') => (!c ? '' : c.media ? img(c.media, alt) : `<img data-sketch="${esc(c.live)}" alt="${esc(alt)}">`);

/** The map. `paint` colours each governorate; returns markup. */
export function mapSVG(cls = '') {
	return `<svg class="eg ${cls}" viewBox="${VIEWBOX}" role="group" aria-label="${L('خريطة محافظات مصر', 'Map of Egypt’s governorates')}" style="direction:ltr">
		<defs><filter id="egShadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#133447" flood-opacity=".25"/></filter></defs>
		<g filter="url(#egShadow)">${GOVERNORATES.map((g) => `<path class="eg__gov" id="g-${g.id.replace('.', '_')}" data-gov="${g.id}" d="${g.d}" tabindex="0" role="button" aria-label="${esc(L(g.ar, g.en))}"><title>${esc(L(g.ar, g.en))}</title></path>`).join('')}</g>
		${Object.entries(DOTS).map(([id, [x, y]]) => `<circle class="eg__dot" data-gov="${id}" cx="${x}" cy="${y}" r="9" tabindex="0" role="button" aria-label="${esc(govName(id))}"><title>${esc(govName(id))}</title></circle>`).join('')}
		<g class="eg__pins"></g>
	</svg>`;
}

/** Colour the governorates we've been to, and pin the year on each. */
export function paintMap(svg, trips, { focus } = {}) {
	const byGov = new Map();
	for (const x of trips) (byGov.get(x.gov) || byGov.set(x.gov, []).get(x.gov)).push(x);
	for (const el of $$('[data-gov]', svg)) {
		const n = byGov.get(el.dataset.gov)?.length || 0;
		el.classList.toggle('is-been', n > 0);
		el.classList.toggle('is-twice', n > 1);
		el.classList.toggle('is-focus', el.dataset.gov === focus);
	}
	const pins = $('.eg__pins', svg);
	pins.innerHTML = [...byGov.entries()].map(([id, list]) => {
		const el = $(`[data-gov="${id}"]`, svg);
		if (!el) return '';
		let x, y;
		if (DOTS[id]) [x, y] = DOTS[id];
		else { const b = el.getBBox(); x = b.x + b.width / 2; y = b.y + b.height / 2; }
		const label = list.map((v) => v.year).join(' · ');
		const w = 22 + label.length * 13;
		return `<g class="eg__pin" transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><path d="M0 0c-6-10-16-14-16-26a16 16 0 0 1 32 0c0 12-10 16-16 26Z" fill="#f2726f" stroke="#fff" stroke-width="3"/><circle cy="-26" r="6" fill="#fff"/>
			<g transform="translate(0 -60)"><rect x="${-w / 2}" y="-16" width="${w}" height="30" rx="15" fill="#133447"/><text text-anchor="middle" dy="6" fill="#fff" font-size="20" font-weight="800">${esc(label)}</text></g></g>`;
	}).join('');
}

/** Phone photos → 1600px webp, so every saved photo is light and the same kind. */
export async function shrinkPhoto(file, max = 1600) {
	const bmp = await createImageBitmap(file);
	const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
	const c = document.createElement('canvas');
	c.width = Math.round(bmp.width * k);
	c.height = Math.round(bmp.height * k);
	c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
	return new Promise((r) => c.toBlob(r, 'image/webp', 0.82));
}

function nextAnniversary(s) {
	const m = parseDate(s.married || '2020-09-10');
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	let d = new Date(today.getFullYear(), m.getMonth(), m.getDate());
	if (d < today) d = new Date(today.getFullYear() + 1, m.getMonth(), m.getDate());
	return { days: Math.round((d - today) / 864e5), year: d.getFullYear() };
}

export default {
	title: { ar: 'رحلات عيد جوازنا', en: 'Anniversary trips' },
	render(s) {
		const ok = live.canWrite();
		const nx = nextAnniversary(s);
		const years = [];
		for (let y = marriedYear(s) + 1; y <= new Date().getFullYear() + 1; y++) years.push(y);
		const govs = [...GOVERNORATES].sort((a, b) => L(a.ar, a.en).localeCompare(L(b.ar, b.en), App.lang));
		return `
		${pageHead(L('رحلات عيد جوازنا', 'Anniversary trips'), L('كل سنة في عيد جوازنا بنسافر محافظة جديدة… لحد ما نلف مصر كلها', 'Every wedding anniversary we travel to a new governorate… until we’ve seen all of Egypt'), [{ href: 'trips.html', ar: 'رحلاتنا', en: 'Our trips' }])}
		<section class="sec sec--top"><div class="wrap">
			<div class="counters trip-stats">
				<div class="counter reveal"><b id="tr-been">–</b><span>${L('محافظة من ٢٧', 'of 27 governorates')}</span></div>
				<div class="counter reveal"><b>${nx.days === 0 ? '🎉' : num(nx.days)}</b><span>${nx.days === 0 ? L('النهارده عيد جوازنا!', 'It’s our anniversary today!') : esc(L(`يوم على ${anniversary(s, nx.year)}`, `days to ${anniversary(s, nx.year).toLowerCase()}`))}</span></div>
				<div class="counter reveal"><b id="tr-left">–</b><span>${L('محافظة لسه مستنيانا', 'still waiting for us')}</span></div>
			</div>

			<div class="trip-map">
				<div class="trip-map__map reveal">${mapSVG()}</div>
				<aside class="trip-map__side panel" id="tr-side" aria-live="polite"></aside>
			</div>

			${ok ? '' : `<div class="narrow" style="margin:28px auto 0">${setupNote()}</div>`}
			<details class="composer reveal" id="tr-composer" style="margin-top:28px"${ok ? '' : ' hidden'}>
				<summary><span>🧳</span> ${L('سجلي رحلة', 'Log a trip')}</summary>
				<form id="tr-form" autocomplete="off">
					<div class="f-row">
						<label class="f"><span>${L('سنة كام؟', 'Which year?')}</span><select name="year">${years.map((y) => `<option value="${y}"${y === (nx.days === 0 ? nx.year : nx.year - 1) ? ' selected' : ''}>${y} — ${esc(anniversary(s, y))}</option>`).join('')}</select></label>
						<label class="f f--grow"><span>${L('المحافظة', 'Governorate')}</span><select name="gov" required><option value="">—</option>${govs.map((g) => `<option value="${g.id}">${esc(L(g.ar, g.en))}</option>`).join('')}</select></label>
					</div>
					<div class="f-row">
						<label class="f f--grow"><span>${L('رحنا فين بالظبط؟', 'Where exactly?')}</span><input name="place" dir="auto" maxlength="80" placeholder="${L('المدينة، الفندق، المكان…', 'Town, hotel, place…')}"></label>
						<label class="f"><span>${L('من يوم', 'From')}</span><input name="date" type="date"></label>
					</div>
					<label class="f"><span>${L('اسم للرحلة', 'Name the trip')}</span><input name="title" dir="auto" maxlength="80"></label>
					<label class="f"><span>${L('في كلمتين', 'In a few words')}</span><textarea name="note" dir="auto" rows="3" maxlength="600"></textarea></label>
					<p class="form-msg" id="tr-msg" role="status"></p>
					<div class="f-actions"><button class="btn btn--coral" type="submit">${L('سجلي الرحلة ♥', 'Log the trip ♥')}</button></div>
				</form>
			</details>

			<div class="hang-night" style="margin-top:48px"><h2 class="sec__title">${L('حيطة الذكريات', 'Our memory wall')}</h2><div id="tr-list"></div></div>
		</div></section>
		${related(['chapters', 'gallery', 'journal'])}`;
	},

	async after(main, s) {
		const svg = $('.eg', main);
		const side = $('#tr-side', main);
		const list = $('#tr-list', main);
		let trips = await loadTrips(s);
		let focus = '';

		const sideIdle = () => `<h2>${L('دوسي على أي محافظة', 'Tap a governorate')}</h2>
			<p class="muted">${L('الملونة رحناها في عيد جوازنا، والباقي لسه مستنينا.', 'The coloured ones are where our anniversaries took us; the rest are still waiting.')}</p>
			<button class="btn btn--coral" type="button" id="tr-draw">🎲 ${L('قرعة الرحلة الجاية', 'Draw our next trip')}</button>
			<p class="trip-pick" id="tr-pick" aria-live="polite"></p>`;

		const showGov = (id) => {
			focus = id;
			paintMap(svg, trips, { focus });
			const here = trips.filter((x) => x.gov === id);
			side.innerHTML = `<h2>${esc(govName(id))}</h2>
				${here.length ? here.map((x) => `<a class="trip-mini" href="trip.html?id=${esc(x.id)}"><b>${x.year}</b><span>${esc(anniversary(s, x.year))}${x.place ? ` · <span dir="auto">${esc(x.place)}</span>` : ''}</span><i aria-hidden="true">${App.arrow}</i></a>`).join('')
					: `<p class="muted">${L('لسه مرحناهاش… يمكن تكون الجاية؟', 'We haven’t been yet… maybe it’s next?')}</p>
					${live.canWrite() ? `<button class="btn btn--ghost btn--sm" type="button" data-log="${id}">🧳 ${L('سجلي رحلة هنا', 'Log a trip here')}</button>` : ''}`}
				<button class="link" type="button" id="tr-back">${L('رجوع', 'Back')}</button>`;
			$('#tr-back', side).onclick = () => { focus = ''; paintMap(svg, trips); side.innerHTML = sideIdle(); wireDraw(); };
			$('[data-log]', side)?.addEventListener('click', (e) => {
				const f = $('#tr-form', main);
				f.gov.value = e.currentTarget.dataset.log;
				$('#tr-composer', main).open = true;
				$('#tr-composer', main).scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
		};

		/* the draw: light up the governorates we haven't been to, one after another, and stop on one */
		function wireDraw() {
			const b = $('#tr-draw', side);
			if (!b) return;
			b.onclick = async () => {
				const been = new Set(trips.map((x) => x.gov));
				const left = GOVERNORATES.filter((g) => !been.has(g.id));
				if (!left.length) { $('#tr-pick', side).textContent = L('لفينا مصر كلها! 🎉', 'We’ve seen all of Egypt! 🎉'); return; }
				b.disabled = true;
				const pick = left[Math.floor(Math.random() * left.length)];
				const steps = REDUCE ? 1 : 18;
				for (let k = 0; k < steps; k++) {
					const g = k === steps - 1 ? pick : left[Math.floor(Math.random() * left.length)];
					paintMap(svg, trips, { focus: g.id });
					await sleep(60 + k * k * 1.2);
				}
				navigator.vibrate?.([30, 60, 30]);
				$('#tr-pick', side).innerHTML = `${L('الرحلة الجاية:', 'Next trip:')} <b>${esc(L(pick.ar, pick.en))}</b>`;
				b.disabled = false;
			};
		}

		const paintList = () => {
			const been = new Set(trips.map((x) => x.gov));
			$('#tr-been', main).textContent = num(been.size);
			$('#tr-left', main).textContent = num(27 - been.size);
			list.innerHTML = hangWall(trips.slice().reverse().map((x) => ({ href: `trip.html?id=${x.id}`, html: coverHTML(coverOf(x), govName(x.gov)), caption: `${x.year} · ${govName(x.gov)}`, sub: x.title || x.place || anniversary(s, x.year) })), { empty: L('الرحلة الجاية ♥', 'Our next trip ♥') });
			hydrate(list);
			live.hydrateSketches(list);
		};

		paintMap(svg, trips);
		side.innerHTML = sideIdle();
		wireDraw();
		paintList();

		svg.onclick = (e) => { const el = e.target.closest('[data-gov]'); if (el) showGov(el.dataset.gov); };
		svg.onkeydown = (e) => { const el = e.target.closest('[data-gov]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showGov(el.dataset.gov); } };

		const form = $('#tr-form', main);
		if (!form) return;
		form.onsubmit = async (e) => {
			e.preventDefault();
			const msg = $('#tr-msg', main);
			const item = { id: live.newId(), year: +form.year.value, gov: form.gov.value, place: form.place.value.trim(), date: form.date.value || undefined, title: form.title.value.trim(), note: form.note.value.trim(), by: live.me(), at: Date.now(), memories: [] };
			if (!item.gov) return form.gov.focus();
			msg.textContent = L('بنسجل…', 'Saving…');
			try {
				await live.save('trips', (d) => { (d.items = d.items || []).push(item); });
				location.href = `trip.html?id=${item.id}`;
			} catch (err) { msg.textContent = live.why(err); }
		};
	}
};
