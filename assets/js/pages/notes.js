import { L, T, img, fmtDate, pageHead, related } from '../shell.js';

export default {
	title: { ar: 'رسايل حب', en: 'Love notes' },
	render(s) {
		const tilt = (n) => `${((n * 37) % 7) - 3}deg`;
		return `
		${pageHead(L('رسايل حب', 'Love notes'), L('كلام صغير كتبناه لبعض', 'Little things we wrote to each other'), [{ href: 'notes.html', ar: 'رسايل حب', en: 'Love notes' }])}
		<section class="sec notes"><div class="wrap">
			<div class="notes__grid">${(s.notes || []).map((n, k) => `
				<figure class="note note--${n.by === 'him' ? 'him' : 'her'} reveal" style="--tilt:${tilt(k + 1)};--delay:${(k % 3) * 0.1}s">
					<p>${T(n.text)}</p>
					${n.photo ? `<div data-media-box>${img(n.photo, '', 'zoom')}</div>` : ''}
					<footer>— ${T(n.by === 'him' ? s.him : s.her)}${n.date ? `، ${fmtDate(n.date)}` : ''}</footer>
				</figure>`).join('')}
			</div>
		</div></section>
		${related(['letters', 'gallery', 'wishes'])}`;
	}
};
