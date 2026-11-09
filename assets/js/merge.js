/* Changes to our shared lists, as small patches that can travel in a file (used by the phones and by tools/import.mjs).

   diff(base, next) says what changed; apply(base, patch) does it again. Lists of things with an `id` are matched by id,
   so a patch adds, changes or removes single entries and never wipes out what someone else added meanwhile.
   Applying the same patch twice changes nothing the second time. */

const plain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const byId = (a) => Array.isArray(a) && a.every((x) => plain(x) && 'id' in x);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/** What it takes to turn `a` into `b`, or undefined when they're the same. */
export function diff(a, b) {
	if (same(a, b)) return undefined;
	if (b === undefined) return { $del: 1 };
	if (byId(b) && (a === undefined || byId(a))) {
		const A = new Map((a || []).map((x) => [x.id, x]));
		const B = new Set(b.map((x) => x.id));
		const set = {};
		for (const x of b) {
			if (!A.has(x.id)) set[x.id] = { $v: x };
			else { const d = diff(A.get(x.id), x); if (d !== undefined) set[x.id] = d; }
		}
		const del = [...A.keys()].filter((id) => !B.has(id));
		return { $arr: 1, set, del };
	}
	if (plain(b) && (a === undefined || plain(a))) {
		const k = {};
		const A = a || {};
		for (const key of new Set([...Object.keys(A), ...Object.keys(b)])) {
			const d = diff(A[key], b[key]);
			if (d !== undefined) k[key] = d;
		}
		return { $obj: 1, k };
	}
	return { $v: b };
}

/** `a` with the patch done to it (a new value; `a` is left alone). */
export function apply(a, p) {
	if (p === undefined) return clone(a);
	if ('$v' in p) return clone(p.$v);
	if (p.$del) return undefined;
	if (p.$arr) {
		const del = new Set(p.del || []);
		const out = (byId(a) ? clone(a) : []).filter((x) => !del.has(x.id));
		for (const [id, q] of Object.entries(p.set || {})) {
			const i = out.findIndex((x) => String(x.id) === id);
			if (i >= 0) out[i] = apply(out[i], q);
			else if ('$v' in q) out.push(clone(q.$v)); // a change to something that was removed meanwhile is dropped
		}
		return out;
	}
	if (p.$obj) {
		const out = plain(a) ? clone(a) : {};
		for (const [key, q] of Object.entries(p.k || {})) {
			const v = apply(out[key], q);
			if (v === undefined) delete out[key]; else out[key] = v;
		}
		return out;
	}
	return clone(a);
}

/** Two patches on the same base, one after the other, as one patch. */
export const combine = (base, p1, p2) => diff(base, apply(apply(base, p1), p2));
