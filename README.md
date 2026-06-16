# SYC OS Form Assistant (POC)

A front-end-only React prototype of a Syariah Court of Singapore **Originating
Summons** (Muslim divorce) filing assistant. A scripted, bilingual (EN/BM) chat
guides the litigant through eight steps and progressively fills a live "Originating
Summons" document on the left.

This rebuild adds **real GenAI**:

- The free-text chat box is answered by **OpenAI `gpt-5.5`**.
- At each document-backed step the assistant asks you to **upload that step's
  supporting document** (one at a time, not a big bundle). `gpt-5.5` **reads the
  document, extracts the fields, and fact-checks** each entry against the image,
  showing a per-field ✓ / ! result.
- If you don't have a document yet, **save & continue later** — the in-progress
  application is stored and you can resume where you left off.

## Quick start

```bash
npm install
# one-time, for generating the sample documents:
npx playwright install chromium

# add your key (already provided in .env.local for this POC)
#   VITE_OPENAI_API_KEY=sk-...
#   VITE_OPENAI_MODEL=gpt-5.5   (optional override)

npm run gen:resources   # writes specimen documents into resources/
npm run dev             # open the printed http://localhost:5173
```

Walk the flow on the right. When prompted, click **Choose file** and pick one of
the documents in [`resources/`](resources/) (e.g. `marriage-cert-romm.png` at the
Marriage step). The AI reads it, fills the form on the left, and shows its
fact-check. Use **save & continue later** at any upload to test resume — reload the
page and a resume banner appears.

## ⚠️ Security note

This is a **front-end-only POC**. `VITE_OPENAI_API_KEY` is bundled into the client
JavaScript and is visible to anyone who can open the app. This is acceptable for a
local demo **only** — never ship a real key this way. A production build must proxy
OpenAI calls through a backend that holds the key.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/prompt.jsx` | **All LLM prompts** — navigator persona, document read/extract/fact-check, field specs |
| `src/lib/openai.js` | OpenAI Responses API client (`askAssistant`, `readDocument`) |
| `src/lib/docToImage.js` | Turns an uploaded image/PDF into an image for vision |
| `src/lib/session.js` | localStorage save / resume |
| `src/state/createEngine.js` | The scripted 8-step flow (ported from the original POC) |
| `src/components/` | `TopBar`, `OsForm` (left doc), `ChatPanel`, `UploadPrompt`, `ResumeBanner` |
| `src/i18n.js` | EN / BM string dictionary |
| `tools/doc-templates.mjs` + `tools/gen-resources.mjs` | Generate the specimen documents |
| `resources/` | Generated sample documents to upload during the demo |

## Sample documents

`resources/` contains specimen ROMM marriage certificate, NRICs, MCP certificate,
children's birth certificates, HDB and CPF statements, and talak evidence — all for
the fictional demo case and clearly watermarked **"SPECIMEN — NOT A GENUINE
DOCUMENT"**. They exist purely so the AI document flow has something to read; they
are not real government documents. Regenerate them with `npm run gen:resources`.

## How the AI document check works

1. `UploadPrompt` converts the chosen file to an image (`docToImage.js`).
2. `readDocument()` sends the image + the prompt from `prompt.jsx` to `gpt-5.5` with
   a JSON schema, asking it to (a) identify the document, (b) extract the section's
   fields, and (c) fact-check each field (`verified` / `review`) against the image.
3. The extracted values fill the Originating Summons form; the fact-check is shown
   in the chat; the file is kept as an attachment.

The original single-file prototype is preserved at
[`syc-form-assistant.html`](syc-form-assistant.html) for reference.
