import { L, esc, pageHead, related, App, $, $$, num, REDUCE } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';

/* Our food: the restaurants we love, each with its menu as a folded paper flyer, after Codrops' «3D Restaurant Menu»
   (tympanus.net/codrops, Mary Lou): the cover swings open on its hinge, the last panel unfolds the other way, and
   picking a dish pushes the menu back while the dish comes forward on its own card. In Arabic the menu opens the
   other way, like an Arabic book; on a phone the panels simply stack. The places live in the shared list
   content/live/food.bin; the first one is an example to show how a menu reads (edit it away or keep it). */

const COLORS = ['#c2185b', '#0e6990', '#26706b', '#e39b2d', '#6d4bb3', '#d9534f', '#8a5a2b'];
const FAV = { him: () => App.t(App.story.him), her: () => App.t(App.story.her), both: () => L('إحنا الاتنين', 'both of us') };
const price = (p) => (p ? L(`${num(+p)} ج`, `EGP ${(+p).toLocaleString('en')}`) : '');

/** "# Section" lines start a section; "Dish | price | what's in it | him/her/both" lines are its dishes. */
export function parseMenu(text) {
	const sections = [];
	for (const raw of String(text || '').split('\n')) {
		const line = raw.trim();
		if (!line) continue;
		if (line.startsWith('#')) { sections.push({ id: live.newId() + sections.length, title: line.replace(/^#+\s*/, ''), dishes: [] }); continue; }
		if (!sections.length) sections.push({ id: live.newId(), title: L('المنيو', 'Menu'), dishes: [] });
		const [name, p, desc, fav] = line.split(/\s*[|｜]\s*/);
		const f = /هو|him|سامح/i.test(fav || '') ? 'him' : /هي|her|إسراء|اسراء/i.test(fav || '') ? 'her' : /اتنين|both|إحنا/i.test(fav || '') ? 'both' : undefined;
		sections.at(-1).dishes.push({ id: live.newId() + Math.random().toString(36).slice(2, 4), name, price: +String(p || '').replace(/[^\d.]/g, '') || undefined, desc: desc || undefined, fav: f });
	}
	return sections.filter((s) => s.dishes.length);
}

/* the sections spread over the three panels, as evenly as their dishes allow */
function panels(sections) {
	if (sections.length <= 3) return [0, 1, 2].map((i) => (sections[i] ? [sections[i]] : []));
	const weight = (s) => 1.4 + s.dishes.length;
	const total = sections.reduce((a, s) => a + weight(s), 0);
	const out = [[], [], []];
	let acc = 0;
	for (const s of sections) {
		const i = Math.min(2, Math.floor((acc + weight(s) / 2) / (total / 3)));
		out[i].push(s);
		acc += weight(s);
	}
	return out;
}

const dl = (secs, r) => secs.map((s) => `<h4>${esc(App.t(s.title))}</h4><dl>${s.dishes.map((d) => `
	<dt><button class="fm-dish" type="button" data-dish="${esc(r.id)}|${esc(s.id)}|${esc(d.id)}"><span dir="auto">${esc(App.t(d.name))}</span>${d.fav ? '<i aria-hidden="true">♥</i>' : ''}${d.price ? `<b>${esc(price(d.price))}</b>` : ''}</button></dt>
	${d.desc ? `<dd dir="auto">${esc(App.t(d.desc))}</dd>` : '<dd></dd>'}`).join('')}</dl>`).join('');

function menuHTML(r) {
	const [a, b, c] = panels(r.sections || []);
	const color = r.color || COLORS[0];
	return `<div class="fm" id="fm" style="--fm:${esc(color)}">
		<div class="fm__wrap">
			<div class="fm__cover">
				<div class="fm__front"><div class="fm__in">
					<div class="fm__logo" aria-hidden="true">${doodle(r.icon || 'dinner', 54)}</div>
					<h2 dir="auto">${esc(App.t(r.name))}</h2>
					${r.tagline ? `<h3 dir="auto">${esc(App.t(r.tagline))}</h3>` : ''}
					<button class="fm__open" type="button">${L('افتحوا المنيو', 'Open the menu')}</button>
					<p class="fm__info">${[App.t(r.cuisine), App.t(r.area), r.phone ? `<span dir="ltr">${esc(r.phone)}</span>` : ''].filter(Boolean).map((x) => (x.startsWith('<') ? x : esc(x))).join('<br>')}</p>
				</div></div>
				<div class="fm__back"><div class="fm__in">${dl(a, r)}</div><div class="fm__shade"></div></div>
			</div>
			<div class="fm__middle"><div class="fm__in">${dl(b, r)}</div><div class="fm__shade"></div></div>
			<div class="fm__right">
				<div class="fm__front"><div class="fm__in"></div></div>
				<div class="fm__back"><div class="fm__in">
					<button class="fm__close" type="button">${L('اقفلوه', 'Close')}</button>
					${dl(c, r)}
					${r.order ? `<div class="fm__order"><h4>${L('طلبنا المعتاد', 'Our usual order')}</h4><p dir="auto">${esc(App.t(r.order))}</p></div>` : ''}
				</div><div class="fm__shade"></div></div>
			</div>
		</div>
	</div>`;
}

export default {
	title: { ar: 'أكلنا', en: 'Our food' },
	render() {
		const ok = live.canWrite();
		return `
		${pageHead(L('أكلنا', 'Our food'), L('المطاعم اللي بنحبها، والمنيو بتاع كل واحد — واللي دايماً بنطلبه', 'The places we love, each with its menu — and what we always order'), [{ href: 'food.html', ar: 'أكلنا', en: 'Our food' }], [['dinner', 'عشا', 'Dinner'], ['coffee', 'قهوة', 'Coffee'], ['scooter', 'دليفري', 'Delivery'], ['heart', 'أكلتنا', 'Our dish']])}
		<section class="sec sec--top"><div class="wrap">
			<div class="chips fm-places" role="toolbar" aria-label="${L('المطاعم', 'Restaurants')}" id="fm-places"></div>
			<div class="fm-stage" id="fm-stage"><p class="empty">${L('بنجيب المطاعم…', 'Fetching the restaurants…')}</p></div>
			<p class="fm-mine" id="fm-mine" hidden></p>

			${ok ? '' : `<div class="narrow" style="margin:28px auto 0">${setupNote()}</div>`}
			<details class="composer reveal narrow" style="margin:28px auto 0"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('dinner', 22)}</span> ${L('ضيفوا مطعم', 'Add a restaurant')}</summary>
				<form id="fm-form" autocomplete="off">
					<div class="f-row">
						<label class="f f--grow"><span>${L('اسم المطعم', 'Restaurant')}</span><input name="name" dir="auto" maxlength="50" required></label>
						<label class="f f--grow"><span>${L('جملة تحت الاسم', 'A line under the name')}</span><input name="tagline" dir="auto" maxlength="70"></label>
					</div>
					<div class="f-row">
						<label class="f"><span>${L('أكل إيه؟', 'What kind of food?')}</span><input name="cuisine" dir="auto" maxlength="40" placeholder="${L('مشويات، إيطالي…', 'Grills, Italian…')}"></label>
						<label class="f"><span>${L('فين؟', 'Where?')}</span><input name="area" dir="auto" maxlength="60"></label>
						<label class="f"><span>${L('التليفون', 'Phone')}</span><input name="phone" type="tel" dir="ltr" maxlength="20"></label>
					</div>
					<label class="f"><span>${L('المنيو', 'The menu')}</span><textarea name="menu" dir="auto" rows="8" required placeholder="${L('# مشويات\nكفتة | 180 | كفتة على الفحم مع عيش وطحينة | إحنا الاتنين\nريش | 320 | ريش ضاني\n# حلو\nأم علي | 70 | بالمكسرات والقشطة | هي', '# Grills\nKofta | 180 | Charcoal kofta with bread and tahini | both\nLamb chops | 320\n# Dessert\nOm Ali | 70 | With nuts and cream | her')}"></textarea></label>
					<p class="fm-howto">${L('سطر يبدأ بـ # يبقى قسم. كل أكلة في سطر: الاسم | السعر | فيها إيه | مين بيحبها (هو / هي / إحنا الاتنين). الباقي اختياري.', 'A line starting with # is a section. One dish per line: name | price | what’s in it | who loves it (him / her / both). All but the name is optional.')}</p>
					<label class="f"><span>${L('طلبنا المعتاد (اختياري)', 'Our usual order (optional)')}</span><input name="order" dir="auto" maxlength="160"></label>
					<p class="form-msg" id="fm-msg" role="status"></p>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${L('حطوا المنيو ♥', 'Add the menu ♥')}</button></div>
				</form>
			</details>
		</div></section>
		${related(['draw', 'places', 'cities'])}`;
	},

	async after(main) {
		const stage = $('#fm-stage', main), chips = $('#fm-places', main);
		let data = { items: [] };
		let cur = '';
		let fm = null;

		const all = () => (data.items || []).slice();
		const close = () => { fm?.classList.remove('is-open', 'is-in', 'no-delay'); $('.fm__card', fm || stage)?.remove(); };

		function show(id) {
			const r = all().find((x) => x.id === id) || all()[0];
			if (!r) { stage.innerHTML = `<p class="empty">${L('لسه مفيش مطاعم… ضيفوا أول مطعم بنحبه ♥', 'No restaurants yet… add the first place we love ♥')}</p>`; chips.innerHTML = ''; return; }
			cur = r.id;
			stage.innerHTML = menuHTML(r);
			fm = $('#fm', stage);
			chips.innerHTML = all().map((x) => `<button class="chip${x.id === cur ? ' is-on' : ''}" type="button" data-r="${esc(x.id)}" style="--c:${esc(x.color || COLORS[0])}">${esc(App.t(x.name))}</button>`).join('');
			chips.hidden = all().length < 2;
			const mine = $('#fm-mine', main);
			const canDel = live.canWrite() && (r.by === live.me() || !r.by);
			mine.hidden = !canDel;
			mine.innerHTML = canDel ? `<button class="link link--danger" type="button" data-del="${esc(r.id)}">${r.by ? L('شيلوا المطعم ده', 'Remove this restaurant') : L('شيلوا المثال ده', 'Remove this example')}</button>` : '';
		}

		function dish(key, btn) {
			const [rid, sid, did] = key.split('|');
			const r = all().find((x) => x.id === rid);
			const s = r?.sections.find((x) => x.id === sid);
			const d = s?.dishes.find((x) => x.id === did);
			if (!d) return;
			$('.fm__card', fm)?.remove();
			const card = document.createElement('div');
			card.className = 'fm__card';
			card.setAttribute('role', 'dialog');
			card.setAttribute("aria-label", App.t(d.name));
			card.innerHTML = `<button class="fm__x" type="button" aria-label="${L('اقفلوا', 'Close')}">✕</button>
				<span class="fm__card-ic" aria-hidden="true">${doodle(r.icon || 'dinner', 40)}</span>
				<p class="fm__card-sec">${esc(App.t(s.title))}</p>
				<h5 dir="auto">${esc(App.t(d.name))}</h5>
				${d.desc ? `<p dir="auto">${esc(App.t(d.desc))}</p>` : ''}
				${d.price ? `<p class="fm__card-price">${esc(price(d.price))}</p>` : ''}
				${d.fav ? `<p class="fm__card-fav">♥ ${L('أكلة', 'A favourite of')} ${esc(FAV[d.fav]())}</p>` : ''}`;
			fm.append(card);
			const back = () => { fm.classList.remove('is-in'); setTimeout(() => card.remove(), REDUCE ? 0 : 600); btn?.focus({ preventScroll: true }); };
			$('.fm__x', card).onclick = back;
			card.addEventListener('keydown', (e) => { if (e.key === 'Escape') back(); });
			requestAnimationFrame(() => { fm.classList.add('is-in', 'no-delay'); $('.fm__x', card).focus({ preventScroll: true }); });
		}

		stage.addEventListener('click', (e) => {
			if (e.target.closest('.fm__open')) { fm.classList.add('is-open'); $('.fm__close', fm)?.focus({ preventScroll: true }); return; }
			if (e.target.closest('.fm__close')) { close(); $('.fm__open', fm)?.focus({ preventScroll: true }); return; }
			const d = e.target.closest('[data-dish]');
			if (d) dish(d.dataset.dish, d);
		});
		chips.onclick = (e) => { const b = e.target.closest('[data-r]'); if (b) { show(b.dataset.r); history.replaceState(history.state, '', '#' + b.dataset.r); } };
		$('#fm-mine', main).onclick = async (e) => {
			const b = e.target.closest('[data-del]');
			if (!b || !confirm(L('تشيلوا المطعم ده بالمنيو بتاعه؟', 'Remove this restaurant and its menu?'))) return;
			try { data = await live.save('food', (d) => { d.items = (d.items || []).filter((x) => x.id !== b.dataset.del); }); show(''); } catch (err) { alert(live.why(err)); }
		};

		const form = $('#fm-form', main);
		form.onsubmit = async (e) => {
			e.preventDefault();
			const msg = $('#fm-msg', main);
			const sections = parseMenu(form.menu.value);
			if (!form.name.value.trim()) return;
			if (!sections.length) { msg.textContent = L('اكتبوا أكلة واحدة على الأقل في المنيو', 'Write at least one dish in the menu'); return; }
			const r = {
				id: live.newId(), name: form.name.value.trim(), tagline: form.tagline.value.trim() || undefined, cuisine: form.cuisine.value.trim() || undefined,
				area: form.area.value.trim() || undefined, phone: form.phone.value.trim() || undefined, order: form.order.value.trim() || undefined,
				color: COLORS[all().length % COLORS.length], icon: 'dinner', sections, by: live.me(), at: Date.now()
			};
			try {
				data = await live.save('food', (d) => { (d.items = d.items || []).push(r); });
				form.reset();
				msg.textContent = L('المنيو اتحط ♥', 'Menu added ♥');
				show(r.id);
				stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
			} catch (err) { msg.textContent = live.why(err); }
		};

		data = await live.load('food');
		show(decodeURIComponent(location.hash.slice(1)));
	}
};
