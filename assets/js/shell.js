/* Shared by every page: language (Arabic first, English second), the lock (questions -> loader -> intro),
   the header with its mega menus, the phone menu, the footer, and helpers the page modules use.

   Each page is a plain HTML file with <body data-page="story"> and one script tag for this file.
   This file loads assets/js/pages/<page>.js and calls its render() once the story is unlocked. */
import { unlock, readVault, open, toB64, fromB64 } from './core.js';

const KEY = 'us.key';
const LANG = 'us.lang';
const SEEN_INTRO = 'us.intro';
export const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ small helpers */

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const store = {
	get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
	set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
	del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};
export const sleep = (ms) => new Promise((r) => setTimeout(r, REDUCE ? Math.min(ms, 120) : ms));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const rand = (a, b) => +(a + Math.random() * (b - a)).toFixed(2);
export const qs = (k) => new URLSearchParams(location.search).get(k);

export const App = {
	lang: store.get(LANG) === 'en' ? 'en' : 'ar',
	story: null,
	/** A text from the data: a plain string, or { ar, en }. */
	t(v) {
		if (v == null) return '';
		if (typeof v === 'string' || typeof v === 'number') return String(v);
		return v[App.lang] ?? v.ar ?? v.en ?? '';
	},
	/** UI text: L('عربي', 'English'). */
	L: (ar, en) => (App.lang === 'ar' ? ar : en),
	get arrow() { return App.lang === 'ar' ? '←' : '→'; }
};
export const t = (v) => App.t(v);
export const L = (ar, en) => App.L(ar, en);
export const T = (v) => esc(App.t(v));

/* Dates: stored as YYYY-MM-DD, shown day.month.year like the poster. */
export const parseDate = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = String(iso).split('-'); return [d, m, y].filter(Boolean).join('.'); };
export function longDate(iso) {
	return parseDate(iso).toLocaleDateString(App.lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function yearsBetween(a, b = new Date()) {
	let y = b.getFullYear() - a.getFullYear();
	if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) y--;
	return y;
}
export const daysBetween = (a, b = new Date()) => Math.floor((b - a) / 864e5);
export const num = (n) => new Intl.NumberFormat(App.lang === 'ar' ? 'ar-EG' : 'en').format(n);

/** "3 years" / "٣ سنين", "4 months" / "٤ شهور" — Egyptian Arabic plural rules kept simple. */
export function age(iso, now = new Date()) {
	const b = parseDate(iso);
	let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth();
	if (now.getDate() < b.getDate()) months--;
	if (months < 0) return L('لسه جاي', 'on the way');
	if (months < 1) { const d = daysBetween(b, now); return App.lang === 'ar' ? `${num(d)} ${d === 1 ? 'يوم' : d === 2 ? 'يومين' : d <= 10 ? 'أيام' : 'يوم'}` : `${d} day${d === 1 ? '' : 's'}`; }
	if (months < 24) return App.lang === 'ar' ? (months === 1 ? 'شهر' : months === 2 ? 'شهرين' : `${num(months)} ${months <= 10 ? 'شهور' : 'شهر'}`) : `${months} month${months === 1 ? '' : 's'}`;
	const y = Math.floor(months / 12);
	return App.lang === 'ar' ? (y === 2 ? 'سنتين' : `${num(y)} ${y <= 10 ? 'سنين' : 'سنة'}`) : `${y} years`;
}
export function yearsAgo(iso) {
	const y = yearsBetween(parseDate(iso));
	if (y <= 0) return '';
	return App.lang === 'ar' ? `من ${y === 1 ? 'سنة' : y === 2 ? 'سنتين' : num(y) + (y <= 10 ? ' سنين' : ' سنة')}` : `${y} year${y === 1 ? '' : 's'} ago`;
}
export function isToday(iso) {
	const d = parseDate(iso), n = new Date();
	return d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/* ------------------------------------------------------------------ media (encrypted photos) */

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg' };
const media = new Map();
let masterKey;
/** The unlocked master key (CryptoKey), for live.js. */
export const getKey = () => masterKey;
export const mimeOf = (ref) => MIME[(String(ref).match(/\.(\w+)$/) || [])[1]?.toLowerCase()] || 'application/octet-stream';
export const isVideo = (ref) => /^video\//.test(mimeOf(ref));

export function mediaURL(ref) {
	if (!ref) return Promise.reject(new Error('none'));
	if (/^https?:\/\//.test(ref)) return Promise.resolve(ref);
	const m = /^media:([a-f0-9]+)\.(\w+)$/.exec(ref);
	if (!m) return Promise.reject(new Error('not built: ' + ref));
	if (!media.has(ref)) {
		media.set(ref, fetch(`content/m/${m[1]}.bin`)
			.then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
			.then((buf) => open(masterKey, buf))
			.then((bytes) => URL.createObjectURL(new Blob([bytes], { type: mimeOf(ref) }))));
	}
	return media.get(ref);
}

/** Markup for a photo/video, filled in by hydrate(). `box` marks the element to remove if it fails. */
export function img(ref, alt = '', cls = '') {
	if (!ref) return '';
	return isVideo(ref)
		? `<video class="${cls}" data-m="${esc(ref)}" playsinline muted loop controls preload="metadata"></video>`
		: `<img class="${cls}" data-m="${esc(ref)}" alt="${esc(alt)}" decoding="async">`;
}

export function hydrate(root = document) {
	for (const el of $$('[data-m]', root)) {
		if (el.dataset.done) continue;
		el.dataset.done = '1';
		mediaURL(el.dataset.m)
			.then((url) => { el.src = url; })
			.catch(() => { (el.closest('[data-media-box]') || el).remove(); });
	}
}

/** Every photo the story refers to (for the "first photo of …" covers). */
export const firstPhoto = (o) => o?.cover || o?.photo || (o?.photos || []).map((p) => (typeof p === 'string' ? p : p.photo))[0] || '';

/* ------------------------------------------------------------------ language */

function applyLang() {
	const html = document.documentElement;
	html.lang = App.lang;
	html.dir = App.lang === 'ar' ? 'rtl' : 'ltr';
}

function setLang(l) {
	App.lang = l;
	store.set(LANG, l);
	applyLang();
	if (App.story) {
		renderChrome();
		renderPage();
	} else if (gateRedraw) {
		gateRedraw();
	}
}

/* ------------------------------------------------------------------ boot */

let page;
let vault;
let gate;
let gateRedraw;

async function boot() {
	applyLang();
	floatHearts();
	registerSW();
	const id = document.body.dataset.page || 'home';
	const pageP = import(`./pages/${id}.js`).then((m) => m.default).catch(() => import('./pages/home.js').then((m) => m.default));
	try {
		[vault, gate, page] = await Promise.all([getJSON('content/vault.json'), getJSON('content/gate.json'), pageP]);
	} catch {
		return fatal(L('مش قادر أحمّل الموقع — اتأكدي من النت وجربي تاني ♥', 'Couldn’t load — check your connection and try again ♥'));
	}
	const saved = store.get(KEY);
	if (saved) {
		try {
			const res = await readVault(vault, fromB64(saved));
			return enter(res, { intro: qs('intro') !== null, loader: false });
		} catch {
			store.del(KEY); // rebuilt with a new key, or storage got mangled
		}
	}
	runGate();
}

async function getJSON(url) {
	const r = await fetch(url, { cache: 'no-cache' });
	if (!r.ok) throw new Error(url + ' ' + r.status);
	return r.json();
}

function stage(html, cls) {
	let el = $('#stage');
	if (!el) {
		el = document.createElement('section');
		el.id = 'stage';
		document.body.prepend(el);
	}
	el.className = 'stage ' + cls;
	el.innerHTML = html;
	el.hidden = false;
	document.body.classList.add('is-locked');
	return el;
}

async function leaveStage() {
	const el = $('#stage');
	if (!el) return;
	el.classList.add('is-leaving');
	await sleep(480);
	el.remove();
	document.body.classList.remove('is-locked');
}

function fatal(msg) {
	stage(`<div class="gate__card"><h1 class="gate__title">${L('أوبس', 'Oops')}</h1><p>${esc(msg)}</p><button class="btn" onclick="location.reload()">${L('جربي تاني', 'Try again')}</button></div>`, 'gate');
}

const langBtn = () => `<button class="lang-toggle" type="button" lang="${App.lang === 'ar' ? 'en' : 'ar'}">${App.lang === 'ar' ? 'English' : 'عربي'}</button>`;

/* ------------------------------------------------------------------ 1. the gate */

function runGate() {
	const qsList = gate.questions;
	const answers = qsList.map(() => '');
	let i = 0;
	let wrong = false;

	const draw = (animate) => {
		const q = qsList[i];
		const last = i === qsList.length - 1;
		const el = stage(`
			<div class="stage__lang">${langBtn()}</div>
			<form class="gate__card" id="gate-form" autocomplete="off" novalidate>
				<svg class="gate__lock" viewBox="0 0 64 72" aria-hidden="true">
					<path class="gate__shackle" d="M18 32V22a14 14 0 0 1 28 0v10" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
					<path class="gate__body" d="M32 70C14 58 4 48 4 38a12 12 0 0 1 22-7l6 6 6-6a12 12 0 0 1 22 7c0 10-10 20-28 32Z"/>
					<g fill="#fff"><circle cx="24" cy="44" r="2.6"/><circle cx="32" cy="44" r="2.6"/><circle cx="40" cy="44" r="2.6"/></g>
				</svg>
				<h1 class="gate__title">${T(gate.title) || L('أهلًا يا قمر', 'Hey you')}</h1>
				<p class="gate__intro">${T(gate.intro)}</p>
				<ol class="gate__steps" aria-hidden="true">${qsList.map((_, n) => `<li class="${n < i ? 'is-done' : n === i ? 'is-now' : ''}"></li>`).join('')}</ol>
				<div class="gate__ask ${animate ? 'swap' : ''}">
					<label class="gate__q" for="gate-input">${T(q.q)}</label>
					<input class="gate__input" id="gate-input" type="text" dir="auto" autocapitalize="off" autocorrect="off" spellcheck="false"
						enterkeyhint="${last ? 'go' : 'next'}" placeholder="${esc(t(q.placeholder))}" value="${esc(answers[i])}">
					${q.hint ? `<button type="button" class="link" id="gate-hint-btn">${L('محتاجة تلميح؟', 'Need a hint?')}</button><p class="gate__hint" id="gate-hint" hidden>${T(q.hint)}</p>` : ''}
				</div>
				<p class="gate__msg" id="gate-msg" role="alert">${wrong ? T(gate.wrong) || L('في إجابة مش مظبوطة… جربي تاني ♥', 'Not quite — try again ♥') : ''}</p>
				<div class="gate__actions">
					${i > 0 ? `<button type="button" class="btn btn--ghost" id="gate-back">${L('رجوع', 'Back')}</button>` : ''}
					<button type="submit" class="btn" id="gate-next">${last ? L('افتحي ♥', 'Unlock ♥') : L('التالي', 'Next')}</button>
				</div>
			</form>`, 'gate');
		wire(el);
	};
	gateRedraw = () => { answers[i] = $('#gate-input')?.value ?? answers[i]; draw(false); };

	const shake = (el) => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); navigator.vibrate?.(120); };

	function wire(el) {
		const form = $('#gate-form', el);
		const input = $('#gate-input', el);
		$('.lang-toggle', el).onclick = () => setLang(App.lang === 'ar' ? 'en' : 'ar');
		$('#gate-hint-btn', el)?.addEventListener('click', (e) => { $('#gate-hint', el).hidden = false; e.currentTarget.hidden = true; });
		$('#gate-back', el)?.addEventListener('click', () => { answers[i] = input.value; i--; wrong = false; draw(true); });
		input.oninput = () => { $('#gate-msg', el).textContent = ''; };
		input.focus({ preventScroll: true });

		form.onsubmit = async (e) => {
			e.preventDefault();
			const v = input.value.trim();
			if (!v) return shake(input);
			answers[i] = v;
			if (i < qsList.length - 1) { i++; wrong = false; draw(true); return; }
			const next = $('#gate-next', el);
			next.disabled = true;
			next.textContent = L('ثانية واحدة…', 'Checking…');
			let raw = null;
			try { raw = await unlock(vault, answers); } catch { /* treated as wrong */ }
			if (!raw) { i = 0; wrong = true; draw(false); shake($('#gate-form')); return; }
			store.set(KEY, toB64(raw));
			gateRedraw = null;
			next.textContent = L('أهلًا بيكي في بيتك ♥', 'Welcome home ♥');
			$$('.gate__steps li', el).forEach((li) => (li.className = 'is-done'));
			el.classList.add('is-open');
			navigator.vibrate?.([60, 80, 60]);
			const res = await readVault(vault, raw);
			await sleep(2000);
			enter(res, { intro: true, loader: true });
		};
	}

	draw(false);
}

/* ------------------------------------------------------------------ 2. loader, 3. intro */

async function enter({ key, story }, { intro, loader }) {
	masterKey = key;
	App.story = story;

	if (loader) {
		const label = L('بنفتح حكايتنا', 'Opening our story');
		const el = stage(`
			<svg class="loader__heart" viewBox="0 0 100 92" aria-hidden="true">
				<defs><clipPath id="heart-clip"><path d="M50 90C20 70 2 52 2 30A24 24 0 0 1 50 18a24 24 0 0 1 48 12c0 22-18 40-48 60Z"/></clipPath></defs>
				<path d="M50 90C20 70 2 52 2 30A24 24 0 0 1 50 18a24 24 0 0 1 48 12c0 22-18 40-48 60Z" fill="#fde3e0"/>
				<g clip-path="url(#heart-clip)"><g id="loader-fill"><path class="loader__wave" d="M-100 92 Q-75 86 -50 92 T0 92 T50 92 T100 92 T150 92 T200 92 V200 H-100Z" fill="#F2726F"/></g></g>
				<path d="M50 90C20 70 2 52 2 30A24 24 0 0 1 50 18a24 24 0 0 1 48 12c0 22-18 40-48 60Z" fill="none" stroke="#0E6990" stroke-width="3"/>
			</svg>
			<p class="loader__text">${App.lang === 'ar' ? esc(label) : [...label].map((c, n) => `<span style="--i:${n};--r:${(n % 2 ? 1 : -1) * 8}deg">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</p>
			<p class="loader__pct" id="loader-pct">0%</p>`, 'loader');
		const fill = $('#loader-fill', el);
		const pct = $('#loader-pct', el);
		const set = (p) => { fill.style.transform = `translateY(${-p * 96}px)`; pct.textContent = Math.round(p * 100) + '%'; };
		set(0);
		const images = (story.$media || []).filter((r) => /^image\//.test(mimeOf(r)));
		let done = 0;
		const started = performance.now();
		const queue = [...images];
		await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
			while (queue.length) {
				try { await mediaURL(queue.shift()); } catch { /* shown as missing later */ }
				set((++done / Math.max(images.length, 1)) * 0.95);
			}
		}));
		set(1);
		await sleep(Math.max(0, 1500 - (performance.now() - started)));
		await leaveStage();
	}

	if (intro && story.intro?.length) await runIntro(story);
	store.set(SEEN_INTRO, '1');
	await leaveStage();
	renderChrome();
	renderPage();
	if (qs('intro') !== null) history.replaceState(null, '', location.pathname + location.hash);
}

async function runIntro(story) {
	let skipped = false;
	let onSkip;
	const skipP = new Promise((r) => (onSkip = r));
	const pause = (ms) => Promise.race([sleep(ms), skipP]);
	const el = stage(`<button class="intro__skip link" type="button">${L('تخطي ←', 'Skip →')}</button><div class="intro__lines" aria-live="polite"></div>`, 'intro');
	$('.intro__skip', el).onclick = () => { skipped = true; onSkip(); };
	const lines = $('.intro__lines', el);

	for (const line of story.intro) {
		if (skipped) break;
		const words = t(line).split(/(\s+)/).filter(Boolean);
		let n = 0;
		lines.innerHTML = `<p class="intro__line">${words.map((w) => (/^\s+$/.test(w) ? ' ' : `<span style="--i:${n++}">${esc(w)}</span>`)).join('')}</p>`;
		await pause(900 + n * 170 + 1500);
		if (skipped) break;
		$('.intro__line', lines)?.classList.add('is-out');
		await pause(600);
	}

	const b = story.birthday || {};
	const bday = b.show !== false;
	const words = (bday ? t(b.title) || L('عيد ميلاد سعيد', 'Happy Birthday') : L('حكاية حبنا', 'Our Love Story')).split(' ');
	const [first, ...rest] = words;
	el.innerHTML = `
		<div class="intro__final">
			<div class="names"><span class="n1">${T(story.him)}</span><span class="heart">♥</span><span class="n2">${T(story.her)}</span></div>
			<h1 class="pop"><span>${esc(first)}</span>${rest.length ? `<span class="pop__word"><span>${esc(rest.join(' '))}</span></span>` : ''}</h1>
			${bday && b.subtitle ? `<p class="sub">${T(b.subtitle)}</p>` : ''}
			<button class="btn btn--light" type="button" id="intro-go">${L('افتحي حكايتنا ♥', 'Open our story ♥')}</button>
		</div>`;
	await new Promise((r) => ($('#intro-go', el).onclick = r));
}

/* ------------------------------------------------------------------ pages, menus */

/* Every page of the site, in the order of the phone menu and the footer. */
export const PAGES = [
	{ href: 'index.html', id: 'home', ic: 'home', ar: 'الرئيسية', en: 'Home' },
	{ href: 'story.html', id: 'story', ic: 'book', ar: 'حكايتنا', en: 'Our story', dar: 'كل تاريخ عملنا إحنا', den: 'Every date that made us', group: 'story' },
	{ href: 'chapters.html', id: 'chapters', ic: 'ring', ar: 'أيام فارقة', en: 'Big days', dar: 'الخطوبة، كتب الكتاب، الفرح', den: 'Engagement, wedding and more', group: 'story' },
	{ href: 'places.html', id: 'places', ic: 'pin', ar: 'أماكننا', en: 'Our places', dar: 'أماكن فيها حتة مننا', den: 'Places that hold a piece of us', group: 'story' },
	{ href: 'trips.html', id: 'trips', ic: 'map', ar: 'رحلات عيد جوازنا', en: 'Anniversary trips', dar: 'كل سنة محافظة جديدة على الخريطة', den: 'A new governorate every year, on the map', group: 'story' },
	{ href: 'journal.html', id: 'journal', ic: 'pen', ar: 'دفترنا', en: 'Our journal', dar: 'بنكتب حكايتنا سوا، يوم بيوم', den: 'We write our story together, day by day', group: 'story' },
	{ href: 'draw.html', id: 'draw', ic: 'dice', ar: 'قرعة الليلة', en: 'Tonight’s draw', dar: 'لبس، خروجة، دليفري، أو فيلم', den: 'Outfit, dinner out, delivery or a movie', group: 'nights' },
	{ href: 'movies.html', id: 'movies', ic: 'film', ar: 'اتفرجنا على إيه', en: 'What we’ve watched', dar: 'أفلامنا ومسلسلاتنا بالأرقام', den: 'Our films and series, in numbers', group: 'nights' },
	{ href: 'music.html', id: 'music', ic: 'music', ar: 'أغانينا', en: 'Our songs', dar: 'الأغاني اللي بتفكرنا ببعض', den: 'The songs that remind us of each other', group: 'nights' },
	{ href: 'gallery.html', id: 'gallery', ic: 'image', ar: 'ألبوم الصور', en: 'Photo album', dar: 'إحنا بالصور، سنة بسنة', den: 'Us in pictures, year by year', group: 'memories' },
	{ href: 'notes.html', id: 'notes', ic: 'note', ar: 'رسايل حب', en: 'Love notes', dar: 'كلام كتبناه لبعض', den: 'Little things we wrote', group: 'memories' },
	{ href: 'letters.html', id: 'letters', ic: 'mail', ar: 'جوابات', en: 'Letters', dar: 'جوابات ليكي، افتحيها', den: 'Letters for you — open them', group: 'memories' },
	{ href: 'family.html', id: 'family', ic: 'family', ar: 'عيلتنا', en: 'Our family', dar: 'فهد وعبد الرحمن وإحنا', den: 'Fahd, Abdulrahman and us', group: 'family' },
	{ href: 'birthday.html', id: 'birthday', ic: 'cake', ar: 'عيد ميلادك', en: 'Your birthday', dar: 'اطفي الشمع واتمني', den: 'Blow the candles, make a wish', group: 'you' },
	{ href: 'wishes.html', id: 'wishes', ic: 'star', ar: 'برطمان الأمنيات', en: 'Wish jar', dar: 'أمنياتك في أمان هنا', den: 'Your wishes, kept safe', group: 'you' },
	{ href: 'settings.html', id: 'settings', ic: 'gear', ar: 'الإعدادات', en: 'Settings', dar: 'مين بيكتب، والمزامنة', den: 'Who’s writing, and syncing', group: 'app' }
];

/* What a night can be drawn for (draw.html?k=…). */
export const DRAW_KINDS = [
	{ id: 'outfit', emoji: '👗', color: '#c2185b', ar: 'لبس الليلة', en: 'Tonight’s outfit', dar: 'ثيم نلبسه سوا الليلة', den: 'A theme we dress up in tonight', sketch: { ar: 'ارسمي اللبس', en: 'Sketch the outfit' } },
	{ id: 'dining', emoji: '🍽️', color: '#e39b2d', ar: 'خروجة عشا', en: 'Dining out', dar: 'نتعشى برا فين؟', den: 'Where shall we eat out?', sketch: { ar: 'ارسمي المكان', en: 'Sketch the place' } },
	{ id: 'delivery', emoji: '🛵', color: '#5a9e6f', ar: 'دليفري', en: 'Delivery night', dar: 'نطلب إيه النهارده؟', den: 'What shall we order in?', sketch: { ar: 'ارسمي الأكلة', en: 'Sketch the meal' } },
	{ id: 'movie', emoji: '🎬', color: '#0e6990', ar: 'سهرة فيلم', en: 'Movie night', dar: 'هنتفرج على إيه؟', den: 'What are we watching?', sketch: { ar: 'ارسمي بوستر الفيلم', en: 'Sketch the poster' } }
];
/* pages that are one page per item, and which menu they belong to */
const DETAIL_OF = { moment: 'story', chapter: 'story', member: 'family', trip: 'story' };

const ICONS = {
	home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
	book: '<path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/><path d="M12 6v13.5"/>',
	ring: '<circle cx="12" cy="14" r="6"/><path d="m9.5 8-2-3h9l-2 3"/>',
	pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.3"/>',
	image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
	note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 12.5h5"/>',
	mail: '<rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="m4 7 8 6 8-6"/>',
	family: '<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="12" cy="13" r="1.8"/><path d="M3.5 20v-3.5A4 4 0 0 1 7.5 12.5h1M20.5 20v-3.5a4 4 0 0 0-4-4h-1M9 20v-1.5a3 3 0 0 1 6 0V20"/>',
	cake: '<path d="M4 20h16v-7H4zM4 15.5c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0"/><path d="M8 13V10M12 13V10M16 13V10"/><path d="M8 7.5c.6-.6.6-1.4 0-2.5-.6 1.1-.6 1.9 0 2.5ZM12 7.5c.6-.6.6-1.4 0-2.5-.6 1.1-.6 1.9 0 2.5ZM16 7.5c.6-.6.6-1.4 0-2.5-.6 1.1-.6 1.9 0 2.5Z"/>',
	star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
	map: '<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
	film: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9h17M3.5 15h17M8 5v4M12 5v4M16 5v4M8 15v4M12 15v4M16 15v4"/>',
	pen: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3M4 20h6"/>',
	music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><path d="M9 9l11-2"/>',
	dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor"/>',
	gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
	heart: '<path d="M12 20C6 16 3.5 12.7 3.5 9.5A4.5 4.5 0 0 1 12 7.2a4.5 4.5 0 0 1 8.5 2.3C20.5 12.7 18 16 12 20Z"/>',
	baby: '<circle cx="12" cy="11" r="6.5"/><circle cx="9.8" cy="10.5" r=".8"/><circle cx="14.2" cy="10.5" r=".8"/><path d="M10 13.6c1.2 1 2.8 1 4 0M12 4.5c1-1 2.2-.8 2.6 0"/>'
};
export const icon = (k, size = 18) => `<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.heart}</svg></span>`;

const currentFile = () => location.pathname.split('/').pop() || 'index.html';
const pageId = () => document.body.dataset.page || 'home';
const groupOf = (id) => DETAIL_OF[id] || PAGES.find((p) => p.id === id)?.group || '';

function megaHTML(s) {
	const here = currentFile();
	const cur = (href) => (href === here ? ' aria-current="page"' : '');
	const item = (p) => `<a class="mg-item" href="${p.href}"${cur(p.href)}>${icon(p.ic)}<span class="mg-tx"><b>${esc(L(p.ar, p.en))}</b>${p.dar ? `<small>${esc(L(p.dar, p.den))}</small>` : ''}</span></a>`;
	const row = (p) => `<a class="mg-row" href="${p.href}"${cur(p.href)}>${icon(p.ic)}<b>${esc(L(p.ar, p.en))}</b><span class="mg-arr" aria-hidden="true">${App.arrow}</span></a>`;
	const panel = (id, label, inner) => `<div class="mega mega-${id}" id="mega-${id}" role="group" aria-label="${esc(label)}"><div class="mega-in">${inner}</div></div>`;
	const top = (id, label) => `<button class="mnav-btn${groupOf(pageId()) === id ? ' is-here' : ''}" type="button" aria-expanded="false" aria-controls="mega-${id}" data-mega="${id}">${esc(label)}<svg class="mnav-chev" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
	const pages = (g) => PAGES.filter((p) => p.group === g);

	// حكايتنا — the big days as photo cards, then the story pages, then "on this day".
	const chapters = (s.chapters || []).slice(0, 3);
	const today = (s.timeline || []).find((x) => isToday(x.date));
	const story = panel('story', L('حكايتنا', 'Our story'),
		`<div class="mg-cards">${chapters.map((c) => `
			<a class="mg-card" href="chapter.html?id=${esc(c.id)}" data-media-box>
				${img(firstPhoto(c), '', 'mg-cover')}
				<span class="mg-card-t"><b>${T(c.title)}</b><small>${fmtDate(c.date)}</small></span>
			</a>`).join('')}</div>
		<div class="mg-more"><p class="mg-h">${L('الحكاية', 'The story')}</p>${pages('story').map(row).join('')}</div>
		<a class="mg-band" href="story.html${today ? '#t-' + esc(today.id) : ''}">
			<b>${today ? L('النهارده في حكايتنا', 'Today in our story') : L('من أول رسالة لحد النهارده', 'From the first message until today')}</b>
			<small>${today ? `${T(today.title)} · ${yearsAgo(today.date)}` : `${fmtDate(s.met)} — ${L('ولسه مكملين', 'and still going')}`} ${App.arrow}</small>
		</a>`);

	// ذكرياتنا — pages + a love note on a photo, a new one every time it opens.
	const memories = panel('memories', L('ذكرياتنا', 'Memories'),
		`<div class="mg-list">${pages('memories').map(item).join('')}</div>
		<a class="mg-photo" href="notes.html" data-media-box>${img(firstPhoto((s.gallery || [])[0]) || s.poster, '', 'mg-photo-img')}<span class="mg-photo-tx" id="mg-note">${noteHTML(s)}</span></a>`);

	// عيلتنا — one card per person.
	const members = s.family?.members || [];
	const family = panel('family', L('عيلتنا', 'Our family'),
		`<div class="mg-figs">${members.map((m) => `
			<a class="mg-fig" href="member.html?id=${esc(m.id)}" style="--c:${esc(m.color || '#0e6990')}">
				<span class="mg-fig-box">${m.photo ? img(m.photo, '', 'mg-fig-img') : `<span class="mg-fig-emoji">${esc(m.emoji || '♥')}</span>`}</span>
				<span class="mg-fig-t"><b>${T(m.name)}</b><small>${m.born && m.kid ? age(m.born) : T(m.role)}</small></span>
			</a>`).join('')}</div>
		<div class="mg-more"><p class="mg-h">${L('البيت', 'Home')}</p>${row(PAGES.find((p) => p.id === 'family'))}</div>`);

	// لِكِ — birthday, wishes, and us in numbers.
	const met = parseDate(s.met || '2009-06-10');
	const yrs = yearsBetween(met);
	const you = panel('you', L('ليكي', 'For you'),
		`<div class="mg-list">${pages('you').map(item).join('')}</div>
		<a class="mg-data" href="index.html#numbers">
			<span class="mg-new">${L('بالأرقام', 'In numbers')}</span>
			<span class="mg-bars" aria-hidden="true">${Array.from({ length: Math.min(yrs + 1, 20) }, (_, k) => `<i style="height:${18 + Math.round(82 * (k + 1) / Math.min(yrs + 1, 20))}%"></i>`).join('')}</span>
			<b>${num(daysBetween(met))} ${L('يوم من أول سلام', 'days since hello')}</b>
			<small>${L('وكل سنة الحب بيزيد', 'and every year it grows')}</small>
			<span class="mg-go">${L('شوفي الأرقام', 'See the numbers')} ${App.arrow}</span>
		</a>`);

	// ليالينا — the four draws as coloured cards, then the songs and the journal.
	const kind = qs('k');
	const nights = panel('nights', L('ليالينا', 'Our nights'),
		`<div class="mg-kinds">${DRAW_KINDS.map((k) => `
			<a class="mg-kind" href="draw.html?k=${k.id}" style="--c:${k.color}"${here === 'draw.html' && kind === k.id ? ' aria-current="page"' : ''}>
				<span class="mg-kind-e" aria-hidden="true">${k.emoji}</span><b>${esc(L(k.ar, k.en))}</b><small>${esc(L(k.dar, k.den))}</small>
			</a>`).join('')}</div>
		<div class="mg-more"><p class="mg-h">${L('سهراتنا', 'Our evenings')}</p>${pages('nights').map(row).join('')}${row(PAGES.find((p) => p.id === 'journal'))}</div>`);

	const link = (href, ar, en) => `<a class="mnav-link" href="${href}"${cur(href)}>${esc(L(ar, en))}</a>`;
	return `<nav class="mnav" aria-label="${L('القائمة الرئيسية', 'Main')}">
		${link('index.html', 'الرئيسية', 'Home')}
		${top('story', L('حكايتنا', 'Our story'))}${top('memories', L('ذكرياتنا', 'Memories'))}${top('family', L('عيلتنا', 'Family'))}${top('nights', L('ليالينا', 'Our nights'))}${top('you', L('ليكي', 'For you'))}
		<a class="mnav-link mnav-cta" href="birthday.html"${cur('birthday.html')}>🎂 ${L('عيد ميلادك', 'Birthday')}</a>
		${story}${memories}${family}${nights}${you}
	</nav>`;
}

let lastNote = -1;
function noteHTML(s) {
	const notes = (s.notes || []).filter((n) => t(n.text).length <= 140);
	if (!notes.length) return `<q>${T(s.closing)}</q>`;
	let k = Math.floor(Math.random() * notes.length);
	if (k === lastNote && notes.length > 1) k = (k + 1) % notes.length;
	lastNote = k;
	const n = notes[k];
	return `<q>${T(n.text)}</q><small>— ${T(n.by === 'him' ? s.him : s.her)}</small>`;
}

/* open on hover (mouse), click/tap, Enter or ↓; close on leaving, Escape, a click outside or focus leaving */
function wireMega(header) {
	const nav = $('.mnav', header);
	const btns = $$('.mnav-btn', nav);
	const fine = matchMedia('(hover: hover) and (pointer: fine)');
	let openId = '';
	let timer = 0;
	let openedAt = 0;
	const set = (id) => {
		clearTimeout(timer);
		if (id === 'memories' && openId !== 'memories') { const tx = $('#mg-note', nav); if (tx) tx.innerHTML = noteHTML(App.story); }
		if (id) hydrate(nav);
		openId = id;
		for (const b of btns) {
			const on = b.dataset.mega === id;
			b.setAttribute('aria-expanded', String(on));
			$('#mega-' + b.dataset.mega).classList.toggle('is-open', on);
		}
		header.classList.toggle('mega-open', !!id);
		if (id) openedAt = Date.now();
	};
	for (const b of btns) {
		const id = b.dataset.mega;
		b.onclick = () => (openId === id && Date.now() - openedAt > 450 ? set('') : set(id));
		b.onkeydown = (ev) => {
			if (ev.key !== 'ArrowDown') return;
			ev.preventDefault();
			set(id);
			$('#mega-' + id + ' a')?.focus();
		};
		b.onpointerenter = (ev) => {
			if (ev.pointerType !== 'mouse' || !fine.matches) return;
			clearTimeout(timer);
			timer = setTimeout(() => set(id), openId ? 0 : 110);
		};
		b.onpointerleave = () => { if (!openId) clearTimeout(timer); };
	}
	for (const a of $$('.mnav-link', nav)) a.onpointerenter = (ev) => { if (ev.pointerType === 'mouse' && openId) { clearTimeout(timer); timer = setTimeout(() => set(''), 140); } };
	header.onpointerleave = (ev) => { if (ev.pointerType === 'mouse' && openId) { clearTimeout(timer); timer = setTimeout(() => set(''), 260); } };
	header.onpointerenter = (ev) => { if (ev.pointerType === 'mouse' && openId) clearTimeout(timer); };
	nav.addEventListener('click', (ev) => { if (ev.target.closest('.mega a')) set(''); });
	nav.addEventListener('focusout', (ev) => { if (openId && ev.relatedTarget && !nav.contains(ev.relatedTarget)) set(''); });
	header._mega = { nav, set, open: () => openId };
	if (header.dataset.wired) return;
	header.dataset.wired = '1';
	document.addEventListener('keydown', (ev) => {
		if (ev.key !== 'Escape') return;
		const m = header._mega;
		if (m.open()) { const b = $(`[data-mega="${m.open()}"]`, m.nav); m.set(''); b?.focus(); }
		if (header.classList.contains('menu-open')) { header._menu(false); $('.menu-btn', header).focus(); }
	});
	document.addEventListener('click', (ev) => {
		if (!header.contains(ev.target)) { header._mega.set(''); header._menu?.(false); }
	});
	matchMedia('(max-width: 979px)').addEventListener('change', () => { header._mega.set(''); header._menu?.(false); });
}

function renderChrome() {
	const s = App.story;
	let header = $('#site-header');
	if (!header) { header = document.createElement('header'); header.id = 'site-header'; document.body.prepend(header); }
	header.className = 'site-header';
	const here = currentFile();
	header.innerHTML = `
		<a class="skip" href="#main">${L('روحي للمحتوى', 'Skip to content')}</a>
		<div class="hd-wrap">
			<button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="${L('القائمة', 'Menu')}"><span class="stack" aria-hidden="true"><i></i><i></i><i></i></span></button>
			<a class="brand" href="index.html"><span class="brand-names">${T(s.him)} <i>♥</i> ${T(s.her)}</span><span class="brand-sub">${L('حكاية حب', 'A love story')} · ${(s.met || '2009').slice(0, 4)}</span></a>
			<nav class="pnav" id="site-nav" aria-label="${L('الفهرس', 'Contents')}" data-title="${L('الفهرس', 'Contents')}">
				${PAGES.map((p, k) => `<a href="${p.href}" style="--i:${k}"${p.href === here ? ' aria-current="page"' : ''}>${icon(p.ic)}<span>${esc(L(p.ar, p.en))}</span><em aria-hidden="true">${num(k + 1)}</em></a>`).join('')}
			</nav>
			${megaHTML(s)}
			<div class="tools">${langBtn()}</div>
		</div>`;
	const setMenu = (on) => {
		header.classList.toggle('menu-open', on);
		$('.menu-btn', header).setAttribute('aria-expanded', String(on));
		document.body.classList.toggle('menu-lock', on);
	};
	header._menu = setMenu;
	$('.menu-btn', header).onclick = () => setMenu(!header.classList.contains('menu-open'));
	$('.pnav', header).onclick = (ev) => { if (ev.target.closest('a')) setMenu(false); };
	$('.lang-toggle', header).onclick = () => setLang(App.lang === 'ar' ? 'en' : 'ar');
	wireMega(header);

	let main = $('#main');
	if (!main) { main = document.createElement('main'); main.id = 'main'; header.after(main); }
	main.tabIndex = -1;

	let footer = $('#site-footer');
	if (!footer) { footer = document.createElement('footer'); footer.id = 'site-footer'; main.after(footer); }
	footer.className = 'site-footer';
	footer.innerHTML = footerHTML(s);
	$('#lock-btn', footer).onclick = () => {
		if (!confirm(L('تقفلي الموقع تاني؟ هتحتاجي تجاوبي على الأسئلة المرة الجاية.', 'Lock it again? You’ll need to answer the questions next time.'))) return;
		store.del(KEY);
		location.href = 'index.html';
	};
	installUI(footer);
	owl();
}

/* The footer: the four of us as the river stones from the portrait Sameh made for Esraa, sitting together on a dune
   by the Nile at sunset — pyramids, palms, a felucca, the places our anniversaries take us. Each of us is a link to
   our own page. Then the links, the tools, and the maker's line with its owl. */

/* A smooth, slightly uneven stone: points around an ellipse, nudged by a seed, joined with curves. */
function pebble(cx, cy, rx, ry, rot = 0, seed = 1) {
	const n = 10;
	const rnd = (k) => { const x = Math.sin(seed * 97.13 + k * 12.9898) * 43758.5453; return x - Math.floor(x); };
	const a0 = (rot * Math.PI) / 180;
	const pts = Array.from({ length: n }, (_, k) => {
		const a = (k / n) * Math.PI * 2;
		const w = 1 + (rnd(k) - 0.5) * 0.12;
		const x = Math.cos(a) * rx * w, y = Math.sin(a) * ry * w;
		return [cx + x * Math.cos(a0) - y * Math.sin(a0), cy + x * Math.sin(a0) + y * Math.cos(a0)];
	});
	const r = (v) => v.toFixed(1);
	let d = 'M' + r(pts[0][0]) + ' ' + r(pts[0][1]);
	for (let k = 0; k < n; k++) {
		const p0 = pts[(k - 1 + n) % n], p1 = pts[k], p2 = pts[(k + 1) % n], p3 = pts[(k + 2) % n];
		const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
		const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
		d += 'C' + [...c1, ...c2, ...p2].map(r).join(' ');
	}
	return d + 'Z';
}

const PEBBLE_COLOURS = [['pbHoney', '#f1d29a', '#d3a25c', '#9c6a2c'], ['pbOchre', '#efc77f', '#c9953d', '#8f6220'], ['pbAmber', '#e9b56a', '#c0863a', '#7f5420'],
	['pbSage', '#eef0dc', '#cfd3b4', '#9da184'], ['pbMoss', '#cfd2b4', '#a7ad8a', '#717757'], ['pbSand', '#efe1bf', '#d2bd8e', '#9e8858'],
	['pbOrange', '#f3c27a', '#d99a44', '#a0661f'], ['pbCream', '#fbf3df', '#e6d6b2', '#b4a37d']];

function familyScene(s) {
	const members = s.family?.members || [];
	const grown = members.filter((m) => !m.kid);
	const kids = members.filter((m) => m.kid);
	const [dad, mum] = grown;
	const who = (m, inner, k) => (m
		? `<a class="pb-person" href="member.html?id=${esc(m.id)}" style="--k:${k}"><title>${esc(t(m.name))}</title>${inner}</a>`
		: `<g class="pb-person" style="--k:${k}">${inner}</g>`);
	const stone = (d, fill) => `<path d="${d}" fill="url(#${fill})" filter="url(#pbShadow)"/>`;
	// the shine on each stone, top-left
	const shine = (cx, cy, r) => `<ellipse cx="${(cx - r * 0.35).toFixed(1)}" cy="${(cy - r * 0.45).toFixed(1)}" rx="${(r * 0.32).toFixed(1)}" ry="${(r * 0.18).toFixed(1)}" fill="#fff" opacity=".35" transform="rotate(-30 ${cx} ${cy})"/>`;

	const people = [
		// him: a big honey stone, head up to the side, his arm reaching across to her
		who(dad, stone(pebble(238, 296, 39, 53, -8, 3), 'pbHoney') + shine(238, 296, 39)
			+ stone(pebble(255, 213, 22, 25, 12, 5), 'pbOchre') + shine(255, 213, 22)
			+ stone(pebble(264, 290, 15, 9, 38, 8), 'pbAmber'), 0),
		// her: a pale sage stone with a grey-green head, cradling the baby
		who(mum, stone(pebble(318, 298, 34, 49, 4, 11), 'pbSage') + shine(318, 298, 34)
			+ stone(pebble(301, 232, 21, 21, 0, 13), 'pbMoss') + shine(301, 232, 21), 1),
		// Fahd, standing beside his mother
		kids[0] ? who(kids[0], stone(pebble(380, 310, 26, 31, 6, 17), 'pbSand') + shine(380, 310, 26)
			+ stone(pebble(357, 266, 15, 15, 0, 19), 'pbOrange') + shine(357, 266, 15), 2) : '',
		// Abdulrahman, a tiny stone in her arms, her arm wrapped round him
		kids[1] ? who(kids[1], stone(pebble(298, 300, 17, 10, -18, 23), 'pbCream')
			+ stone(pebble(281, 289, 8.5, 8.5, 0, 29), 'pbOrange') + shine(281, 289, 8.5), 3) : '',
		mum ? `<path d="${pebble(306, 313, 15, 8, -12, 31)}" fill="url(#pbAmber)" filter="url(#pbShadow)"/>` : ''
	].join('');
	// any more children stand in a row to the right
	const more = kids.slice(2).map((m, k) => who(m, stone(pebble(420 + k * 26, 320, 12, 16, 0, 41 + k), 'pbSand')
		+ stone(pebble(418 + k * 26, 297, 8, 8, 0, 47 + k), 'pbOrange'), 4 + k)).join('');

	const palm = (x, h, flip = 1) => `<g transform="translate(${x} 300) scale(${flip} 1)"><path d="M0 0c-2-${h * 0.4}-6-${h * 0.75}-2-${h}" fill="none" stroke="#5b3a29" stroke-width="7" stroke-linecap="round"/>
		<g fill="#3e5a2a" transform="translate(-2 -${h})">${[-150, -115, -70, -30, 10, 50].map((r) => `<path d="M0 0c22-8 46-4 64 10-24-4-44-2-64-10Z" transform="rotate(${r})"/>`).join('')}</g></g>`;
	return `<svg class="fs" viewBox="0 0 1200 380" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${esc(L('إحنا الأربعة حجارة صغيرة قاعدين على الرملة جنب النيل وقت الغروب', 'The four of us as pebbles, sitting on the sand by the Nile at sunset'))}">
		<defs>
			<linearGradient id="fsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b6e8f"/><stop offset=".45" stop-color="#e99a6b"/><stop offset=".75" stop-color="#f6c37c"/><stop offset="1" stop-color="#fbe0a8"/></linearGradient>
			<radialGradient id="fsSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>
			<linearGradient id="fsNile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d9bb4"/><stop offset="1" stop-color="#2f6f8c"/></linearGradient>
			<linearGradient id="fsSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1cf92"/><stop offset="1" stop-color="#d9a964"/></linearGradient>
			<linearGradient id="fsSand2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7bd7a"/><stop offset="1" stop-color="#c98f4c"/></linearGradient>
			${PEBBLE_COLOURS.map(([id, a, b, c]) => `<radialGradient id="${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`).join('')}
			<filter id="pbShadow" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="3" dy="4" stdDeviation="2.5" flood-color="#6b3f1a" flood-opacity=".45"/></filter>
		</defs>
		<rect width="1200" height="380" fill="url(#fsSky)"/>
		<circle class="fs-sun" cx="860" cy="176" r="120" fill="url(#fsSun)"/>
		<circle cx="860" cy="176" r="38" fill="#fff1c7"/>
		<g fill="#fff" opacity=".7">
			<g class="fs-cloud"><ellipse cx="0" cy="70" rx="60" ry="14"/><ellipse cx="30" cy="60" rx="34" ry="14"/></g>
			<g class="fs-cloud c2"><ellipse cx="0" cy="110" rx="80" ry="12"/><ellipse cx="-30" cy="101" rx="30" ry="12"/></g>
		</g>
		${[0, 1].map((k) => `<g class="fs-bird${k ? ' b2' : ''}"><g transform="translate(0 ${90 + k * 30}) scale(${k ? 0.8 : 1})" fill="none" stroke="#2b3b4a" stroke-width="2.4" stroke-linecap="round"><path class="fs-wing" d="M0 0q8-8 16 0"/><path class="fs-wing" d="M16 0q8-8 16 0"/></g></g>`).join('')}
		<!-- the pyramids of Giza, far away in the haze -->
		<g fill="#c9845a" opacity=".85"><path d="M140 252l70-84 70 84z"/><path d="M250 252l52-62 52 62z" fill="#b8744f"/><path d="M60 252l40-46 40 46z" fill="#d1936a"/></g>
		<g fill="#a8653f" opacity=".7"><path d="M210 168l70 84h-70z"/><path d="M302 190l52 62h-52z"/></g>
		<!-- the far bank -->
		<path d="M0 250c120-10 260-6 380 0s300 8 420-2 300-8 400 0v20H0z" fill="#7f9a5a"/>
		${palm(470, 70)}${palm(520, 54, -1)}${palm(1080, 80, -1)}${palm(1130, 60)}
		<!-- the Nile, with a felucca sailing by -->
		<rect y="262" width="1200" height="48" fill="url(#fsNile)"/>
		<g class="fs-water" stroke="#cfe8f1" stroke-width="2" stroke-linecap="round" opacity=".8"><path d="M80 278h40M300 290h60M560 276h30M760 294h50M1000 282h40"/></g>
		<g class="fs-boat"><g class="fs-boat-bob"><path d="M0 286h70l-10 12H8z" fill="#5b3a29"/><path d="M34 286V214" stroke="#5b3a29" stroke-width="3"/><path d="M36 216c18 20 26 44 26 66H36z" fill="#fffaf0"/><path d="M33 222c-12 16-20 36-22 60h22z" fill="#f7efe0"/></g></g>
		<!-- our dune -->
		<path d="M0 380V318c140-26 300-30 460-18 120-30 260-34 380-14 140-12 260 0 360 16V380z" fill="url(#fsSand2)"/>
		<path d="M260 380c40-52 160-80 340-80s300 28 340 80z" fill="url(#fsSand)"/>
		<g stroke="#c48a47" stroke-width="1.5" fill="none" opacity=".5"><path d="M380 350q40-8 80 0M700 344q50-10 100 0M520 366q30-6 60 0"/></g>
		<ellipse cx="600" cy="342" rx="120" ry="12" fill="#a8723a" opacity=".35"/>
		<g class="fs-family" transform="translate(600 342) scale(.98) translate(-312 -346)">${people}${more}</g>
		<path class="fs-heart" d="M612 170c-5-6-14-3-14 4 0 7 14 15 14 15s14-8 14-15c0-7-9-10-14-4Z" fill="#f2726f" stroke="#fff" stroke-width="2"/>
	</svg>`;
}

function footerHTML(s) {
	const col = (title, list) => `<nav class="ft-links" aria-label="${esc(title)}"><h2>${esc(title)}</h2>${list.map((p) => `<a href="${p.href}">${esc(L(p.ar, p.en))}</a>`).join('')}</nav>`;
	const g = (id) => PAGES.filter((p) => p.group === id);
	return `
	<div class="ft-scene">${familyScene(s)}</div>
	<div class="ft-body"><div class="ft-wrap">
		<div class="ft-brand">
			<span class="ft-names">${T(s.him)} <i>♥</i> ${T(s.her)}</span>
			<span class="ft-dates" dir="ltr">${(s.met || '2009').slice(0, 4)} — ∞</span>
			<div class="ft-tools">
				<button class="btn btn--coral btn--sm" type="button" id="install-btn" hidden>${L('حطيه على الشاشة الرئيسية', 'Add to home screen')}</button>
				<a class="btn btn--ghost btn--sm" href="index.html?intro">${L('شوفي المقدمة تاني', 'Replay intro')}</a>
				<button class="btn btn--ghost btn--sm" type="button" id="lock-btn">${L('اقفلي', 'Lock')} 🔒</button>
			</div>
			<p class="ios-tip" id="ios-tip" hidden>${L('على الآيفون: دوسي على <b>مشاركة</b> وبعدين <b>إضافة إلى الشاشة الرئيسية</b> ♥', 'On iPhone: tap <b>Share</b> then <b>Add to Home Screen</b> ♥')}</p>
		</div>
		${col(L('حكايتنا', 'Our story'), [PAGES[0], ...g('story')])}
		${col(L('ذكرياتنا', 'Memories'), g('memories'))}
		${col(L('ليالينا', 'Our nights'), [...g('nights'), ...DRAW_KINDS.map((k) => ({ href: `draw.html?k=${k.id}`, ar: `${k.emoji} ${k.ar}`, en: `${k.emoji} ${k.en}` }))])}
		${col(L('عيلتنا وليكي', 'Family & you'), [...g('family'), ...g('you'), ...g('app')])}
		<div class="ft-maker">
			${App.lang === 'ar'
				? `<p class="ft-copy" dir="rtl">حقوق النشر @${new Date().getFullYear()}، <span class="ascii owl" aria-hidden="true">,___,\n[o,o]\n/)__)\n~"--"~</span>كل الحب محفوظ. <span>صُنع بـ <span class="ft-heart">🧡</span> سامح بلال</span></p>`
				: `<p class="ft-copy" dir="ltr">Copyright @${new Date().getFullYear()}, <span class="ascii owl" aria-hidden="true">,___,\n[o,o]\n/)__)\n~"--"~</span>All love reserved. <span>Crafted with <span class="ft-heart">🧡</span> Sameh Bilal</span></p>`}
		</div>
	</div>
	<p class="ft-end">${T(s.closing)} <span aria-hidden="true">♥</span></p></div>`;
}

/* the footer owl (from Sameh's portfolio): blinks while idle, glances when the page scrolls */
let owlTimer;
function owl() {
	const F = { idle: [',___,\n[o,o]\n/)__)\n~"--"~', ',___,\n[o,-]\n/)__)\n~"--"~', ',___,\n[-,o]\n/)__)\n~"--"~'], scroll: [',___,\n[o,o]\n<(__)\n~"--"~', ',___,\n[o,o]\n/)__>\n~"--"~'] };
	if (REDUCE || owlTimer) return;
	let k = 0;
	let scrolled = 0;
	addEventListener('scroll', () => { scrolled = Date.now(); }, { passive: true });
	owlTimer = setInterval(() => {
		const el = $('.site-footer .owl');
		if (!el) return;
		const list = Date.now() - scrolled < 400 ? F.scroll : F.idle;
		k = (k + 1) % (list === F.idle ? 12 : 2);
		el.textContent = list === F.idle ? (k < 2 ? list[k + 1] : list[0]) : list[k % 2];
	}, 380);
}

/* ------------------------------------------------------------------ the page itself */

async function renderPage() {
	const main = $('#main');
	const s = App.story;
	// a page may fetch what it shows first (e.g. the journal entries the timeline includes)
	if (page.load) { try { await page.load(s); } catch { /* render without it */ } }
	main.innerHTML = page.render(s) || '';
	document.title = `${t(page.title) || L('حكايتنا', 'Our story')} — ${t(s.him)} ♥ ${t(s.her)}`;
	hydrate(main);
	reveal(main);
	lightbox(main);
	page.after?.(main, s);
	if (location.hash) $(location.hash.replace(/[^\w#-]/g, ''))?.scrollIntoView();
}

/** Page heading used on every inner page. */
export function pageHead(title, sub, crumbs = []) {
	const trail = [{ href: 'index.html', ar: 'الرئيسية', en: 'Home' }, ...crumbs];
	return `<header class="ph">
		<nav class="crumbs" aria-label="${L('أنت هنا', 'You are here')}">${trail.map((c) => `<a href="${c.href}">${esc(c.ar ? L(c.ar, c.en) : t(c.label))}</a>`).join('<span aria-hidden="true">/</span>')}</nav>
		<h1 class="ph__title">${esc(title)}</h1>
		${sub ? `<p class="ph__sub">${esc(sub)}</p>` : ''}
	</header>`;
}

/** "More to see" links at the foot of a page. */
export function related(ids) {
	return `<aside class="related wrap" aria-label="${L('كمان', 'More')}"><h2 class="related__h">${L('كملي الحكاية', 'Keep exploring')}</h2><div class="related__grid">
		${ids.map((id) => PAGES.find((p) => p.id === id)).filter(Boolean).map((p) => `<a class="related__card reveal" href="${p.href}">${icon(p.ic, 26)}<b>${esc(L(p.ar, p.en))}</b><small>${esc(L(p.dar || '', p.den || ''))}</small><span aria-hidden="true">${App.arrow}</span></a>`).join('')}
	</div></aside>`;
}

export function reveal(root) {
	const els = $$('.reveal:not(.is-in)', root);
	if (!('IntersectionObserver' in window) || REDUCE) return els.forEach((e) => e.classList.add('is-in'));
	const io = new IntersectionObserver((entries) => {
		for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
	}, { rootMargin: '0px 0px -10% 0px', threshold: 0.04 });
	els.forEach((e) => io.observe(e));
}

function lightbox(root) {
	if (root.dataset.lb) return;
	root.dataset.lb = '1';
	root.addEventListener('click', (e) => {
		const el = e.target.closest('img.zoom');
		if (!el || !el.src) return;
		const box = document.createElement('div');
		box.className = 'lightbox';
		box.setAttribute('role', 'dialog');
		box.setAttribute('aria-modal', 'true');
		box.innerHTML = `<button type="button" aria-label="${L('اقفلي', 'Close')}">✕</button><figure><img src="${el.src}" alt="${esc(el.alt)}">${el.alt ? `<figcaption>${esc(el.alt)}</figcaption>` : ''}</figure>`;
		const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
		const onKey = (k) => k.key === 'Escape' && close();
		box.onclick = close;
		document.addEventListener('keydown', onKey);
		document.body.append(box);
		$('button', box).focus();
	});
}

/* ------------------------------------------------------------------ PWA */

function registerSW() {
	if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
let installEvt;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; const b = $('#install-btn'); if (b) b.hidden = false; });
function installUI(root) {
	const btn = $('#install-btn', root);
	if (installEvt) btn.hidden = false;
	btn.onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; btn.hidden = true; };
	const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
	const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	if (ios && !standalone) $('#ios-tip', root).hidden = false;
}

function floatHearts() {
	if (REDUCE) return;
	const box = document.createElement('div');
	box.className = 'hearts';
	box.setAttribute('aria-hidden', 'true');
	box.innerHTML = Array.from({ length: innerWidth < 600 ? 9 : 14 }, () =>
		`<span style="--x:${rand(0, 100)}%;--s:${rand(12, 28)}px;--d:${rand(12, 24)}s;--delay:-${rand(0, 24)}s;--o:${rand(0.12, 0.4)};--drift:${rand(-60, 60)}px;--r:${rand(-60, 60)}deg">♥</span>`).join('');
	document.body.prepend(box);
}

boot();
