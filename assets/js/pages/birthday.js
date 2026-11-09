import { L, T, esc, img, num, pageHead, related, App, $, $$, rand, REDUCE, qs, occasions, longDate, age } from '../shell.js';

/* Birthdays: each of us, with how long until the next one and the age we're turning. The cake below is for
   whoever is next (or whose day it is today, or whoever you tap): blow out the candles, get confetti. */
export default {
	title: { ar: 'أعياد الميلاد', en: 'Birthdays' },
	render(s) {
		const members = s.family?.members || [];
		const bdays = occasions(s).filter((o) => o.kind === 'birthday');
		const missing = members.filter((m) => !m.born);
		const pick = bdays.find((o) => o.id === qs('id')) || bdays[0];
		this.pick = pick;
		const card = (o) => `
			<a class="bd-card reveal${o === pick ? ' is-on' : ''}${o.days === 0 ? ' is-today' : ''}" href="birthday.html?id=${esc(o.id)}" style="--c:${esc(o.member.color || '#0e6990')}">
				<span class="fam__pic">${o.member.photo ? `<span data-media-box>${img(o.member.photo, App.t(o.member.name))}</span>` : `<span class="fam__emoji">${esc(o.member.emoji || '♥')}</span>`}</span>
				<b>${T(o.member.name)}</b>
				<small>${longDate(o.member.born).replace(/\s*\d{4}$|[\s،,]*[٠-٩]{4}$/, '')}</small>
				<em>${o.days === 0 ? L('النهارده! 🎂', 'Today! 🎂') : L(`بعد ${num(o.days)} يوم`, `in ${o.days} days`)}</em>
				<small>${L(`${o.member.female ? 'هتكمل' : 'هيكمل'} ${num(o.years)}`, `turning ${o.years}`)}</small>
			</a>`;
		const n = pick ? Math.min(Math.max(pick.years, 1), 9) : 5;
		const xs = Array.from({ length: n }, (_, k) => 40 + (k * 140) / Math.max(n - 1, 1));
		return `
		${pageHead(L('أعياد الميلاد', 'Birthdays'), L('عيد ميلاد كل واحد فينا، وكام يوم فاضل عليه', 'Each of our birthdays, and how long until the next'), [{ href: 'birthday.html', ar: 'أعياد الميلاد', en: 'Birthdays' }])}
		<section class="sec sec--top"><div class="wrap">
			<div class="bd-row">${bdays.map(card).join('')}</div>
			${missing.length ? `<p class="empty" style="margin-top:16px">${L(`ضيفوا تاريخ ميلاد ${missing.map((m) => App.t(m.name)).join(' و')} (born) في private/story.json عشان يظهر هنا`, `Add a birth date ("born") for ${missing.map((m) => App.t(m.name)).join(' and ')} in private/story.json to show them here`)}</p>` : ''}
		</div></section>
		${pick ? `
		<section class="sec sec--top bday"><div class="wrap narrow">
			<h2 class="sec__title reveal">${esc(pick.title)}</h2>
			<p class="sec__sub reveal">${pick.days === 0 ? esc(pick.sub) : L(`بعد ${num(pick.days)} يوم — ${age(pick.member.born)} دلوقتي`, `in ${pick.days} days — ${age(pick.member.born)} now`)}</p>
			<p class="bday__hint reveal" id="bday-hint">${L('اتمنوا أمنية… وبعدين اطفوا الشمع (دوسوا على كل شمعة)', 'Make a wish… then blow out the candles (tap each one)')}</p>
			<div class="cake reveal">
				<svg viewBox="0 0 220 210" role="img" aria-label="${L('تورتة عيد ميلاد', 'A birthday cake')}">
					<ellipse cx="110" cy="196" rx="100" ry="10" fill="#0e6990" opacity=".12"/>
					<path d="M20 120h180v70c0 6-40 12-90 12s-90-6-90-12z" fill="#fde3e0"/>
					<path d="M20 120c0-7 40-13 90-13s90 6 90 13-40 13-90 13-90-6-90-13Z" fill="#fff"/>
					<path d="M20 124c10 14 18 0 26 12s16-4 26 8 18-4 26 6 18-6 26 4 18-6 26 2 18-4 24-12v18H20z" fill="#f2726f"/>
					<path d="M20 165h180" stroke="#f2726f" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round"/>
					${xs.map((x, k) => `
					<g class="candle" data-k="${k}" tabindex="0" role="button" aria-label="${L('شمعة', 'Candle')} ${k + 1}">
						<rect x="${x - 4}" y="74" width="8" height="42" rx="3" fill="${['#0e6990', '#f2726f', '#e39b2d', '#5a9e6f'][k % 4]}"/>
						<path d="M${x - 4} 84l8-5M${x - 4} 96l8-5M${x - 4} 108l8-5" stroke="#fff" stroke-width="2" opacity=".6"/>
						<path class="flame" d="M${x} 46c7 9 8 16 0 24-8-8-7-15 0-24Z" fill="#ffc94a"/>
						<path class="flame flame--in" d="M${x} 58c3 4 3 7 0 10-3-3-3-6 0-10Z" fill="#fff4c4"/>
						<path class="smoke" d="M${x} 66c-4-8 4-12 0-20s4-12 0-18" fill="none" stroke="#9aa9b3" stroke-width="2" stroke-linecap="round"/>
						<rect x="${x - 14}" y="40" width="28" height="80" fill="transparent"/>
					</g>`).join('')}
				</svg>
			</div>
			<div class="bday__msg" id="bday-msg" hidden>
				<h2 class="sec__title">${L(`كل سنة و${App.t(pick.member.name)} ${pick.member.female ? 'طيبة' : 'طيب'} ✨`, `Happy birthday, ${App.t(pick.member.name)} ✨`)}</h2>
				<p class="center"><a class="btn btn--coral" href="wishes.html">${L('اكتبوا الأمنية في البرطمان', 'Put the wish in the jar')} ${App.arrow}</a></p>
			</div>
		</div></section>` : ''}
		${related(['wishes', 'family', 'journal'])}`;
	},
	after(main) {
		const candles = $$('.candle', main);
		const blow = (c) => {
			if (c.classList.contains('is-out')) return;
			c.classList.add('is-out');
			navigator.vibrate?.(30);
			if (candles.every((x) => x.classList.contains('is-out'))) done();
		};
		for (const c of candles) {
			c.onclick = () => blow(c);
			c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); blow(c); } };
		}
		function done() {
			$('#bday-hint', main).textContent = '🎉';
			$('#bday-msg', main).hidden = false;
			confetti();
		}
	}
};

function confetti() {
	if (REDUCE) return;
	const box = document.createElement('div');
	box.className = 'confetti';
	box.setAttribute('aria-hidden', 'true');
	const colors = ['#f2726f', '#0e6990', '#ffc94a', '#5a9e6f', '#fde3e0'];
	box.innerHTML = Array.from({ length: 90 }, (_, k) => `<i style="--x:${rand(0, 100)}vw;--d:${rand(2.2, 4.2)}s;--delay:${rand(0, 0.8)}s;--r:${rand(-720, 720)}deg;--dx:${rand(-80, 80)}px;background:${colors[k % colors.length]}${k % 3 ? '' : ';border-radius:50%'}"></i>`).join('');
	document.body.append(box);
	setTimeout(() => box.remove(), 5500);
}
