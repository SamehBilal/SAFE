import { L, T, esc, img, num, age, longDate, parseDate, yearsBetween, pageHead, related, App } from '../shell.js';
import { doodle } from '../doodles.js';

export default {
	title: { ar: 'عيلتنا', en: 'Our family' },
	render(s) {
		const f = s.family || {};
		const members = f.members || [];
		const today = new Date();
		return `
		${pageHead(L('عيلتنا', 'Our family'), L('خبر عاجل! اقروا كل حاجة عننا', 'Extra! Extra! Read all about us'), [{ href: 'family.html', ar: 'عيلتنا', en: 'Our family' }])}
		<section class="sec sec--top"><div class="wrap">
			<div class="fam-row">${members.map((m, k) => `
				<a class="fam reveal" href="member.html?id=${esc(m.id)}" style="--c:${esc(m.color || '#0e6990')};--delay:${k * 0.08}s">
					<span class="fam__pic">${m.photo ? `<span data-media-box>${img(m.photo, App.t(m.name))}</span>` : `<span class="fam__emoji">${doodle(m.emoji, 52)}</span>`}</span>
					<b>${T(m.name)}</b>
					<small>${m.kid && m.born ? `${age(m.born)} · ${T(m.role)}` : T(m.role)}</small>
				</a>`).join('')}
			</div>

			${f.portrait ? `<figure class="portrait reveal" data-media-box>
				${img(f.portrait.photo, App.t(f.portrait.caption), 'zoom')}
				<figcaption>${f.portrait.title ? `<b>${T(f.portrait.title)}</b>` : ''}${f.portrait.text ? `<span>${T(f.portrait.text)}</span>` : ''}</figcaption>
			</figure>` : ''}
			<article class="paper reveal">
				<h2 class="paper__name">${T(f.paper) || L('جريدة بيتنا', 'The Daily Us')}</h2>
				<div class="paper__bar"><div><span>${L('العدد', 'Issue')} #${num(yearsBetween(parseDate(s.met)))}</span><span>${today.toLocaleDateString(App.lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span>${L('التمن: حضن', 'Price: one hug')}</span></div></div>
				${f.headline ? `<h3 class="paper__headline">${T(f.headline)}</h3>` : ''}
				${f.lead ? `<p class="paper__lead">${T(f.lead)}</p>` : ''}
				<div class="paper__cols">${members.map((m) => `
					<section class="article" tabindex="0">
						${m.photo ? `<div data-media-box>${img(m.photo, App.t(m.name), 'zoom')}</div>` : ''}
						<h4>${T(m.name)}</h4>
						<em>${T(m.role)}${m.born ? ` · ${L('مواليد', 'born')} ${longDate(m.born)}` : ''}</em>
						${m.text ? `<p>${T(m.text)}</p>` : ''}
					</section>`).join('')}
				</div>
			</article>
		</div></section>
		${related(['chapters', 'gallery', 'letters'])}`;
	}
};
