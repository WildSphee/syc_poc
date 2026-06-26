// Thin client for the OpenAI Responses API (gpt-5.5). In dev this calls the
// Vite same-origin proxy so the browser does not preflight api.openai.com.
//
// All prompt text lives in src/prompt.jsx; this module only handles transport.

import {
  navigatorSystemPrompt,
  documentReadPrompt,
  documentReadSchema,
  fieldExtractPrompt,
  fieldExtractSchema,
  sectionReviewPrompt,
  sectionReviewSchema,
} from '../prompt.jsx';

const API_URL = import.meta.env.VITE_OPENAI_PROXY_URL || '/api/openai/responses';
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5.5';

export function hasApiKey() {
  return true;
}

async function callResponses(body) {
  let res;
  try {
    const headers = { 'Content-Type': 'application/json' };

    res = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: MODEL, ...body }),
    });
  } catch (err) {
    console.error('[OpenAI] fetch failed', {
      url: API_URL,
      model: MODEL,
      message: err?.message || String(err),
      error: err,
    });
    throw err;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    console.error('[OpenAI] API request failed', {
      url: API_URL,
      model: MODEL,
      status: res.status,
      statusText: res.statusText,
      body: errText,
    });
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }

  try {
    return await res.json();
  } catch (err) {
    console.error('[OpenAI] response JSON parse failed', {
      url: API_URL,
      model: MODEL,
      status: res.status,
      statusText: res.statusText,
      message: err?.message || String(err),
      error: err,
    });
    throw err;
  }
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

// Parse a JSON object out of a model reply, salvaging from surrounding text.
function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Could not parse model JSON');
  }
}

// ── Free-text → form-field extraction ───────────────────────────────────────
// Returns { updates: { fieldId: value, ... }, note: string }.
export async function extractFields(userMessage, { lang = 'en', section, fields = [], formSnapshot } = {}) {
  const json = await callResponses({
    reasoning: { effort: 'low' },
    text: {
      format: {
        type: 'json_schema',
        name: 'field_extract',
        schema: fieldExtractSchema(),
        strict: false,
      },
    },
    input: [
      { role: 'system', content: fieldExtractPrompt(section, fields, lang, formSnapshot) },
      { role: 'user', content: userMessage },
    ],
  });
  const out = parseJson(outputText(json));
  return { updates: out.updates || {}, note: out.note || '' };
}

// ── Section sense-check before a section is saved ────────────────────────────
// Returns { status: 'ok' | 'review', issues: string[] }.
export async function reviewSection(section, fieldValues, { lang = 'en' } = {}) {
  const json = await callResponses({
    reasoning: { effort: 'low' },
    text: {
      format: {
        type: 'json_schema',
        name: 'section_review',
        schema: sectionReviewSchema(),
        strict: false,
      },
    },
    input: [
      { role: 'system', content: sectionReviewPrompt(section, fieldValues, lang) },
      { role: 'user', content: 'Review this section before it is saved.' },
    ],
  });
  const out = parseJson(outputText(json));
  return { status: out.status || 'ok', issues: out.issues || [] };
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
