# Our Love Story ♥

A private birthday gift: questions only she can answer → loader → intro → our story.
Installable as an app (PWA), works offline, built for phones first.

## How it stays private
Everything readable lives in `private/` (git-ignored). `node tools/build.mjs` encrypts it into
`content/` with AES-256; the key can only be unlocked by the right answers. So the repo and the
published site can be **public** — without the answers, `content/` is noise.

After she unlocks once, the phone remembers (there's a **Lock 🔒** button in the footer).

## Editing
| File | What it is |
| --- | --- |
| `private/questions.json` | The questions, hints, and every answer you accept for each. Case, spaces, punctuation, Arabic letter forms and Arabic digits are ignored, so `13/07/2009` = `13.07.2009`. Add spelling variants as extra answers. |
| `private/story.json` | All the text: timeline, proposal, places, notes, gallery, family, letter, closing line. |
| `private/media/` | Photos/videos. Refer to them by file name in `story.json` (e.g. `"photo": "wedding.jpg"`). |
| `private/.master-key` | Created on first build. **Keep it** — if it changes, she has to answer the questions again. |

Then:

```bash
node tools/build.mjs
```

Starting fresh? Copy `tools/example/*.json` into `private/`.

Tips: shrink photos to ~1600px wide before adding them; keep videos short (they're decrypted in memory).
Make at least one answer something nobody could guess from the timeline.

## Testing
```bash
node tools/serve.mjs
```
Open http://localhost:5174 (add `?intro` to replay the intro).

## Publishing (GitHub Pages)
Commit everything except `private/` (already ignored), push, then enable Pages on the `main` branch.
Back up `private/` somewhere safe — it's the only readable copy of the story.
