import React from 'react';
import { text } from '../i18n.js';

export default function ResumeBanner({ lang, saved, onResume, onStartNew }) {
  const t = (k) => text[lang][k] ?? k;
  const stepName = (t('steps')[(saved?.step || 1) - 1]) || '';
  return (
    <div className="resume-banner">
      <div className="resume-text">
        <strong>{t('resume_found')}</strong><br />
        {t('resume_at')} <strong>{stepName}</strong>
      </div>
      <div className="resume-actions">
        <button className="btn btn-primary" onClick={onResume}>{t('resume_btn')}</button>
        <button className="btn" onClick={onStartNew}>{t('start_new')}</button>
      </div>
    </div>
  );
}
