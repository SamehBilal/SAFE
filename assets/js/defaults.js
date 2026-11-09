/* What each shared list starts as before anything was saved (the phones and tools/import.mjs both start from this). */

/* Ideas to start from — edit, remove or add your own on the page. */
const DEFAULTS = {
	outfit: [['ليلة بيجامات', 'Pyjama night'], ['ستايل التسعينات', '90s retro'], ['أبيض في أبيض', 'All white'], ['أحمر وأسود', 'Red & black'], ['زمن الفن الجميل', 'Golden-age Egyptian cinema'], ['لبس متطابق', 'Matching outfits'], ['شخصية من فيلم', 'A movie character'], ['سهرة شيك', 'Black tie at home']],
	dining: [['مكان جديد عمرنا ما رحناه', 'Somewhere we’ve never been'], ['ستاربكس بتاعنا', 'Our Starbucks'], ['سمك وسي فود', 'Fish & seafood'], ['سوشي', 'Sushi'], ['مشويات', 'Grills'], ['إيطالي', 'Italian'], ['فطار برا', 'Breakfast out']],
	delivery: [['بيتزا', 'Pizza'], ['برجر', 'Burgers'], ['كشري', 'Koshary'], ['شاورما', 'Shawarma'], ['فطير مشلتت', 'Feteer'], ['سوشي', 'Sushi'], ['حلويات بس', 'Only desserts']],
	movie: [['كوميدي', 'A comedy'], ['فيلم عربي قديم', 'An old Arabic film'], ['رومانسي', 'Romance'], ['أنيميشن مع الولاد', 'Animated, with the boys'], ['إثارة', 'A thriller'], ['فيلم اتفرجنا عليه زمان', 'One we saw years ago'], ['اختيار إسراء', 'Esraa’s pick'], ['اختيار سامح', 'Sameh’s pick']]
};
const drawInit = () => ({
	lists: Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, v.map(([ar, en], n) => ({ id: `d-${k}-${n}`, text: { ar, en } }))])),
	history: []
});
export const INIT = {
	draw: drawInit
};
export const initOf = (kind) => (INIT[kind] ? INIT[kind]() : { items: [] });
