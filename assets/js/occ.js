/* Dates the occasion pages share: the next time a yearly day comes round, the Islamic calendar's big days (worked
   out with the browser's Umm al-Qura calendar, so they can be a day off from the moon sighting in Egypt), the
   Egyptian days of the year, and small helpers for counting the days to them. */
import { L, num } from './shell.js';

export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const daysTo = (d) => Math.round((d - today()) / 864e5);
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };

/** The next time a month-day comes round (today counts). */
export function nextMD(isoDate, from = today()) {
	const [, m, d] = String(isoDate).split('-').map(Number);
	let n = new Date(from.getFullYear(), m - 1, d);
	if (n < from) n = new Date(from.getFullYear() + 1, m - 1, d);
	return n;
}

/** «النهارده» / «بكرة» / «بعد ٥ أيام» */
export function inDays(n) {
	if (n === 0) return L('النهارده', 'today');
	if (n === 1) return L('بكرة', 'tomorrow');
	return L(`بعد ${num(n)} ${n === 2 ? 'يوم' : n <= 10 ? 'أيام' : 'يوم'}`, `in ${n} days`);
}

/* ---------- the Islamic calendar ---------- */
const HIJRI = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', day: 'numeric', year: 'numeric' });
export function hijri(d) {
	const p = HIJRI.formatToParts(d);
	const get = (t) => +(p.find((x) => x.type === t)?.value || 0);
	return { y: get('year'), m: get('month'), d: get('day') };
}
/** The next day (from today on) that falls on this Hijri month and day. */
export function nextHijri(month, day, from = today()) {
	const d = new Date(from);
	for (let i = 0; i < 390; i++) {
		const h = hijri(d);
		if (h.m === month && h.d === day) return new Date(d);
		d.setDate(d.getDate() + 1);
	}
	return null;
}
export const HOLY = [
	{ id: 'ramadan', m: 9, d: 1, icon: 'moon', ar: 'أول يوم رمضان', en: 'Ramadan begins' },
	{ id: 'fitr', m: 10, d: 1, icon: 'star', ar: 'عيد الفطر', en: 'Eid al-Fitr' },
	{ id: 'adha', m: 12, d: 10, icon: 'sparkle', ar: 'عيد الأضحى', en: 'Eid al-Adha' },
	{ id: 'hijri', m: 1, d: 1, icon: 'moon', ar: 'رأس السنة الهجرية', en: 'Islamic New Year' },
	{ id: 'mawlid', m: 3, d: 12, icon: 'star', ar: 'المولد النبوي', en: 'The Prophet’s birthday' }
];
export function holyDays(from = today()) {
	return HOLY.map((h) => ({ ...h, date: nextHijri(h.m, h.d, from) })).filter((h) => h.date);
}
/** Is it Ramadan today, and which day of it? */
export function ramadanDay(d = today()) { const h = hijri(d); return h.m === 9 ? h.d : 0; }

/* ---------- Egypt's days of the year ---------- */
/* Orthodox Easter (Meeus's Julian method, moved to our calendar); Sham El-Nessim is the Monday after */
function easter(y) {
	const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
	const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
	return new Date(y, m - 1, day + 13);
}
export function egyptDays(from = today()) {
	const next = (f) => { const a = f(from.getFullYear()); return a >= from ? a : f(from.getFullYear() + 1); };
	return [
		{ id: 'valentine', icon: 'heart', ar: 'عيد الحب', en: 'Valentine’s Day', date: next((y) => new Date(y, 1, 14)) },
		{ id: 'mother', icon: 'love', ar: 'عيد الأم', en: 'Mother’s Day', date: next((y) => new Date(y, 2, 21)) },
		{ id: 'nessim', icon: 'sun', ar: 'شم النسيم', en: 'Sham El-Nessim', date: next((y) => { const e = easter(y); e.setDate(e.getDate() + 1); return e; }) },
		{ id: 'newyear', icon: 'party', ar: 'راس السنة', en: 'New Year’s Eve', date: next((y) => new Date(y, 11, 31)) }
	];
}

/** A one-line, add-to-calendar file (.ics) for a list of { date, title, yearly } — the phone opens it in its calendar. */
export function ics(events) {
	const d8 = (d) => iso(d).replace(/-/g, '');
	const esc = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//us//occasions//AR', 'CALSCALE:GREGORIAN'];
	events.forEach((e, i) => {
		const end = new Date(e.date); end.setDate(end.getDate() + 1);
		lines.push('BEGIN:VEVENT', `UID:${d8(e.date)}-${i}@us`, `DTSTAMP:${d8(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${d8(e.date)}`, `DTEND;VALUE=DATE:${d8(end)}`, `SUMMARY:${esc(e.title)}`);
		if (e.yearly) lines.push('RRULE:FREQ=YEARLY');
		lines.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'END:VALARM', 'END:VEVENT');
	});
	lines.push('END:VCALENDAR');
	return lines.join('\r\n');
}
