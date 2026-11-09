import { L, T, esc, pageHead, related, App, $, $$, longDate } from '../shell.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';

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

export default {
	title: { ar: 'أغانينا', en: 'Our songs' },
	render() {
		const ok = live.canWrite();
		return `
		${pageHead(L('أغانينا', 'Our songs'), L('كل أغنية هنا ليها حكاية معانا', 'Every song here has a story with us'), [{ href: 'music.html', ar: 'أغانينا', en: 'Our songs' }])}
		<section class="sec sec--top"><div class="wrap narrow">
			<div class="sotd reveal" id="sotd"></div>
			${ok ? '' : setupNote()}
			<details class="composer reveal"${ok ? '' : ' hidden'}>
				<summary><span>🎵</span> ${L('ضيفوا أغنية', 'Add a song')}</summary>
				<form id="mu-form" autocomplete="off">
					<div class="f-row">
						<label class="f f--grow"><span>${L('اسم الأغنية', 'Song')}</span><input name="song" dir="auto" required maxlength="120"></label>
						<label class="f f--grow"><span>${L('المطرب', 'Artist')}</span><input name="artist" dir="auto" maxlength="80"></label>
					</div>
					<label class="f"><span>${L('اللينك (يوتيوب، سبوتيفاي، أنغامي…)', 'Link (YouTube, Spotify, Anghami…)')}</span><input name="link" type="url" dir="ltr" placeholder="https://"></label>
					<label class="f"><span>${L('بتفكرنا بإيه؟', 'Why is it ours?')}</span><textarea name="note" dir="auto" rows="3" maxlength="400"></textarea></label>
					<label class="f"><span>${L('من إمتى بنسمعها؟ (اختياري)', 'Since when? (optional)')}</span><input name="date" type="date"></label>
					<p class="form-msg" id="mu-msg" role="status"></p>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${L('ضيفوها للقايمة ♥', 'Add to our list ♥')}</button></div>
				</form>
			</details>
			<div class="toolbar">
				<div class="chips" role="toolbar" aria-label="${L('مين اختارها', 'Picked by')}">
					<button class="chip is-on" type="button" data-by="">${L('الكل', 'All')}</button>
					<button class="chip" type="button" data-by="him">${L('اختيارات', 'Picked by')} ${T(App.story.him)}</button>
					<button class="chip" type="button" data-by="her">${L('اختيارات', 'Picked by')} ${T(App.story.her)}</button>
				</div>
				<button class="btn btn--sm" type="button" id="mu-shuffle">🔀 ${L('شغلوا أي أغنية', 'Shuffle')}</button>
			</div>
			<ol class="songs" id="mu-list"><li class="empty">${L('بنجيب الأغاني…', 'Fetching the songs…')}</li></ol>
		</div></section>
		${related(['draw', 'journal', 'notes'])}`;
	},

	async after(main, s) {
		const list = $('#mu-list', main);
		let data = { items: [] };
		let by = '';
		const name = (w) => T(w === 'him' ? s.him : s.her);

		const card = (x, n) => {
			const link = safeLink(x.link);
			const playable = !!player(link);
			return `<li class="song" id="${esc(x.id)}">
				<span class="song__n">${n}</span>
				<div class="song__body">
					<b dir="auto">${esc(x.title)}</b>${x.artist ? `<small dir="auto">${esc(x.artist)}</small>` : ''}
					${x.note ? `<p dir="auto">${esc(x.note)}</p>` : ''}
					<em>${L('اختارها', 'Picked by')} ${name(x.by)}${x.date ? ` · ${L('من', 'since')} ${longDate(x.date)}` : ''}</em>
					<div class="song__player" hidden></div>
				</div>
				<div class="song__acts">
					${playable ? `<button type="button" class="play" data-play="${esc(x.id)}" aria-label="${L('شغلوا', 'Play')}">▶</button>` : `<a class="play" href="${esc(link || searchLink(x))}" target="_blank" rel="noopener noreferrer" aria-label="${L('افتحوا', 'Open')}">↗</a>`}
					${x.by === live.me() && live.canWrite() ? `<button type="button" class="link link--danger" data-del="${esc(x.id)}">${L('مسح', 'Delete')}</button>` : ''}
				</div>
			</li>`;
		};

		const paint = () => {
			const all = (data.items || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
			const items = all.filter((x) => !by || x.by === by);
			list.innerHTML = items.length ? items.map((x, k) => card(x, items.length - k)).join('') : `<li class="empty">${all.length ? L('مفيش أغاني هنا لسه', 'No songs here yet') : L('القايمة فاضية… ضيفوا أول أغنية بتاعتكم ♥', 'The list is empty… add your first song ♥')}</li>`;
			// one song a day, the same on both phones
			const sotd = $('#sotd', main);
			if (all.length) {
				const d = new Date();
				const x = all[(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % all.length];
				const link = safeLink(x.link);
				sotd.innerHTML = `<small>${L('أغنية النهارده', 'Song of the day')}</small><b dir="auto">${esc(x.title)}</b>${x.artist ? `<span dir="auto">${esc(x.artist)}</span>` : ''}${x.note ? `<p dir="auto">${esc(x.note)}</p>` : ''}
					${player(link) ? `<button type="button" class="btn btn--light btn--sm" data-play="${esc(x.id)}">▶ ${L('شغلوها', 'Play it')}</button><div class="song__player" hidden></div>` : `<a class="btn btn--light btn--sm" href="${esc(link || searchLink(x))}" target="_blank" rel="noopener noreferrer">↗ ${L('اسمعوها', 'Listen')}</a>`}`;
				sotd.hidden = false;
			} else sotd.hidden = true;
		};

		const play = (id, scope) => {
			const x = data.items.find((i) => i.id === id);
			const box = $('.song__player', scope);
			if (!x || !box) return;
			$$('.song__player', main).forEach((b) => { if (b !== box) { b.hidden = true; b.innerHTML = ''; } });
			box.hidden = !box.hidden;
			box.innerHTML = box.hidden ? '' : player(safeLink(x.link));
		};

		main.onclick = async (e) => {
			const p = e.target.closest('[data-play]');
			const del = e.target.closest('[data-del]');
			if (p) play(p.dataset.play, p.closest('.song, .sotd'));
			if (del) {
				if (!confirm(L('تشيلوا الأغنية دي من القايمة؟', 'Remove this song from the list?'))) return;
				try { data = await live.save('music', (d) => { d.items = (d.items || []).filter((i) => i.id !== del.dataset.del); }); paint(); }
				catch (err) { alert(live.why(err)); }
			}
		};
		$$('.chip', main).forEach((c) => (c.onclick = () => { by = c.dataset.by; $$('.chip', main).forEach((x) => x.classList.toggle('is-on', x === c)); paint(); }));
		$('#mu-shuffle', main).onclick = () => {
			const items = $$('.song', list);
			if (!items.length) return;
			const li = items[Math.floor(Math.random() * items.length)];
			li.scrollIntoView({ behavior: 'smooth', block: 'center' });
			li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash');
			const b = $('[data-play]', li);
			if (b) play(b.dataset.play, li); else $('a.play', li)?.focus();
		};

		data = await live.load('music');
		paint();

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
				msg.textContent = L('اتضافت ♥', 'Added ♥');
				paint();
			} catch (err) { msg.textContent = live.why(err); }
		};
	}
};
