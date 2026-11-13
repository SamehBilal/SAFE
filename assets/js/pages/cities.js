import { L, T, esc, pageHead, related, App, $, $$, num, fmtDate } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';
import { GOV, govName, loadTrips } from './trips.js';
import { fit, where, here, nearestGov, CAPITALS } from '../tilemap.js';

/* A map for every city we've been to, like a city poster: the streets in the dark and every spot we went to lit up.
   The spots are our places that have "at" in story.json (grouped by the governorate they're in, named by their
   "area" when they have one), the governorates of our anniversary trips, and spots added from the phones
   (the shared list content/live/spots.bin). */

const coords = ({ lat, lng }) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;

/** Every city with its spots: [{ id (governorate), name, spots: [{ title, at, date, note, id?, by? }], trips: [years] }] */
function cities(s, trips, extra) {
	const map = new Map();
	const get = (gov) => {
		if (!map.has(gov)) map.set(gov, { id: gov, name: govName(gov) || gov, area: '', spots: [], trips: [] });
		return map.get(gov);
	};
	// places that share an "area" stay on one map, under the governorate of the first of them
	const areaGov = new Map();
	for (const m of s.places || []) {
		const at = where(m);
		if (!at) continue;
		const area = App.t(m.area);
		if (area && !areaGov.has(area)) areaGov.set(area, nearestGov(at));
		const c = get(area ? areaGov.get(area) : nearestGov(at));
		if (m.area && !c.area) c.area = App.t(m.area);
		c.spots.push({ title: App.t(m.title), at, date: m.date, note: App.t(m.where) || App.t(m.place) });
	}
	for (const x of extra) {
		const at = where(x);
		if (!at) continue;
		get(x.gov && GOV[x.gov] ? x.gov : nearestGov(at)).spots.push({ ...x, at, live: true });
	}
	for (const t of trips) if (t.gov && GOV[t.gov]) get(t.gov).trips.push(t.year);
	return [...map.values()].map((c) => ({ ...c, label: c.area || c.name }))
		.sort((a, b) => b.spots.length - a.spots.length || a.label.localeCompare(b.label));
}

export default {
	title: { ar: 'خرايط مدننا', en: 'Our city maps' },
	render() {
		const ok = live.canWrite();
		return `
		${pageHead(L('خرايط مدننا', 'Our city maps'), L('كل مدينة رحناها، والأماكن اللي مشينا فيها منورة على خريطتها', 'Every city we’ve been to, with the spots we walked lit up on its map'), [{ href: 'places.html', ar: 'أماكننا', en: 'Our places' }, { href: 'cities.html', ar: 'خرايط مدننا', en: 'Our city maps' }], [['pin', 'هنا', 'Here'], ['moon', 'بالليل', 'By night'], ['walk', 'مشينا', 'We walked'], ['star', 'منورة', 'Lit up']])}
		<section class="sec sec--top"><div class="wrap">
			<div class="cm" id="cm" style="direction:ltr">
				<div class="cm__map" aria-hidden="true"></div>
				<div class="cm__pins"></div>
				<div class="cm__title"><b id="cm-name"></b><small id="cm-sub"></small></div>
				<p class="cm__empty" id="cm-empty" hidden>${L('لسه مفيش أماكن منورة هنا — ضيفوا اللي رحناه', 'No spots lit up here yet — add the ones we went to')}</p>
				<div class="cm__tip" id="cm-tip" hidden></div>
				<p class="cm__credit">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p>
			</div>
			<ol class="cm-spots" id="cm-spots"></ol>
			<h2 class="sec__title">${L('مدننا', 'Our cities')}</h2>
			<div class="cm-grid" id="cm-grid"><p class="empty">${L('بنجيب الخرايط…', 'Fetching the maps…')}</p></div>

			${ok ? '' : `<div class="narrow" style="margin:28px auto 0">${setupNote()}</div>`}
			<details class="composer reveal narrow" style="margin:28px auto 0"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('pin', 22)}</span> ${L('نورّوا مكان', 'Light up a spot')}</summary>
				<form id="cm-form" autocomplete="off">
					<label class="f"><span>${L('اسم المكان', 'The spot')}</span><input name="title" dir="auto" maxlength="80" required placeholder="${L('قلعة قايتباي', 'Qaitbay Citadel')}"></label>
					<div class="f-row">
						<label class="f"><span>${L('المحافظة', 'Governorate')}</span><select name="gov">${Object.keys(CAPITALS).sort((a, b) => govName(a).localeCompare(govName(b))).map((g) => `<option value="${g}">${esc(govName(g))}</option>`).join('')}</select></label>
						<label class="f"><span>${L('رحناه إمتى؟', 'When?')}</span><input name="date" type="date"></label>
					</div>
					<label class="f"><span>${L('المكان على الخريطة', 'Where on the map')}</span><input name="at" dir="ltr" required placeholder="31.2140, 29.8856" inputmode="decimal"></label>
					<p class="cm-howto">${L('من جوجل ماب: دوسة طويلة (أو كليك يمين) على المكان، وانسخوا أول سطر. أو:', 'From Google Maps: long-press (or right-click) the spot and copy the first line. Or:')} <button class="link" type="button" id="cm-here">${doodle('pin', 16)} ${L('أنا هناك دلوقتي', 'I’m there now')}</button></p>
					<label class="f"><span>${L('كلمة عنه (اختياري)', 'A word about it (optional)')}</span><input name="note" dir="auto" maxlength="140"></label>
					<p class="form-msg" id="cm-msg" role="status"></p>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${L('نوّروه ✦', 'Light it up ✦')}</button></div>
				</form>
			</details>
		</div></section>
		${related(['places', 'trips', 'distances'])}`;
	},

	async after(main, s) {
		const box = $('#cm', main), mapEl = $('.cm__map', box), pinsEl = $('.cm__pins', box), tip = $('#cm-tip', main), grid = $('#cm-grid', main);
		let trips = [], spots = { items: [] }, list = [], cur = '';

		const show = (id) => {
			const c = list.find((x) => x.id === id) || list[0];
			if (!c) return;
			cur = c.id;
			const pts = c.spots.map((p) => p.at);
			const cap = CAPITALS[c.id] ? { lat: CAPITALS[c.id][0], lng: CAPITALS[c.id][1] } : pts[0];
			const view = fit(mapEl, pts, { pad: 60, padTop: 110, zoom: pts.length ? 15 : 12, maxZ: 16, center: cap });
			pinsEl.innerHTML = c.spots.map((p, i) => { const xy = view.at(p.at); return `<button class="cm__pin" type="button" data-i="${i}" style="left:${xy.x.toFixed(1)}px;top:${xy.y.toFixed(1)}px;--d:${(i % 7) * 0.4}s" aria-label="${esc(p.title)}"></button>`; }).join('');
			$('#cm-name', main).textContent = c.label;
			$('#cm-sub', main).textContent = [cap ? coords(cap) : '', c.trips.length ? L(`رحلة ${c.trips.map((y) => num(y).replace(/[٬,]/g, '')).join(' و')}`, `Trip ${c.trips.join(' & ')}`) : ''].filter(Boolean).join(' · ');
			$('#cm-empty', main).hidden = !!c.spots.length;
			tip.hidden = true;
			const mineOk = live.canWrite();
			$('#cm-spots', main).innerHTML = c.spots.map((p, i) => `<li><button type="button" data-i="${i}"><b dir="auto">${esc(p.title)}</b>${p.date || p.note ? `<small dir="auto">${esc([p.date ? fmtDate(p.date) : '', p.note || ''].filter(Boolean).join(' · '))}</small>` : ''}</button>${p.live && mineOk && p.by === live.me() ? `<button class="link link--danger" type="button" data-del="${esc(p.id)}">${L('مسح', 'Delete')}</button>` : ''}</li>`).join('');
			for (const b of $$('.cm-card', grid)) b.classList.toggle('is-on', b.dataset.c === c.id);
			const f = $('#cm-form', main);
			if (f && !f.title.value) f.gov.value = c.id;
		};

		const tipFor = (i) => {
			const c = list.find((x) => x.id === cur);
			const p = c?.spots[i];
			const pin = $(`.cm__pin[data-i="${i}"]`, pinsEl);
			if (!p || !pin) return;
			for (const x of $$('.cm__pin', pinsEl)) x.classList.toggle('is-on', x === pin);
			tip.innerHTML = `<b dir="auto">${esc(p.title)}</b>${p.date ? `<small>${esc(fmtDate(p.date))}</small>` : ''}${p.note ? `<span dir="auto">${esc(p.note)}</span>` : ''}`;
			tip.style.left = pin.style.left;
			tip.style.top = pin.style.top;
			tip.hidden = false;
		};
		pinsEl.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) tipFor(+b.dataset.i); };
		pinsEl.onpointerover = (e) => { const b = e.target.closest('[data-i]'); if (b && e.pointerType === 'mouse') tipFor(+b.dataset.i); };
		mapEl.parentElement.addEventListener('click', (e) => { if (!e.target.closest('.cm__pin, .cm__tip, a')) { tip.hidden = true; $$('.cm__pin', pinsEl).forEach((x) => x.classList.remove('is-on')); } });

		$('#cm-spots', main).onclick = async (e) => {
			const del = e.target.closest('[data-del]');
			if (del) {
				if (!confirm(L('تطفوا المكان ده؟', 'Remove this spot?'))) return;
				try { spots = await live.save('spots', (d) => { d.items = (d.items || []).filter((x) => x.id !== del.dataset.del); }); build(cur); } catch (err) { alert(live.why(err)); }
				return;
			}
			const b = e.target.closest('[data-i]');
			if (b) { tipFor(+b.dataset.i); box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
		};

		grid.onclick = (e) => {
			const b = e.target.closest('[data-c]');
			if (!b) return;
			show(b.dataset.c);
			history.replaceState(history.state, '', `#${b.dataset.c}`);
			box.scrollIntoView({ behavior: 'smooth', block: 'start' });
		};

		function build(want) {
			list = cities(s, trips, spots.items || []);
			grid.innerHTML = list.length ? list.map((c) => `
				<button class="cm-card" type="button" data-c="${esc(c.id)}">
					<span class="cm-card__map" style="direction:ltr" aria-hidden="true"><span class="cm-card__tiles"></span><span class="cm-card__dots"></span></span>
					<b>${esc(c.label)}</b>
					<small>${c.spots.length ? L(`${num(c.spots.length)} ${c.spots.length === 1 ? 'مكان' : c.spots.length <= 10 ? 'أماكن' : 'مكان'} منورة`, `${c.spots.length} spot${c.spots.length === 1 ? '' : 's'} lit up`) : L('مستنية أماكنها', 'waiting for its spots')}${c.trips.length ? ` · ${doodle('suitcase', 14)}` : ''}</small>
				</button>`).join('') : `<p class="empty">${L('لسه مفيش مدن… ضيفوا أول مكان رحناه ♥', 'No cities yet… add the first spot we went to ♥')}</p>`;
			// each card gets its own little night map
			for (const card of $$('.cm-card', grid)) {
				const c = list.find((x) => x.id === card.dataset.c);
				const tiles = $('.cm-card__tiles', card);
				const cap = CAPITALS[c.id] ? { lat: CAPITALS[c.id][0], lng: CAPITALS[c.id][1] } : null;
				const v = fit(tiles, c.spots.map((p) => p.at), { pad: 26, zoom: c.spots.length ? 14 : 11, maxZ: 15, center: cap || undefined });
				$('.cm-card__dots', card).innerHTML = c.spots.map((p) => { const xy = v.at(p.at); return `<i style="left:${xy.x.toFixed(1)}px;top:${xy.y.toFixed(1)}px"></i>`; }).join('');
			}
			const fromHash = decodeURIComponent(location.hash.slice(1));
			show(want || (list.some((c) => c.id === fromHash) ? fromHash : list[0]?.id));
		}

		const form = $('#cm-form', main);
		if (form) {
			const msg = $('#cm-msg', main);
			$('#cm-here', main).onclick = async () => {
				msg.textContent = L('بندور عليكم…', 'Finding you…');
				try { const p = await here(); form.at.value = `${p.lat}, ${p.lng}`; form.gov.value = nearestGov(p); msg.textContent = ''; }
				catch (err) { msg.textContent = err.message === 'denied' ? L('اسمحوا للموقع بالـ Location من إعدادات المتصفح', 'Allow Location for this site in the browser settings') : L('معرفناش نلاقي المكان', 'Couldn’t find the spot'); }
			};
			form.onsubmit = async (e) => {
				e.preventDefault();
				const at = where(form.at.value);
				if (!at) { msg.textContent = L('المكان لازم يبقى رقمين زي 31.2140, 29.8856', 'The spot should be two numbers like 31.2140, 29.8856'); return; }
				const x = { id: live.newId(), title: form.title.value.trim(), gov: form.gov.value, at: `${at.lat}, ${at.lng}`, date: form.date.value || undefined, note: form.note.value.trim() || undefined, by: live.me() };
				if (!x.title) return;
				try {
					spots = await live.save('spots', (d) => { (d.items = d.items || []).push(x); });
					form.reset();
					msg.textContent = L('اتنوّر ✦', 'Lit up ✦');
					build(x.gov);
					box.scrollIntoView({ behavior: 'smooth', block: 'start' });
				} catch (err) { msg.textContent = live.why(err); }
			};
		}

		[trips, spots] = await Promise.all([loadTrips(s).catch(() => []), live.load('spots').catch(() => ({ items: [] }))]);
		build();
		let w = box.clientWidth;
		new ResizeObserver(() => { if (box.isConnected && Math.abs(box.clientWidth - w) > 30) { w = box.clientWidth; show(cur); } }).observe(box);
	}
};
