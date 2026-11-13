import { L, Y, esc, pageHead, related, App, $, num, longDate } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';
import { shrinkPhoto } from './trips.js';
import { today, parse, iso } from '../occ.js';

/* The boys' time capsule: letters (and a photo) we write them now, sealed until a day we choose — when they turn 18,
   say. Above the title an hourglass runs beside the jar of sealed letters, counting down to the next one to open.
   A letter stays an envelope with a wax seal until its day; then it opens on the page. (Like everything here it's
   kept encrypted; the seal is the page's promise not to show it early.) */

const AGES = [10, 13, 16, 18, 21, 25];
const SEALS = ['#c2185b', '#0e6990', '#5a9e6f', '#6d4bb3'];

/* «٨ سنين و٣ شهور» — the time left, in the biggest two units */
function left(to) {
	const a = today();
	let y = to.getFullYear() - a.getFullYear(), m = to.getMonth() - a.getMonth(), d = to.getDate() - a.getDate();
	if (d < 0) { m--; d += new Date(to.getFullYear(), to.getMonth(), 0).getDate(); }
	if (m < 0) { y--; m += 12; }
	const ar = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : `${num(n)} ${n <= 10 ? few : many}`);
	const parts = App.lang === 'ar'
		? [y && ar(y, 'سنة', 'سنتين', 'سنين', 'سنة'), m && ar(m, 'شهر', 'شهرين', 'شهور', 'شهر'), !y && d && ar(d, 'يوم', 'يومين', 'أيام', 'يوم')]
		: [y && `${y} year${y > 1 ? 's' : ''}`, m && `${m} month${m > 1 ? 's' : ''}`, !y && d && `${d} day${d > 1 ? 's' : ''}`];
	return parts.filter(Boolean).slice(0, 2).join(App.lang === 'ar' ? ' و' : ' and ') || L('النهارده', 'today');
}

export default {
	title: { ar: 'كبسولة زمنية للولاد', en: 'The boys’ time capsule' },
	render(s) {
		const ok = live.canWrite();
		const kids = (s.family?.members || []).filter((m) => m.kid);
		return `
		${pageHead(L('كبسولة زمنية للولاد', 'The boys’ time capsule'), L('جوابات بنكتبها لهم النهارده… ويفتحوها لما يكبروا', 'Letters we write them today… to open when they’re grown'), [{ href: 'capsule.html', ar: 'كبسولة زمنية للولاد', en: 'The boys’ time capsule' }], {
			band: `<div class="cp-band" id="cp-band">
				<div class="cp-scene" aria-hidden="true">
					<svg class="cp-glass" viewBox="0 0 120 200">
						<path class="cp-ink" d="M14 8h92M14 192h92" />
						<clipPath id="cp-top"><path d="M24 14h72c0 40-30 56-34 86h-4c-4-30-34-46-34-86Z"/></clipPath>
						<clipPath id="cp-bot"><path d="M58 100h4c4 30 34 46 34 86H24c0-40 30-56 34-86Z"/></clipPath>
						<g clip-path="url(#cp-top)"><rect class="cp-sand cp-sand--top" x="20" y="14" width="80" height="90"/></g>
						<g clip-path="url(#cp-bot)"><rect class="cp-sand cp-sand--bot" x="20" y="100" width="80" height="90"/></g>
						<path class="cp-stream" d="M60 98v86"/>
						<path class="cp-ink" d="M24 14h72c0 40-30 56-34 86 4 30 34 46 34 86H24c0-40 30-56 34-86-4-30-34-46-34-86Z" fill="none"/>
						<path class="cp-ink" d="M18 8v184M102 8v184" opacity=".6"/>
					</svg>
					<div class="cp-jar">
						<svg viewBox="0 0 140 170">
							<path class="cp-ink" d="M38 10h64v18H38Z" fill="#d9b48a"/>
							<path class="cp-ink cp-jar__glass" d="M30 30h80c10 10 14 22 14 40v74c0 10-8 18-18 18H34c-10 0-18-8-18-18V70c0-18 4-30 14-40Z"/>
							<g class="cp-env" transform="translate(36 96) rotate(-8)"><path class="cp-ink" d="M0 0h50v32H0Z" fill="#fffdf8"/><path class="cp-ink" d="M0 0l25 18L50 0" fill="none"/><circle cx="25" cy="18" r="5" fill="#c2185b"/></g>
							<g class="cp-env" transform="translate(58 70) rotate(10)"><path class="cp-ink" d="M0 0h46v30H0Z" fill="#fff6e0"/><path class="cp-ink" d="M0 0l23 17L46 0" fill="none"/><circle cx="23" cy="17" r="5" fill="#0e6990"/></g>
							<g class="cp-env" transform="translate(40 120) rotate(4)"><path class="cp-ink" d="M0 0h56v30H0Z" fill="#eef7e4"/><path class="cp-ink" d="M0 0l28 16L56 0" fill="none"/><circle cx="28" cy="16" r="5" fill="#5a9e6f"/></g>
							<path d="M40 44c-4 10-5 24-5 40" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55" fill="none"/>
						</svg>
					</div>
				</div>
				<p class="cp-next" id="cp-next"></p>
			</div>`
		})}
		<section class="sec sec--top"><div class="wrap">
			${ok ? '' : `<div class="narrow" style="margin:0 auto 24px">${setupNote()}</div>`}
			<details class="composer reveal narrow" style="margin:0 auto 30px"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('letter', 22)}</span> ${Y('اكتب جواب للكبسولة', 'اكتبي جواب للكبسولة', 'Write a letter for the capsule')}</summary>
				<form id="cp-form" autocomplete="off">
					<div class="f-row">
						<label class="f"><span>${L('لمين؟', 'For whom?')}</span><select name="kid">${kids.map((k) => `<option value="${esc(k.id)}">${esc(App.t(k.name))}</option>`).join('')}</select></label>
						<label class="f"><span>${L('يتفتح إمتى؟', 'Opens when?')}</span><select name="when">${AGES.map((a) => `<option value="${a}"${a === 18 ? ' selected' : ''}>${L(`لما يكمّل ${num(a)}`, `When he turns ${a}`)}</option>`).join('')}<option value="date">${L('في يوم أنا أختاره', 'On a day I choose')}</option></select></label>
						<label class="f" id="cp-date" hidden><span>${L('اليوم', 'The day')}</span><input name="date" type="date"></label>
					</div>
					<label class="f"><span>${L('العنوان', 'Title')}</span><input name="title" dir="auto" maxlength="80" placeholder="${L('لما تكبر…', 'When you grow up…')}"></label>
					<label class="f"><span>${L('الجواب', 'The letter')}</span><textarea name="text" dir="auto" rows="7" required maxlength="6000"></textarea></label>
					<label class="f"><span>${L('صورة معاه (اختياري)', 'A photo with it (optional)')}</span><input name="photo" type="file" accept="image/*"></label>
					<p class="form-msg" id="cp-msg" role="status"></p>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${Y('اقفله في الكبسولة ♥', 'اقفليه في الكبسولة ♥', 'Seal it in the capsule ♥')}</button></div>
				</form>
			</details>
			<div id="cp-kids"></div>
		</div></section>
		${related(['firsts', 'letters', 'family'])}`;
	},

	async after(main, s) {
		const kids = (s.family?.members || []).filter((m) => m.kid);
		const kidOf = (id) => kids.find((k) => k.id === id);
		const writer = (by) => App.t(by === 'her' ? s.her : s.him);
		let data = await live.load('capsule');
		const mine = (x) => x.by === live.me() && live.canWrite();

		const paint = () => {
			const all = (data.items || []).slice().sort((a, b) => String(a.openOn).localeCompare(String(b.openOn)));
			const sealed = all.filter((x) => parse(x.openOn) > today());
			const first = sealed[0];
			$('#cp-next', main).innerHTML = first
				? `<b>${L(`أول جواب يتفتح لـ${App.t(kidOf(first.kid)?.name || '')}`, `The next letter opens for ${App.t(kidOf(first.kid)?.name || '')}`)}</b><span>${L('بعد', 'in')} ${esc(left(parse(first.openOn)))}</span><small>${num(sealed.length)} ${L(sealed.length === 1 ? 'جواب مقفول' : 'جوابات مقفولة', sealed.length === 1 ? 'sealed letter' : 'sealed letters')}</small>`
				: `<b>${L('الكبسولة لسه فاضية', 'The capsule is still empty')}</b><span>${Y('اكتب أول جواب للولاد', 'اكتبي أول جواب للولاد', 'Write the boys their first letter')}</span>`;
			$('#cp-kids', main).innerHTML = kids.map((k, ki) => {
				const list = all.filter((x) => x.kid === k.id);
				return `<section class="cp-kid"><h2 class="sec__title">${L(`لـ${App.t(k.name)}`, `For ${App.t(k.name)}`)}</h2>
					<div class="cp-letters">${list.map((x, i) => {
						const d = parse(x.openOn), open = d <= today();
						return open
							? `<article class="cp-open reveal is-in" style="--seal:${SEALS[(ki + i) % SEALS.length]}">
								<p class="cp-open__k">${L('اتفتح', 'Opened')} ${esc(longDate(x.openOn))} · ${L('من', 'from')} ${esc(writer(x.by))}</p>
								${x.title ? `<h3 dir="auto">${esc(x.title)}</h3>` : ''}
								${x.photo ? `<img data-sketch="${esc(x.photo)}" alt="" loading="lazy">` : ''}
								<div class="cp-open__tx" dir="auto">${esc(x.text)}</div>
								${mine(x) ? `<button class="link link--danger" type="button" data-del="${esc(x.id)}">${L('مسح', 'Delete')}</button>` : ''}
							</article>`
							: `<article class="cp-env-card reveal is-in" style="--seal:${SEALS[(ki + i) % SEALS.length]};--r:${[-2, 1.5, -1, 2.5][i % 4]}deg">
								<span class="cp-env-card__flap" aria-hidden="true"></span>
								<span class="cp-env-card__seal" aria-hidden="true">${doodle('heart', 18)}</span>
								<p class="cp-env-card__to">${L('إلى', 'To')} <b>${esc(App.t(k.name))}</b></p>
								${x.title ? `<p class="cp-env-card__t" dir="auto">«${esc(x.title)}»</p>` : ''}
								<p class="cp-env-card__when">${doodle('lock', 14)} ${L('يتفتح', 'Opens')} ${esc(longDate(x.openOn))}${x.age ? ` · ${L(`لما يكمّل ${num(x.age)}`, `at ${x.age}`)}` : ''}</p>
								<p class="cp-env-card__left">${L('فاضل', '')} ${esc(left(d))}</p>
								<p class="cp-env-card__by">${L('من', 'From')} ${esc(writer(x.by))} · ${esc(longDate(iso(new Date(x.at || Date.now()))))}</p>
								${mine(x) ? `<button class="link link--danger" type="button" data-del="${esc(x.id)}">${L('مسح', 'Delete')}</button>` : ''}
							</article>`;
					}).join('') || `<p class="empty">${L(`لسه مفيش جوابات لـ${App.t(k.name)}`, `No letters for ${App.t(k.name)} yet`)}</p>`}</div></section>`;
			}).join('') || `<p class="empty">${L('ضيف الولاد في story.json الأول', 'Add the boys in story.json first')}</p>`;
			live.hydrateSketches($('#cp-kids', main));
		};

		$('#cp-kids', main).addEventListener('click', async (e) => {
			const del = e.target.closest('[data-del]');
			if (!del || !confirm(Y('تمسح الجواب ده؟', 'تمسحي الجواب ده؟', 'Delete this letter?'))) return;
			try { data = await live.save('capsule', (d) => { d.items = (d.items || []).filter((x) => x.id !== del.dataset.del); }); paint(); } catch (err) { alert(live.why(err)); }
		});
		const f = $('#cp-form', main);
		f.when.onchange = () => { $('#cp-date', main).hidden = f.when.value !== 'date'; };
		f.onsubmit = async (e) => {
			e.preventDefault();
			const msg = $('#cp-msg', main);
			const kid = kidOf(f.kid.value);
			let openOn, ageAt;
			if (f.when.value === 'date') openOn = f.date.value;
			else if (kid?.born) { ageAt = +f.when.value; const b = parse(kid.born); openOn = iso(new Date(b.getFullYear() + ageAt, b.getMonth(), b.getDate())); }
			if (!openOn) { msg.textContent = L('اختار يوم يتفتح فيه', 'Pick a day for it to open'); return; }
			try {
				msg.textContent = L('بنقفله…', 'Sealing…');
				const photo = f.photo.files[0] ? await live.putSketch(await shrinkPhoto(f.photo.files[0], 1200)) : undefined;
				data = await live.save('capsule', (d) => { (d.items = d.items || []).push({ id: live.newId(), kid: f.kid.value, openOn, age: ageAt, title: f.title.value.trim() || undefined, text: f.text.value.trim(), photo, by: live.me(), at: Date.now() }); });
				f.reset(); $('#cp-date', main).hidden = true; msg.textContent = L('اتقفل في الكبسولة ♥', 'Sealed in the capsule ♥');
				paint();
			} catch (err) { msg.textContent = live.why(err); }
		};
		paint();
	}
};
