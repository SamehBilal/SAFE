# حكاية حبنا — Our Love Story ♥

A private birthday gift: a full website, Arabic first (right-to-left) with English one tap away.
Questions only she can answer → loader → intro → the site. Installable as an app (PWA), works offline.

## Pages
| Page | What's on it |
| --- | --- |
| `index.html` | Home: birthday badge, us in numbers (days together, the boys' ages), shortcuts, latest days, the poster |
| `story.html` → `moment.html?id=…` | The timeline, by year; each date has its own page |
| `chapters.html` → `chapter.html?id=…` | Big days: proposal, wedding, Fahd, Abdulrahman — long text + photos |
| `places.html` | Our places (photo cards that tilt with the mouse) |
| `gallery.html` | Photo album, filterable by album |
| `notes.html` · `letters.html` | Handwritten love notes · letters in envelopes she opens |
| `family.html` → `member.html?id=…` | The family newspaper; one page per person with age and next birthday |
| `birthday.html` · `wishes.html` | Candles she taps out (confetti) · the wish jar |

Every page shares the header (mega menus on desktop, a “الفهرس” contents menu on phones), the footer,
and the language switch. The code: `assets/js/shell.js` (shared), `assets/js/pages/<page>.js` (one per page).

## How it stays private
Everything readable lives in `private/` (git-ignored). `node tools/build.mjs` encrypts it into `content/`
with AES-256; only the right answers unlock the key. So the repo and site can be **public**.
After she unlocks once, her phone remembers (footer: **اقفلي 🔒** to lock again).

## Editing
| File | What it is |
| --- | --- |
| `private/questions.json` | Questions + hints (`{ "ar": …, "en": … }`), and every accepted answer. Case, spaces, punctuation, Arabic letter forms and Arabic digits are ignored, so `١٣/٠٧/٢٠٠٩` = `13.07.2009`. |
| `private/story.json` | All the content. Any text can be a plain string or `{ "ar": "…", "en": "…" }`. |
| `private/media/` | Photos/videos. Refer to them by file name in `story.json` (`"photo": "wedding.jpg"`). |
| `private/.master-key` | Created on first build. **Keep it** — if it changes, she has to answer again. |

Useful fields in `story.json`: `timeline[].photos`, `timeline[].story` (long text for its page),
`chapters[].photos` (`[{ "photo": "x.jpg", "caption": {…} }]`), `gallery[].album`, `gallery[].who: ["fahd"]`
(shows on that person's page), `family.members[].photo`, `birthday.candles`, `letters[]`.

Then:

```bash
node tools/build.mjs
```

Starting fresh? Copy `tools/example/*.json` into `private/`.
Tips: shrink photos to ~1600px wide; keep videos short; make at least one answer something nobody could guess.

## Testing
```bash
node tools/serve.mjs
```
Open http://localhost:5174 (add `?intro` to replay the intro).

## Publishing (GitHub Pages)
Commit everything except `private/` (already ignored), push, enable Pages on `main`.
Back up `private/` — it's the only readable copy of the story.
