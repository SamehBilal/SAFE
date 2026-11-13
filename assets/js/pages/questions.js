import { L, Y, esc, pageHead, related, App, $, num, longDate } from '../shell.js';
import { doodle } from '../doodles.js';
import * as live from '../live.js';
import { setupNote } from './journal.js';

/* Questions for us: one question a day, the same on both phones. Each of us writes an answer; the other's stays
   blurred until you've written yours. Above the title the day's question sits on a card that flips in, with a heart
   for each of us that fills once we've answered. Every day we both answered is kept below, side by side. */

const BANK = [
	['إيه أكتر لحظة في السنة دي نفسك ترجعلها؟', 'Which moment this year would you live again?'],
	['إيه أول حاجة لفتت نظرك فيّا؟', 'What was the first thing you noticed about me?'],
	['لو هنسافر بكرة من غير تخطيط، نروح فين؟', 'If we left tomorrow with no plan, where would we go?'],
	['إيه الأكلة اللي بتفكرك بينا؟', 'Which food reminds you of us?'],
	['إيه حاجة صغيرة بعملها وبتفرّحك؟', 'What small thing do I do that makes you happy?'],
	['إيه أكتر حاجة اتعلمتها من جوازنا؟', 'What has our marriage taught you most?'],
	['لو عندك يوم كامل لوحدك، تعمل فيه إيه؟', 'If you had a whole day to yourself, what would you do?'],
	['إيه الأغنية اللي بتحس إنها بتاعتنا؟', 'Which song feels like ours?'],
	['إيه حلم نفسك نحققه سوا قبل ما نكبر؟', 'What dream do you want us to reach together?'],
	['إيه أكتر صفة بتحبها في الولاد؟', 'What do you love most about the boys?'],
	['فاكر أول خناقة لينا؟ كانت على إيه؟', 'Remember our first argument? What was it about?'],
	['إيه الحاجة اللي نفسك أعملها أكتر؟', 'What would you like me to do more often?'],
	['إيه أحسن هدية جاتلك في حياتك؟', 'What’s the best gift you’ve ever had?'],
	['لو هنكتب كتاب عن حكايتنا، اسمه هيبقى إيه؟', 'If we wrote a book about us, what would it be called?'],
	['إيه أكتر حاجة بتضحكك فيّا؟', 'What about me makes you laugh most?'],
	['إيه العادة اللي نفسك نبدأها كعيلة؟', 'What tradition would you like us to start as a family?'],
	['إمتى حسيت إنك مبسوط جدًا الأسبوع ده؟', 'When did you feel really happy this week?'],
	['إيه المكان اللي بتحس فيه إنك في البيت؟', 'Where do you feel most at home?'],
	['لو رجعنا بالزمن ليوم فرحنا، تغيّر إيه؟', 'If we went back to our wedding day, what would you change?'],
	['إيه أكتر حاجة بتقلقك اليومين دول؟ وأساعدك إزاي؟', 'What’s worrying you lately, and how can I help?'],
	['إيه الفيلم اللي ممكن نتفرج عليه مليون مرة؟', 'Which film could we watch a million times?'],
	['إيه أصعب حاجة عديناها سوا؟', 'What’s the hardest thing we’ve been through together?'],
	['إيه اللي بتحب تعمله يوم الجمعة الصبح؟', 'What do you love doing on a Friday morning?'],
	['لو قدرت تقول حاجة لنفسك وإنت صغير، تقول إيه؟', 'What would you tell your younger self?'],
	['إيه الريحة اللي بتفكرك بطفولتك؟', 'Which smell takes you back to childhood?'],
	['إيه أكتر حاجة فخور بيها في نفسك السنة دي؟', 'What are you proudest of this year?'],
	['إيه صفة في أهلي بتحبها؟', 'What do you like about my family?'],
	['إيه شكل اليوم المثالي بالنسبالك؟', 'What does a perfect day look like to you?'],
	['إيه حاجة نفسك تتعلمها السنة الجاية؟', 'What would you like to learn next year?'],
	['إيه أحلى رسالة بعتهالك؟', 'What’s the sweetest message I ever sent you?'],
	['لو الولاد هيفتكروا حاجة واحدة عن طفولتهم، نفسك تبقى إيه؟', 'If the boys remember one thing from childhood, what do you hope it is?'],
	['إيه حاجة بتعملها عشاني ومش باخد بالي؟', 'What do you do for me that I might not notice?'],
	['إيه أكتر يوم ضحكنا فيه سوا؟', 'Which day did we laugh the most?'],
	['لو عندنا بيت على البحر، هتسميه إيه؟', 'If we had a house by the sea, what would we call it?'],
	['إيه الحاجة اللي نفسك نعملها سوا ولسه ماعملناهاش؟', 'What haven’t we done together yet that you’d love to?'],
	['إيه أحسن نصيحة اتقالتلك؟', 'What’s the best advice anyone gave you?'],
	['إيه أكتر حاجة بتحبها في بيتنا؟', 'What do you love most about our home?'],
	['إمتى حسيت إني فهمتك من غير ما تتكلم؟', 'When did I understand you without you saying a word?'],
	['إيه حاجة كنت خايف منها وطلعت أسهل من ما توقعت؟', 'What did you fear that turned out easier than expected?'],
	['لو هنرقص على أغنية دلوقتي، هتختار إيه؟', 'If we danced to a song right now, which would it be?'],
	['إيه الكلمة اللي بتوصف السنة دي؟', 'Which word describes this year?'],
	['إيه أكتر حاجة بتحبها في نفسك؟', 'What do you love most about yourself?']
];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayNo = (iso) => Math.floor(new Date(iso + 'T12:00').getTime() / 864e5);

export default {
	title: { ar: 'أسئلة لينا', en: 'Questions for us' },
	render() {
		const ok = live.canWrite();
		return `
		${pageHead(L('أسئلة لينا', 'Questions for us'), L('سؤال كل يوم… وكل واحد فينا يجاوب، من غير ما يشوف إجابة التاني', 'A question every day… we each answer before seeing the other’s'), [{ href: 'questions.html', ar: 'أسئلة لينا', en: 'Questions for us' }], {
			band: `<div class="qs-band" id="qs-band">${Array.from({ length: 7 }, (_, i) => `<span class="qs-float" style="--x:${[6, 18, 84, 94, 12, 78, 50][i]}%;--y:${[20, 70, 18, 64, 44, 46, 8][i]}%;--d:${i * -0.8}s" aria-hidden="true">${i % 2 ? '?' : '♥'}</span>`).join('')}<div class="qs-card" id="qs-card"></div></div>`
		})}
		<section class="sec sec--top"><div class="wrap narrow">
			${ok ? '' : `<div style="margin:0 0 24px">${setupNote()}</div>`}
			<details class="composer" id="qs-answer"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('pen', 22)}</span> ${Y('جاوب على سؤال النهارده', 'جاوبي على سؤال النهارده', 'Answer today’s question')}</summary>
				<form id="qs-form" autocomplete="off">
					<p class="qs-form__q" id="qs-form-q"></p>
					<label class="f"><span>${L('إجابتك', 'Your answer')}</span><textarea name="text" dir="auto" rows="5" maxlength="1200" required></textarea></label>
					<p class="form-msg" id="qs-msg" role="status"></p>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${L('ابعت ♥', 'Send ♥')}</button></div>
				</form>
			</details>
			<div class="qs-today" id="qs-today"></div>
			<h2 class="sec__title">${L('اللي جاوبنا عليه', 'What we’ve answered')}</h2>
			<div class="qs-past" id="qs-past"></div>
			<details class="composer"${ok ? '' : ' hidden'}>
				<summary><span>${doodle('chat', 22)}</span> ${Y('ضيف سؤال من عندك', 'ضيفي سؤال من عندك', 'Add a question of your own')}</summary>
				<form id="qs-new" autocomplete="off">
					<label class="f"><span>${L('السؤال', 'The question')}</span><input name="q" dir="auto" maxlength="160" required></label>
					<div class="f-actions"><button type="submit" class="btn btn--coral">${L('ضيفه', 'Add it')}</button></div>
				</form>
			</details>
		</div></section>
		${related(['journal', 'letters', 'notes'])}`;
	},

	async after(main, s) {
		let data = await live.load('questions');
		const me = live.me(), other = me === 'her' ? 'him' : 'her';
		const nameOf = (w) => App.t(w === 'her' ? s.her : s.him);
		/* the day's question: from the bank and our own, the same on both phones */
		const bank = () => [...BANK.map(([ar, en]) => L(ar, en)), ...(data.items || []).filter((x) => x.type === 'question').sort((a, b) => (a.at || 0) - (b.at || 0)).map((x) => x.text)];
		const questionFor = (iso) => { const b = bank(); return b[((dayNo(iso) % b.length) + b.length) % b.length]; };
		const answer = (iso, who) => (data.items || []).find((x) => x.type === 'answer' && x.date === iso && x.who === who);

		const paint = () => {
			const t = today(), q = answer(t, me)?.q || answer(t, other)?.q || questionFor(t);
			const mine = answer(t, me), theirs = answer(t, other);
			const heart = (who, a) => `<span class="qs-heart${a ? ' is-on' : ''}"><i aria-hidden="true">${a ? '♥' : '♡'}</i>${esc(nameOf(who))}<small>${a ? L('جاوب', 'answered') : L('لسه', 'not yet')}</small></span>`;
			$('#qs-card', main).innerHTML = `<p class="qs-card__k">${L('سؤال النهارده', 'Today’s question')} · ${esc(longDate(t))}</p><p class="qs-card__q" dir="auto">${esc(q)}</p><p class="qs-card__h">${heart('him', answer(t, 'him'))}${heart('her', answer(t, 'her'))}</p>`;
			$('#qs-card', main).classList.remove('is-in'); void main.offsetWidth; $('#qs-card', main).classList.add('is-in');
			$('#qs-form-q', main).textContent = q;
			const ans = $('#qs-answer', main);
			if (mine) ans.hidden = true;
			/* today: my answer, and theirs only once I've answered */
			$('#qs-today', main).innerHTML = me ? `
				<div class="qs-pair">
					<article class="qs-bubble qs-bubble--me"><b>${esc(nameOf(me))}</b>${mine ? `<p dir="auto">${esc(mine.text)}</p>` : `<p class="qs-wait">${Y('لسه ماجاوبتش', 'لسه ماجاوبتيش', 'You haven’t answered yet')}</p>`}</article>
					<article class="qs-bubble qs-bubble--them"><b>${esc(nameOf(other))}</b>${theirs ? (mine ? `<p dir="auto">${esc(theirs.text)}</p>` : `<p class="qs-blur" aria-hidden="true">${esc(theirs.text.replace(/\S/g, '•'))}</p><p class="qs-wait">${Y('جاوب الأول عشان تشوف إجابتها', 'جاوبي الأول عشان تشوفي إجابته', 'Answer first to see theirs')}</p>`) : `<p class="qs-wait">${L('لسه ماجاوبش', 'Hasn’t answered yet')}</p>`}</article>
				</div>` : '';
			/* every past day we both answered */
			const dates = [...new Set((data.items || []).filter((x) => x.type === 'answer' && x.date < t).map((x) => x.date))].sort().reverse();
			$('#qs-past', main).innerHTML = dates.map((d) => {
				const a = answer(d, 'him'), b = answer(d, 'her');
				const both = a && b;
				return `<article class="qs-day">
					<p class="qs-day__d">${esc(longDate(d))}</p>
					<h3 dir="auto">${esc((a || b).q || questionFor(d))}</h3>
					${both ? `<div class="qs-pair">${[['him', a], ['her', b]].map(([w, x]) => `<div class="qs-bubble${w === me ? ' qs-bubble--me' : ' qs-bubble--them'}"><b>${esc(nameOf(w))}</b><p dir="auto">${esc(x.text)}</p></div>`).join('')}</div>`
					: `<p class="qs-wait">${L(`جاوب ${nameOf(a ? 'him' : 'her')} بس`, `Only ${nameOf(a ? 'him' : 'her')} answered`)}</p>`}
				</article>`;
			}).join('') || `<p class="empty">${L('أول يوم نجاوب فيه هيتحفظ هنا', 'The first day we both answer is kept here')}</p>`;
		};

		const f = $('#qs-form', main);
		f.onsubmit = async (e) => {
			e.preventDefault();
			const msg = $('#qs-msg', main), t = today();
			const text = f.text.value.trim();
			if (!text || !me) return;
			try {
				data = await live.save('questions', (d) => { d.items = (d.items || []).filter((x) => x.id !== `${t}-${me}`); d.items.push({ id: `${t}-${me}`, type: 'answer', date: t, who: me, q: questionFor(t), text, at: Date.now() }); });
				f.reset(); msg.textContent = L('اتبعتت ♥', 'Sent ♥'); paint();
			} catch (err) { msg.textContent = live.why(err); }
		};
		const fq = $('#qs-new', main);
		fq.onsubmit = async (e) => {
			e.preventDefault();
			const text = fq.q.value.trim();
			if (!text) return;
			try { data = await live.save('questions', (d) => { (d.items = d.items || []).push({ id: live.newId(), type: 'question', text, by: me, at: Date.now() }); }); fq.reset(); paint(); } catch (err) { alert(live.why(err)); }
		};
		paint();
	}
};
