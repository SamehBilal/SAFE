import { L, T, esc, img, pageHead, related, App, $, $$, rand, REDUCE } from '../shell.js';

/* A cake: tap each flame to blow it out. When they're all out — confetti, and the birthday message. */
export default {
	title: { ar: 'عيد ميلادك', en: 'Your birthday' },
	render(s) {
		const b = s.birthday || {};
		const n = Math.min(Math.max(Number(b.candles) || 5, 1), 9);
		const xs = Array.from({ length: n }, (_, k) => 40 + (k * 140) / Math.max(n - 1, 1));
		return `
		${pageHead(App.t(b.title) || L('كل سنة وانتي طيبة', 'Happy Birthday'), App.t(b.subtitle), [{ href: 'birthday.html', ar: 'عيد ميلادك', en: 'Your birthday' }])}
		<section class="sec sec--top bday"><div class="wrap narrow">
			<p class="bday__hint reveal" id="bday-hint">${L('اتمني أمنية… وبعدين اطفي الشمع (دوسي على كل شمعة)', 'Make a wish… then blow out the candles (tap each one)')}</p>
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
				<h2 class="sec__title">${L('أمنيتك اتسجلت ✨', 'Your wish is on its way ✨')}</h2>
				${b.message ? `<p class="lede">${T(b.message)}</p>` : ''}
				${b.photo ? `<figure class="frame frames--single" data-media-box style="--tilt:-2deg;max-width:520px;margin:24px auto">${img(b.photo, '', 'zoom')}</figure>` : ''}
				<p class="center"><a class="btn btn--coral" href="wishes.html">${L('اكتبي أمنيتك في البرطمان', 'Write your wish in the jar')} ${App.arrow}</a></p>
			</div>
		</div></section>
		${related(['wishes', 'letters', 'family'])}`;
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
			$('#bday-hint', main).textContent = L('🎉 كل سنة وانتي طيبة يا حبيبتي 🎉', '🎉 Happy birthday, my love 🎉');
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
