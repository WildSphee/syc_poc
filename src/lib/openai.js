// Thin client for the OpenAI Responses API (gpt-5.5), called directly from the
// browser. NOTE: the key is bundled into the client — local POC use only.
//
// All prompt text lives in src/prompt.jsx; this module only handles transport.

import {
  navigatorSystemPrompt,
  documentReadPrompt,
  documentReadSchema,
} from '../prompt.jsx';

const API_URL = 'https://api.openai.com/v1/responses';
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5.5';

export function hasApiKey() {
  return Boolean(API_KEY);
}

async function callResponses(body) {
  if (!API_KEY) throw new Error('Missing VITE_OPENAI_API_KEY');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }
  return res.json();
}

// Pull plain text out of a Responses-API result across shape variations.
function outputText(json) {
  if (typeof json.output_text === 'string' && json.output_text) return json.output_text;
  const parts = [];
  for (const item of json.output || []) {
    for (const c of item.content || []) {
      if (typeof c.text === 'string') parts.push(c.text);
    }
  }
  return parts.join('').trim();
}

// ── Free-text navigator chat ────────────────────────────────────────────────
export async function askAssistant(userMessage, { lang = 'en', formSnapshot } = {}) {
  const json = await callResponses({
    reasoning: { effort: 'low' },
    input: [
      { role: 'system', content: navigatorSystemPrompt(lang, formSnapshot) },
      { role: 'user', content: userMessage },
    ],
  });
  return outputText(json);
}

// ── Read + extract + fact-check an uploaded document ────────────────────────
// `imageDataUrl` is a data: URL (image/*). Returns
//   { documentType, extracted:{...}, factCheck:[...], overall:'verified'|'review' }.
export async function readDocument(specKey, imageDataUrl, { lang = 'en', context } = {}) {
  const json = await callResponses({
    reasoning: { effort: 'low' },
    text: {
      format: {
        type: 'json_schema',
        name: 'document_check',
        schema: documentReadSchema(specKey),
        strict: false,
      },
    },
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: documentReadPrompt(specKey, lang, context) },
          { type: 'input_image', image_url: imageDataUrl },
        ],
      },
    ],
  });
  const raw = outputText(json);
  try {
    return JSON.parse(raw);
  } catch {
    // Last-resort: salvage a JSON object from the text.
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Could not parse document analysis JSON');
  }
}
