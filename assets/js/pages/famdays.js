import { L, Y, esc, pageHead, related, App, $, $$, num, longDate } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';
import { today, daysTo, nextMD, inDays } from '../occ.js';

/* The wider family's days: parents, brothers and sisters on both sides — birthdays, wedding anniversaries, and any
   other day worth remembering. Above the title a string of bunting with everyone's names sways in the breeze, the
   flag of whoever is next lifted up with how long is left. Names come from the family tree; dates are added here. */

const TYPES = [
	{ id: 'birthday', icon: 'cake', ar: 'عيد ميلاد', en: 'Birthday' },
	{ id: 'wedding', icon: 'ring', ar: 'عيد جواز', en: 'Wedding anniversary' },
	{ id: 'other', icon: 'star', ar: 'يوم تاني نفتكره', en: 'Another day to remember' }
];
const FLAGS = ['#f2726f', '#ffc94a', '#8fd1ef', '#b9e08a', '#c779d0', '#feac5e'];
const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[2];
const title = (f) => (f.type === 'birthday' ? L(`عيد ميلاد ${f.name}`, `${f.name}’s birthday`) : f.type === 'wedding' ? L(`عيد جواز ${f.name}`, `${f.name}’s anniversary`) : f.name);

export default {
	title: { ar: 'مناسبات العيلة', en: 'Family occasions' },
	render() {
		const ok = live.canWrite();
		return `
		${pageHead(L('مناسبات العيلة', 'Family occasions'), L('أعياد ميلاد وأعياد جواز العيلة كلها، عشان محدش يتنسي', 'The whole family’s birthdays and anniversaries, so nobody is forgotten'), [{ href: 'famdays.html', ar: 'مناسبات العيلة', en: 'Family occasions' }], {
			band: `<div class="fd-band" id="fd-band"></div>`
		})}
		<section class="sec sec--top"><div class="wrap">
			${ok ? '' : `<div class="narrow" style="margin:0 auto 24px">${setupNote()}</div>`}
			<details class="composer reveal narrow" style="margin:0 auto 30px"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('family', 22)}</span> ${Y('ضيف مناسبة', 'ضيفي مناسبة', 'Add an occasion')}</summary>
				<form id="fd-form" autocomplete="off">
					<div class="f-row">
						<label class="f f--grow"><span>${L('مين؟', 'Who?')}</span><input name="name" dir="auto" maxlength="60" required list="fd-names" placeholder="${L('ماما، خالي أحمد…', 'Mum, uncle Ahmed…')}"></label>
						<label class="f f--grow"><span>${L('قرايبنا إزاي؟ (اختياري)', 'How are they family? (optional)')}</span><input name="rel" dir="auto" maxlength="40" placeholder="${L('أم سامح، أخت إسراء…', 'Sameh’s mother, Esraa’s sister…')}"></label>
					</div>
					<datalist id="fd-names"></datalist>
					<div class="f-row">
						<label class="f"><span>${L('المناسبة', 'Occasion')}</span><select name="type">${TYPES.map((t) => `<option value="${t.id}">${esc(L(t.ar, t.en))}</option>`).join('')}</select></label>
						<label class="f"><span>${L('اليوم', 'Date')}</span><input name="date" type="date" required></label>
					</div>
					<label class="check"><input type="checkbox" name="noYear"> ${L('مش عارفين السنة (المهم اليوم والشهر)', 'We don’t know the year (just the day and month)')}</label>
					<label class="f"><span>${L('ملاحظة (اختياري)', 'A note (optional)')}</span><input name="note" dir="auto" maxlength="120" placeholder="${L('بيحب الشوكولاتة…', 'Loves chocolate…')}"></label>
					<p class="form-msg" id="fd-msg" role="status"></p>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${Y('افتكرها ♥', 'افتكريها ♥', 'Remember it ♥')}</button></div>
				</form>
			</details>
			<div class="fd-list" id="fd-list"></div>
		</div></section>
		${related(['calendar', 'family', 'birthday'])}`;
	},

	async after(main) {
		let data = await live.load('famdays');
		const tree = await live.load('tree').catch(() => ({ items: [] }));
		$('#fd-names', main).innerHTML = [...new Set((tree.items || []).map((p) => p.name).filter(Boolean))].map((n) => `<option value="${esc(n)}">`).join('');

		const paint = () => {
			const items = (data.items || []).map((f) => ({ ...f, next: nextMD(f.date) })).sort((a, b) => a.next - b.next);
			/* the bunting: one flag per person, the next one lifted */
			const names = [...new Set([...items.map((f) => f.name), ...(tree.items || []).map((p) => p.name)].filter(Boolean))].slice(0, 14);
			const named = names.length ? names : [L('ماما', 'Mum'), L('بابا', 'Dad'), L('أخويا', 'Brother'), L('أختي', 'Sister'), L('خالتو', 'Auntie'), L('عمو', 'Uncle')];
			// always a full string of flags: the names spread along it, plain flags in between
			const n = Math.max(11, named.length);
			const flags = Array(n).fill('');
			named.forEach((name, j) => { flags[Math.min(n - 1, Math.floor(((j + 0.5) * n) / named.length))] = name; });
			const nextOne = items[0];
			const W = 1000;
			// the string is a curve from (0,26) through (W/2,146) to (W,26): where it is at x
			const sag = (x) => { const t = x / W; return (1 - t) * (1 - t) * 26 + 2 * (1 - t) * t * 146 + t * t * 26; };
			$('#fd-band', main).innerHTML = `
				<svg class="fd-svg" viewBox="0 0 ${W} 230" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
					<path class="fd-string" d="M0 26Q${W / 2} 146 ${W} 26"/>
					${flags.map((name, i) => {
						const x = ((i + 0.5) / n) * W, y = sag(x) - 1, on = nextOne && name === nextOne.name;
						const w = Math.min(70, (W / n) * 0.82), h = w * 1.25;
						return `<g class="fd-flag${on ? ' is-next' : ''}" style="--d:${(i % 5) * -0.4}s;--c:${FLAGS[i % FLAGS.length]}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
							<g class="fd-flag__sw"><path d="M${-w / 2} 0H${w / 2}L0 ${h}Z"/>${name ? `<text y="${h * 0.36}" font-size="${Math.min(15, (w / Math.max(name.length, 3)) * 1.7).toFixed(1)}">${esc(name)}</text>` : `<circle cy="${h * 0.34}" r="${w * 0.09}" class="fd-dot"/>`}</g></g>`;
					}).join('')}
				</svg>
				${nextOne ? `<p class="fd-next">${doodle(typeOf(nextOne.type).icon, 20)} <b>${esc(title(nextOne))}</b> <em>${esc(inDays(daysTo(nextOne.next)))}</em></p>` : `<p class="fd-next">${Y('ضيف أول مناسبة تحت، وهتظهر هنا', 'ضيفي أول مناسبة تحت، وهتظهر هنا', 'Add the first occasion below and it will show here')}</p>`}`;

			/* the list */
			$('#fd-list', main).innerHTML = items.length ? items.map((f, i) => {
				const t = typeOf(f.type), dd = daysTo(f.next);
				const yrs = f.noYear ? 0 : f.next.getFullYear() - +String(f.date).slice(0, 4);
				return `<article class="fd-card reveal is-in${dd === 0 ? ' is-today' : ''}" style="--c:${FLAGS[i % FLAGS.length]}">
					<span class="fd-card__ic" aria-hidden="true">${doodle(t.icon, 30)}</span>
					<div class="fd-card__tx">
						<h3 dir="auto">${esc(title(f))}</h3>
						<p>${[f.rel, longDate(f.date).replace(f.noYear ? /\s*\S+$/ : /$^/, '')].filter(Boolean).map(esc).join(' · ')}</p>
						${yrs > 0 ? `<p class="fd-card__yrs">${f.type === 'wedding' ? L(`${num(yrs)} سنة جواز`, `${yrs} years married`) : f.type === 'birthday' ? (f.late ? (f.female ? L(`كانت هتكمّل ${num(yrs)}`, `would have turned ${yrs}`) : L(`كان هيكمّل ${num(yrs)}`, `would have turned ${yrs}`)) : L(`هيكمّل ${num(yrs)}`, `turning ${yrs}`)) : L(`${num(yrs)} سنة`, `${yrs} years`)}</p>` : ''}
						${f.note ? `<p class="fd-card__note" dir="auto">${esc(f.note)}</p>` : ''}
					</div>
					<em class="fd-card__in">${esc(inDays(dd))}</em>
					${f.by === live.me() && live.canWrite() ? `<button class="link link--danger fd-card__del" type="button" data-del="${esc(f.id)}">${L('مسح', 'Delete')}</button>` : ''}
				</article>`;
			}).join('') : `<p class="empty">${L('لسه مفيش مناسبات — ابدأوا بعيد ميلاد ماما ♥', 'No occasions yet — start with Mum’s birthday ♥')}</p>`;
		};

		$('#fd-list', main).addEventListener('click', async (e) => {
			const del = e.target.closest('[data-del]');
			if (!del || !confirm(Y('تمسح المناسبة دي؟', 'تمسحي المناسبة دي؟', 'Delete this occasion?'))) return;
			try { data = await live.save('famdays', (d) => { d.items = (d.items || []).filter((x) => x.id !== del.dataset.del); }); paint(); } catch (err) { alert(live.why(err)); }
		});
		const form = $('#fd-form', main);
		form.onsubmit = async (e) => {
			e.preventDefault();
			const msg = $('#fd-msg', main);
			const f = { id: live.newId(), name: form.name.value.trim(), rel: form.rel.value.trim() || undefined, type: form.type.value, date: form.date.value, noYear: form.noYear.checked || undefined, note: form.note.value.trim() || undefined, by: live.me(), at: Date.now() };
			if (!f.name || !f.date) return;
			try { data = await live.save('famdays', (d) => { (d.items = d.items || []).push(f); }); form.reset(); msg.textContent = L('اتحفظت ♥', 'Saved ♥'); paint(); } catch (err) { msg.textContent = live.why(err); }
		};
		paint();
	}
};
