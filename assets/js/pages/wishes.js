import { L, pageHead, related, sleep, store, $ } from '../shell.js';

const KEY = 'us.wishes';
const JAR = `<svg viewBox="0 0 200 260" aria-hidden="true">
	<rect x="30" y="70" width="140" height="180" rx="34" fill="rgba(230,247,255,.55)" stroke="#27525c" stroke-width="5"/>
	<path d="M138 92c10 30 10 110 0 140" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"/>
	<rect x="48" y="52" width="104" height="22" rx="6" fill="#cfe3ec" stroke="#27525c" stroke-width="5"/>
	<g class="jar__lid"><rect x="40" y="26" width="120" height="28" rx="10" fill="#66a8b8" stroke="#27525c" stroke-width="5"/><path d="M56 38h88" stroke="#27525c" stroke-width="3" opacity=".35"/></g>
</svg>`;

/* Wishes stay on her phone (localStorage) — they're hers. */
export default {
	title: { ar: 'برطمان الأمنيات', en: 'Wish jar' },
	render() {
		return `
		${pageHead(L('برطمان الأمنيات', 'Wish jar'), L('اكتبي أمنية، وهتفضل في أمان جوه البرطمان', 'Make a wish — it stays safe in the jar'), [{ href: 'wishes.html', ar: 'برطمان الأمنيات', en: 'Wish jar' }])}
		<section class="sec sec--top"><div class="wrap jar-wrap">
			<form class="wish-form reveal" id="wish-form" autocomplete="off">
				<label class="sr-only" for="wish-input">${L('نفسي…', 'I wish…')}</label>
				<input id="wish-input" dir="auto" maxlength="140" placeholder="${L('نفسي…', 'I wish…')}" enterkeyhint="send">
				<button type="submit" aria-label="${L('حطي الأمنية في البرطمان', 'Put the wish in the jar')}">★</button>
			</form>
			<p class="wish-hint">${L('دوسي على أي نجمة عشان تقري الأمنية اللي جواها', 'Tap a star to read the wish inside')}</p>
			<div class="jar" id="jar">${JAR}<div class="jar__stars" id="jar-stars"></div></div>
			<p class="wish-toast" id="wish-toast" aria-live="polite"></p>
		</div></section>
		${related(['birthday', 'letters', 'notes'])}`;
	},
	after(main) {
		const form = $('#wish-form', main);
		const input = $('#wish-input', main);
		const box = $('#jar-stars', main);
		const jar = $('#jar', main);
		const toast = $('#wish-toast', main);
		let wishes = [];
		try { wishes = JSON.parse(store.get(KEY) || '[]'); } catch { wishes = []; }
		const add = (w, animate) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.textContent = '⭐';
			b.setAttribute('aria-label', L('أمنية: ', 'Wish: ') + w.text);
			if (!animate) b.style.animation = 'none';
			b.onclick = () => { toast.textContent = '«' + w.text + '»'; };
			box.append(b);
		};
		wishes.forEach((w) => add(w, false));
		form.onsubmit = async (e) => {
			e.preventDefault();
			const text = input.value.trim();
			if (!text) return input.focus();
			input.value = '';
			const w = { text, at: Date.now() };
			wishes.push(w);
			store.set(KEY, JSON.stringify(wishes));
			const from = form.getBoundingClientRect();
			const to = jar.getBoundingClientRect();
			const star = Object.assign(document.createElement('span'), { className: 'flying-star', textContent: '⭐' });
			const sx = from.left + from.width / 2;
			star.style.left = sx + 'px';
			star.style.top = from.top + 'px';
			document.body.append(star);
			jar.classList.add('is-open');
			requestAnimationFrame(() => requestAnimationFrame(() => {
				star.style.transform = `translate(${to.left + to.width / 2 - sx}px, ${to.top + to.height * 0.5 - from.top}px) rotate(540deg) scale(.6)`;
				star.style.opacity = '0';
			}));
			await sleep(850);
			star.remove();
			add(w, true);
			await sleep(250);
			jar.classList.remove('is-open');
			toast.textContent = L('أمنيتك في أمان جوه البرطمان ✨', 'Your wish is safe in the jar ✨');
		};
	}
};
