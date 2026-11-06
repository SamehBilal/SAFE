import { App, L, T, esc, img, num, parseDate, yearsBetween, daysBetween, age, isToday, yearsAgo, fmtDate, icon, PAGES, firstPhoto, $ } from '../shell.js';

export default {
	title: { ar: 'الرئيسية', en: 'Home' },
	render(s) {
		const b = s.birthday || {};
		const met = parseDate(s.met);
		const kids = (s.family?.members || []).filter((m) => m.kid);
		const today = (s.timeline || []).filter((x) => isToday(x.date));
		const latest = (s.timeline || []).slice(-3).reverse();
		const stats = [
			[num(daysBetween(met)), L('يوم من أول سلام', 'days since hello')],
			[num(yearsBetween(met)), L('سنة مع بعض', 'years of us')],
			s.married && [num(daysBetween(parseDate(s.married))), L('يوم جواز', 'days married')],
			[num(2 + kids.length), L('أفراد في العيلة', 'of us now')],
			...kids.map((k) => [age(k.born), L(`عمر ${App.t(k.name)}`, `${App.t(k.name)}’s age`)])
		].filter(Boolean);
		const features = PAGES.filter((p) => p.id !== 'home');

		return `
		<section class="hero">
			${b.show !== false ? `<a class="hero__bday" href="birthday.html">🎂 ${T(b.title) || L('كل سنة وانتي طيبة', 'Happy Birthday')} ${App.lang === 'ar' ? 'يا ' : ''}${T(s.her)}</a>` : ''}
			<h1 class="hero__title">${L('حكاية حبنا', 'Our Love Story')}</h1>
			<div class="ribbon"><span>${T(s.him)}</span><span class="heart">♥</span><span>${T(s.her)}</span></div>
			<a class="scroll-cue" href="#numbers" aria-label="${L('انزلي', 'Scroll down')}">⌄</a>
		</section>

		<section class="sec" id="numbers">
			<div class="wrap">
				<h2 class="sec__title reveal">${L('إحنا بالأرقام', 'Us in numbers')}</h2>
				<div class="counters">${stats.map(([n, l], k) => `<div class="counter reveal" style="--delay:${k * 0.06}s"><b>${n}</b><span>${esc(l)}</span></div>`).join('')}</div>
			</div>
		</section>

		${today.length ? `
		<section class="sec sec--tight">
			<div class="wrap">
				${today.map((x) => `<a class="otd reveal" href="moment.html?id=${esc(x.id)}"><span class="otd__ic">${esc(x.icon || '♥')}</span><span><small>${L('النهارده', 'On this day')} · ${yearsAgo(x.date)}</small><b>${T(x.title)}</b></span><span aria-hidden="true">${App.arrow}</span></a>`).join('')}
			</div>
		</section>` : ''}

		<section class="sec">
			<div class="wrap">
				<h2 class="sec__title reveal">${L('جوه البيت ده', 'Inside this home')}</h2>
				<p class="sec__sub reveal">${L('كل ركن هنا فيه حتة من حكايتنا', 'Every corner here holds a piece of our story')}</p>
				<div class="tiles">${features.map((p, k) => `
					<a class="tile reveal" href="${p.href}" style="--delay:${(k % 4) * 0.06}s">${icon(p.ic, 28)}<b>${esc(L(p.ar, p.en))}</b><small>${esc(L(p.dar, p.den))}</small></a>`).join('')}
				</div>
			</div>
		</section>

		<section class="sec">
			<div class="wrap">
				<h2 class="sec__title reveal">${L('آخر الحكاية', 'Latest in our story')}</h2>
				<div class="cards3">${latest.map((x) => `
					<a class="mini reveal" href="moment.html?id=${esc(x.id)}">
						<span class="mini__ic">${esc(x.icon || '♥')}</span>
						<time>${fmtDate(x.date)}</time>
						<b>${T(x.title)}</b>
						<p>${T(x.text)}</p>
					</a>`).join('')}
				</div>
				<p class="center"><a class="btn" href="story.html">${L('الحكاية كاملة', 'The whole story')} ${App.arrow}</a></p>
			</div>
		</section>

		${s.poster ? `
		<section class="sec">
			<div class="wrap">
				<figure class="poster reveal" data-media-box>${img(s.poster, L('حكايتنا في صفحة', 'Our story on one page'), 'zoom')}</figure>
			</div>
		</section>` : ''}`;
	}
};
