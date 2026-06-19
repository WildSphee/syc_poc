import React, { useState } from 'react';
import OsFlow from '../components/OsFlow.jsx';

// "Filing of Originating Summons for Divorce" (mockup). Shows the 4-step flow and
// the document checklist (Originating Summons issued by Court + Case Statement).
// "Fill up Case Statement" enters the live GenAI filing demo.
export default function FilingScreen({ onNav }) {
  const [showFull, setShowFull] = useState(false);
  return (
    <div className="screen">
      <div className="hero lc">
        <div className="crumb">DIVORCE E-SERVICES / FILING OF ORIGINATING SUMMONS FOR DIVORCE</div>
        <h1>Filing of Originating Summons for Divorce</h1>
      </div>

      <div className="filing-meta">
        <div className="cid">Case ID: <b>POS-2025-000058</b></div>
        <div className="status">Status: <b>Draft</b></div>
      </div>

      <OsFlow active={1} />

      <div className="page-wrap">
        <div className="info-box">
          <ul>
            <li>All fields are mandatory unless otherwise stated.</li>
            <li>You may save the form as draft copy for future completion.</li>
            <li>You may submit the application once you have completed all the sections.</li>
            <li>If you have difficulties filling up the forms, please seek <span className="cid">legal advice ↗</span>.</li>
          </ul>
          <div className="legend">
            <span><span className="lg-ok">✓</span> Complete/No action required</span>
            <span><span className="lg-inc">ⓘ</span> Incomplete</span>
          </div>
        </div>

        <div className="doc-block">
          <div className="d-title"><span className="d-check">✓</span> 1. Originating Summons (Issued by the Court)</div>
          <div className="d-body">No action required. This document will be issued by the Court when your filing is accepted.</div>
        </div>

        <div className="doc-block">
          <div className="d-title"><span style={{ color: '#e0a800', fontSize: 20 }}>ⓘ</span> 2. Case Statement</div>
          <div className="doc-grid">
            <div>
              <div className="es-h">Description</div>
              <p className="es-p">To be filed by the party who wishes to commence divorce proceedings (called the Plaintiff).</p>
              <p className="es-p">Estimated time required: 30 mins</p>
              <p className="es-p">Filing fee: $12</p>
            </div>
            <div>
              <div className="es-h">Documents Required</div>
              <ul className="es-list">
                <li>NRIC or valid Passport (for foreigner)</li>
                <li>Deed Poll (if applicable where the Plaintiff has changed his/her name)</li>
                <li>Marriage/Revocation Certificate (front and back page)</li>
                {showFull && (
                  <>
                    <li>Children's Birth Certificates (if any)</li>
                    <li>HDB / property statement</li>
                    <li>CPF statement</li>
                    <li>Talak / supporting evidence (if applicable)</li>
                  </>
                )}
              </ul>
              <span className="cid" onClick={() => setShowFull((v) => !v)}>
                {showFull ? 'Show less ▲' : 'View full list ▾'}
              </span>
            </div>
          </div>
          <div className="filing-actions">
            <button className="btn-solid" onClick={() => onNav('demo')}>Fill up Case Statement →</button>
            <button className="btn-outline" onClick={() => onNav('divorce')}>Save as Draft</button>
          </div>
        </div>
      </div>
    </div>
  );
}
