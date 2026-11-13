/* Our family tree, on the family page: both our parents at the top, the two of us in the middle with our brothers
   and sisters beside us, and the boys underneath, joined by hand-drawn lines. The four of us come from story.json;
   everyone else is added from the phones (the shared list content/live/tree.bin) and can be taken off again. */
import { L, T, esc, img, App, $, $$, hydrate, age } from './shell.js';
import { doodle } from './doodles.js';
import * as live from './live.js';

const RELS = [
	{ id: 'father', ar: 'الأب', en: 'Father' }, { id: 'mother', ar: 'الأم', en: 'Mother' },
	{ id: 'brother', ar: 'أخ', en: 'Brother' }, { id: 'sister', ar: 'أخت', en: 'Sister' }
];
const relName = (id) => { const r = RELS.find((x) => x.id === id); return r ? L(r.ar, r.en) : ''; };

/** The four of us from story.json: the grown-ups (him, her) and the kids. */
function core(s) {
	const ms = s.family?.members || [];
	const grown = ms.filter((m) => !m.kid);
	return { him: grown[0], her: grown[1], kids: ms.filter((m) => m.kid) };
}

const initials = (name) => [...String(name).trim()][0] || '♥';
function node(p, { member = false, side = '', cls = '' } = {}) {
	const name = member ? App.t(p.name) : p.name;
	const sub = member ? (p.kid && p.born ? age(p.born) : App.t(p.role)) : [relName(p.rel), p.born ? String(p.born).slice(0, 4) : ''].filter(Boolean).join(' · ');
	const pic = member ? (p.photo ? img(p.photo, '', 'ft__img') : `<span class="ft__emoji">${doodle(p.emoji || 'heart', 34)}</span>`) : `<span class="ft__init" aria-hidden="true">${esc(initials(name))}</span>`;
	const mine = !member && live.canWrite() && p.by === live.me();
	return `<div class="ft__node ${cls}${p.gone ? ' is-gone' : ''}" data-node="${esc(p.id)}" data-side="${side}" style="--c:${esc(p.color || (side === 'her' ? '#c2185b' : '#0e6990'))}">
		${member ? `<a class="ft__pic" href="member.html?id=${esc(p.id)}">${pic}</a>` : `<span class="ft__pic">${pic}</span>`}
		<b dir="auto">${esc(name)}${p.gone ? ' <span aria-label="' + L('الله يرحمه', 'in loving memory') + '">♡</span>' : ''}</b>
		${sub ? `<small dir="auto">${esc(sub)}</small>` : ''}
		${mine ? `<button class="ft__del" type="button" data-untree="${esc(p.id)}" aria-label="${L('شيلوا', 'Remove')} ${esc(name)}">✕</button>` : ''}
	</div>`;
}

export function treeHTML(s) {
	const ok = live.canWrite();
	const { him, her } = core(s);
	return `<section class="ftree reveal" aria-labelledby="ft-h">
		<h2 class="sec__title" id="ft-h">${L('شجرة عيلتنا', 'Our family tree')}</h2>
		<div class="ft__scroll"><div class="ft" id="ft"><svg class="ft__lines" aria-hidden="true"></svg><div class="ft__rows" id="ft-rows"></div></div></div>
		${ok && him && her ? `<details class="composer narrow ft__add">
			<summary><span>${doodle('family', 22)}</span> ${L('ضيفوا حد للشجرة', 'Add someone to the tree')}</summary>
			<form id="ft-form" autocomplete="off">
				<div class="f-row">
					<label class="f f--grow"><span>${L('الاسم', 'Name')}</span><input name="name" dir="auto" maxlength="40" required></label>
					<label class="f"><span>${L('يبقى إيه؟', 'Who are they?')}</span><select name="rel">${RELS.map((r) => `<option value="${r.id}">${esc(L(r.ar, r.en))}</option>`).join('')}</select></label>
				</div>
				<div class="f-row">
					<label class="f"><span>${L('من ناحية مين؟', 'On whose side?')}</span><select name="side"><option value="him">${T(him.name)}</option><option value="her">${T(her.name)}</option></select></label>
					<label class="f"><span>${L('سنة الميلاد (اختياري)', 'Year born (optional)')}</span><input name="born" type="number" inputmode="numeric" min="1900" max="2100"></label>
				</div>
				<label class="check"><input type="checkbox" name="gone"> ${L('الله يرحمه / يرحمها', 'In loving memory')}</label>
				<p class="form-msg" id="ft-msg" role="status"></p>
				<div class="f-actions"><button type="submit" class="btn btn--coral">${L('على الشجرة ♥', 'Onto the tree ♥')}</button></div>
			</form>
		</details>` : ''}
	</section>`;
}

export async function wireTree(main, s) {
	const ft = $('#ft', main);
	if (!ft) return;
	const rows = $('#ft-rows', main), svg = $('.ft__lines', ft);
	const { him, her, kids } = core(s);
	if (!him || !her) { ft.closest('.ftree').hidden = true; return; }
	let data = { items: [] };

	const draw = () => {
		const rel = data.items || [];
		const of = (side, ...r) => rel.filter((p) => p.side === side && r.includes(p.rel));
		const parents = (side) => of(side, 'father', 'mother').sort((a, b) => (a.rel === 'father' ? -1 : 1) - (b.rel === 'father' ? -1 : 1));
		const sibs = (side) => of(side, 'brother', 'sister').sort((a, b) => (+a.born || 9999) - (+b.born || 9999));
		const group = (side, list, cls) => `<div class="ft__couple ${cls}" data-g="${side}">${list.map((p) => node(p, { side })).join('')}</div>`;
		const hp = parents('him'), sp = parents('her');
		rows.innerHTML = `
			<div class="ft__row ft__row--top">
				${hp.length ? group('him-parents', hp, '') : `<div class="ft__couple ft__ghost" data-g="him-parents"><span>${L('أهل', 'Parents of')} ${T(him.name)}</span></div>`}
				${sp.length ? group('her-parents', sp, '') : `<div class="ft__couple ft__ghost" data-g="her-parents"><span>${L('أهل', 'Parents of')} ${T(her.name)}</span></div>`}
			</div>
			<div class="ft__row ft__row--mid">
				<div class="ft__sibs" data-g="him-sibs">${sibs('him').map((p) => node(p, { side: 'him', cls: 'ft__node--sm' })).join('')}</div>
				<div class="ft__couple ft__us" data-g="us">${node(him, { member: true, side: 'him', cls: 'ft__node--us' })}<span class="ft__heart" aria-hidden="true">♥</span>${node(her, { member: true, side: 'her', cls: 'ft__node--us' })}</div>
				<div class="ft__sibs" data-g="her-sibs">${sibs('her').map((p) => node(p, { side: 'her', cls: 'ft__node--sm' })).join('')}</div>
			</div>
			${kids.length ? `<div class="ft__row ft__row--kids" data-g="kids">${kids.map((k) => node(k, { member: true, cls: 'ft__node--kid' })).join('')}</div>` : ''}`;
		hydrate(rows);
		requestAnimationFrame(lines);
	};

	// elbow lines: from the middle of a couple down to each child
	function lines() {
		if (!ft.isConnected) return;
		const box = ft.getBoundingClientRect();
		svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
		svg.setAttribute('width', box.width);
		svg.setAttribute('height', box.height);
		const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left - box.left + b.width / 2, top: b.top - box.top, bottom: b.bottom - box.top, l: b.left - box.left, rr: b.right - box.left }; };
		const pic = (el) => r($('.ft__pic', el) || el);
		const paths = [];
		const elbow = (from, tos) => {
			if (!tos.length) return;
			const midY = (from.bottom + Math.min(...tos.map((t) => t.top))) / 2;
			paths.push(`M${from.x.toFixed(1)} ${from.bottom.toFixed(1)}V${midY.toFixed(1)}`);
			const xs = tos.map((t) => t.x).concat(from.x);
			paths.push(`M${Math.min(...xs).toFixed(1)} ${midY.toFixed(1)}H${Math.max(...xs).toFixed(1)}`);
			for (const t of tos) paths.push(`M${t.x.toFixed(1)} ${midY.toFixed(1)}V${t.top.toFixed(1)}`);
		};
		const g = (k) => $(`[data-g="${k}"]`, rows);
		const kidsOf = (side) => [$(`[data-node="${CSS.escape(side === 'him' ? him.id : her.id)}"]`, g('us')), ...$$('.ft__node', g(side + '-sibs'))].filter(Boolean).map(pic);
		for (const side of ['him', 'her']) {
			const par = g(side + '-parents');
			if (par && !par.classList.contains('ft__ghost')) {
				const nodes = $$('.ft__node', par).map(pic);
				const from = { x: nodes.reduce((a, n) => a + n.x, 0) / nodes.length, bottom: Math.max(...nodes.map((n) => n.bottom)) };
				if (nodes.length === 2) paths.push(`M${nodes[0].x.toFixed(1)} ${(nodes[0].top + (nodes[0].bottom - nodes[0].top) / 2).toFixed(1)}H${nodes[1].x.toFixed(1)}`);
				elbow(from, kidsOf(side));
			}
		}
		const us = $$('.ft__node--us', rows).map(pic);
		const kidEls = $$('.ft__node--kid', rows).map(pic);
		if (us.length === 2 && kidEls.length) elbow({ x: (us[0].x + us[1].x) / 2, bottom: Math.max(us[0].bottom, us[1].bottom) }, kidEls);
		svg.innerHTML = paths.map((d) => `<path d="${d}"/>`).join('');
	}

	ft.closest('.ftree').addEventListener('click', async (e) => {
		const b = e.target.closest('[data-untree]');
		if (!b || !confirm(L('تشيلوه من الشجرة؟', 'Take them off the tree?'))) return;
		try { data = await live.save('tree', (d) => { d.items = (d.items || []).filter((p) => p.id !== b.dataset.untree); }); draw(); } catch (err) { alert(live.why(err)); }
	});
	const form = $('#ft-form', main);
	if (form) form.onsubmit = async (e) => {
		e.preventDefault();
		const msg = $('#ft-msg', main);
		const p = { id: live.newId(), name: form.name.value.trim(), rel: form.rel.value, side: form.side.value, born: +form.born.value || undefined, gone: form.gone.checked || undefined, by: live.me(), at: Date.now() };
		if (!p.name) return;
		try { data = await live.save('tree', (d) => { (d.items = d.items || []).push(p); }); form.reset(); msg.textContent = L('اتضاف للشجرة ♥', 'On the tree ♥'); draw(); }
		catch (err) { msg.textContent = live.why(err); }
	};

	draw();
	data = await live.load('tree').catch(() => ({ items: [] }));
	draw();
	let w = ft.clientWidth;
	new ResizeObserver(() => { if (ft.isConnected && Math.abs(ft.clientWidth - w) > 8) { w = ft.clientWidth; lines(); } }).observe(ft);
	for (const im of $$('img', rows)) im.addEventListener('load', lines, { once: true });
}
