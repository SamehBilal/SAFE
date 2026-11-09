import { L, T, esc, longDate, pageHead, related, sleep, REDUCE, App, $, $$ } from '../shell.js';

export default {
	title: { ar: 'جوابات', en: 'Letters' },
	render(s) {
		const list = s.letters || [];
		return `
		${pageHead(L('جواباتنا', 'Letters for you'), L('دوسوا على الجواب عشان يتفتح', 'Tap an envelope to open it'), [{ href: 'letters.html', ar: 'جوابات', en: 'Letters' }])}
		<section class="sec sec--top"><div class="wrap">
			${list.map((x, k) => `
			<div class="letter-block" id="${esc(x.id)}">
				<h2 class="letter-block__h reveal">${T(x.title)}</h2>
				${x.date ? `<p class="sec__sub reveal">${longDate(x.date)}</p>` : ''}
				<button class="envelope reveal" type="button" aria-expanded="false" aria-controls="letter-${k}">
					<span class="envelope__back"></span>
					<span class="envelope__peek">${T(x.to)}</span>
					<span class="envelope__front"></span>
					<span class="envelope__flap"></span>
					<span class="envelope__seal" aria-hidden="true">💌</span>
					<span class="sr-only">${L('افتحوا الجواب', 'Open the letter')}</span>
				</button>
				<article class="letter" id="letter-${k}" hidden>
					<h3>${T(x.to)}</h3>
					${App.t(x.body).split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')}
					<p class="from">${T(x.from)}</p>
				</article>
			</div>`).join('')}
		</div></section>
		${related(['notes', 'birthday', 'wishes'])}`;
	},
	after(main) {
		for (const env of $$('.envelope', main)) {
			env.onclick = async () => {
				const body = $('#' + env.getAttribute('aria-controls'), main);
				if (env.classList.contains('is-open')) return body.scrollIntoView({ behavior: 'smooth', block: 'start' });
				env.classList.add('is-open');
				env.setAttribute('aria-expanded', 'true');
				await sleep(900);
				body.hidden = false;
				body.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
			};
		}
	}
};
