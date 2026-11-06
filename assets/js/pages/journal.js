import { L, T, esc, pageHead, related, App, $, $$, longDate, store } from '../shell.js';
import * as live from '../live.js';
import { openSketch } from '../sketch.js';

const MOODS = ['😍', '🥰', '😂', '🥹', '😌', '🎉', '😴', '🤒', '😤', '🌧️'];
const DRAFT = 'us.draft.journal';

/* Our journal: pages you both write. An entry can also be pinned to the story timeline. */
export default {
	title: { ar: 'دفترنا', en: 'Our journal' },
	render() {
		const ok = live.canWrite();
		return `
		${pageHead(L('دفترنا', 'Our journal'), L('هنا بنكتب حكايتنا سوا — كل واحد بقلمه', 'Where we write our story together — each in our own hand'), [{ href: 'journal.html', ar: 'دفترنا', en: 'Our journal' }])}
		<section class="sec sec--top"><div class="wrap narrow">
			${ok ? '' : setupNote()}
			<details class="composer reveal" id="composer"${ok ? '' : ' hidden'}>
				<summary><span>✍️</span> ${L('اكتبي صفحة جديدة', 'Write a new page')}</summary>
				<form id="jr-form" autocomplete="off">
					<div class="f-row">
						<label class="f"><span>${L('اليوم', 'Date')}</span><input type="date" name="date" required></label>
						<label class="f f--grow"><span>${L('العنوان', 'Title')}</span><input name="title" dir="auto" maxlength="120" placeholder="${L('النهارده…', 'Today…')}"></label>
					</div>
					<label class="f"><span>${L('حصل إيه؟', 'What happened?')}</span><textarea name="text" dir="auto" rows="7" required placeholder="${L('اكتبي براحتك…', 'Write as much as you like…')}"></textarea></label>
					<fieldset class="moods"><legend>${L('المود', 'Mood')}</legend>${MOODS.map((m, k) => `<label><input type="radio" name="mood" value="${m}"${k === 0 ? ' checked' : ''}><span>${m}</span></label>`).join('')}</fieldset>
					<label class="check"><input type="checkbox" name="timeline"> ${L('ضيفي اليوم ده لحكايتنا (التايم لاين)', 'Add this day to our story timeline')}</label>
					<div class="sketch-attach" id="jr-sketch"></div>
					<p class="form-msg" id="jr-msg" role="status"></p>
					<div class="f-actions">
						<button type="button" class="btn btn--ghost" id="jr-draw">✏️ ${L('ارسمي حاجة', 'Add a sketch')}</button>
						<button type="button" class="btn btn--ghost" id="jr-cancel" hidden>${L('إلغاء التعديل', 'Cancel edit')}</button>
						<button type="submit" class="btn btn--coral" id="jr-save">${L('احفظي في الدفتر ♥', 'Save to the journal ♥')}</button>
					</div>
				</form>
			</details>

			<div class="toolbar">
				<div class="chips" role="toolbar" aria-label="${L('مين كتب', 'Written by')}">
					<button class="chip is-on" type="button" data-by="">${L('الكل', 'All')}</button>
					<button class="chip" type="button" data-by="him">${T(App.story.him)}</button>
					<button class="chip" type="button" data-by="her">${T(App.story.her)}</button>
				</div>
				<input class="search" id="jr-q" type="search" dir="auto" placeholder="${L('دوري في الدفتر…', 'Search the journal…')}" aria-label="${L('بحث', 'Search')}">
			</div>
			<div id="jr-list" class="journal" aria-live="polite"><p class="empty">${L('بنفتح الدفتر…', 'Opening the journal…')}</p></div>
		</div></section>
		${related(['story', 'music', 'draw'])}`;
	},

	async after(main, s) {
		const form = $('#jr-form', main);
		const list = $('#jr-list', main);
		let data = { items: [] };
		let by = '';
		let q = '';
		let editing = null;
		let sketchBlob = null;
		let sketchId = null;

		const name = (who) => T(who === 'him' ? s.him : s.her);
		const paint = () => {
			const items = (data.items || [])
				.filter((x) => (!by || x.by === by) && (!q || `${x.title} ${x.text}`.toLowerCase().includes(q)))
				.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.at || 0) - (a.at || 0));
			if (!items.length) {
				list.innerHTML = `<p class="empty">${data.items?.length ? L('مفيش صفحات بالشكل ده', 'No pages match') : L('الدفتر لسه فاضي… اكتبوا أول صفحة ♥', 'The journal is still empty… write the first page ♥')}</p>`;
				return;
			}
			let month = '';
			list.innerHTML = items.map((x) => {
				const m = (x.date || '').slice(0, 7);
				const head = m !== month ? `<h2 class="journal__month">${new Date(m + '-01T00:00').toLocaleDateString(App.lang === 'ar' ? 'ar-EG' : 'en-GB', { month: 'long', year: 'numeric' })}</h2>` : '';
				month = m;
				const mine = x.by === live.me();
				return `${head}<article class="entry entry--${x.by === 'him' ? 'him' : 'her'}" id="${esc(x.id)}">
					<header><span class="entry__mood">${esc(x.mood || '♥')}</span>
						<div><h3 dir="auto">${esc(x.title || longDate(x.date))}</h3><small>${longDate(x.date)} · ${L('كتبها', 'by')} <b>${name(x.by)}</b>${x.timeline ? ` · <a href="story.html#t-${esc(x.id)}">📌 ${L('في حكايتنا', 'on our timeline')}</a>` : ''}</small></div>
					</header>
					<div class="entry__text" dir="auto">${esc(x.text)}</div>
					${x.sketch ? `<img class="entry__sketch zoom" data-sketch="${esc(x.sketch)}" alt="${L('رسمة', 'Sketch')}">` : ''}
					${mine && live.canWrite() ? `<footer><button type="button" class="link" data-edit="${esc(x.id)}">${L('تعديل', 'Edit')}</button><button type="button" class="link link--danger" data-del="${esc(x.id)}">${L('مسح', 'Delete')}</button></footer>` : ''}
				</article>`;
			}).join('');
			live.hydrateSketches(list);
			if (location.hash) $(location.hash.replace(/[^\w#-]/g, ''), list)?.scrollIntoView({ block: 'center' });
		};

		data = await live.load('journal');
		paint();

		$$('.chip', main).forEach((c) => (c.onclick = () => { by = c.dataset.by; $$('.chip', main).forEach((x) => x.classList.toggle('is-on', x === c)); paint(); }));
		$('#jr-q', main).oninput = (e) => { q = e.target.value.trim().toLowerCase(); paint(); };
		if (!form) return;

		/* the composer: today's date, and whatever was left unsaved last time */
		const msg = $('#jr-msg', main);
		const reset = () => {
			form.reset();
			form.date.value = live.today();
			editing = null; sketchBlob = null; sketchId = null;
			$('#jr-sketch', main).innerHTML = '';
			$('#jr-cancel', main).hidden = true;
			$('#jr-save', main).textContent = L('احفظي في الدفتر ♥', 'Save to the journal ♥');
		};
		reset();
		try { const d = JSON.parse(store.get(DRAFT) || 'null'); if (d) { form.title.value = d.title || ''; form.text.value = d.text || ''; if (d.text) $('#composer', main).open = true; } } catch { /* no draft */ }
		form.oninput = () => { if (!editing) store.set(DRAFT, JSON.stringify({ title: form.title.value, text: form.text.value })); };

		const showSketch = (url) => { $('#jr-sketch', main).innerHTML = url ? `<img src="${url}" alt=""><button type="button" class="link link--danger" id="jr-unsketch">${L('شيلي الرسمة', 'Remove sketch')}</button>` : ''; const b = $('#jr-unsketch', main); if (b) b.onclick = () => { sketchBlob = null; sketchId = null; showSketch(''); }; };
		$('#jr-draw', main).onclick = async () => {
			const blob = await openSketch({ title: form.title.value || L('رسمة للدفتر', 'A sketch for the journal') });
			if (blob) { sketchBlob = blob; sketchId = null; showSketch(URL.createObjectURL(blob)); }
		};
		$('#jr-cancel', main).onclick = reset;

		list.addEventListener('click', async (e) => {
			const ed = e.target.closest('[data-edit]');
			const del = e.target.closest('[data-del]');
			if (ed) {
				const x = data.items.find((i) => i.id === ed.dataset.edit);
				if (!x) return;
				editing = x.id;
				form.date.value = x.date; form.title.value = x.title || ''; form.text.value = x.text || '';
				form.timeline.checked = !!x.timeline;
				const m = form.querySelector(`input[name=mood][value="${x.mood}"]`); if (m) m.checked = true;
				sketchId = x.sketch || null; sketchBlob = null;
				if (sketchId) live.sketchURL(sketchId).then(showSketch).catch(() => {}); else showSketch('');
				$('#jr-cancel', main).hidden = false;
				$('#jr-save', main).textContent = L('احفظي التعديل', 'Save changes');
				$('#composer', main).open = true;
				$('#composer', main).scrollIntoView({ behavior: 'smooth' });
			} else if (del) {
				if (!confirm(L('تمسحي الصفحة دي من الدفتر؟', 'Delete this page from the journal?'))) return;
				try { data = await live.save('journal', (d) => { d.items = (d.items || []).filter((i) => i.id !== del.dataset.del); }); paint(); }
				catch (err) { alert(live.why(err)); }
			}
		});

		form.onsubmit = async (e) => {
			e.preventDefault();
			const btn = $('#jr-save', main);
			btn.disabled = true;
			msg.textContent = L('بنحفظ…', 'Saving…');
			try {
				if (sketchBlob) sketchId = await live.putSketch(sketchBlob);
				const entry = {
					id: editing || live.newId(),
					date: form.date.value || live.today(),
					title: form.title.value.trim(),
					text: form.text.value.trim(),
					mood: form.mood.value,
					timeline: form.timeline.checked,
					sketch: sketchId || undefined,
					by: live.me()
				};
				data = await live.save('journal', (d) => {
					d.items = d.items || [];
					const old = d.items.find((i) => i.id === entry.id);
					if (old) Object.assign(old, entry, { by: old.by, edited: Date.now() });
					else d.items.push({ ...entry, at: Date.now() });
				});
				store.del(DRAFT);
				reset();
				$('#composer', main).open = false;
				msg.textContent = L('اتحفظت في الدفتر ♥', 'Saved to the journal ♥');
				paint();
				$('#' + entry.id, list)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			} catch (err) {
				msg.textContent = live.why(err);
			} finally {
				btn.disabled = false;
			}
		};
	}
};

export function setupNote() {
	return `<a class="setup-note reveal" href="settings.html">⚙️ <span><b>${L('عشان تكتبي هنا، ظبطي المزامنة مرة واحدة', 'To write here, set up syncing once')}</b><small>${L('اختاري انتي مين وحطي الـ GitHub token في صفحة الإعدادات', 'Choose who you are and add the GitHub token on the settings page')}</small></span><span aria-hidden="true">${App.arrow}</span></a>`;
}
