import React from 'react';

const SECTION_TITLES = {
  1: 'Parties to the Proceedings',
  2: 'Marriage Certificate Details',
  3: 'Grounds for Divorce',
  4: 'Children & Custody',
  5: 'Matrimonial Property',
  6: 'Maintenance & Alimony',
  7: 'Bankruptcy & Court Proceedings',
  8: 'Declaration',
};

// Shared form state/engine. Defined at module scope so the sub-components below
// keep a STABLE identity across renders — otherwise React remounts every input
// on each keystroke (focus loss + jank).
const FormCtx = React.createContext({ form: {}, engine: null });

function Field({ id, label, type = 'text', textarea = false, options }) {
  const { form, engine } = React.useContext(FormCtx);
  const flash = form.flash || {};
  const val = form.fields?.[id] ?? '';
  const classes = `os-form-control${flash[id] ? ' flash' : ''}`;
  // silent: direct user edit — no flash / no auto-scroll / no mid-type reformat.
  const onChange = (e) => engine?.setField?.(id, e.target.value, { silent: true });
  return (
    <label className="os-field">
      <span className="os-lbl">{label}</span>
      {textarea ? (
        <textarea className={classes} value={val} rows={3} onChange={onChange} />
      ) : options ? (
        <select className={classes} value={val} onChange={onChange}>
          <option value="">Select...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className={classes} type={type} value={val} onChange={onChange} />
      )}
    </label>
  );
}

function Val({ id }) {
  const { form } = React.useContext(FormCtx);
  const filled = form.filled || {};
  const flash = form.flash || {};
  return (
    <span className={`os-val${filled[id] ? ' filled' : ''}${flash[id] ? ' flash' : ''}`} id={id}>
      {form.fields?.[id] ?? '-'}
    </span>
  );
}

function ReadRow({ label, id }) {
  return <div className="os-row"><span className="os-lbl">{label}</span><Val id={id} /></div>;
}

function SecNum({ n }) {
  const { form } = React.useContext(FormCtx);
  const done = form.secDone || {};
  const active = form.activeSection || 1;
  return <span className={`os-sec-num${done[n] ? ' done' : ''}${active === n ? ' current' : ''}`}>{n}</span>;
}

function ContinueButton({ n }) {
  const { form, engine } = React.useContext(FormCtx);
  if (form.secDone?.[n]) return <div className="section-saved">Saved</div>;
  const complete = engine?.isSectionComplete?.(n) ?? false;
  const label = n < 8 ? `Save Continue to Section ${n + 1}` : 'Save and Review';
  return (
    <button className="section-continue-btn" disabled={!complete} onClick={() => engine?.continueSection?.(n)}>
      {complete ? label : 'Complete required fields'}
    </button>
  );
}

function Shell({ n, children }) {
  const { form } = React.useContext(FormCtx);
  const unlocked = form.unlockedSection || 1;
  const active = form.activeSection || 1;
  const justUnlocked = form.justUnlockedSection;
  const issues = form.validationIssues || {};
  const locked = n > unlocked;
  return (
    <div
      className={`os-section form-section${locked ? ' locked' : ''}${active === n ? ' active' : ''}${justUnlocked === n ? ' just-unlocked' : ''}`}
      id={sectionDomId(n)}
    >
      <div className="os-sec-title"><SecNum n={n} /> {SECTION_TITLES[n]}</div>
      <div className="section-body">{children}</div>
      {issues[n]?.length > 0 && (
        <div className="section-issues">
          {issues[n].map((issue, i) => <div key={i}>{issue}</div>)}
        </div>
      )}
      {!locked && <ContinueButton n={n} />}
      {locked && <div className="section-lock"><span>Locked</span></div>}
    </div>
  );
}

export default function OsForm({ form, engine }) {
  const f = form.fields || {};
  return (
    <FormCtx.Provider value={{ form, engine }}>
      <div className="form-panel" id="formPanel">
        <div className="os-doc">
          <div className="os-doc-header">
            <h1>In the Syariah Court of the Republic of Singapore</h1>
            <h2>Originating Summons</h2>
            <div className="os-ref">Case Ref: <Val id="f_ref" /> &nbsp;|&nbsp; Filed: <Val id="f_date" /></div>
          </div>

          <Shell n={1}>
            <div className="os-grid">
              <div className="os-party-col">
                <div className="os-party-lbl">Plaintiff (Applicant)</div>
                <Field id="f_p_name" label="Full Name" />
                <Field id="f_p_nric" label="NRIC No." />
                <Field id="f_p_dob" label="Date of Birth" />
                <Field id="f_p_citizenship" label="Citizenship" />
                <Field id="f_p_religion" label="Religion" />
                <div className="os-divider" />
                <Field id="f_p_edu" label="Education" options={educationOptions()} />
                <Field id="f_p_occ" label="Occupation" />
                <Field id="f_p_sal" label="Gross Salary" />
              </div>
              <div className="os-party-col">
                <div className="os-party-lbl">Defendant (Respondent)</div>
                <Field id="f_d_name" label="Full Name" />
                <Field id="f_d_nric" label="NRIC No." />
                <Field id="f_d_dob" label="Date of Birth" />
                <Field id="f_d_citizenship" label="Citizenship" />
                <Field id="f_d_religion" label="Religion" />
                <div className="os-divider" />
                <Field id="f_d_edu" label="Education" options={educationOptions()} />
                <Field id="f_d_occ" label="Occupation" />
                <Field id="f_d_sal" label="Gross Salary" />
              </div>
            </div>
          </Shell>

          <Shell n={2}>
            <div className="os-form-grid">
              <Field id="f_m_cert" label="Certificate No." />
              <Field id="f_m_date" label="Date of Marriage" />
              <Field id="f_m_venue" label="Venue" />
              <Field id="f_m_wali" label="Wali" />
              <Field id="f_m_mahr" label="Mahr" />
              <Field id="f_m_prior" label="Prior Pronouncement" options={['No', 'Yes']} />
              {(form.showRevocRow || f.f_m_prior === 'Yes') && <Field id="f_m_revoc" label="Revocation Cert" />}
            </div>
          </Shell>

          <Shell n={3}>
            <Field id="f_ground" label="Ground" options={['Talak', 'Fasakh', 'Taklik', 'Khuluk']} />
            {form.talakRows?.length > 0 && (
              <div className="left-list">
                {form.talakRows.map((r, i) => <div className="os-talak-row" key={i} dangerouslySetInnerHTML={{ __html: r }} />)}
              </div>
            )}
          </Shell>

          <Shell n={4}>
            {form.childrenRows?.length > 0 ? (
              <div className="left-list">
                {form.childrenRows.map((r, i) => <div className="os-children-row" key={i} dangerouslySetInnerHTML={{ __html: r }} />)}
              </div>
            ) : (
              <div className="os-row"><span className="os-lbl">Children</span><span className="os-val">-</span></div>
            )}
            <Field id="f_custody" label="Custody Arrangement" options={['Joint Custody', 'Sole Custody (me)', 'Court to determine']} />
          </Shell>

          <Shell n={5}>
            <div className="os-form-grid">
              <Field id="f_hdb_addr" label="HDB Address" />
              <Field id="f_hdb_lease" label="Lease Year" />
              <Field id="f_hdb_value" label="Estimated Value" />
              <Field id="f_hdb_loan" label="Outstanding Loan" />
              <Field id="f_duration" label="Duration of Marriage" />
              <Field id="f_relief" label="Relief Sought" options={['Sell on open market (50/50 split)', 'Transfer share to spouse', 'Retain flat']} />
            </div>
          </Shell>

          <Shell n={6}>
            <div className="os-form-grid">
              <Field id="f_child_naf" label="Child Nafkah (Monthly)" />
              <Field id="f_self_naf" label="Self Nafkah Iddah" />
            </div>
          </Shell>

          <Shell n={7}>
            <div className="os-form-grid">
              <Field id="f_bk" label="Status" options={['None declared', 'Yes - proceedings exist']} />
              <Field id="f_bk_details" label="Details" textarea />
            </div>
          </Shell>

          <Shell n={8}>
            <div className="os-form-grid">
              <ReadRow label="Declarant" id="f_declarant" />
              <ReadRow label="Date" id="f_declare_date" />
              <ReadRow label="Status" id="f_declare_status" />
            </div>
          </Shell>
        </div>
      </div>
    </FormCtx.Provider>
  );
}

function educationOptions() {
  return ['Primary School', 'Secondary School', 'ITE/NITEC', 'Polytechnic Diploma', "Bachelor's Degree", "Master's/PhD", 'Other'];
}

function sectionDomId(n) {
  return {
    1: 'sec_parties',
    2: 'sec_marriage',
    3: 'sec_grounds',
    4: 'sec_children',
    5: 'sec_property',
    6: 'sec_maint',
    7: 'sec_bk',
    8: 'sec_declare',
  }[n];
}
