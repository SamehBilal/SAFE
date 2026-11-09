/* A full-screen sketch pad. openSketch({ title }) resolves to a webp Blob, or null if cancelled.
   Finger, pen or mouse; pen pressure changes the line width. */
import { L, esc } from './shell.js';

const COLORS = ['#133447', '#0e6990', '#f2726f', '#c2185b', '#e39b2d', '#ffc94a', '#5a9e6f', '#8e5bd1', '#8b5a2b', '#ffffff'];
const SIZES = [3, 7, 14];

export function openSketch({ title = '', hint = '' } = {}) {
	return new Promise((resolve) => {
		const box = document.createElement('div');
		box.className = 'sketch';
		box.setAttribute('role', 'dialog');
		box.setAttribute('aria-modal', 'true');
		box.innerHTML = `
			<header class="sketch__bar">
				<button type="button" class="btn btn--ghost btn--sm" data-act="cancel">${L('إلغاء', 'Cancel')}</button>
				<b class="sketch__title">${esc(title || L('ارسموا', 'Draw'))}</b>
				<button type="button" class="btn btn--coral btn--sm" data-act="save">${L('احفظوا ♥', 'Save ♥')}</button>
			</header>
			${hint ? `<p class="sketch__hint">${esc(hint)}</p>` : ''}
			<div class="sketch__stage"><canvas aria-label="${L('لوحة الرسم', 'Drawing canvas')}"></canvas></div>
			<footer class="sketch__tools">
				<div class="sketch__colors">${COLORS.map((c, k) => `<button type="button" class="sw${k === 0 ? ' is-on' : ''}" data-color="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div>
				<div class="sketch__row">
					${SIZES.map((s, k) => `<button type="button" class="sz${k === 1 ? ' is-on' : ''}" data-size="${s}" aria-label="${L('سُمك', 'Size')} ${s}"><i style="--s:${s}px"></i></button>`).join('')}
					<button type="button" class="tool" data-act="eraser" aria-pressed="false" title="${L('أستيكة', 'Eraser')}">🧽</button>
					<button type="button" class="tool" data-act="undo" title="${L('رجوع', 'Undo')}">↶</button>
					<button type="button" class="tool" data-act="clear" title="${L('امسحوا الكل', 'Clear')}">🗑️</button>
				</div>
			</footer>`;
		document.body.append(box);
		document.body.classList.add('menu-lock');

		const canvas = box.querySelector('canvas');
		const ctx = canvas.getContext('2d');
		const strokes = [];
		let color = COLORS[0];
		let size = SIZES[1];
		let eraser = false;
		let cur = null;

		const fit = () => {
			const r = canvas.parentElement.getBoundingClientRect();
			const dpr = Math.min(devicePixelRatio || 1, 2);
			canvas.width = Math.round(r.width * dpr);
			canvas.height = Math.round(r.height * dpr);
			canvas.style.width = r.width + 'px';
			canvas.style.height = r.height + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			redraw();
		};
		// strokes are kept in 0..1 coordinates so a resize or rotation keeps the drawing
		const redraw = () => {
			const w = canvas.clientWidth, h = canvas.clientHeight;
			ctx.fillStyle = '#fffdf8';
			ctx.fillRect(0, 0, w, h);
			for (const s of strokes) drawStroke(ctx, s, w, h);
		};
		addEventListener('resize', fit);
		requestAnimationFrame(fit);

		const pt = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.pressure && e.pointerType === 'pen' ? e.pressure : 0.5]; };
		canvas.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			canvas.setPointerCapture(e.pointerId);
			cur = { color: eraser ? '#fffdf8' : color, size: eraser ? size * 2.5 : size, pts: [pt(e)] };
			strokes.push(cur);
			redraw();
		});
		canvas.addEventListener('pointermove', (e) => {
			if (!cur) return;
			for (const ev of e.getCoalescedEvents?.() || [e]) cur.pts.push(pt(ev));
			redraw();
		});
		const end = () => { cur = null; };
		canvas.addEventListener('pointerup', end);
		canvas.addEventListener('pointercancel', end);

		box.addEventListener('click', async (e) => {
			const b = e.target.closest('button');
			if (!b) return;
			if (b.dataset.color) {
				color = b.dataset.color; eraser = false;
				box.querySelectorAll('.sw').forEach((x) => x.classList.toggle('is-on', x === b));
				box.querySelector('[data-act=eraser]').setAttribute('aria-pressed', 'false');
			} else if (b.dataset.size) {
				size = +b.dataset.size;
				box.querySelectorAll('.sz').forEach((x) => x.classList.toggle('is-on', x === b));
			} else if (b.dataset.act === 'eraser') {
				eraser = !eraser; b.setAttribute('aria-pressed', String(eraser));
			} else if (b.dataset.act === 'undo') {
				strokes.pop(); redraw();
			} else if (b.dataset.act === 'clear') {
				if (strokes.length && confirm(L('تمسحوا الرسمة كلها؟', 'Clear the whole drawing?'))) { strokes.length = 0; redraw(); }
			} else if (b.dataset.act === 'cancel') {
				if (!strokes.length || confirm(L('تسيبوا الرسمة من غير ما تحفظيها؟', 'Leave without saving the drawing?'))) close(null);
			} else if (b.dataset.act === 'save') {
				if (!strokes.length) return close(null);
				close(await exportBlob(strokes, canvas.clientWidth / canvas.clientHeight));
			}
		});

		function close(v) {
			removeEventListener('resize', fit);
			document.body.classList.remove('menu-lock');
			box.remove();
			resolve(v);
		}
	});
}

function drawStroke(ctx, s, w, h) {
	ctx.strokeStyle = s.color;
	ctx.fillStyle = s.color;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	const p = s.pts;
	if (p.length === 1) {
		ctx.beginPath();
		ctx.arc(p[0][0] * w, p[0][1] * h, s.size / 2, 0, Math.PI * 2);
		ctx.fill();
		return;
	}
	for (let i = 1; i < p.length; i++) {
		ctx.lineWidth = s.size * (0.5 + p[i][2]);
		ctx.beginPath();
		ctx.moveTo(p[i - 1][0] * w, p[i - 1][1] * h);
		ctx.lineTo(p[i][0] * w, p[i][1] * h);
		ctx.stroke();
	}
}

/** Redraw at a fixed size (1000px on the long side) so every sketch saves the same way. */
function exportBlob(strokes, ratio) {
	const long = 1000;
	const w = ratio >= 1 ? long : Math.round(long * ratio);
	const h = ratio >= 1 ? Math.round(long / ratio) : long;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const ctx = c.getContext('2d');
	ctx.fillStyle = '#fffdf8';
	ctx.fillRect(0, 0, w, h);
	const scale = w / Math.max(1, document.querySelector('.sketch canvas')?.clientWidth || w);
	for (const s of strokes) drawStroke(ctx, { ...s, size: s.size * scale }, w, h);
	return new Promise((r) => c.toBlob((b) => r(b), 'image/webp', 0.85));
}
