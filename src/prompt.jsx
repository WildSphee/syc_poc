// ─────────────────────────────────────────────────────────────────────────────
// prompt.jsx — ALL LLM prompts for the SYC Form Assistant live here.
//
// Two kinds of GenAI calls are used in the app:
//   1. askAssistant  — free-text Q&A chat (the "Aisha · SYC Navigator" persona)
//   2. readDocument  — vision call that READS an uploaded document, EXTRACTS the
//      section's fields, and FACT-CHECKS each entry against the document.
//
// Keeping every prompt + the per-document field spec in one file makes the
// assistant's behaviour easy to audit and tune.
// ─────────────────────────────────────────────────────────────────────────────

const LANG_NAME = { en: 'English', bm: 'Bahasa Melayu' };

// ── 1. Free-text navigator persona ──────────────────────────────────────────
export function navigatorSystemPrompt(lang, formSnapshot) {
  return [
    'You are "Aisha AI", a warm, concise navigator for the Syariah Court of Singapore (SYC)',
    'Originating Summons (Muslim divorce) filing assistant. You help litigants-in-person',
    'understand the filing process and the form they are completing.',
    '',
    `Reply in ${LANG_NAME[lang] || 'English'}. Keep answers short (2-4 sentences), plain, and supportive.`,
    'You are NOT a lawyer: do not give binding legal advice; for legal strategy suggest the',
    'SYC helpline (1800-792-7424) or a Syariah lawyer. Never invent case facts.',
    'If the user asks how to do a step, point them to the action buttons in the panel.',
    '',
    'Current application state (for context only — do not read it back verbatim):',
    JSON.stringify(formSnapshot || {}, null, 0),
  ].join('\n');
}

// ── 2. Per-document field specifications ─────────────────────────────────────
// Each entry describes a document the user uploads at a given section, the fields
// to extract, and the context the fact-checker should validate against.
export const DOC_SPECS = {
  marriage: {
    label: 'Certificate of Marriage (Registry of Muslim Marriages, ROMM)',
    fields: [
      { key: 'certNo', label: 'Certificate No.' },
      { key: 'marriageDate', label: 'Date of Marriage' },
      { key: 'venue', label: 'Venue / Mosque' },
      { key: 'wali', label: 'Wali (guardian) name' },
      { key: 'mahr', label: 'Mahr (dowry)' },
      { key: 'husband', label: 'Husband name' },
      { key: 'wife', label: 'Wife name' },
    ],
  },
  nric_p: {
    label: "Plaintiff's NRIC (National Registration Identity Card)",
    fields: [
      { key: 'name', label: 'Full Name' },
      { key: 'nric', label: 'NRIC No.' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'citizenship', label: 'Citizenship / Country of Birth' },
    ],
  },
  nric_d: {
    label: "Defendant's NRIC (National Registration Identity Card)",
    fields: [
      { key: 'name', label: 'Full Name' },
      { key: 'nric', label: 'NRIC No.' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'citizenship', label: 'Citizenship / Country of Birth' },
    ],
  },
  mcp: {
    label: 'Marriage Counselling Programme (MCP) completion certificate',
    fields: [
      { key: 'provider', label: 'Provider' },
      { key: 'date', label: 'Completion Date' },
      { key: 'ref', label: 'Reference No.' },
      { key: 'expiry', label: 'Expiry Date' },
    ],
  },
  birth: {
    label: "Children's Birth Certificates (one or more)",
    fields: [
      { key: 'children', label: 'Children (array of {name, dob, birthCertNo, citizenship})' },
    ],
  },
  hdb: {
    label: 'HDB flat / property statement (HDB query reply or mortgage statement)',
    fields: [
      { key: 'address', label: 'Block & Street address' },
      { key: 'leaseYear', label: 'Lease commencement year' },
      { key: 'value', label: 'Estimated property value' },
      { key: 'loan', label: 'Outstanding housing loan' },
    ],
  },
  cpf: {
    label: 'CPF statement',
    fields: [
      { key: 'oaBalance', label: 'Ordinary Account balance' },
      { key: 'usedForHousing', label: 'Amount used for housing' },
    ],
  },
  talak: {
    label: 'Evidence of a talak pronouncement (message, note, or statutory declaration)',
    fields: [
      { key: 'date', label: 'Date of pronouncement' },
      { key: 'mode', label: 'Mode (verbal / written)' },
      { key: 'summary', label: 'One-line summary of the evidence' },
    ],
  },
  bk: {
    label: 'Court / bankruptcy proceedings document',
    fields: [
      { key: 'caseNo', label: 'Case / proceeding number' },
      { key: 'court', label: 'Court' },
      { key: 'nature', label: 'Nature of proceedings' },
    ],
  },
};

// ── 3. Document read + extract + fact-check prompt ───────────────────────────
// Returns the instruction text sent alongside the document image.
export function documentReadPrompt(specKey, lang, context) {
  const spec = DOC_SPECS[specKey];
  const fieldList = spec.fields.map((f) => `- ${f.key}: ${f.label}`).join('\n');
  return [
    `You are verifying a supporting document for a Syariah Court divorce filing.`,
    `The user says this document is: "${spec.label}".`,
    '',
    'Do THREE things and return ONE JSON object:',
    '1) documentType — what the image actually appears to be, in a few words.',
    '2) extracted — read the following fields off the document (use null if a field is',
    '   not present or not legible):',
    fieldList,
    '3) factCheck — an array, one item per extracted field, each:',
    '   { "field": <key>, "value": <what you read>, "status": "verified" | "review",',
    '     "note": <short reason in ' + (LANG_NAME[lang] || 'English') + '> }.',
    '   Mark "review" (not "verified") when: the value is missing/illegible, the document',
    '   type does not match what was expected, the document appears to belong to a different',
    '   person than the known context, or values are internally inconsistent.',
    'Also return overall: "verified" if every field is verified and the document type matches,',
    'otherwise "review".',
    context ? `\nKnown context to cross-check against: ${JSON.stringify(context)}` : '',
    '',
    'Note: demo/specimen documents are acceptable; judge the DATA, not the watermark.',
    'Return strictly valid JSON, no markdown, no commentary.',
  ].join('\n');
}

// ── 4. Free-text → form-field extraction ────────────────────────────────────
// Turns a user's chat message into a key→value payload of form-field IDs.
// `fields` is an array of { id, label, options?, money?, yesno? }.
export function fieldExtractPrompt(section, fields, lang, formSnapshot) {
  const fieldList = fields
    .map((f) => {
      let line = `- ${f.id}: ${f.label}`;
      if (f.options) line += ` — choose the closest of: ${f.options.join(' / ')}`;
      if (f.money) line += ` — return the numeric monthly amount in SGD as a plain number`;
      if (f.yesno) line += ` — return "Yes" or "No"`;
      return line;
    })
    .join('\n');
  return [
    'You are the data-extraction engine for a Syariah Court (Singapore) Muslim divorce',
    `e-filing form. The user is filling Section ${section}. From their message, extract`,
    'values ONLY for these fields:',
    fieldList,
    '',
    'Rules:',
    '- Only include a field in "updates" if the message clearly provides it. Omit all others.',
    '- Money amounts: return the numeric monthly figure in SGD as a number. Expand shorthand:',
    '  "3k" → 3000, "2.5k" → 2500, "1.2m" → 1200000, "$4,500" → 4500.',
    '- Education: map free wording to the closest allowed option (e.g. "studied bachelors"',
    "  → \"Bachelor's Degree\"; \"only finished secondary school\" → \"Secondary School\").",
    '- Distinguish the two parties: first person ("I", "me", "my", "I\'m") = plaintiff (f_p_*);',
    '  "husband", "wife", "spouse", "he", "she", "defendant" = defendant (f_d_*).',
    '- Put each piece of information in its correct field — never let occupation text land in the',
    '  education field, or income text land in the occupation field.',
    '- Never invent values. If the message is a question or contains no field data, return empty',
    '  "updates" and put a brief helpful answer/clarification in "note".',
    `- Write "note" in ${LANG_NAME[lang] || 'English'}, one short sentence.`,
    '',
    'Current values (for context, do not repeat back): ' + JSON.stringify(formSnapshot || {}),
    '',
    'Return strictly valid JSON: { "updates": { "<fieldId>": <value>, ... }, "note": "<text>" }',
  ].join('\n');
}

export function fieldExtractSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      updates: { type: 'object', additionalProperties: true },
      note: { type: 'string' },
    },
    required: ['updates', 'note'],
  };
}

// ── 5. Section sense-check (run before a section is saved / gated) ────────────
// `fieldValues` is a plain { label: value } object for the section.
export function sectionReviewPrompt(section, fieldValues, lang) {
  return [
    'You are a careful court case officer reviewing one section of a Syariah Court (Singapore)',
    `Muslim divorce filing before it is saved. Section ${section} contains these entries:`,
    JSON.stringify(fieldValues, null, 2),
    '',
    'Check whether the answers make sense, are internally consistent, and are plausible. Flag things like:',
    '- a salary/income that is implausibly high or low for the stated occupation, or clearly not a',
    '  monthly figure;',
    '- a value that appears to have landed in the wrong field (e.g. an occupation or income phrase',
    '  sitting inside the education field);',
    '- an education level that does not match the wording entered;',
    '- maintenance amounts that look like lump sums rather than monthly, or are implausibly large;',
    '- contradictory, garbled, or nonsensical entries.',
    '',
    'Only return "review" if something genuinely looks wrong; otherwise return "ok" with no issues.',
    `Write each issue in ${LANG_NAME[lang] || 'English'}, addressed to the user, naming the field and`,
    'suggesting what to double-check.',
    '',
    'Return strictly valid JSON: { "status": "ok" | "review", "issues": ["<text>", ...] }',
  ].join('\n');
}

export function sectionReviewSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['ok', 'review'] },
      issues: { type: 'array', items: { type: 'string' } },
    },
    required: ['status', 'issues'],
  };
}

// JSON schema for the structured Responses-API output of documentReadPrompt().
export function documentReadSchema(specKey) {
  return {
    type: 'object',
    additionalProperties: true,
    properties: {
      documentType: { type: 'string' },
      extracted: { type: 'object', additionalProperties: true },
      factCheck: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            value: {},
            status: { type: 'string', enum: ['verified', 'review'] },
            note: { type: 'string' },
          },
          required: ['field', 'status', 'note'],
        },
      },
      overall: { type: 'string', enum: ['verified', 'review'] },
    },
    required: ['documentType', 'extracted', 'factCheck', 'overall'],
  };
}
