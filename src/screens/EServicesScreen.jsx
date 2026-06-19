import React, { useState } from 'react';

// Divorce E-Services (mockup). Left menu lets the user pick "Marriage Counselling
// Programme" or "Divorce"; choosing Divorce leads to the Originating Summons filing.
export default function EServicesScreen({ onNav }) {
  const [item, setItem] = useState('mcp');
  const isDivorce = item === 'divorce';
  return (
    <div className="screen">
      <div className="hero">
        <div className="crumb">DIVORCE E-SERVICES / APPLICATIONS</div>
        <h1 style={{ fontSize: 34 }}>Divorce E-Services</h1>
      </div>
      <div className="page-wrap">
        <div className="es-layout">
          <div className="es-menu">
            <div className="es-acc">Start a New Case <span>⌄</span></div>
            <div className={`es-menu-item${item === 'mcp' ? ' active' : ''}`} onClick={() => setItem('mcp')}>
              Marriage Counselling Programme
            </div>
            <div className={`es-menu-item${item === 'divorce' ? ' active' : ''}`} onClick={() => setItem('divorce')}>
              Divorce
            </div>
            <div className="es-acc" style={{ marginTop: 14 }}>
              I want to.. for Case with Originating Summons Number <span>⌄</span>
            </div>
          </div>

          <div className="es-panel">
            <div className="es-panel-head">Applications</div>
            <div className="es-panel-body">
              {isDivorce ? (
                <>
                  <span className="es-app-link" onClick={() => onNav('filing')}>
                    Filing of Originating Summons for Divorce
                  </span>
                  <div className="es-cols">
                    <div>
                      <div className="es-h">Description</div>
                      <p className="es-p">To be filed by a party who wishes to commence divorce proceedings (called the Plaintiff).</p>
                      <p className="es-p">Estimated time required: 30 mins</p>
                      <p className="es-p">Filing fee: $12</p>
                    </div>
                    <div>
                      <div className="es-h">Documents Required</div>
                      <div className="es-sub">Singaporean/PR</div>
                      <ul className="es-list">
                        <li>NRIC or valid Passport (for foreigner)</li>
                        <li>Deed Poll (if applicable where the Plaintiff has changed his/her name)</li>
                        <li>Marriage/Revocation Certificate (front and back page)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="filing-actions">
                    <button className="btn-solid" onClick={() => onNav('filing')}>Start Filing</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="es-app-link">Registration for Marriage Counselling Programme</span>
                  <div className="es-cols">
                    <div>
                      <div className="es-h">Description</div>
                      <p className="es-p">For an applicant who intends to file a divorce.</p>
                      <p className="es-p">Estimated time required: 30 mins</p>
                      <p className="es-p">Filing fee: N/A</p>
                    </div>
                    <div>
                      <div className="es-h">Documents Required</div>
                      <div className="es-sub">Singaporean/PR</div>
                      <ul className="es-list">
                        <li>Marriage/Revocation Certificate (front and back page)</li>
                        <li>Children's Birth Certificates</li>
                        <li>Protection Order/Maintenance Order/Conversion Letter to Islam</li>
                      </ul>
                      <div className="es-sub">Foreigners</div>
                      <ul className="es-list">
                        <li>Marriage/Revocation Certificate (front and back page) [For foreign marriage, please provide a copy of original attested foreign marriage certificate and the attested translation, if applicable.]</li>
                        <li>Children's Birth Certificates</li>
                      </ul>
                    </div>
                  </div>
                  <div className="filing-actions">
                    <button className="btn-outline" onClick={() => setItem('divorce')}>Proceed to Divorce filing →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
