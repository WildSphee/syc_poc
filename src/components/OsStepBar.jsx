import React from 'react';
import OsFlow from './OsFlow.jsx';

// White step bar shown above the filing demo — replaces the old maroon top bar.
// Carries the same Originating-Summons 4-step flow as the filing screen (we are
// on step 1, "Filing of Originating Summons", while completing the Case Statement).
export default function OsStepBar({ lang, onSetLang }) {
  return (
    <div className="os-stepbar">
      <span className="osbar-title">Case Statement</span>
      <OsFlow active={1} />
      <div className="lang-row">
        <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => onSetLang('en')}>EN</button>
        <button className={`lang-btn${lang === 'bm' ? ' active' : ''}`} onClick={() => onSetLang('bm')}>BM</button>
      </div>
    </div>
  );
}
