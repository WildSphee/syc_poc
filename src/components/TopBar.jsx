import React from 'react';
import { text } from '../i18n.js';

export default function TopBar({ lang, step, onSetLang }) {
  const t = (k) => text[lang][k] ?? k;
  const steps = t('steps');
  return (
    <div className="top-bar">
      <span className="top-logo">
        <span>⚖</span>
        <span className="logo-text">{t('logo')}</span>
      </span>
      <div className="top-steps">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`top-step${i + 1 === step ? ' active' : i + 1 < step ? ' done' : ''}`}
          >
            {s}
          </div>
        ))}
      </div>
      <div className="lang-row">
        <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => onSetLang('en')}>EN</button>
        <button className={`lang-btn${lang === 'bm' ? ' active' : ''}`} onClick={() => onSetLang('bm')}>BM</button>
      </div>
    </div>
  );
}
