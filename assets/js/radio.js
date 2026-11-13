/* The song that keeps playing while we walk around the site, like SoundCloud: one player for every page, and a bar
   along the bottom (a little spinning record, the song, back / play / next, how far in) that shows up once a song
   has been played and stays until it's closed. While it's up, links swap only the page itself (shell.js) so the
   music carries on. Songs with their own recording play here; a YouTube or Spotify song plays in a small screen
   above the bar; anything else opens in its own app. The music page's turntable follows whatever this is playing. */
import { L, Y, App, $, mediaURL } from './shell.js';

/* every song gets its own sleeve colours, the same on both phones */
const PALETTE = [['#c2185b', '#ffd1dc'], ['#0e6990', '#cfe9f5'], ['#e39b2d', '#fff0cf'], ['#5a9e6f', '#dcf1df'], ['#6d4bb3', '#e6dcff'], ['#d9534f', '#ffe0dc'], ['#26706b', '#d2f0ec'], ['#8a5a2b', '#f3e2cc']];
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const colours = (x) => PALETTE[hash(x.id || x.title) % PALETTE.length];

export const safeLink = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
export const searchLink = (x) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${x.title} ${x.artist || ''}`.trim())}`;

/* Links we can play right here; anything else opens in its own app. */
export function player(link) {
	const yt = /(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([\w-]{11})/.exec(link || '');
	if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
	const sp = /open\.spotify\.com\/(?:intl-[\w-]+\/)?(track|album|playlist|episode)\/(\w+)/.exec(link || '');
	if (sp) return `<iframe class="is-spotify" src="https://open.spotify.com/embed/${sp[1]}/${sp[2]}?autoplay=1" title="Spotify" allow="autoplay; encrypted-media; clipboard-write"></iframe>`;
	return '';
}
const playable = (x) => !!(x && (x.audio || player(safeLink(x.link))));

const song = new Audio();
song.preload = 'none';
let queue = [];
let item = null;
let mode = '';      // 'audio' | 'embed' while a song is loaded
let playing = false;
let asked = 0;
let bar = null;
const fans = new Set();

/** What's on now: { item, playing, mode, time, duration }. */
export const state = () => ({ item, playing, mode, time: song.currentTime || 0, duration: isFinite(song.duration) ? song.duration : 0 });
/** True while the bar is up, so links should keep the music going. */
export const active = () => !!item;
/** Hear about every change (what: 'change' | 'meta' | 'time'). Returns the way to stop listening. */
export function on(fn) { fans.add(fn); return () => fans.delete(fn); }
const tell = (what = 'change') => { paint(what); for (const f of fans) { try { f(what, state()); } catch { /* a page's own trouble */ } } };

/** Play a song; the list it came from becomes what back / next go through. */
export function play(x, list) {
	if (!x) return;
	if (list?.length) queue = list.slice();
	else if (!queue.some((q) => q.id === x.id)) queue = [x];
	if (!playable(x)) { window.open(safeLink(x.link) || searchLink(x), '_blank', 'noopener'); return; }
	halt();
	item = x;
	playing = true;
	mount();
	const ask = ++asked;
	if (x.audio) {
		mode = 'audio';
		mediaURL(x.audio).then((url) => {
			if (ask !== asked || !playing) return;
			if (song.src !== url) song.src = url;
			return song.play();
		}).catch(() => {
			if (ask !== asked) return;
			const link = safeLink(x.link);
			if (player(link)) { mode = 'embed'; screen(player(link)); tell(); }
			else { stop(); window.open(link || searchLink(x), '_blank', 'noopener'); }
		});
	} else {
		mode = 'embed';
		screen(player(safeLink(x.link)));
	}
	media();
	tell();
}

export function pause() {
	if (!item || !playing) return;
	playing = false;
	asked++;
	if (mode === 'audio') song.pause();
	else screen('');
	tell();
}

export function resume() {
	if (!item || playing) return;
	if (mode === 'embed') return play(item);
	playing = true;
	const ask = ++asked;
	(song.src ? song.play() : mediaURL(item.audio).then((url) => { if (ask === asked) { song.src = url; return song.play(); } })).catch(() => {});
	tell();
}

export const toggle = () => (playing ? pause() : resume());

/** Back / next through the list, skipping songs that can only open elsewhere. */
export function step(dir) {
	if (!queue.length) return;
	let i = queue.findIndex((q) => q.id === item?.id);
	for (let n = 0; n < queue.length; n++) {
		i = (i + dir + queue.length) % queue.length;
		if (playable(queue[i])) return play(queue[i]);
	}
}

/** Stop and put the bar away. */
export function stop() {
	halt();
	item = null;
	mode = '';
	if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
	tell();
}

function halt() {
	playing = false;
	asked++;
	song.pause();
	screen('');
}

export function seek(frac) {
	if (mode !== 'audio' || !isFinite(song.duration)) return;
	song.currentTime = Math.max(0, Math.min(1, frac)) * song.duration;
	tell('time');
}

song.onended = () => step(1);
song.onloadedmetadata = () => tell('meta');
song.ontimeupdate = () => paint('time');
song.onpause = () => { if (playing && mode === 'audio' && !song.ended && song.src) { playing = false; tell(); } };   // the phone paused it (a call, the lock screen)
song.onplay = () => { if (!playing && item) { playing = true; tell(); } };

/* the phone's lock screen and headphone buttons */
function media() {
	if (!('mediaSession' in navigator) || !item) return;
	try {
		navigator.mediaSession.metadata = new MediaMetadata({ title: item.title, artist: item.artist || '', album: L('أغانينا', 'Our songs') });
		if (item.cover) mediaURL(item.cover).then((src) => { if (navigator.mediaSession.metadata && item) navigator.mediaSession.metadata.artwork = [{ src, sizes: '512x512' }]; }).catch(() => {});
		navigator.mediaSession.setActionHandler('play', resume);
		navigator.mediaSession.setActionHandler('pause', pause);
		navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
		navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
	} catch { /* older phones */ }
}

/* ---------- the bar ---------- */
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const ICON = {
	play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor"/></svg>',
	pause: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.3" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.3" fill="currentColor"/></svg>',
	prev: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 5v14M18 6v12a.8.8 0 0 1-1.2.7L8.5 12.7a.8.8 0 0 1 0-1.4l8.3-6A.8.8 0 0 1 18 6Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	next: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M18 5v14M6 6v12a.8.8 0 0 0 1.2.7l8.3-6a.8.8 0 0 0 0-1.4l-8.3-6A.8.8 0 0 0 6 6Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
	close: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
};

function mount() {
	if (bar?.isConnected) return;
	bar = document.createElement('div');
	bar.className = 'np';
	bar.id = 'np';
	bar.hidden = true;
	document.body.append(bar);
	draw();
}

/** Draw the bar's words again (the language changed). */
export function redraw() { if (bar?.isConnected) draw(); }

function draw() {
	// in Arabic "back" points right and sits on the right, so the arrows follow the reading direction
	const rtl = App.lang === 'ar';
	bar.setAttribute('role', 'region');
	bar.setAttribute('aria-label', L('الأغنية اللي شغالة', 'Now playing'));
	bar.innerHTML = `
		<div class="np__screen" hidden></div>
		<div class="np__card">
			<div class="np__bar" role="slider" tabindex="0" aria-label="${L('وصلنا لفين في الأغنية', 'Position in the song')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
			<a class="np__song" href="music.html">
				<span class="np__lp" aria-hidden="true"><img alt="" hidden></span>
				<span class="np__words"><b class="np__title" dir="auto"></b><small class="np__artist" dir="auto"></small></span>
			</a>
			<span class="np__time" aria-hidden="true"></span>
			<div class="np__ctrls">
				<button class="np__btn" type="button" data-np="prev" aria-label="${L('اللي قبلها', 'Previous')}">${rtl ? ICON.next : ICON.prev}</button>
				<button class="np__btn np__btn--main" type="button" data-np="toggle"></button>
				<button class="np__btn" type="button" data-np="next" aria-label="${L('اللي بعدها', 'Next')}">${rtl ? ICON.prev : ICON.next}</button>
			</div>
			<button class="np__x" type="button" data-np="close" aria-label="${Y('اقفل', 'اقفلي', 'Close')}" title="${Y('اقفل', 'اقفلي', 'Close')}">${ICON.close}</button>
		</div>`;
	bar.onclick = (e) => {
		const b = e.target.closest('[data-np]');
		if (!b) return;
		({ prev: () => step(-1), next: () => step(1), toggle, close: stop })[b.dataset.np]();
	};
	const track = $('.np__bar', bar);
	const at = (e) => { const r = track.getBoundingClientRect(); const f = (e.clientX - r.left) / r.width; return document.documentElement.dir === 'rtl' ? 1 - f : f; };
	track.onpointerdown = (e) => {
		track.setPointerCapture(e.pointerId);
		seek(at(e));
		track.onpointermove = (m) => seek(at(m));
		track.onpointerup = track.onpointercancel = () => { track.onpointermove = null; };
	};
	track.onkeydown = (e) => {
		const d = { ArrowRight: 5, ArrowLeft: -5 }[e.key];
		if (!d || mode !== 'audio') return;
		e.preventDefault();
		song.currentTime = Math.max(0, song.currentTime + d * (document.documentElement.dir === 'rtl' ? -1 : 1));
	};
	screen(screenHTML);
	paint('change');
}

let screenHTML = '';
function screen(html) {
	screenHTML = html;
	const el = bar && $('.np__screen', bar);
	if (!el) return;
	el.innerHTML = html;
	el.hidden = !html;
}

function paint(what) {
	if (!bar?.isConnected) return;
	const { time, duration } = state();
	const frac = duration ? time / duration : 0;
	$('.np__bar i', bar).style.transform = `scaleX(${frac})`;
	$('.np__bar', bar).setAttribute('aria-valuenow', String(Math.round(frac * 100)));
	$('.np__time', bar).textContent = mode === 'audio' && duration ? `${fmt(time)} / ${fmt(duration)}` : '';
	if (what === 'time') return;

	const show = !!item;
	if (bar.hidden === show) {
		bar.hidden = !show;
		document.body.classList.toggle('has-np', show);
	}
	if (!item) return;
	const [ink, paper] = colours(item);
	bar.style.setProperty('--np-ink', ink);
	bar.style.setProperty('--np-paper', paper);
	bar.classList.toggle('is-playing', playing);
	bar.classList.toggle('is-embed', mode === 'embed');
	const song$ = $('.np__song', bar);
	song$.href = `music.html#${encodeURIComponent(item.id || '')}`;
	song$.setAttribute('aria-label', `${item.title}${item.artist ? ' — ' + item.artist : ''}`);
	$('.np__title', bar).textContent = item.title;
	$('.np__artist', bar).textContent = item.artist || '';
	const img = $('.np__lp img', bar);
	if (img.dataset.for !== item.id) {
		img.dataset.for = item.id;
		img.hidden = true;
		img.removeAttribute('src');
		const x = item;
		if (x.cover) mediaURL(x.cover).then((url) => { if (item === x) { img.src = url; img.hidden = false; } }).catch(() => {});
	}
	const main = $('[data-np="toggle"]', bar);
	main.innerHTML = playing ? ICON.pause : ICON.play;
	main.setAttribute('aria-label', playing ? Y('وقّف', 'وقّفي', 'Pause') : Y('شغّل', 'شغّلي', 'Play'));
	const many = queue.filter(playable).length > 1;
	for (const b of bar.querySelectorAll('[data-np="prev"], [data-np="next"]')) b.disabled = !many;
}
