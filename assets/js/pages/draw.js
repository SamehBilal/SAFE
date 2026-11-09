import { L, T, t, esc, pageHead, related, App, $, $$, qs, longDate, DRAW_KINDS, REDUCE, parseDate, daysBetween } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { openSketch } from '../sketch.js';
import { setupNote } from './journal.js';

/* Ideas to start from — edit, remove or add your own on the page. */
const DEFAULTS = {
	outfit: [['ليلة بيجامات', 'Pyjama night'], ['ستايل التسعينات', '90s retro'], ['أبيض في أبيض', 'All white'], ['أحمر وأسود', 'Red & black'], ['زمن الفن الجميل', 'Golden-age Egyptian cinema'], ['لبس متطابق', 'Matching outfits'], ['شخصية من فيلم', 'A movie character'], ['سهرة شيك', 'Black tie at home']],
	dining: [['مكان جديد عمرنا ما رحناه', 'Somewhere we’ve never been'], ['ستاربكس بتاعنا', 'Our Starbucks'], ['سمك وسي فود', 'Fish & seafood'], ['سوشي', 'Sushi'], ['مشويات', 'Grills'], ['إيطالي', 'Italian'], ['فطار برا', 'Breakfast out']],
	delivery: [['بيتزا', 'Pizza'], ['برجر', 'Burgers'], ['كشري', 'Koshary'], ['شاورما', 'Shawarma'], ['فطير مشلتت', 'Feteer'], ['سوشي', 'Sushi'], ['حلويات بس', 'Only desserts']],
	movie: [['كوميدي', 'A comedy'], ['فيلم عربي قديم', 'An old Arabic film'], ['رومانسي', 'Romance'], ['أنيميشن مع الولاد', 'Animated, with the boys'], ['إثارة', 'A thriller'], ['فيلم اتفرجنا عليه زمان', 'One we saw years ago'], ['اختيار إسراء', 'Esraa’s pick'], ['اختيار سامح', 'Sameh’s pick']]
};
const init = () => ({
	lists: Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, v.map(([ar, en], n) => ({ id: `d-${k}-${n}`, text: { ar, en } }))])),
	history: []
});
const COLORS = ['#0e6990', '#f2726f', '#e39b2d', '#5a9e6f', '#8e5bd1', '#c2185b', '#13789f', '#f59a7b'];

export default {
	title: { ar: 'قرعة الليلة', en: 'Tonight’s draw' },
	render() {
		const k = DRAW_KINDS.find((x) => x.id === qs('k'));
		if (k) this.title = { ar: k.ar, en: k.en };
		const tabs = `<nav class="chips kinds-tabs" aria-label="${L('نوع السهرة', 'Kind of night')}">${DRAW_KINDS.map((x) => `<a class="chip${x === k ? ' is-on' : ''}" href="draw.html?k=${x.id}" style="--c:${x.color}">${doodle(x.emoji, 18)} ${esc(L(x.ar, x.en))}</a>`).join('')}</nav>`;
		const crumbs = [{ href: 'draw.html', ar: 'قرعة الليلة', en: 'Tonight’s draw' }, ...(k ? [{ href: '#', ar: k.ar, en: k.en }] : [])];

		if (!k) return `
			${pageHead(L('قرعة الليلة', 'Tonight’s draw'), L('مش عارفين نعمل إيه الليلة؟ سيبوها للعجلة', 'Can’t decide what to do tonight? Let the wheel choose'), crumbs)}
			<section class="sec sec--top"><div class="wrap">
				<div class="kinds">${DRAW_KINDS.map((x, n) => `
					<a class="kind reveal" href="draw.html?k=${x.id}" style="--c:${x.color};--delay:${n * 0.07}s">
						<span class="kind__e" aria-hidden="true">${doodle(x.emoji, 54)}</span><b>${esc(L(x.ar, x.en))}</b><small>${esc(L(x.dar, x.den))}</small>
						<em data-count="${x.id}"></em>
					</a>`).join('')}
				</div>
				<h2 class="sec__title reveal" style="margin-top:56px">${L('ليالينا اللي فاتت', 'Nights we’ve had')}</h2>
				<div class="nights" id="dr-history"><p class="empty">${L('بنجيب الليالي…', 'Fetching our nights…')}</p></div>
			</div></section>
			${related(['music', 'journal', 'wishes'])}`;

		return `
			${pageHead(L(k.ar, k.en), L(k.dar, k.den), crumbs)}
			<div class="wrap">${tabs}</div>
			<section class="sec sec--top"><div class="wrap">
				<div class="draw" style="--c:${k.color}">
					<div class="wheel-box">
						<div class="wheel" id="wheel"><span class="wheel__pin" aria-hidden="true"></span><div class="wheel__disc" id="wheel-disc"></div><button class="wheel__hub" type="button" id="spin">${L('لفّوا', 'Spin')}</button></div>
						<label class="check"><input type="checkbox" id="fresh" checked> ${L('من غير اللي عملناه آخر أسبوعين', 'Skip what we did in the last two weeks')}</label>
					</div>
					<div class="result" id="result" hidden aria-live="polite"></div>
				</div>
				${live.canWrite() ? '' : `<div class="narrow" style="margin:24px auto 0">${setupNote()}</div>`}
				<div class="draw-cols">
					<section class="panel">
						<h2>${L('القايمة بتاعتنا', 'Our list')}</h2>
						<ul class="pool" id="pool"></ul>
						<form class="add" id="add" autocomplete="off"${live.canWrite() ? '' : ' hidden'}>
							<input name="item" dir="auto" maxlength="80" placeholder="${L('ضيفوا اختيار…', 'Add an option…')}" required>
							<button class="btn btn--sm" type="submit">${L('ضيفوا', 'Add')}</button>
						</form>
					</section>
					<section class="panel">
						<h2>${L('عملناها قبل كده', 'We’ve done these')}</h2>
						<div class="nights nights--col" id="dr-history"></div>
					</section>
				</div>
			</div></section>
			${related(['music', 'journal', 'family'])}`;
	},

	async after(main, s) {
		const k = DRAW_KINDS.find((x) => x.id === qs('k'));
		let data = await live.load('draw', init);
		data.lists = { ...init().lists, ...(data.lists || {}) };
		data.history = data.history || [];
		const name = (w) => T(w === 'him' ? s.him : s.her);
		const label = (x) => t(x.text);

		const night = (h) => {
			const kk = DRAW_KINDS.find((x) => x.id === h.kind) || DRAW_KINDS[0];
			return `<article class="night" style="--c:${kk.color}">
				<span class="night__e" aria-hidden="true">${doodle(kk.emoji, 30)}</span>
				<div><b dir="auto">${esc(h.text)}</b><small>${longDate(h.date)} · ${esc(L(kk.ar, kk.en))}${h.by ? ` · ${name(h.by)}` : ''}</small>
				${h.hearts ? `<span class="hearts-row" aria-label="${h.hearts}/5">${'♥'.repeat(h.hearts)}<i>${'♥'.repeat(5 - h.hearts)}</i></span>` : ''}
				${h.note ? `<p dir="auto">${esc(h.note)}</p>` : ''}</div>
				${h.sketch ? `<img class="zoom" data-sketch="${esc(h.sketch)}" alt="${esc(h.text)}">` : live.canWrite() ? `<button type="button" class="link" data-sketch-for="${esc(h.id)}">${doodle('pencil', 16)} ${L('ارسموها', 'Sketch it')}</button>` : ''}
			</article>`;
		};
		const paintHistory = () => {
			const box = $('#dr-history', main);
			const list = data.history.filter((h) => !k || h.kind === k.id).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.at - a.at);
			box.innerHTML = list.length ? list.map(night).join('') : `<p class="empty">${L('لسه مفيش ليالي متسجلة — لفّوا العجلة وسجلوا أول ليلة ♥', 'No nights logged yet — spin the wheel and log the first ♥')}</p>`;
			live.hydrateSketches(box);
			$$('[data-count]', main).forEach((el) => { const n = data.history.filter((h) => h.kind === el.dataset.count).length; el.textContent = n ? L(`${n} ليلة`, `${n} night${n === 1 ? '' : 's'}`) : ''; });
		};

		/* sketch an old night */
		main.onclick = async (e) => {
			const b = e.target.closest('[data-sketch-for]');
			if (!b) return;
			const h = data.history.find((x) => x.id === b.dataset.sketchFor);
			const kk = DRAW_KINDS.find((x) => x.id === h?.kind);
			const blob = await openSketch({ title: h?.text, hint: kk ? t(kk.sketch) : '' });
			if (!blob) return;
			b.disabled = true;
			try {
				const id = await live.putSketch(blob);
				data = await live.save('draw', (d) => { const x = (d.history || []).find((y) => y.id === h.id); if (x) x.sketch = id; }, init);
				paintHistory();
			} catch (err) { alert(live.why(err)); b.disabled = false; }
		};

		paintHistory();
		if (!k) return;

		/* the list */
		const pool = $('#pool', main);
		const paintPool = () => {
			const items = data.lists[k.id] || [];
			pool.innerHTML = items.length ? items.map((x) => `<li><span dir="auto">${esc(label(x))}</span>${live.canWrite() ? `<button type="button" aria-label="${L('شيلي', 'Remove')} ${esc(label(x))}" data-rm="${esc(x.id)}">✕</button>` : ''}</li>`).join('') : `<li class="empty">${L('القايمة فاضية — ضيفوا اختيارات', 'The list is empty — add some options')}</li>`;
			paintWheel();
		};
		pool.onclick = async (e) => {
			const b = e.target.closest('[data-rm]');
			if (!b) return;
			try { data = await live.save('draw', (d) => { d.lists = d.lists || init().lists; d.lists[k.id] = (d.lists[k.id] || init().lists[k.id]).filter((x) => x.id !== b.dataset.rm); }, init); paintPool(); }
			catch (err) { alert(live.why(err)); }
		};
		$('#add', main).onsubmit = async (e) => {
			e.preventDefault();
			const text = e.target.item.value.trim();
			if (!text) return;
			try {
				data = await live.save('draw', (d) => { d.lists = d.lists || init().lists; (d.lists[k.id] = d.lists[k.id] || init().lists[k.id]).push({ id: live.newId(), text, by: live.me(), at: Date.now() }); }, init);
				e.target.reset();
				paintPool();
			} catch (err) { alert(live.why(err)); }
		};

		/* the wheel: what's on it is the list, minus what we did lately (if that leaves anything) */
		const fresh = $('#fresh', main);
		const disc = $('#wheel-disc', main);
		let onWheel = [];
		let rot = 0;
		const candidates = () => {
			const all = data.lists[k.id] || [];
			if (!fresh.checked) return all;
			const recent = new Set(data.history.filter((h) => h.kind === k.id && daysBetween(parseDate(h.date)) < 14).map((h) => h.text));
			const left = all.filter((x) => !recent.has(label(x)));
			return left.length ? left : all;
		};
		function paintWheel() {
			onWheel = candidates();
			const n = onWheel.length;
			if (!n) { disc.innerHTML = ''; return; }
			const seg = 360 / n;
			const R = 150;
			const pt = (deg, r) => { const a = ((deg - 90) * Math.PI) / 180; return [R + r * Math.cos(a), R + r * Math.sin(a)]; };
			const short = (s) => (s.length > 16 ? s.slice(0, 15) + '…' : s);
			disc.innerHTML = `<svg viewBox="0 0 300 300" aria-hidden="true" style="direction:ltr">${onWheel.map((x, i) => {
				const a0 = i * seg, a1 = (i + 1) * seg;
				const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
				const path = n === 1 ? `<circle cx="${R}" cy="${R}" r="${R}" fill="${COLORS[0]}"/>` : `<path d="M${R} ${R}L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" fill="${COLORS[i % COLORS.length]}"/>`;
				const mid = a0 + seg / 2;
				return `${path}<g transform="rotate(${(mid - 90).toFixed(2)} ${R} ${R})"><text x="${R + R - 14}" y="${R}" text-anchor="end" dominant-baseline="middle" fill="#fff" font-size="${n > 10 ? 10 : 13}" font-weight="700">${esc(short(label(x)))}</text></g>`;
			}).join('')}<circle cx="${R}" cy="${R}" r="${R - 2}" fill="none" stroke="#fff" stroke-width="4"/></svg>`;
		}
		fresh.onchange = paintWheel;
		paintPool();

		const result = $('#result', main);
		let pendingSketch = null;
		$('#spin', main).onclick = () => {
			if (!onWheel.length) return;
			const n = onWheel.length;
			const i = Math.floor(Math.random() * n);
			const seg = 360 / n;
			// land the middle of segment i (with a little wobble) under the pin at the top
			const target = -((i + 0.5) * seg + (Math.random() - 0.5) * seg * 0.6);
			rot += 360 * 6 + ((((target - rot) % 360) + 360) % 360);
			$('#spin', main).disabled = true;
			result.hidden = true;
			disc.style.transition = REDUCE ? 'none' : 'transform 4.2s cubic-bezier(.15,.9,.2,1)';
			disc.style.transform = `rotate(${rot}deg)`;
			setTimeout(() => show(onWheel[i]), REDUCE ? 50 : 4300);
		};

		function show(x) {
			$('#spin', main).disabled = false;
			navigator.vibrate?.([30, 60, 30]);
			pendingSketch = null;
			const ok = live.canWrite();
			result.innerHTML = `
				<small>${L('الليلة دي', 'Tonight it’s')}</small>
				<b class="result__pick" dir="auto">${doodle(k.emoji, 40)} ${esc(label(x))}</b>
				<div class="result__sketch" id="res-sketch"></div>
				${ok ? `<form id="log" class="result__log">
					<label class="f"><span>${L('حاجة عايزين نفتكرها؟', 'Anything to remember?')}</span><input name="note" dir="auto" maxlength="200"></label>
					<fieldset class="rate"><legend>${L('قيّموا الليلة', 'Rate the night')}</legend>${[5, 4, 3, 2, 1].map((h) => `<input type="radio" name="hearts" id="h${h}" value="${h}"><label for="h${h}" title="${h}">♥</label>`).join('')}</fieldset>
					<p class="form-msg" id="log-msg" role="status"></p>
				</form>` : ''}
				<div class="result__acts">
					<button type="button" class="btn btn--ghost" id="again">${doodle('refresh', 18)} ${L('لفّوا تاني', 'Spin again')}</button>
					<button type="button" class="btn btn--ghost" id="res-draw">${doodle('pencil', 18)} ${esc(t(k.sketch))}</button>
					${ok ? `<button type="button" class="btn btn--coral" id="res-log">${L('عملناها ♥ سجلوها', 'We did it ♥ Log it')}</button>` : ''}
				</div>`;
			result.hidden = false;
			result.scrollIntoView({ behavior: 'smooth', block: 'center' });
			$('#again', result).onclick = () => $('#spin', main).click();
			$('#res-draw', result).onclick = async () => {
				const blob = await openSketch({ title: label(x), hint: t(k.sketch) });
				if (blob) { pendingSketch = blob; $('#res-sketch', result).innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="">`; }
			};
			const logBtn = $('#res-log', result);
			if (logBtn) logBtn.onclick = async () => {
				const form = $('#log', result);
				const msg = $('#log-msg', result);
				logBtn.disabled = true;
				msg.textContent = L('بنسجل…', 'Logging…');
				try {
					const sketch = pendingSketch ? await live.putSketch(pendingSketch) : undefined;
					const entry = { id: live.newId(), kind: k.id, text: label(x), date: live.today(), by: live.me(), note: form.note.value.trim() || undefined, hearts: +(form.hearts.value || 0) || undefined, sketch, at: Date.now() };
					data = await live.save('draw', (d) => { (d.history = d.history || []).push(entry); }, init);
					data.lists = { ...init().lists, ...(data.lists || {}) };
					msg.textContent = L('اتسجلت في ليالينا ♥', 'Logged in our nights ♥');
					paintHistory();
					paintWheel();
				} catch (err) { msg.textContent = live.why(err); logBtn.disabled = false; }
			};
		}
	}
};
