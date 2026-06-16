import React, { useRef, useState } from 'react';
import { text } from '../i18n.js';
import { fileToImageDataUrl } from '../lib/docToImage.js';
import { readDocument, hasApiKey } from '../lib/openai.js';

// One per document-backed section. Lets the user choose a file, sends it to
// gpt-5.5 to read + fact-check, shows the result, then confirms into the flow.
export default function UploadPrompt({ msg }) {
  const { specKey, promptKey, context, lang } = msg;
  const t = (k) => text[lang][k] ?? k;
  const inputRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | reading | done | error
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (msg.done) {
    return (
      <div className="ai-bubble">
        <div className="upload-file-pill">📎 {fileName || 'document'} · {t('fc_verified')}</div>
      </div>
    );
  }

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setError('');
    if (!hasApiKey()) {
      setError('Missing VITE_OPENAI_API_KEY — add it to .env.local to enable AI reading.');
      setPhase('error');
      return;
    }
    setPhase('reading');
    try {
      const dataUrl = await fileToImageDataUrl(file);
      const res = await readDocument(specKey, dataUrl, { lang, context });
      setResult(res);
      setPhase('done');
    } catch (e) {
      setError(String(e.message || e));
      setPhase('error');
    }
  }

  function confirm() {
    msg.onConfirm(result ? result.extracted : {});
  }

  return (
    <div className="ai-bubble">
      <div className="upload-box">
        <div className="upload-title">{t(promptKey)}</div>
        <div className="upload-sub">{t('upload_drop')} · {t('upload_accept')}</div>
        <div className="upload-actions">
          <button className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={phase === 'reading'}>
            {t('upload_choose')}
          </button>
          <button className="btn" onClick={() => msg.onSkip()} disabled={phase === 'reading'}>
            {t('upload_skip')}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {fileName && phase !== 'idle' && (
          <div className="upload-file-pill">📎 {fileName}</div>
        )}
      </div>

      {phase === 'reading' && (
        <div className="fc-card"><span className="spinner" />{t('upload_reading')}</div>
      )}

      {phase === 'error' && (
        <div className="warn-banner">⚠ {error}
          <div style={{ marginTop: 6 }}>
            <button className="btn" onClick={() => inputRef.current?.click()}>{t('upload_choose')}</button>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <>
          <div className="fc-card">
            <div className="fc-title">
              🔍 {t('fc_heading')}
              <span className={`fc-badge ${result.overall === 'verified' ? 'verified' : 'review'}`}>
                {result.overall === 'verified' ? t('fc_verified') : t('fc_review')}
              </span>
            </div>
            {result.documentType && (
              <div className="fc-note" style={{ marginBottom: 6, fontStyle: 'italic' }}>{result.documentType}</div>
            )}
            {(result.factCheck || []).map((fc, i) => (
              <div className="fc-row" key={i}>
                <span className={`fc-mark ${fc.status === 'verified' ? 'ok' : 'warn'}`}>
                  {fc.status === 'verified' ? '✓' : '!'}
                </span>
                <span className="fc-field">{fc.field}</span>
                <span className="fc-note">{fc.value != null && fc.value !== '' ? `${fc.value} — ` : ''}{fc.note}</span>
              </div>
            ))}
          </div>
          <div className="upload-actions" style={{ marginTop: 8, justifyContent: 'flex-start' }}>
            <button className="btn btn-primary" onClick={confirm}>{t('continue_btn')}</button>
            <button className="btn" onClick={() => { setPhase('idle'); setResult(null); }}>{t('upload_choose')}</button>
          </div>
        </>
      )}
    </div>
  );
}
