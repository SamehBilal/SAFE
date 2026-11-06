/* Gate -> loader -> intro -> site.
   Nothing private is in this file: everything comes from content/vault.json once her
   answers unlock it (see core.js for how). */
import { unlock, readVault, open, toB64, fromB64 } from './core.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'us.key';
const WISHES = 'us.wishes';
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg' };

const store = {
	get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
	set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
	del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, REDUCE ? Math.min(ms, 120) : ms));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let vault;
let gate;
let masterKey;

/* ------------------------------------------------------------------ boot */

async function boot() {
	floatHearts();
	registerSW();
	try {
		[vault, gate] = await Promise.all([getJSON('content/vault.json'), getJSON('content/gate.json')]);
	} catch {
		return showError('Couldn’t load — check your connection and try again ♥');
	}
	const saved = store.get(KEY);
	if (saved) {
		try {
			const res = await readVault(vault, fromB64(saved));
			return enter(res, { intro: new URLSearchParams(location.search).has('intro') });
		} catch {
			store.del(KEY); // content was rebuilt with a new key, or storage got mangled
		}
	}
	runGate();
}

async function getJSON(url) {
	const r = await fetch(url, { cache: 'no-cache' });
	if (!r.ok) throw new Error(url + ' ' + r.status);
	return r.json();
}

function show(id) {
	for (const el of $$('.stage, #site')) {
		if (el.id === id) el.hidden = false;
		else if (!el.hidden) el.hidden = true;
	}
	document.body.classList.toggle('on-site', id === 'site');
	window.scrollTo(0, 0);
}

async function leave(id) {
	const el = $('#' + id);
	el.classList.add('is-leaving');
	await sleep(480);
	el.classList.remove('is-leaving');
}

function showError(msg) {
	const g = $('#gate');
	g.hidden = false;
	g.innerHTML = `<div class="gate__card error"><h1 class="gate__title">Oops</h1><p>${esc(msg)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`;
}

/* ------------------------------------------------------------------ 1. gate */

function runGate() {
	show('gate');
	const qs = gate.questions;
	const answers = qs.map(() => '');
	let i = 0;

	const form = $('#gate-form');
	const input = $('#gate-input');
	const ask = $('#gate-ask');
	const msg = $('#gate-msg');
	const next = $('#gate-next');
	const back = $('#gate-back');
	const hint = $('#gate-hint');
	const hintBtn = $('#gate-hint-btn');
	const steps = $('#gate-steps');

	$('#gate-title').textContent = gate.title || 'Hey you';
	$('#gate-intro').textContent = gate.intro || '';
	steps.innerHTML = qs.map(() => '<li></li>').join('');

	function render(animate = true) {
		const q = qs[i];
		$('#gate-q').textContent = q.q;
		input.value = answers[i];
		input.placeholder = q.placeholder || '';
		input.inputMode = q.type === 'number' ? 'numeric' : 'text';
		input.enterKeyHint = i === qs.length - 1 ? 'go' : 'next';
		hint.hidden = true;
		hint.textContent = q.hint || '';
		hintBtn.hidden = !q.hint;
		back.hidden = i === 0;
		next.textContent = i === qs.length - 1 ? 'Unlock ♥' : 'Next';
		$$('li', steps).forEach((li, n) => {
			li.className = n < i ? 'is-done' : n === i ? 'is-now' : '';
		});
		if (animate) {
			ask.classList.remove('swap');
			void ask.offsetWidth;
			ask.classList.add('swap');
		}
		input.focus({ preventScroll: true });
	}

	function shake(el) {
		el.classList.remove('shake');
		void el.offsetWidth;
		el.classList.add('shake');
		navigator.vibrate?.(120);
	}

	hintBtn.onclick = () => { hint.hidden = false; hintBtn.hidden = true; };
	back.onclick = () => { answers[i] = input.value; i = Math.max(0, i - 1); msg.textContent = ''; render(); };
	input.oninput = () => { msg.textContent = ''; };

	form.onsubmit = async (e) => {
		e.preventDefault();
		const v = input.value.trim();
		if (!v) return shake(input);
		answers[i] = v;
		if (i < qs.length - 1) { i++; render(); return; }

		next.disabled = back.disabled = true;
		next.textContent = 'Checking…';
		let raw = null;
		try { raw = await unlock(vault, answers); } catch { /* treated as wrong */ }
		next.disabled = back.disabled = false;
		if (!raw) {
			msg.textContent = gate.wrong || 'Not quite — try again ♥';
			shake(form);
			i = 0;
			render(false);
			return;
		}
		store.set(KEY, toB64(raw));
		$$('li', steps).forEach((li) => (li.className = 'is-done'));
		next.textContent = 'Welcome home ♥';
		msg.textContent = '';
		$('#gate').classList.add('is-open');
		navigator.vibrate?.([60, 80, 60]);
		const res = await readVault(vault, raw);
		await sleep(2000);
		$('#gate').classList.remove('is-open');
		enter(res, { intro: true });
	};

	render(false);
}

/* ------------------------------------------------------------------ 2. loader */

async function enter({ key, story }, { intro }) {
	masterKey = key;
	show('loader');
	const label = 'Opening our story';
	$('#loader-text').innerHTML = [...label].map((c, n) => `<span style="--i:${n};--r:${(n % 2 ? 1 : -1) * 8}deg">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
	const fill = $('#loader-fill');
	const pct = $('#loader-pct');
	const set = (p) => {
		fill.style.transform = `translateY(${-p * 96}px)`;
		pct.textContent = Math.round(p * 100) + '%';
	};
	set(0);

	const images = (story.$media || []).filter((r) => /^image\//.test(mimeOf(r)));
	let done = 0;
	const started = performance.now();
	await pool(images, 4, async (ref) => {
		try { await mediaURL(ref); } catch { /* shown as missing later */ }
		set(++done / Math.max(images.length, 1) * 0.95);
	});
	set(1);
	await sleep(Math.max(0, 1600 - (performance.now() - started)));
	await leave('loader');

	if (intro && story.intro?.length) await runIntro(story);
	renderSite(story);
}

async function pool(items, n, fn) {
	const queue = [...items];
	await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
		while (queue.length) await fn(queue.shift());
	}));
}

/* ------------------------------------------------------------------ media */

const media = new Map();
const mimeOf = (ref) => MIME[(ref.match(/\.(\w+)$/) || [])[1]?.toLowerCase()] || 'application/octet-stream';

function mediaURL(ref) {
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

/** Markup for a photo or video; filled in by hydrate(). */
function mediaTag(ref, alt = '', cls = '') {
	if (!ref) return '';
	const isVideo = /^video\//.test(mimeOf(ref));
	return isVideo
		? `<video class="${cls}" data-m="${esc(ref)}" playsinline muted loop controls preload="metadata"></video>`
		: `<img class="${cls}" data-m="${esc(ref)}" alt="${esc(alt)}" decoding="async">`;
}

function hydrate(root) {
	for (const el of $$('[data-m]', root)) {
		mediaURL(el.dataset.m)
			.then((url) => { el.src = url; })
			.catch(() => { (el.closest('[data-media-box]') || el).remove(); });
	}
}

/* ------------------------------------------------------------------ 3. intro */

async function runIntro(story) {
	show('intro');
	const lines = $('#intro-lines');
	const final = $('#intro-final');
	lines.hidden = false;
	final.hidden = true;
	let skipped = false;
	let onSkip;
	const skipP = new Promise((r) => (onSkip = r));
	$('#intro-skip').hidden = false;
	$('#intro-skip').onclick = () => { skipped = true; onSkip(); };
	const pause = (ms) => Promise.race([sleep(ms), skipP]);

	for (const line of story.intro) {
		if (skipped) break;
		const words = String(line).split(/(\s+)/).filter(Boolean);
		let n = 0;
		lines.innerHTML = `<p class="intro__line">${words.map((w) => (/^\s+$/.test(w) ? ' ' : `<span style="--i:${n++}">${esc(w)}</span>`)).join('')}</p>`;
		await pause(900 + n * 160 + 1500);
		if (skipped) break;
		$('.intro__line', lines)?.classList.add('is-out');
		await pause(600);
	}

	lines.hidden = true;
	$('#intro-skip').hidden = true;
	const b = story.birthday || {};
	const bday = b.show !== false;
	const [first, ...rest] = (bday ? b.title || 'Happy Birthday' : 'Our Love Story').split(' ');
	final.innerHTML = `
		<div class="names"><span class="n1">${esc(story.him)}</span><span class="heart">♥</span><span class="n2">${esc(story.her)}</span></div>
		<h1 class="pop"><span>${esc(first)}</span>${rest.length ? `<span class="pop__word"><span>${esc(rest.join(' '))}</span></span>` : ''}</h1>
		${bday && b.subtitle ? `<p class="sub">${esc(b.subtitle)}</p>` : ''}
		<button class="btn btn--light" type="button" id="intro-go">Open our story ♥</button>`;
	final.hidden = false;
	await new Promise((r) => ($('#intro-go').onclick = r));
	await leave('intro');
}

/* ------------------------------------------------------------------ 4. site */

const fmtDate = (iso) => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };
const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
function yearsBetween(a, b) {
	let y = b.getFullYear() - a.getFullYear();
	if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) y--;
	return y;
}
const daysBetween = (a, b) => Math.floor((b - a) / 864e5);
const nf = new Intl.NumberFormat('en');

function renderSite(s) {
	const site = $('#site');
	const tilt = (n) => `${((n * 37) % 7) - 3}deg`;
	const has = (k) => Array.isArray(s[k]) ? s[k].length : !!s[k];
	const nav = [
		['top', '🏠', 'Home'],
		has('timeline') && ['story', '📖', 'Story'],
		(has('proposal') || has('moments')) && ['us', '💍', 'Us'],
		(has('notes') || has('gallery')) && ['notes', '💌', 'Notes'],
		has('family') && ['family', '🏡', 'Family'],
		['wishes', '⭐', 'Wishes']
	].filter(Boolean);

	const b = s.birthday || {};
	const today = new Date();
	const tl = s.timeline || [];

	site.innerHTML = `
	<nav class="nav" aria-label="Sections">${nav.map(([id, ico, label]) => `<a href="#${id}" data-to="${id}"><b aria-hidden="true">${ico}</b>${label}</a>`).join('')}</nav>

	<header class="hero" id="top">
		${b.show !== false ? `<span class="hero__bday">🎂 ${esc(b.title || 'Happy Birthday')} ${esc(s.her)}</span>` : ''}
		<h1 class="hero__title">Our Love Story</h1>
		<div class="ribbon"><span>${esc(s.him).toUpperCase()}</span><span class="heart">♥</span><span>${esc(s.her).toUpperCase()}</span></div>
		<div class="counters" id="counters"></div>
		<a class="scroll-cue" href="#story" aria-label="Scroll down">⌄</a>
	</header>

	${tl.length ? `
	<section class="sec" id="story">
		<div class="wrap">
			<h2 class="sec__title reveal">Our Story</h2>
			<p class="sec__sub reveal">Every date that made us, us.</p>
			<ol class="tl">
				${tl.map((t) => {
					const d = parse(t.date);
					const ago = yearsBetween(d, today);
					const isToday = d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
					return `<li class="tl__item reveal">
						<span class="tl__icon" aria-hidden="true">${esc(t.icon || '♥')}</span>
						<article class="tl__card">
							<div class="tl__date"><time datetime="${esc(t.date)}">${fmtDate(t.date)}</time>
								${isToday ? `<span class="tl__today">Today, ${ago} year${ago === 1 ? '' : 's'} ago ♥</span>` : ago > 0 ? `<span class="tl__ago">${ago} year${ago === 1 ? '' : 's'} ago</span>` : ''}
							</div>
							${t.title ? `<h3>${esc(t.title)}</h3>` : ''}
							${t.text ? `<p>${esc(t.text)}</p>` : ''}
							${t.photo ? `<figure data-media-box>${mediaTag(t.photo, t.title, 'zoom')}</figure>` : ''}
						</article>
					</li>`;
				}).join('')}
			</ol>
			<p class="tl__more reveal">• • •</p>
			${s.poster ? `<figure class="poster reveal" data-media-box style="margin-top:40px">${mediaTag(s.poster, 'Our love story poster', 'zoom')}</figure>` : ''}
		</div>
	</section>` : ''}

	${s.proposal ? `
	<section class="sec proposal" id="us">
		<div class="fairy" aria-hidden="true">${Array.from({ length: 40 }, () => `<i style="--x:${rand(0, 100)}%;--y:${rand(0, 100)}%;--d:${rand(2, 5)}s;--delay:-${rand(0, 5)}s"></i>`).join('')}</div>
		<div class="wrap">
			<h2 class="sec__title reveal">${esc(s.proposal.title || 'The proposal')}</h2>
			${s.proposal.text ? `<p class="sec__sub reveal">${esc(s.proposal.text)}</p>` : ''}
			<div class="frames ${(s.proposal.photos || []).length === 1 ? 'frames--single' : ''}">
				${(s.proposal.photos || []).map((p, n) => {
					const ref = typeof p === 'string' ? p : p.photo;
					const cap = typeof p === 'string' ? '' : p.caption;
					return `<figure class="frame reveal" data-media-box style="--tilt:${tilt(n)};--delay:${n * 0.12}s">${mediaTag(ref, cap, 'zoom')}${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`;
				}).join('')}
			</div>
		</div>
	</section>` : ''}

	${has('moments') ? `
	<section class="sec" id="${s.proposal ? 'moments' : 'us'}">
		<h2 class="sec__title reveal">Our Places</h2>
		<p class="sec__sub reveal">Swipe through the places that hold a piece of us.</p>
		<div class="moments">
			${s.moments.map((m) => `
			<article class="moment reveal" data-media-box>
				${mediaTag(m.photo, m.title)}
				<h3>${esc(m.title)}</h3>
				<div class="moment__blur"></div>
				<div class="moment__meta"><b>${esc(m.place || '')}</b>${m.date ? `<span>${fmtDate(m.date)}</span>` : ''}</div>
			</article>`).join('')}
		</div>
	</section>` : ''}

	${has('notes') ? `
	<section class="sec notes" id="notes">
		<div class="wrap">
			<h2 class="sec__title reveal">Love Notes</h2>
			<p class="sec__sub reveal">Little things we wrote to each other.</p>
			<div class="notes__grid">
				${s.notes.map((n, i) => `
				<figure class="note note--${n.by === 'him' ? 'him' : 'her'} reveal" style="--tilt:${tilt(i + 1)};--delay:${(i % 3) * 0.1}s">
					<p>${esc(n.text)}</p>
					${n.photo ? `<div data-media-box>${mediaTag(n.photo, '', 'zoom')}</div>` : ''}
					<footer>— ${esc(n.by === 'him' ? s.him : s.her)}${n.date ? `, ${fmtDate(n.date)}` : ''}</footer>
				</figure>`).join('')}
			</div>
		</div>
	</section>` : ''}

	${has('gallery') ? `
	<section class="sec" id="${has('notes') ? 'gallery' : 'notes'}">
		<div class="wrap">
			<h2 class="sec__title reveal">Us, in pictures</h2>
			<p class="sec__sub reveal">Tap any photo to see it bigger.</p>
			<div class="gallery">
				${s.gallery.map((g) => `<figure class="shot" data-media-box>${mediaTag(g.photo, g.caption, 'zoom')}${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}</figure>`).join('')}
			</div>
		</div>
	</section>` : ''}

	${s.family ? `
	<section class="sec" id="family">
		<div class="wrap">
			<h2 class="sec__title reveal">Our Family</h2>
			<p class="sec__sub reveal">Extra! Extra! Read all about us.</p>
			<article class="paper reveal">
				<h3 class="paper__name">${esc(s.family.paper || 'The Daily Us')}</h3>
				<div class="paper__bar"><div><span>Issue #${yearsBetween(parse(s.met || '2009-06-10'), today)}</span><span>${today.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span><span>Price: one hug</span></div></div>
				${s.family.headline ? `<h4 class="paper__headline">${esc(s.family.headline)}</h4>` : ''}
				${s.family.lead ? `<p class="paper__lead">${esc(s.family.lead)}</p>` : ''}
				<div class="paper__cols">
					${(s.family.members || []).map((m) => `
					<section class="article" tabindex="0">
						${m.photo ? `<div data-media-box>${mediaTag(m.photo, m.name, 'zoom')}</div>` : ''}
						<h4>${esc(m.name)}</h4>
						${m.role ? `<em>${esc(m.role)}</em>` : ''}
						${m.text ? `<p>${esc(m.text)}</p>` : ''}
					</section>`).join('')}
				</div>
			</article>
		</div>
	</section>` : ''}

	${s.letter ? `
	<section class="sec" id="letter">
		<div class="wrap">
			<h2 class="sec__title reveal">A letter for you</h2>
			<p class="sec__sub reveal">Open it ♥</p>
			<button class="envelope reveal" type="button" id="envelope" aria-expanded="false" aria-controls="letter-body">
				<span class="envelope__back"></span>
				<span class="envelope__peek">${esc(s.letter.to || 'For you')}</span>
				<span class="envelope__front"></span>
				<span class="envelope__flap"></span>
				<span class="envelope__seal" aria-hidden="true">💌</span>
				<span class="sr-only">Open the letter</span>
			</button>
			<p class="envelope__tap">tap the envelope</p>
			<article class="letter" id="letter-body" hidden>
				<h3>${esc(s.letter.to || '')}</h3>
				${String(s.letter.body || '').split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('<br>')}
				<p class="from">${esc(s.letter.from || '')}</p>
			</article>
		</div>
	</section>` : ''}

	<section class="sec" id="wishes">
		<div class="wrap jar-wrap">
			<h2 class="sec__title reveal">Wish Jar</h2>
			<p class="sec__sub reveal" style="margin-bottom:8px">Make a birthday wish. It stays in the jar.</p>
			<form class="wish-form" id="wish-form" autocomplete="off">
				<label class="sr-only" for="wish-input">I wish…</label>
				<input id="wish-input" maxlength="120" placeholder="I wish…" enterkeyhint="send">
				<button type="submit" aria-label="Put the wish in the jar">★</button>
			</form>
			<p class="wish-hint">Tap a star to read the wish inside.</p>
			<div class="jar" id="jar">
				${JAR_SVG}
				<div class="jar__stars" id="jar-stars"></div>
			</div>
			<p class="wish-toast" id="wish-toast" aria-live="polite"></p>
		</div>
	</section>

	<footer class="foot">
		<hr class="foot__dash">
		<p class="foot__line">${esc(s.closing || 'W kol youm 7kaya tol ma ana wyak')}</p>
		<div class="foot__tools">
			<button class="btn btn--coral" type="button" id="install-btn" hidden>Add to home screen</button>
			<a class="btn btn--ghost" href="?intro" style="text-decoration:none">Replay intro</a>
			<button class="btn btn--ghost" type="button" id="lock-btn">Lock 🔒</button>
		</div>
		<p class="ios-tip" id="ios-tip" hidden>On iPhone: tap <b>Share</b> then <b>Add to Home Screen</b> to keep this as an app ♥</p>
		<small>Made with all my love — ${esc(s.him)}</small>
	</footer>`;

	show('site');
	hydrate(site);
	counters(s);
	reveal(site);
	activeNav(site);
	pointerTilt();
	lightbox(site);
	envelope();
	wishJar();
	installUI();
	$('#lock-btn').onclick = () => {
		if (!confirm('Lock it again? You’ll need to answer the questions next time.')) return;
		store.del(KEY);
		location.href = location.pathname;
	};
}

function rand(a, b) { return +(a + Math.random() * (b - a)).toFixed(2); }

function counters(s) {
	const box = $('#counters');
	if (!box) return;
	const draw = () => {
		const now = new Date();
		const items = [];
		if (s.met) {
			const met = parse(s.met);
			items.push([nf.format(daysBetween(met, now)), 'days since hello']);
			items.push([yearsBetween(met, now), 'years of us']);
		}
		if (s.married) {
			const w = parse(s.married);
			items.push([nf.format(daysBetween(w, now)), 'days married']);
		}
		box.innerHTML = items.map(([n, l]) => `<div class="counter"><b>${n}</b><span>${l}</span></div>`).join('');
	};
	draw();
	setInterval(draw, 60000);
}

function reveal(root) {
	const els = $$('.reveal', root);
	if (!('IntersectionObserver' in window) || REDUCE) return els.forEach((e) => e.classList.add('is-in'));
	const io = new IntersectionObserver((entries) => {
		for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
	}, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
	els.forEach((e) => io.observe(e));
}

function activeNav(root) {
	const links = new Map($$('.nav a', root).map((a) => [a.dataset.to, a]));
	const io = new IntersectionObserver((entries) => {
		for (const e of entries) {
			if (!e.isIntersecting) continue;
			const id = e.target.id;
			const target = links.has(id) ? id : (id === 'moments' ? 'us' : id === 'gallery' ? 'notes' : id === 'letter' ? 'family' : null);
			if (!target) continue;
			links.forEach((a, k) => a.classList.toggle('is-active', k === target));
		}
	}, { rootMargin: '-45% 0px -50% 0px' });
	$$('#top, .sec', root).forEach((s) => io.observe(s));
}

function pointerTilt() {
	if (REDUCE) return;
	const cards = $$('.moment');
	if (!cards.length) return;
	window.addEventListener('pointermove', (e) => {
		if (e.pointerType !== 'mouse') return;
		for (const c of cards) {
			const r = c.getBoundingClientRect();
			if (r.bottom < 0 || r.top > innerHeight) continue;
			c.style.setProperty('--x', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
			c.style.setProperty('--y', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
		}
	}, { passive: true });
}

function lightbox(root) {
	root.addEventListener('click', (e) => {
		const el = e.target.closest('img.zoom');
		if (!el || !el.src) return;
		const cap = el.alt;
		const box = document.createElement('div');
		box.className = 'lightbox';
		box.setAttribute('role', 'dialog');
		box.setAttribute('aria-modal', 'true');
		box.innerHTML = `<button type="button" aria-label="Close">✕</button><figure style="margin:0"><img src="${el.src}" alt="${esc(cap)}">${cap ? `<p>${esc(cap)}</p>` : ''}</figure>`;
		const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
		const onKey = (k) => k.key === 'Escape' && close();
		box.onclick = close;
		document.addEventListener('keydown', onKey);
		document.body.append(box);
		$('button', box).focus();
	});
}

function envelope() {
	const env = $('#envelope');
	if (!env) return;
	env.onclick = async () => {
		const body = $('#letter-body');
		if (env.classList.contains('is-open')) return body.scrollIntoView({ behavior: 'smooth', block: 'start' });
		env.classList.add('is-open');
		env.setAttribute('aria-expanded', 'true');
		$('.envelope__tap').textContent = '♥';
		await sleep(900);
		body.hidden = false;
		body.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
	};
}

/* ------------------------------------------------------------------ wish jar */

const JAR_SVG = `<svg viewBox="0 0 200 260" aria-hidden="true">
	<rect x="30" y="70" width="140" height="180" rx="34" fill="rgba(230,247,255,.55)" stroke="#27525c" stroke-width="5"/>
	<path d="M138 92c10 30 10 110 0 140" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"/>
	<rect x="48" y="52" width="104" height="22" rx="6" fill="#cfe3ec" stroke="#27525c" stroke-width="5"/>
	<g class="jar__lid"><rect x="40" y="26" width="120" height="28" rx="10" fill="#66a8b8" stroke="#27525c" stroke-width="5"/>
	<path d="M56 38h88" stroke="#27525c" stroke-width="3" opacity=".35"/></g>
</svg>`;

function wishJar() {
	const form = $('#wish-form');
	const input = $('#wish-input');
	const starsBox = $('#jar-stars');
	const jar = $('#jar');
	const toast = $('#wish-toast');
	let wishes = [];
	try { wishes = JSON.parse(store.get(WISHES) || '[]'); } catch { wishes = []; }

	const addStar = (w, animate) => {
		const b = document.createElement('button');
		b.type = 'button';
		b.textContent = '⭐';
		b.title = w.text;
		b.setAttribute('aria-label', 'Wish: ' + w.text);
		if (!animate) b.style.animation = 'none';
		b.onclick = () => { toast.textContent = '“' + w.text + '”'; };
		starsBox.append(b);
	};
	wishes.forEach((w) => addStar(w, false));

	form.onsubmit = async (e) => {
		e.preventDefault();
		const text = input.value.trim();
		if (!text) return input.focus();
		input.value = '';
		const w = { text, at: Date.now() };
		wishes.push(w);
		store.set(WISHES, JSON.stringify(wishes));

		// A star leaves the input and drops into the jar.
		const from = form.getBoundingClientRect();
		const to = jar.getBoundingClientRect();
		const star = document.createElement('span');
		star.className = 'flying-star';
		star.textContent = '⭐';
		star.style.left = from.right - 40 + 'px';
		star.style.top = from.top + 'px';
		document.body.append(star);
		jar.classList.add('is-open');
		requestAnimationFrame(() => requestAnimationFrame(() => {
			star.style.transform = `translate(${to.left + to.width / 2 - from.right + 40}px, ${to.top + to.height * 0.5 - from.top}px) rotate(540deg) scale(.6)`;
			star.style.opacity = '0';
		}));
		await sleep(850);
		star.remove();
		addStar(w, true);
		await sleep(250);
		jar.classList.remove('is-open');
		toast.textContent = 'Your wish is safe in the jar ✨';
	};
}

/* ------------------------------------------------------------------ PWA */

function registerSW() {
	if ('serviceWorker' in navigator && location.protocol !== 'file:') {
		navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is a bonus */ });
	}
}

let installEvt;
window.addEventListener('beforeinstallprompt', (e) => {
	e.preventDefault();
	installEvt = e;
	const btn = $('#install-btn');
	if (btn) btn.hidden = false;
});

function installUI() {
	const btn = $('#install-btn');
	if (installEvt) btn.hidden = false;
	btn.onclick = async () => {
		if (!installEvt) return;
		installEvt.prompt();
		await installEvt.userChoice;
		installEvt = null;
		btn.hidden = true;
	};
	const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
	const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	if (ios && !standalone) $('#ios-tip').hidden = false;
}

function floatHearts() {
	if (REDUCE) return;
	const box = $('.hearts');
	const n = innerWidth < 600 ? 10 : 16;
	box.innerHTML = Array.from({ length: n }, () =>
		`<span style="--x:${rand(0, 100)}%;--s:${rand(12, 30)}px;--d:${rand(12, 24)}s;--delay:-${rand(0, 24)}s;--o:${rand(0.15, 0.45)};--drift:${rand(-60, 60)}px;--r:${rand(-60, 60)}deg">♥</span>`
	).join('');
}

boot();
