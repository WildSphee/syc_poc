import React from 'react';
import { text } from '../i18n.js';

// The left "Originating Summons" document. Reads values from engine.form state.
export default function OsForm({ lang, form }) {
  const t = (k) => text[lang][k] ?? k;
  const f = form.fields || {};
  const filled = form.filled || {};
  const flash = form.flash || {};
  const done = form.secDone || {};

  const Val = ({ id }) => (
    <span className={`os-val${filled[id] ? ' filled' : ''}${flash[id] ? ' flash' : ''}`} id={id}>
      {f[id] ?? '—'}
    </span>
  );
  const Row = ({ label, id }) => (
    <div className="os-row"><span className="os-lbl">{label}</span><Val id={id} /></div>
  );
  const SecNum = ({ n }) => (
    <span className={`os-sec-num${done[n] ? ' done' : ''}`}>{n}</span>
  );

  return (
    <div className="form-panel" id="formPanel">
      <div className="os-doc">
        <div className="os-doc-header">
          <h1>In the Syariah Court of the Republic of Singapore</h1>
          <h2>Originating Summons</h2>
          <div className="os-ref">Case Ref: <Val id="f_ref" /> &nbsp;|&nbsp; Filed: <Val id="f_date" /></div>
        </div>

        <div className="os-section" id="sec_parties">
          <div className="os-sec-title"><SecNum n={1} /> Parties to the Proceedings</div>
          <div className="os-grid">
            <div className="os-party-col">
              <div className="os-party-lbl">Plaintiff (Applicant)</div>
              <Row label="Full Name" id="f_p_name" />
              <Row label="NRIC No." id="f_p_nric" />
              <Row label="Date of Birth" id="f_p_dob" />
              <Row label="Citizenship" id="f_p_citizenship" />
              <Row label="Religion" id="f_p_religion" />
              <div className="os-divider" />
              <Row label="Education" id="f_p_edu" />
              <Row label="Occupation" id="f_p_occ" />
              <Row label="Gross Salary" id="f_p_sal" />
            </div>
            <div className="os-party-col">
              <div className="os-party-lbl">Defendant (Respondent)</div>
              <Row label="Full Name" id="f_d_name" />
              <Row label="NRIC No." id="f_d_nric" />
              <Row label="Date of Birth" id="f_d_dob" />
              <Row label="Citizenship" id="f_d_citizenship" />
              <Row label="Religion" id="f_d_religion" />
              <div className="os-divider" />
              <Row label="Education" id="f_d_edu" />
              <Row label="Occupation" id="f_d_occ" />
              <Row label="Gross Salary" id="f_d_sal" />
            </div>
          </div>
        </div>

        <div className="os-section" id="sec_marriage">
          <div className="os-sec-title"><SecNum n={2} /> Marriage Certificate Details</div>
          <Row label="Certificate No." id="f_m_cert" />
          <Row label="Date of Marriage" id="f_m_date" />
          <Row label="Venue" id="f_m_venue" />
          <Row label="Wali" id="f_m_wali" />
          <Row label="Mahr" id="f_m_mahr" />
          <Row label="Prior Pronouncement" id="f_m_prior" />
          {form.showRevocRow && <Row label="Revocation Cert" id="f_m_revoc" />}
        </div>

        <div className="os-section" id="sec_grounds">
          <div className="os-sec-title"><SecNum n={3} /> Grounds for Divorce</div>
          <Row label="Ground" id="f_ground" />
          {form.talakRows && form.talakRows.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#8090a8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                Talak Pronouncement Sessions
              </div>
              {form.talakRows.map((r, i) => (
                <div className="os-talak-row" key={i} dangerouslySetInnerHTML={{ __html: r }} />
              ))}
            </div>
          )}
        </div>

        <div className="os-section" id="sec_children">
          <div className="os-sec-title"><SecNum n={4} /> Children &amp; Custody</div>
          {form.childrenRows && form.childrenRows.length > 0
            ? form.childrenRows.map((r, i) => (
                <div className="os-children-row" key={i} dangerouslySetInnerHTML={{ __html: r }} />
              ))
            : <div className="os-row"><span className="os-lbl">Children</span><span className="os-val">—</span></div>}
          <div className="os-row" style={{ marginTop: 4 }}><span className="os-lbl">Custody Arrangement</span><Val id="f_custody" /></div>
        </div>

        <div className="os-section" id="sec_property">
          <div className="os-sec-title"><SecNum n={5} /> Matrimonial Property</div>
          <Row label="HDB Address" id="f_hdb_addr" />
          <Row label="Lease Year" id="f_hdb_lease" />
          <Row label="Estimated Value" id="f_hdb_value" />
          <Row label="Outstanding Loan" id="f_hdb_loan" />
          <Row label="Duration of Marriage" id="f_duration" />
          <Row label="Relief Sought" id="f_relief" />
        </div>

        <div className="os-section" id="sec_maint">
          <div className="os-sec-title"><SecNum n={6} /> Maintenance &amp; Alimony</div>
          <Row label="Child Nafkah (Monthly)" id="f_child_naf" />
          <Row label="Self Nafkah Iddah" id="f_self_naf" />
        </div>

        <div className="os-section" id="sec_bk">
          <div className="os-sec-title"><SecNum n={7} /> Bankruptcy &amp; Court Proceedings</div>
          <Row label="Status" id="f_bk" />
          {form.showBkRow && <Row label="Details" id="f_bk_details" />}
        </div>

        <div className="os-section" id="sec_declare">
          <div className="os-sec-title"><SecNum n={8} /> Declaration</div>
          <Row label="Declarant" id="f_declarant" />
          <Row label="Date" id="f_declare_date" />
          <Row label="Status" id="f_declare_status" />
        </div>
      </div>
    </div>
  );
}
