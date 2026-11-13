import { L, Y, T, esc, pageHead, related, App, $, $$, num, mediaURL } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';

/* What we've watched together, laid out like Olivia Ng's «Netflix Binge: Top Stats» (codepen.io/oliviale): one
   poster card per film or series, dropped in scattered spots that overlap a little rather than in rows, with the
   title running up the side, a legend by kind, and our totals. */
export const KINDS = [
	{ id: 'arabic', ar: 'عربي', en: 'Arabic' },
	{ id: 'foreign', ar: 'أجنبي', en: 'Foreign' },
	{ id: 'kids', ar: 'مع الولاد', en: 'With the boys' },
	{ id: 'other', ar: 'تركي، كوري، وغيره', en: 'Turkish, Korean & more' }
];
/* The spots, after the pen's six boxes: [first column, columns wide, first row, nudge sideways %]. Rows are half a
   column tall, so a card 3 columns wide is 9 rows high — a poster's 2:3. Every other group of six is mirrored so
   the pattern never shows; tablets and phones get a zigzag. */
const SPOTS = {
	d: { cols: 12, every: 25, at: [[6, 3, 0, 0], [2, 4, 2, 0], [10, 3, 4, 0], [6, 3, 11, -12], [3, 3, 16, 6], [9, 3, 15, -10]] },
	t: { cols: 6, every: 16, at: [[1, 3, 0, 0], [5, 2, 2, -6], [3, 2, 9, 8], [5, 2, 10, 4]] },
	p: { cols: 2, every: 6, at: [[1, 1, 0, 0], [2, 1, 3, 0]], tall: 6 }
};
const hash = (t) => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function spot(k, id) {
	const out = [];
	const j = hash(id);
	for (const [m, S] of Object.entries(SPOTS)) {
		const g = Math.floor(k / S.at.length);
		let [c, w, r, dx] = S.at[k % S.at.length];
		if (g % 2 && m !== 'p') { c = S.cols + 2 - c - w; dx = -dx; }
		const h = S.tall || w * 3;
		const dy = m === 'p' ? 0 : (j % 7) - 3; // a little up or down, the same every time for the same film
		out.push(`--${m}c:${c} / span ${w};--${m}r:${1 + g * S.every + r} / span ${h};--${m}x:${dx + ((j >> 3) % 5) - 2}%;--${m}y:${dy}%`);
	}
	return out.join(';');
}
const kindName = (id) => { const k = KINDS.find((x) => x.id === id) || KINDS[3]; return L(k.ar, k.en); };

function line(x) {
	const parts = [];
	const yr = (y) => num(y).replace(/[٬,]/g, '');
	if (x.series) {
		if (x.seasons) parts.push(x.seasons === 1 ? L('موسم واحد', 'One season') : L(`${num(x.seasons)} ${x.seasons <= 10 ? 'مواسم' : 'موسم'}`, `${x.seasons} seasons`));
		parts.push(L(`${num(x.eps || 0)} حلقة`, `${x.eps || 0} episodes`));
	} else parts.push(L('فيلم', 'Film'));
	// the year it came out (a series: the years it ran), not when we watched it
	if (x.year) parts.push(x.yearTo && x.yearTo !== x.year ? `${yr(x.year)}–${yr(x.yearTo)}` : yr(x.year));
	if (x.mins) parts.push(L(`${num(x.mins)} دقيقة`, `${x.mins} minutes`));
	let s = parts.join(' // ');
	if (x.days) s += x.days === 1 ? L(' في قعدة واحدة.', ' in one sitting.') : L(` في ${num(x.days)} أيام.`, ` in ${x.days} days.`);
	return s;
}

export default {
	title: { ar: 'اتفرجنا على إيه', en: 'What we’ve watched' },
	render(s) {
		const ok = live.canWrite();
		return `
		${pageHead(L('سهراتنا بالأرقام', 'Our watch stats'), L('كل فيلم ومسلسل اتفرجنا عليه سوا — وكام ساعة من عمرنا راحت فيه ♥', 'Every film and series we watched together — and how many hours of our lives went into it ♥'), [{ href: 'draw.html?k=movie', ar: 'سهرة فيلم', en: 'Movie night' }, { href: 'movies.html', ar: 'اتفرجنا على إيه', en: 'What we’ve watched' }])}
		<section class="sec sec--top"><div class="wrap">
			<div class="counters" id="mv-totals"></div>
			${ok ? '' : `<div class="narrow" style="margin:24px auto 0">${setupNote()}</div>`}
			<details class="composer reveal" style="margin-top:24px"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('popcorn', 22)}</span> ${Y('ضيف حاجة اتفرجنا عليها', 'ضيفي حاجة اتفرجنا عليها', 'Add something we watched')}</summary>
				<form id="mv-form" autocomplete="off">
					<label class="f"><span>${L('الاسم', 'Title')}</span><input name="title" dir="auto" maxlength="80" required></label>
					<div class="f-row">
						<label class="f"><span>${L('نوعه', 'Kind')}</span><select name="kind">${KINDS.map((k) => `<option value="${k.id}">${esc(L(k.ar, k.en))}</option>`).join('')}</select></label>
						<label class="f"><span>${L('فيلم ولا مسلسل؟', 'Film or series?')}</span><select name="series"><option value="">${L('فيلم', 'Film')}</option><option value="1">${L('مسلسل', 'Series')}</option></select></label>
					</div>
					<div class="f-row">
						<label class="f"><span>${L('حلقات', 'Episodes')}</span><input name="eps" type="number" min="1" max="2000" inputmode="numeric"></label>
						<label class="f"><span>${L('دقايق في المجموع', 'Minutes in all')}</span><input name="mins" type="number" min="1" max="100000" inputmode="numeric"></label>
						<label class="f"><span>${L('في كام يوم؟', 'Over how many days?')}</span><input name="days" type="number" min="1" max="3650" inputmode="numeric"></label>
					</div>
					<fieldset class="rate"><legend>${Y('قيّمه', 'قيّميه', 'Rate it')}</legend>${[5, 4, 3, 2, 1].map((h) => `<input type="radio" name="hearts" id="mvh${h}" value="${h}"><label for="mvh${h}">♥</label>`).join('')}</fieldset>
					<label class="f"><span>${L('حاجة عايزين نفتكرها؟', 'Anything to remember?')}</span><input name="note" dir="auto" maxlength="160"></label>
					<p class="form-msg" id="mv-msg" role="status"></p>
					<div class="f-actions"><button class="btn btn--coral" type="submit">${Y('ضيفه ♥', 'ضيفيه ♥', 'Add it ♥')}</button></div>
				</form>
			</details>

			<div class="binge" id="mv-board">
				<h2 class="binge__title">${L('سهراتنا:', 'Binge:')} <br><span>${L('أحلى الأرقام', 'Top stats')}</span><small>${L('لما حد فينا يقول «حلقة كمان وننام»، ', 'When one of us says “one more episode”, ')}<span>${L('ماحدش بيصدق.', 'nobody believes it.')}</span></small></h2>
				<div class="binge__legend">${KINDS.map((k) => `<span><i class="mv--${k.id}"></i>${esc(L(k.ar, k.en))}</span>`).join('')}</div>
				<p class="empty" id="mv-empty">${L('بنجيب السهرات…', 'Fetching our evenings…')}</p>
				<div class="binge__field" id="mv-field"></div>
			</div>

			<div class="games" id="mv-games" hidden>
				<h2 class="sec__title">${L('لعبنا سوا', 'Games we played together')}</h2>
				<p class="sec__sub">${L('مش كل السهرات أفلام — ساعات كانت دراع في إيد كل واحد فينا', 'Not every night was a film — sometimes it was a controller each')}</p>
				<div class="games__grid" id="mv-games-grid"></div>
			</div>
		</div></section>
		${related(['draw', 'music', 'journal'])}`;
	},

	async after(main, s) {
		const board = $('#mv-board', main);
		let data = await live.load('movies');
		const name = (w) => T(w === 'him' ? s.him : s.her);

		const paint = () => {

			const items = (data.items || []).slice().sort((a, b) => (b.mins || 0) - (a.mins || 0));
			$('#mv-empty', main).hidden = !!items.length;
			$('#mv-empty', main).textContent = Y('لسه مسجلناش حاجة — ضيف أول فيلم ♥', 'لسه مسجلناش حاجة — ضيفي أول فيلم ♥', 'Nothing logged yet — add your first film ♥');
			$('#mv-field', main).innerHTML = items.map((x, k) => `
				<article class="binge__box mv--${esc(x.kind || 'other')}${x.cover ? ' has-cover' : ''}" style="--i:${k};${spot(k, x.id || x.title)}" id="${esc(x.id)}">
					${x.cover ? `<img class="binge__poster" data-cover="${esc(x.cover)}" alt="" decoding="async">` : ''}
					<h4 dir="auto">${esc(x.title)}</h4>
					<p>${esc(line(x))}</p>
					${x.hearts ? `<p class="binge__hearts" aria-label="${x.hearts}/5">${'♥'.repeat(x.hearts)}<i>${'♥'.repeat(5 - x.hearts)}</i></p>` : ''}
					${x.note ? `<p class="binge__note" dir="auto">${esc(x.note)}</p>` : ''}
					<p class="binge__by">${x.by ? `${L('اختيار', 'Picked by')} ${name(x.by)}` : ''}${x.by === live.me() && live.canWrite() ? ` · <button class="link" type="button" data-del="${esc(x.id)}">${L('مسح', 'Delete')}</button>` : ''}</p>
				</article>`).join('');

			// the games we played together (movies.json → games)
			const games = (data.games || []).slice().sort((a, b) => (b.year || 0) - (a.year || 0));
			$('#mv-games', main).hidden = !games.length;
			$('#mv-games-grid', main).innerHTML = games.map((g) => `
				<article class="game">
					${g.cover ? `<img class="game__cover" data-cover="${esc(g.cover)}" alt="" decoding="async">` : '<span class="game__pad" aria-hidden="true">🎮</span>'}
					<h3 dir="auto">${esc(g.title)}</h3>
					${g.year ? `<p class="game__year">${num(g.year).replace(/[٬,]/g, '')}</p>` : ''}
					${g.note ? `<p class="game__note" dir="auto">${esc(g.note)}</p>` : ''}
				</article>`).join('');

			// posters and box art (private/media/covers), decrypted like the photos
			for (const im of $$('img[data-cover]', main)) mediaURL(im.dataset.cover).then((url) => { im.src = url; }).catch(() => im.closest('.has-cover')?.classList.remove('has-cover') ?? im.remove());

			// our totals
			const mins = items.reduce((a, x) => a + (+x.mins || 0), 0);
			const eps = items.reduce((a, x) => a + (x.series ? +x.eps || 0 : 0), 0);
			const count = (f) => items.filter(f).length;
			const fav = KINDS.map((k) => [k, count((x) => (x.kind || 'other') === k.id)]).sort((a, b) => b[1] - a[1])[0];
			const him = count((x) => x.by === 'him'), her = count((x) => x.by === 'her');
			$('#mv-totals', main).innerHTML = [
				[num(Math.round(mins / 60)), L('ساعة اتفرجنا سوا', 'hours watched together')],
				[num(items.length), L('فيلم ومسلسل', 'films & series')],
				[num(eps), L('حلقة', 'episodes')],
				[fav && fav[1] ? esc(L(fav[0].ar, fav[0].en)) : '–', L('أكتر نوع بنحبه', 'our favourite kind')],
				[him === her ? doodle('handshake', 34) : name(him > her ? 'him' : 'her'), L('مين بيختار أكتر', 'who picks more')]
			].map(([n, l]) => `<div class="counter"><b>${n}</b><span>${l}</span></div>`).join('');
		};
		paint();

		board.onclick = async (e) => {
			const del = e.target.closest('[data-del]');
			if (!del || !confirm(Y('تمسحه من القايمة؟', 'تمسحيه من القايمة؟', 'Remove it from the list?'))) return;
			try { data = await live.save('movies', (d) => { d.items = (d.items || []).filter((x) => x.id !== del.dataset.del); }); paint(); }
			catch (err) { alert(live.why(err)); }
		};

		const form = $('#mv-form', main);
		if (!form) return;
		form.onsubmit = async (e) => {
			e.preventDefault();
			const msg = $('#mv-msg', main);
			const n = (v) => (v ? Math.max(0, Math.round(+v)) : undefined);
			const item = { id: live.newId(), title: form.title.value.trim(), kind: form.kind.value, series: !!form.series.value, eps: n(form.eps.value), mins: n(form.mins.value), days: n(form.days.value), hearts: n(form.hearts.value), note: form.note.value.trim() || undefined, by: live.me(), at: Date.now() };
			if (!item.title) return;
			msg.textContent = L('بنحفظ…', 'Saving…');
			try {
				data = await live.save('movies', (d) => { (d.items = d.items || []).push(item); });
				form.reset();
				msg.textContent = L('اتضاف ♥', 'Added ♥');
				paint();
				$('#' + item.id, board)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			} catch (err) { msg.textContent = live.why(err); }
		};
	}
};
