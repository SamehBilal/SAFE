import { L, Y, esc, pageHead, related, App, $, $$, num, longDate } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';

/* Our games: every game night — cards, dominoes, backgammon, PlayStation — who won, and the score that matters: who's
   ahead this year. Above the title a hand of cards fans out and is dealt while a die tumbles, the year's score between
   the two of us in the middle. */

const IDEAS = [['كوتشينة', 'Cards'], ['دومينو', 'Dominoes'], ['طاولة', 'Backgammon'], ['شطرنج', 'Chess'], ['أونو', 'UNO'], ['بنك الحظ', 'Monopoly'], ['سكرابل', 'Scrabble'], ['بلايستيشن', 'PlayStation'], ['فيفا', 'FIFA'], ['بازل', 'Puzzle'], ['كلمات متقاطعة', 'Crossword']];
const CARDS = [['A', '♥'], ['K', '♠'], ['Q', '♦'], ['J', '♣'], ['10', '♥']];
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

export default {
	title: { ar: 'ألعابنا', en: 'Our games' },
	render(s) {
		const ok = live.canWrite();
		const kids = (s.family?.members || []).filter((m) => m.kid);
		const players = [['him', App.t(s.him)], ['her', App.t(s.her)], ...kids.map((k) => [k.id, App.t(k.name)])];
		return `
		${pageHead(L('ألعابنا', 'Our games'), L('كل سهرة لعب، ومين كسب… ومين بيقول «الدور الجاي هكسب»', 'Every game night, who won… and who keeps saying “next time”'), [{ href: 'games.html', ar: 'ألعابنا', en: 'Our games' }], {
			band: `<div class="gm-band" id="gm-band">
				<div class="gm-hand" aria-hidden="true">${CARDS.map(([r, s2], i) => `<span class="gm-card${'♥♦'.includes(s2) ? ' is-red' : ''}" style="--i:${i - 2}"><b>${r}</b><i>${s2}</i><b class="gm-card__b">${r}</b></span>`).join('')}</div>
				<div class="gm-score" id="gm-score"></div>
				<span class="gm-die" id="gm-die" aria-hidden="true"></span>
			</div>`
		})}
		<section class="sec sec--top"><div class="wrap">
			${ok ? '' : `<div class="narrow" style="margin:0 auto 24px">${setupNote()}</div>`}
			<details class="composer"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('dice', 22)}</span> ${Y('سجّل دور', 'سجّلي دور', 'Log a game')}</summary>
				<form id="gm-form" autocomplete="off">
					<div class="f-row">
						<label class="f f--grow"><span>${L('اللعبة', 'Game')}</span><input name="game" dir="auto" maxlength="40" required list="gm-ideas"></label>
						<label class="f"><span>${L('إمتى؟', 'When?')}</span><input name="date" type="date"></label>
					</div>
					<datalist id="gm-ideas">${IDEAS.map(([ar, en]) => `<option value="${esc(L(ar, en))}">`).join('')}</datalist>
					<fieldset class="gm-who"><legend>${L('مين كسب؟', 'Who won?')}</legend>${players.map(([id, n], i) => `<label><input type="radio" name="winner" value="${esc(id)}"${i === 0 ? ' checked' : ''}><span>${esc(n)}</span></label>`).join('')}<label><input type="radio" name="winner" value="draw"><span>${L('تعادل', 'A draw')}</span></label></fieldset>
					<div class="f-row">
						<label class="f"><span>${L('النتيجة (اختياري)', 'Score (optional)')}</span><input name="score" dir="ltr" maxlength="20" placeholder="51 – 38"></label>
						<label class="f f--grow"><span>${L('حصل إيه؟ (اختياري)', 'What happened? (optional)')}</span><input name="note" dir="auto" maxlength="120"></label>
					</div>
					<p class="form-msg" id="gm-msg" role="status"></p>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${L('سجّل ♥', 'Log it ♥')}</button></div>
				</form>
			</details>
			<div class="chips" id="gm-years" role="toolbar" aria-label="${L('السنة', 'Year')}"></div>
			<div class="counters gm-board" id="gm-board"></div>
			<h2 class="sec__title">${L('كل لعبة', 'Each game')}</h2>
			<div class="gm-games" id="gm-games"></div>
			<h2 class="sec__title">${L('آخر السهرات', 'Latest game nights')}</h2>
			<ul class="gm-log" id="gm-log"></ul>
		</div></section>
		${related(['draw', 'movies', 'chores'])}`;
	},

	async after(main, s) {
		const kids = (s.family?.members || []).filter((m) => m.kid);
		const nameOf = (id) => (id === 'him' ? App.t(s.him) : id === 'her' ? App.t(s.her) : id === 'draw' ? L('تعادل', 'Draw') : App.t(kids.find((k) => k.id === id)?.name || ''));
		const players = ['him', 'her', ...kids.map((k) => k.id)];
		let data = await live.load('games');
		const thisYear = new Date().getFullYear();
		let year = thisYear;
		const yearOf = (g) => +String(g.date || '').slice(0, 4) || thisYear;
		const yt = (y) => (App.lang === 'ar' ? num(y).replace(/[٬,]/g, '') : String(y));

		/* the die: a new face every roll */
		const die = $('#gm-die', main);
		const face = (n) => { die.innerHTML = Array.from({ length: 9 }, (_, i) => `<i${PIPS[n].includes(i + 1) ? ' class="on"' : ''}></i>`).join(''); };
		face(6);
		const roll = setInterval(() => { if (!document.hidden) face(1 + Math.floor(Math.random() * 6)); }, 2400);
		this.leave = () => clearInterval(roll);

		const paint = () => {
			const all = (data.items || []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (b.at || 0) - (a.at || 0));
			const years = [...new Set([thisYear, ...all.map(yearOf)])].sort((a, b) => b - a);
			$('#gm-years', main).innerHTML = [...years.map((y) => `<button class="chip${y === year ? ' is-on' : ''}" type="button" data-year="${y}">${yt(y)}</button>`), `<button class="chip${year === 0 ? ' is-on' : ''}" type="button" data-year="0">${L('من الأول', 'All time')}</button>`].join('');
			const inYear = all.filter((g) => !year || yearOf(g) === year);
			const wins = (id, list = inYear) => list.filter((g) => g.winner === id).length;

			/* the band's scoreboard: the two of us, this year */
			const yh = all.filter((g) => yearOf(g) === thisYear);
			$('#gm-score', main).innerHTML = `<span class="gm-score__p"><b>${num(wins('him', yh))}</b><small>${esc(App.t(s.him))}</small></span><i>—</i><span class="gm-score__p"><b>${num(wins('her', yh))}</b><small>${esc(App.t(s.her))}</small></span><em>${L(`سنة ${yt(thisYear)}`, String(thisYear))}</em>`;

			/* who's ahead */
			const lead = Math.max(0, ...players.map((p) => wins(p)));
			$('#gm-board', main).innerHTML = players.map((p) => `<div class="counter${lead && wins(p) === lead ? ' is-lead' : ''}">${lead && wins(p) === lead ? `<i class="gm-crown" aria-hidden="true">♛</i>` : ''}<b>${num(wins(p))}</b><span>${esc(nameOf(p))}</span></div>`).join('') + `<div class="counter"><b>${num(inYear.length)}</b><span>${L('دور', inYear.length === 1 ? 'game' : 'games')}</span></div>`;

			/* each game */
			const games = [...new Set(inYear.map((g) => g.game))];
			$('#gm-games', main).innerHTML = games.map((name, i) => {
				const list = inYear.filter((g) => g.game === name);
				return `<article class="gm-game" style="--r:${[-1.5, 1, -0.8, 1.6][i % 4]}deg">
					<h3 dir="auto">${esc(name)}</h3>
					<p class="gm-game__n">${num(list.length)} ${L(list.length === 1 ? 'مرة' : 'مرات', list.length === 1 ? 'time' : 'times')} · ${L('آخر مرة', 'last')} ${esc(longDate(list[0].date || ''))}</p>
					<ul>${players.filter((p) => wins(p, list)).sort((a, b) => wins(b, list) - wins(a, list)).map((p) => `<li><span>${esc(nameOf(p))}</span><b>${'●'.repeat(Math.min(10, wins(p, list)))}${wins(p, list) > 10 ? '+' : ''}</b><em>${num(wins(p, list))}</em></li>`).join('')}</ul>
				</article>`;
			}).join('') || `<p class="empty">${L('لسه ماسجلناش ولا دور', 'No games logged yet')}</p>`;

			/* the latest nights */
			$('#gm-log', main).innerHTML = inYear.slice(0, 30).map((g) => `
				<li><span class="gm-log__d">${esc(longDate(g.date || ''))}</span><b dir="auto">${esc(g.game)}</b>
					<span class="gm-log__w">${g.winner === 'draw' ? L('تعادل', 'A draw') : `${doodle('star', 14)} ${esc(nameOf(g.winner))}`}</span>
					${g.score ? `<span class="gm-log__s" dir="ltr">${esc(g.score)}</span>` : ''}${g.note ? `<small dir="auto">${esc(g.note)}</small>` : ''}
					${g.by === live.me() && live.canWrite() ? `<button class="link link--danger" type="button" data-del="${esc(g.id)}">✕</button>` : ''}</li>`).join('') || `<li class="empty">${L('السهرة الجاية هتتسجل هنا', 'The next game night goes here')}</li>`;
		};

		$('#gm-years', main).addEventListener('click', (e) => { const c = e.target.closest('[data-year]'); if (c) { year = +c.dataset.year; paint(); } });
		$('#gm-log', main).addEventListener('click', async (e) => {
			const del = e.target.closest('[data-del]');
			if (!del || !confirm(Y('تمسح الدور ده؟', 'تمسحي الدور ده؟', 'Delete this game?'))) return;
			try { data = await live.save('games', (d) => { d.items = (d.items || []).filter((x) => x.id !== del.dataset.del); }); paint(); } catch (err) { alert(live.why(err)); }
		});
		const f = $('#gm-form', main);
		f.onsubmit = async (e) => {
			e.preventDefault();
			const msg = $('#gm-msg', main);
			const g = { id: live.newId(), game: f.game.value.trim(), date: f.date.value || live.today(), winner: f.winner.value, score: f.score.value.trim() || undefined, note: f.note.value.trim() || undefined, by: live.me(), at: Date.now() };
			if (!g.game) return;
			try { data = await live.save('games', (d) => { (d.items = d.items || []).push(g); }); year = yearOf(g); f.reset(); msg.textContent = L('اتسجل ♥', 'Logged ♥'); paint(); } catch (err) { msg.textContent = live.why(err); }
		};
		paint();
	}
};
