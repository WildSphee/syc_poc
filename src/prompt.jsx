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
