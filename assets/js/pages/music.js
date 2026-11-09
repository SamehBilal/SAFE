import { L, T, esc, pageHead, related, App, $, $$, longDate, store, REDUCE, mediaURL } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';

/* Our songs on a record player, after Codrops' "Interactive Record Player" (tympanus.net/Development/RecordPlayer):
   the songs are sleeves on a shelf; tap one and its vinyl slides out onto the turntable, the tonearm swings onto
   the record, the platter spins and the arm creeps inward while it plays, over a soft vinyl crackle
   (Vinyl Noise SFX by Chia, free to use). Sound comes from the song's own recording when it has one ("audio": a file in
   private/media, encrypted by the build like the photos), else from its YouTube or Spotify link. */

/* Links we can play right here; anything else opens in its own app. */
export function player(link) {
	const yt = /(?:youtu\.be\/|[?&]v=|shorts\/|embed\/)([\w-]{11})/.exec(link || '');
	if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
	const sp = /open\.spotify\.com\/(?:intl-[\w-]+\/)?(track|album|playlist|episode)\/(\w+)/.exec(link || '');
	if (sp) return `<iframe class="is-spotify" src="https://open.spotify.com/embed/${sp[1]}/${sp[2]}?autoplay=1" title="Spotify" allow="autoplay; encrypted-media; clipboard-write" loading="lazy"></iframe>`;
	return '';
}
const safeLink = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
const searchLink = (x) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${x.title} ${x.artist || ''}`.trim())}`;

/* every song gets its own sleeve colours, the same on both phones */
const PALETTE = [['#c2185b', '#ffd1dc'], ['#0e6990', '#cfe9f5'], ['#e39b2d', '#fff0cf'], ['#5a9e6f', '#dcf1df'], ['#6d4bb3', '#e6dcff'], ['#d9534f', '#ffe0dc'], ['#26706b', '#d2f0ec'], ['#8a5a2b', '#f3e2cc']];
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const colours = (x) => PALETTE[hash(x.id || x.title) % PALETTE.length];

const ARM_REST = 0;
const ARM_START = 21;
const ARM_END = 36;
const CRACKLE = 'us.crackle';

/* the turntable: one drawing, so every part scales together */
function deckSVG() {
	const grooves = Array.from({ length: 21 }, (_, k) => `<circle cx="400" cy="400" r="${330 - k * 10}"/>`).join('');
	return `<svg class="deck__svg" viewBox="0 0 1000 800" role="img" aria-label="${L('جرامافون', 'Record player')}">
		<defs>
			<linearGradient id="dkWood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4a33"/><stop offset=".5" stop-color="#4a3222"/><stop offset="1" stop-color="#2f1f15"/></linearGradient>
			<linearGradient id="dkSheen" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>
			<radialGradient id="dkPlatter"><stop offset=".9" stop-color="#2b2b2e"/><stop offset="1" stop-color="#151517"/></radialGradient>
		</defs>
		<rect x="10" y="10" width="980" height="780" rx="48" fill="url(#dkWood)"/>
		<rect x="10" y="10" width="980" height="780" rx="48" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="6"/>
		<g fill="#000" opacity=".12">${Array.from({ length: 9 }, (_, k) => `<path d="M30 ${90 + k * 80}q240 ${k % 2 ? 14 : -14} 480 0t460 0" stroke="#000" stroke-width="3" fill="none"/>`).join('')}</g>
		<circle cx="400" cy="400" r="352" fill="url(#dkPlatter)"/>
		<g class="deck__lp">
			<circle cx="400" cy="400" r="340" fill="#161618"/>
			<g fill="none" stroke="#0e0e10" stroke-width="2">${grooves}</g>
			<circle class="deck__label" cx="400" cy="400" r="118"/>
			<circle cx="400" cy="400" r="104" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
			<text class="deck__label-t" x="400" y="380" text-anchor="middle"></text>
			<text class="deck__label-a" x="400" y="438" text-anchor="middle"></text>
			<circle cx="400" cy="400" r="9" fill="#d8d8d8"/>
		</g>
		<circle cx="400" cy="400" r="340" fill="url(#dkSheen)" pointer-events="none"/>
		<g class="deck__arm">
			<circle cx="860" cy="140" r="58" fill="#1d1d20" stroke="#000" stroke-opacity=".4" stroke-width="4"/>
			<circle cx="860" cy="140" r="34" fill="#c9c9cf"/>
			<rect x="836" y="40" width="48" height="74" rx="10" fill="#3c3c44"/>
			<path d="M860 140L872 560L842 640" fill="none" stroke="#d9d9de" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M860 140L872 560L842 640" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
			<rect x="814" y="626" width="44" height="58" rx="8" fill="#e8e8ec" transform="rotate(24 836 655)"/>
			<circle cx="860" cy="140" r="12" fill="#77777f"/>
		</g>
		<rect x="905" y="620" width="56" height="130" rx="14" fill="#1d1d20"/>
		<circle class="deck__led" cx="933" cy="660" r="9"/>
		<circle cx="933" cy="712" r="18" fill="#3c3c44"/>
	</svg>`;
}

export default {
	title: { ar: 'أغانينا', en: 'Our songs' },
	render() {
		const ok = live.canWrite();
		return `
		${pageHead(L('أغانينا', 'Our songs'), L('حطوا أي أسطوانة على الجرامافون — كل أغنية هنا ليها حكاية معانا', 'Put any record on the player — every song here has a story with us'), [{ href: 'music.html', ar: 'أغانينا', en: 'Our songs' }])}
		<section class="sec sec--top"><div class="wrap">
			<div class="deck reveal" id="deck">
				<div class="deck__stage">${deckSVG()}</div>
				<div class="deck__side">
					<p class="deck__eyebrow" id="dk-eyebrow"></p>
					<h2 class="deck__title" id="dk-title" dir="auto">${L('اختاروا أسطوانة', 'Pick a record')}</h2>
					<p class="deck__artist" id="dk-artist" dir="auto"></p>
					<p class="deck__note" id="dk-note" dir="auto"></p>
					<div class="deck__ctrls">
						<button class="deck__btn" type="button" id="dk-prev" aria-label="${L('اللي قبلها', 'Previous')}">${doodle(App.lang === 'ar' ? 'forward' : 'back', 22)}</button>
						<button class="deck__btn deck__btn--main" type="button" id="dk-play" aria-label="${L('شغلوا', 'Play')}"><span class="dk-ic-play">▶</span><span class="dk-ic-stop">■</span></button>
						<button class="deck__btn" type="button" id="dk-next" aria-label="${L('اللي بعدها', 'Next')}">${doodle(App.lang === 'ar' ? 'back' : 'forward', 22)}</button>
					</div>
					<label class="check deck__crackle"><input type="checkbox" id="dk-crackle"> ${L('صوت الإبرة على الأسطوانة', 'Needle crackle')}</label>
					<div class="deck__screen" id="dk-screen" hidden></div>
					<a class="btn btn--ghost btn--sm" id="dk-open" target="_blank" rel="noopener noreferrer" hidden>↗ ${L('اسمعوها على يوتيوب', 'Listen on YouTube')}</a>
				</div>
			</div>

			${ok ? '' : `<div class="narrow" style="margin:24px auto 0">${setupNote()}</div>`}
			<details class="composer reveal narrow" style="margin:24px auto 0"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('music', 22)}</span> ${L('ضيفوا أسطوانة', 'Add a record')}</summary>
				<form id="mu-form" autocomplete="off">
					<div class="f-row">
						<label class="f f--grow"><span>${L('اسم الأغنية', 'Song')}</span><input name="song" dir="auto" required maxlength="120"></label>
						<label class="f f--grow"><span>${L('المطرب', 'Artist')}</span><input name="artist" dir="auto" maxlength="80"></label>
					</div>
					<label class="f"><span>${L('اللينك (يوتيوب، سبوتيفاي، أنغامي…)', 'Link (YouTube, Spotify, Anghami…)')}</span><input name="link" type="url" dir="ltr" placeholder="https://"></label>
					<label class="f"><span>${L('بتفكرنا بإيه؟', 'Why is it ours?')}</span><textarea name="note" dir="auto" rows="3" maxlength="400"></textarea></label>
					<label class="f"><span>${L('من إمتى بنسمعها؟ (اختياري)', 'Since when? (optional)')}</span><input name="date" type="date"></label>
					<p class="form-msg" id="mu-msg" role="status"></p>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${L('حطوها على الرف ♥', 'Put it on the shelf ♥')}</button></div>
				</form>
			</details>

			<div class="toolbar" style="margin-top:36px">
				<div class="chips" role="toolbar" aria-label="${L('مين اختارها', 'Picked by')}">
					<button class="chip is-on" type="button" data-by="">${L('الكل', 'All')}</button>
					<button class="chip" type="button" data-by="him">${L('اختيارات', 'Picked by')} ${T(App.story.him)}</button>
					<button class="chip" type="button" data-by="her">${L('اختيارات', 'Picked by')} ${T(App.story.her)}</button>
				</div>
				<button class="btn btn--sm" type="button" id="mu-shuffle">${doodle('shuffle', 18)} ${L('أي أسطوانة', 'Shuffle')}</button>
			</div>
			<ul class="shelf" id="mu-list"><li class="empty">${L('بنجيب الأسطوانات…', 'Fetching the records…')}</li></ul>
		</div></section>
		${related(['draw', 'movies', 'journal'])}`;
	},

	async after(main, s) {
		const list = $('#mu-list', main);
		const deck = $('#deck', main);
		const arm = $('.deck__arm', deck);
		const screen = $('#dk-screen', main);
		const open = $('#dk-open', main);
		const name = (w) => T(w === 'him' ? s.him : s.her);
		let data = { items: [] };
		let by = '';
		let current = null;
		let playing = false;
		let armTimer = 0;

		/* the needle crackle (on unless turned off) */
		const crackle = new Audio('assets/audio/crackle.mp3');
		crackle.loop = true;
		crackle.volume = 0.18;
		/* a song's own recording, decrypted on the phone; the arm crosses the record in the song's own time */
		const song = new Audio();
		song.preload = 'none';
		let asked = 0;
		song.onloadedmetadata = () => { if (playing && isFinite(song.duration)) { clearTimeout(armTimer); armTimer = setTimeout(() => setArm(ARM_END, Math.max(1, song.duration - song.currentTime), 'linear'), REDUCE ? 0 : 950); } };
		song.onended = () => step(1);
		const crackleBox = $('#dk-crackle', main);
		crackleBox.checked = store.get(CRACKLE) !== 'off';
		crackleBox.onchange = () => {
			store.set(CRACKLE, crackleBox.checked ? 'on' : 'off');
			if (playing && crackleBox.checked) crackle.play().catch(() => {});
			else crackle.pause();
		};

		const items = () => (data.items || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
		const shown = () => items().filter((x) => !by || x.by === by);

		const setArm = (deg, seconds = 0.9, ease = 'cubic-bezier(.3,.8,.3,1)') => {
			arm.style.transition = REDUCE ? 'none' : `transform ${seconds}s ${ease}`;
			arm.style.transform = `rotate(${deg}deg)`;
		};

		function load(x, { autoplay = false } = {}) {
			stop();
			current = x;
			const [ink, paper] = colours(x);
			deck.style.setProperty('--lab', ink);
			deck.style.setProperty('--lab-ink', paper);
			$('.deck__label-t', deck).textContent = x.title.length > 18 ? x.title.slice(0, 17) + '…' : x.title;
			$('.deck__label-a', deck).textContent = (x.artist || '').slice(0, 22);
			$('#dk-eyebrow', main).textContent = `${L('اختيار', 'Picked by')} ${App.t(x.by === 'him' ? s.him : s.her)}${x.date ? ` · ${L('من', 'since')} ${longDate(x.date)}` : ''}`;
			$('#dk-title', main).textContent = x.title;
			$('#dk-artist', main).textContent = x.artist || '';
			$('#dk-note', main).textContent = x.note || '';
			const link = safeLink(x.link);
			open.hidden = !!(player(link) || x.audio);
			open.href = link || searchLink(x);
			$$('.sleeve', list).forEach((el) => el.classList.toggle('is-on', el.dataset.id === x.id));
			// the new record drops onto the platter
			deck.classList.remove('is-swapping'); void deck.offsetWidth; deck.classList.add('is-swapping');
			if (autoplay) setTimeout(play, REDUCE ? 0 : 450);
		}

		function play() {
			if (!current) return;
			const embed = player(safeLink(current.link));
			playing = true;
			deck.classList.add('is-playing');
			$('#dk-play', main).setAttribute('aria-label', L('وقفوا', 'Stop'));
			// the arm swings onto the outer groove, then creeps inward as the song plays
			setArm(ARM_START);
			clearTimeout(armTimer);
			armTimer = setTimeout(() => setArm(ARM_END, 240, 'linear'), REDUCE ? 0 : 950);
			if (crackleBox.checked) { crackle.currentTime = 0; crackle.play().catch(() => {}); }
			if (current.audio) {
				const ask = ++asked, x = current;
				if (crackleBox.checked) crackle.volume = 0.07;
				mediaURL(x.audio).then((url) => {
					if (ask !== asked || !playing) return;
					if (song.src !== url) song.src = url;
					return song.play();
				}).catch(() => { if (ask === asked) { stop(); window.open(safeLink(x.link) || searchLink(x), '_blank', 'noopener'); } });
			}
			else if (embed) { screen.innerHTML = embed; screen.hidden = false; }
			else window.open(safeLink(current.link) || searchLink(current), '_blank', 'noopener');
		}

		function stop() {
			playing = false;
			deck.classList.remove('is-playing');
			$('#dk-play', main).setAttribute('aria-label', L('شغلوا', 'Play'));
			clearTimeout(armTimer);
			setArm(ARM_REST, 1.1);
			crackle.pause();
			crackle.volume = 0.18;
			asked++;
			song.pause();
			screen.innerHTML = '';
			screen.hidden = true;
		}

		const step = (dir) => {
			const l = shown();
			if (!l.length) return;
			const i = Math.max(0, l.findIndex((x) => x.id === current?.id));
			load(l[(i + dir + l.length) % l.length], { autoplay: playing });
		};

		const sleeve = (x, n) => {
			const [ink, paper] = colours(x);
			const mine = x.by === live.me() && live.canWrite();
			return `<li class="sleeve reveal" data-id="${esc(x.id)}" style="--ink:${ink};--paper:${paper};--delay:${(n % 4) * 0.05}s">
				<button class="sleeve__btn" type="button" data-play="${esc(x.id)}" aria-label="${L('شغلوا', 'Play')} ${esc(x.title)}">
					<span class="sleeve__lp" aria-hidden="true"><i></i></span>
					<span class="sleeve__cover">
						<span class="sleeve__n">${n}</span>
						<span class="sleeve__art" aria-hidden="true">${doodle('music', 44)}</span>
						<b dir="auto">${esc(x.title)}</b>
						${x.artist ? `<small dir="auto">${esc(x.artist)}</small>` : ''}
					</span>
				</button>
				<p class="sleeve__by">${L('اختيار', 'Picked by')} ${name(x.by)}${mine ? ` · <button class="link link--danger" type="button" data-del="${esc(x.id)}">${L('مسح', 'Delete')}</button>` : ''}</p>
			</li>`;
		};

		const paint = () => {
			const l = shown();
			list.innerHTML = l.length ? l.map((x, k) => sleeve(x, l.length - k)).join('')
				: `<li class="empty">${(data.items || []).length ? L('مفيش أسطوانات هنا لسه', 'No records here yet') : L('الرف فاضي… ضيفوا أول أسطوانة بتاعتكم ♥', 'The shelf is empty… add your first record ♥')}</li>`;
			list.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in'));
			if (current) $$('.sleeve', list).forEach((el) => el.classList.toggle('is-on', el.dataset.id === current.id));
		};

		list.onclick = async (e) => {
			const p = e.target.closest('[data-play]');
			const del = e.target.closest('[data-del]');
			if (p) {
				const x = data.items.find((i) => i.id === p.dataset.play);
				if (!x) return;
				// the record slides out of its sleeve, then onto the turntable
				const li = p.closest('.sleeve');
				li.classList.add('is-out');
				setTimeout(() => li.classList.remove('is-out'), 700);
				load(x, { autoplay: true });
				deck.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
			}
			if (del) {
				if (!confirm(L('تشيلوا الأسطوانة دي من الرف؟', 'Remove this record from the shelf?'))) return;
				try { data = await live.save('music', (d) => { d.items = (d.items || []).filter((i) => i.id !== del.dataset.del); }); if (current?.id === del.dataset.del) stop(); paint(); }
				catch (err) { alert(live.why(err)); }
			}
		};
		$('#dk-play', main).onclick = () => (playing ? stop() : play());
		$('#dk-prev', main).onclick = () => step(-1);
		$('#dk-next', main).onclick = () => step(1);
		$$('.chip', main).forEach((c) => (c.onclick = () => { by = c.dataset.by; $$('.chip', main).forEach((x) => x.classList.toggle('is-on', x === c)); paint(); }));
		$('#mu-shuffle', main).onclick = () => {
			const l = shown();
			if (l.length) load(l[Math.floor(Math.random() * l.length)], { autoplay: true });
		};
		// leaving the page stops the music and the crackle
		addEventListener('pagehide', () => { crackle.pause(); song.pause(); }, { once: true });

		data = await live.load('music');
		paint();
		// today's record waits on the platter (the same one on both phones), unless a song is in the address
		const all = items();
		const wanted = all.find((x) => x.id === location.hash.slice(1));
		if (all.length) {
			const d = new Date();
			load(wanted || all[(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % all.length]);
			$('#dk-eyebrow', main).textContent = (wanted ? '' : L('أسطوانة النهارده · ', 'Today’s record · ')) + $('#dk-eyebrow', main).textContent;
		}

		const form = $('#mu-form', main);
		if (!form) return;
		form.onsubmit = async (e) => {
			e.preventDefault();
			const msg = $('#mu-msg', main);
			const item = { id: live.newId(), title: form.song.value.trim(), artist: form.artist.value.trim(), link: safeLink(form.link.value.trim()), note: form.note.value.trim(), date: form.date.value || undefined, by: live.me(), at: Date.now() };
			if (!item.title) return;
			msg.textContent = L('بنحفظ…', 'Saving…');
			try {
				data = await live.save('music', (d) => { (d.items = d.items || []).push(item); });
				form.reset();
				msg.textContent = L('اتحطت على الرف ♥', 'On the shelf ♥');
				paint();
				load(item);
			} catch (err) { msg.textContent = live.why(err); }
		};
	}
};
