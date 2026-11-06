/* Shared by the browser (assets/js/app.js) and the build tool (tools/build.mjs).
   Keep this file free of DOM and Node APIs so both can import it.

   How the lock works
   - Everything private (the story, the photos) is encrypted with one random "master key".
   - The master key is itself encrypted ("wrapped") once for every accepted combination
     of answers. Her answers -> PBKDF2 -> a key that can unwrap the master key.
   - No answers, no master key, nothing to read. The questions are the only plain text. */

export const ITERATIONS = 600000;

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();

/** Make an answer forgiving: case, spaces, punctuation, Arabic letter forms, Arabic digits. */
export function normalize(input) {
	return String(input ?? '')
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
		.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
		.replace(/[ً-ٰٟـ]/g, '')
		.replace(/[أإآٱ]/g, 'ا')
		.replace(/ة/g, 'ه')
		.replace(/ى/g, 'ي')
		.replace(/[^\p{L}\p{N}]/gu, '');
}

export function toB64(bytes) {
	let s = '';
	const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
	return btoa(s);
}

export function fromB64(str) {
	const s = atob(str);
	const out = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
	return out;
}

export function randomBytes(n) {
	return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

/** answers: array of strings, in question order. */
export async function deriveKek(answers, salt, iterations = ITERATIONS) {
	const secret = answers.map(normalize).join('␞');
	const base = await subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
	return subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		base,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export function importMaster(raw) {
	return subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Returns iv(12) + ciphertext as one Uint8Array. */
export async function seal(key, bytes) {
	const iv = randomBytes(12);
	const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
	const out = new Uint8Array(12 + ct.length);
	out.set(iv, 0);
	out.set(ct, 12);
	return out;
}

/** Inverse of seal(). Throws if the key is wrong. */
export async function open(key, sealed) {
	const b = sealed instanceof Uint8Array ? sealed : new Uint8Array(sealed);
	return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, key, b.subarray(12)));
}

/** Try her answers against the vault. Resolves to the raw master key, or null. */
export async function unlock(vault, answers) {
	const kek = await deriveKek(answers, fromB64(vault.salt), vault.iter);
	for (const wrapped of vault.keys) {
		try {
			return await open(kek, fromB64(wrapped));
		} catch {
			/* not this combination */
		}
	}
	return null;
}

export async function readVault(vault, masterRaw) {
	const key = await importMaster(masterRaw);
	const json = new TextDecoder().decode(await open(key, fromB64(vault.data)));
	return { key, story: JSON.parse(json) };
}
