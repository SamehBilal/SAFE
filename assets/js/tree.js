/* Our family tree, on the family page, after tenebrius' «Family Tree» pen (codepen.io/tenebrius/pen/EaKGLKL):
   arch-topped cards with a glow behind each face, thin branch lines, and a card with the person's story when you tap
   them. Both our parents at the top, the two of us in the middle with our brothers and sisters beside us, the boys
   underneath. The tree keeps a spot for everyone in the family — his father and mother, his two brothers and two
   sisters; her father and mother, her brother and sister — shown as "waiting for a name" until it's filled from a
   phone (the shared list content/live/tree.bin, encrypted like the rest). The four of us come from story.json. */
import { L, Y, T, esc, img, App, $, $$, hydrate, age } from './shell.js';
import { doodle } from './doodles.js';
import * as live from './live.js';

const RELS = [
	{ id: 'father', ar: 'الأب', en: 'Father', of: ['أبو', 'father'], gone: 'الله يرحمه' },
	{ id: 'mother', ar: 'الأم', en: 'Mother', of: ['أم', 'mother'], gone: 'الله يرحمها' },
	{ id: 'brother', ar: 'أخ', en: 'Brother', of: ['أخو', 'brother'], gone: 'الله يرحمه' },
	{ id: 'sister', ar: 'أخت', en: 'Sister', of: ['أخت', 'sister'], gone: 'الله يرحمها' }
];
const rel = (id) => RELS.find((x) => x.id === id) || RELS[2];

/* the spots the tree keeps for each side, filled in this order */
const SLOTS = { him: { father: 1, mother: 1, brother: 2, sister: 2 }, her: { father: 1, mother: 1, brother: 1, sister: 1 } };

/** The four of us from story.json: the grown-ups (him, her) and the kids. */
function core(s) {
	const ms = s.family?.members || [];
	const grown = ms.filter((m) => !m.kid);
	return { him: grown[0], her: grown[1], kids: ms.filter((m) => m.kid) };
}

const colour = (side) => (side === 'her' ? '#c2185b' : '#0e6990');
const initials = (name) => [...String(name).trim()][0] || '♥';
/** "Sameh's father" / «أبو سامح» */
const relOf = (r, s, side) => { const x = rel(r); const n = App.t(side === 'her' ? s.her : s.him); return L(`${x.of[0]} ${n}`, `${n}’s ${x.of[1]}`); };

function face(p, member, size = 34) {
	if (p.photo) return img(p.photo, '', '');
	if (member) return `<span class="ft__face">${doodle(p.emoji || 'heart', size)}</span>`;
	return `<span class="ft__face"><span class="ft__init" aria-hidden="true">${esc(initials(p.name))}</span></span>`;
}

function node(s, p, { member = false, side = '', cls = '' } = {}) {
	const name = member ? App.t(p.name) : p.name;
	const sub = member ? (p.kid && p.born ? age(p.born) : App.t(p.role)) : relOf(p.rel, s, side);
	return `<button type="button" class="ft__node ${cls}${p.gone ? ' is-gone' : ''}" data-open="${esc(p.id)}" data-side="${side}" style="--c:${esc(p.color || colour(side))}">
		<span class="ft__pic">${face(p, member)}</span>
		<b dir="auto">${esc(name)}${p.gone ? ' <span aria-hidden="true">♡</span>' : ''}</b>
		${sub ? `<small dir="auto">${esc(sub)}</small>` : ''}
	</button>`;
}

/** A spot still waiting for a name: tap it to fill it in. */
function empty(s, side, r, cls) {
	const ok = live.canWrite();
	return `<button type="button" class="ft__node is-empty ${cls}" data-slot="${side}|${r}" data-side="${side}" style="--c:${colour(side)}"${ok ? '' : ' disabled'}>
		<span class="ft__pic"><span class="ft__face"><span class="ft__init" aria-hidden="true">?</span></span></span>
		<b>${esc(relOf(r, s, side))}</b>
		<small>${ok ? Y('دوس واكتب الاسم', 'دوسي واكتبي الاسم', 'Tap to add the name') : L('لسه من غير اسم', 'No name yet')}</small>
	</button>`;
}

export function treeHTML(s) {
	const ok = live.canWrite();
	const { him, her } = core(s);
	return `<section class="ftree reveal" aria-labelledby="ft-h">
		<h2 class="sec__title" id="ft-h">${L('شجرة عيلتنا', 'Our family tree')}</h2>
		<div class="ft__scroll"><div class="ft" id="ft"><svg class="ft__lines" aria-hidden="true"></svg><div class="ft__rows" id="ft-rows"></div></div></div>
		${ok && him && her ? `<details class="composer narrow ft__add" id="ft-add">
			<summary><span>${doodle('family', 22)}</span> ${Y('ضيف حد للشجرة', 'ضيفي حد للشجرة', 'Add someone to the tree')}</summary>
			<form id="ft-form" autocomplete="off">
				<div class="f-row">
					<label class="f f--grow"><span>${L('الاسم', 'Name')}</span><input name="name" dir="auto" maxlength="40" required></label>
					<label class="f"><span>${L('يبقى إيه؟', 'Who are they?')}</span><select name="rel">${RELS.map((r) => `<option value="${r.id}">${esc(L(r.ar, r.en))}</option>`).join('')}</select></label>
				</div>
				<div class="f-row">
					<label class="f"><span>${L('من ناحية مين؟', 'On whose side?')}</span><select name="side"><option value="him">${T(him.name)}</option><option value="her">${T(her.name)}</option></select></label>
					<label class="f"><span>${L('سنة الميلاد (اختياري)', 'Year born (optional)')}</span><input name="born" type="number" inputmode="numeric" min="1900" max="2100"></label>
				</div>
				<label class="f"><span>${L('كلمة عنه أو عنها (اختياري)', 'A line about them (optional)')}</span><input name="note" dir="auto" maxlength="200"></label>
				<label class="check"><input type="checkbox" name="gone"> ${L('الله يرحمه / يرحمها', 'In loving memory')}</label>
				<p class="form-msg" id="ft-msg" role="status"></p>
				<div class="f-actions"><button type="submit" class="btn btn--coral">${L('على الشجرة ♥', 'Onto the tree ♥')}</button></div>
			</form>
		</details>` : ''}
		<div class="ft-card" id="ft-card" hidden></div>
	</section>`;
}

export async function wireTree(main, s) {
	const ft = $('#ft', main);
	if (!ft) return;
	const rows = $('#ft-rows', main), svg = $('.ft__lines', ft), card = $('#ft-card', main);
	const { him, her, kids } = core(s);
	if (!him || !her) { ft.closest('.ftree').hidden = true; return; }
	let data = { items: [] };

	const draw = () => {
		const items = data.items || [];
		// one side's people for a relation, then empty spots up to the number the tree keeps
		const spots = (side, r, cls) => {
			const got = items.filter((p) => p.side === side && p.rel === r).sort((a, b) => (+a.born || 9999) - (+b.born || 9999));
			const out = got.map((p) => node(s, p, { side, cls }));
			for (let k = got.length; k < (SLOTS[side][r] || 0); k++) out.push(empty(s, side, r, cls));
			return out.join('');
		};
		const parents = (side) => `<div class="ft__couple" data-g="${side}-parents">${spots(side, 'father', '')}${spots(side, 'mother', '')}</div>`;
		// brothers and sisters beside each of us; his on his outer side, hers on hers
		rows.innerHTML = `
			<div class="ft__row ft__row--top">${parents('him')}${parents('her')}</div>
			<div class="ft__row ft__row--mid">
				<div class="ft__sibs" data-g="him-sibs">${spots('him', 'sister', 'ft__node--sm')}${spots('him', 'brother', 'ft__node--sm')}</div>
				<div class="ft__couple ft__us" data-g="us">${node(s, him, { member: true, side: 'him', cls: 'ft__node--us' })}<span class="ft__heart" aria-hidden="true">♥</span>${node(s, her, { member: true, side: 'her', cls: 'ft__node--us' })}</div>
				<div class="ft__sibs" data-g="her-sibs">${spots('her', 'brother', 'ft__node--sm')}${spots('her', 'sister', 'ft__node--sm')}</div>
			</div>
			${kids.length ? `<div class="ft__row ft__row--kids" data-g="kids">${kids.map((k) => node(s, k, { member: true, cls: 'ft__node--kid' })).join('')}</div>` : ''}`;
		hydrate(rows);
		for (const im of $$('img', rows)) im.addEventListener('load', lines, { once: true });
		requestAnimationFrame(lines);
	};

	// branch lines: from the middle of each couple down to their children, with soft corners like the pen's
	function lines() {
		if (!ft.isConnected) return;
		const box = ft.getBoundingClientRect();
		svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
		svg.setAttribute('width', box.width);
		svg.setAttribute('height', box.height);
		const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left - box.left + b.width / 2, top: b.top - box.top, bottom: b.bottom - box.top, mid: b.top - box.top + b.height * 0.42 }; };
		const f = (n) => n.toFixed(1);
		const paths = [];
		const elbow = (from, tos) => {
			if (!tos.length) return;
			const midY = (from.bottom + Math.min(...tos.map((t) => t.top))) / 2;
			paths.push(`M${f(from.x)} ${f(from.bottom)}V${f(midY)}`);
			for (const t of tos) {
				const dx = t.x - from.x, rad = Math.min(8, Math.abs(dx) / 2);
				if (Math.abs(dx) < 1) { paths.push(`M${f(t.x)} ${f(midY)}V${f(t.top)}`); continue; }
				const sx = Math.sign(dx);
				paths.push(`M${f(from.x)} ${f(midY)}H${f(t.x - sx * rad)}Q${f(t.x)} ${f(midY)} ${f(t.x)} ${f(midY + rad)}V${f(t.top)}`);
			}
		};
		const g = (k) => $(`[data-g="${k}"]`, rows);
		const childrenOf = (side) => [$(`[data-open="${CSS.escape(side === 'him' ? him.id : her.id)}"]`, g('us')), ...$$('.ft__node', g(side + '-sibs'))].filter(Boolean).map(r);
		for (const side of ['him', 'her']) {
			const nodes = $$('.ft__node', g(side + '-parents')).map(r);
			if (!nodes.length) continue;
			if (nodes.length >= 2) paths.push(`M${f(nodes[0].x)} ${f(nodes[0].mid)}H${f(nodes.at(-1).x)}`);
			elbow({ x: nodes.reduce((a, n) => a + n.x, 0) / nodes.length, bottom: nodes[0].mid }, childrenOf(side));
		}
		const us = $$('.ft__node--us', rows).map(r);
		const kidEls = $$('.ft__node--kid', rows).map(r);
		let wed = '';
		if (us.length === 2) {
			wed = `<path class="ft__wed" d="M${f(us[0].x)} ${f(us[0].mid)}H${f(us[1].x)}"/>`;
			if (kidEls.length) elbow({ x: (us[0].x + us[1].x) / 2, bottom: us[0].mid }, kidEls);
		}
		svg.innerHTML = paths.map((d) => `<path d="${d}"/>`).join('') + wed;
	}

	/* the person's card, like the pen's modal: a big arch portrait, the name, who they are, and a line about them */
	let back = null;
	const closeCard = () => { card.hidden = true; card.innerHTML = ''; back?.focus({ preventScroll: true }); };
	function openCard(id, from) {
		const member = [him, her, ...kids].find((m) => m.id === id);
		const p = member || (data.items || []).find((x) => x.id === id);
		if (!p) return;
		back = from;
		const side = member ? (p === her ? 'her' : p === him ? 'him' : '') : p.side;
		const name = member ? App.t(p.name) : p.name;
		const who = member ? (p.kid && p.born ? age(p.born) : App.t(p.role)) : relOf(p.rel, s, side);
		const born = p.born ? String(p.born).slice(0, 4) : '';
		const mine = !member && live.canWrite() && (p.by === live.me() || !p.by);
		card.style.setProperty('--c', p.color || colour(side));
		card.innerHTML = `<div class="ft-card__box" role="dialog" aria-modal="true" aria-labelledby="ft-card-h">
			<button class="ft-card__x" type="button" aria-label="${Y('اقفل', 'اقفلي', 'Close')}">✕</button>
			<div class="ft-card__pic"><span class="ft__pic">${face(p, !!member, 60)}</span></div>
			<h3 id="ft-card-h" dir="auto">${esc(name)}</h3>
			<p class="ft-card__rel" dir="auto">${esc([who, born && !p.kid ? L(`مواليد ${born}`, `born ${born}`) : ''].filter(Boolean).join(' · '))}</p>
			${p.gone ? `<p class="ft-card__rel">♡ ${member ? L('الله يرحمه', 'In loving memory') : L(rel(p.rel).gone, 'In loving memory')}</p>` : ''}
			${p.note ? `<p class="ft-card__note" dir="auto">${esc(p.note)}</p>` : ''}
			<div class="ft-card__acts">
				${member ? `<a class="btn btn--sm btn--coral" href="member.html?id=${esc(p.id)}">${L('صفحته', 'Their page')} ${App.arrow}</a>` : ''}
				${mine ? `<button class="link link--danger" type="button" data-untree="${esc(p.id)}">${Y('شيله من الشجرة', 'شيليه من الشجرة', 'Take off the tree')}</button>` : ''}
			</div>
		</div>`;
		hydrate(card);
		card.hidden = false;
		$('.ft-card__x', card).focus({ preventScroll: true });
	}
	card.addEventListener('click', async (e) => {
		if (e.target === card || e.target.closest('.ft-card__x')) return closeCard();
		const b = e.target.closest('[data-untree]');
		if (!b || !confirm(Y('تشيله من الشجرة؟', 'تشيليه من الشجرة؟', 'Take them off the tree?'))) return;
		try { data = await live.save('tree', (d) => { d.items = (d.items || []).filter((p) => p.id !== b.dataset.untree); }); closeCard(); draw(); } catch (err) { alert(live.why(err)); }
	});
	card.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });

	const form = $('#ft-form', main);
	rows.addEventListener('click', (e) => {
		const open = e.target.closest('[data-open]');
		if (open) return openCard(open.dataset.open, open);
		const slot = e.target.closest('[data-slot]');
		if (slot && form) {
			// an empty spot: the form opens already knowing who it's for, waiting for the name
			const [side, r] = slot.dataset.slot.split('|');
			$('#ft-add', main).open = true;
			form.side.value = side;
			form.rel.value = r;
			form.scrollIntoView({ behavior: 'smooth', block: 'center' });
			setTimeout(() => form.name.focus({ preventScroll: true }), 350);
		}
	});
	if (form) form.onsubmit = async (e) => {
		e.preventDefault();
		const msg = $('#ft-msg', main);
		const p = { id: live.newId(), name: form.name.value.trim(), rel: form.rel.value, side: form.side.value, born: +form.born.value || undefined, note: form.note.value.trim() || undefined, gone: form.gone.checked || undefined, by: live.me(), at: Date.now() };
		if (!p.name) return;
		try { data = await live.save('tree', (d) => { (d.items = d.items || []).push(p); }); form.reset(); msg.textContent = L('اتضاف للشجرة ♥', 'On the tree ♥'); draw(); }
		catch (err) { msg.textContent = live.why(err); }
	};

	draw();
	data = await live.load('tree').catch(() => ({ items: [] }));
	draw();
	let w = ft.clientWidth;
	new ResizeObserver(() => { if (ft.isConnected && Math.abs(ft.clientWidth - w) > 8) { w = ft.clientWidth; lines(); } }).observe(ft);
}
