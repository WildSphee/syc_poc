// Flow engine — a faithful port of the original scripted SYC chat flow, adapted
// so that document-backed sections prompt the user to UPLOAD the relevant file
// (read + fact-checked by gpt-5.5) instead of using hardcoded mock data.
//
// The engine owns all mutable flow state and a `messages` list. React subscribes
// via `engine.onChange` and re-renders. Buttons in message HTML use data-act
// attributes handled by ChatPanel (no globals, no inline-quote escaping issues).

import { text } from '../i18n.js';
import { saveSession } from '../lib/session.js';

const TOTAL_STEPS = 8;
let MSG_SEQ = 0;

const SECTION_REQUIRED = {
  1: ['f_p_name', 'f_p_nric', 'f_p_edu', 'f_p_occ', 'f_p_sal', 'f_d_name', 'f_d_nric', 'f_d_edu', 'f_d_occ', 'f_d_sal'],
  2: ['f_m_cert', 'f_m_date', 'f_m_venue', 'f_m_prior'],
  3: ['f_ground'],
  4: ['f_custody'],
  5: ['f_hdb_addr', 'f_hdb_value', 'f_relief'],
  6: ['f_child_naf', 'f_self_naf'],
  7: ['f_bk'],
  8: ['f_declarant', 'f_declare_date'],
};

const FIELD_TO_SECTION = Object.fromEntries(
  Object.entries(SECTION_REQUIRED).flatMap(([section, ids]) => ids.map((id) => [id, Number(section)])),
);

const SECTION_NEXT_ACT = {
  1: 'checkCitizenship',
  2: 'showGrounds',
  3: 'showChildren',
  4: 'showHDB',
  5: 'showMaintenance',
  6: 'showBankruptcy',
  7: 'showPreview',
  8: 'doSubmit',
};

export function createEngine() {
  const engine = {
    lang: 'en',
    step: 1,
    busy: false,
    messages: [],
    onChange: null,

    // form (left document) state
    form: {
      fields: {}, filled: {}, flash: {}, secDone: {},
      talakRows: [], childrenRows: [], showRevocRow: false, showBkRow: false,
      progressPct: 0, activeSection: 1, unlockedSection: 1,
      validationIssues: {}, justUnlockedSection: null,
    },

    // flow vars (ported)
    talakData: [], numTalakSessions: 0, witnessState: {},
    revocData: { certNo: '', regDate: '' },
    addlData: { p: { edu: "Bachelor's Degree", occ: 'Senior Executive', sal: '5800' },
                d: { edu: 'Polytechnic Diploma', occ: 'Operations Manager', sal: '6200' } },
    selectedGroundValue: '', custodyValue: '', reliefValue: '',
    childNaf: '0', selfNaf: '0', bkStatus: false, bkDetails: '',
    personal: { p: {}, d: {} },
    marriage: {}, children: [], property: {},
  };

  const t = (k) => (text[engine.lang][k] ?? k);
  engine.t = t;

  const notify = () => engine.onChange && engine.onChange();

  // ── messages ──
  function push(msg) { engine.messages.push({ id: ++MSG_SEQ, ...msg }); notify(); }
  function addMsg(html) { push({ kind: 'ai', html, consumed: false }); }
  function addUser(textStr) { push({ kind: 'user', text: textStr }); }

  function addAI(fn, cb) {
    if (engine.busy) return;
    engine.busy = true;
    const typing = { id: ++MSG_SEQ, kind: 'typing' };
    engine.messages.push(typing); notify();
    setTimeout(() => {
      engine.messages = engine.messages.filter((m) => m.id !== typing.id);
      fn();
      engine.busy = false;
      if (cb) cb();
      notify();
    }, 700);
  }

  // disable the buttons of the most recent interactive AI message
  function disableLive() {
    for (let i = engine.messages.length - 1; i >= 0; i--) {
      if (engine.messages[i].kind === 'ai' && !engine.messages[i].consumed) {
        engine.messages[i].consumed = true; break;
      }
    }
    notify();
  }

  // ── form helpers ──
  function fill(id, val, sectionScroll) {
    engine.form.fields[id] = val;
    engine.form.filled[id] = true;
    engine.form.flash[id] = true;
    notify();
    setTimeout(() => { engine.form.flash[id] = false; notify(); }, 1200);
    if (sectionScroll) {
      setTimeout(() => {
        const sec = document.getElementById(sectionScroll);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }
  function markSectionDone(n) { engine.form.secDone[n] = true; notify(); }
  function setStep(n) {
    engine.step = n;
    engine.form.progressPct = Math.round((n / TOTAL_STEPS) * 100);
    notify();
    persist();
  }
  function setActiveSection(n) {
    engine.form.activeSection = n;
    engine.form.unlockedSection = Math.max(engine.form.unlockedSection || 1, n);
    notify();
    setTimeout(() => {
      const sec = document.getElementById(sectionDomId(n));
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
  function unlockSection(n) {
    engine.form.unlockedSection = Math.max(engine.form.unlockedSection || 1, n);
    engine.form.activeSection = n;
    engine.form.justUnlockedSection = n;
    notify();
    setTimeout(() => {
      engine.form.justUnlockedSection = null;
      notify();
    }, 900);
    setTimeout(() => {
      const sec = document.getElementById(sectionDomId(n));
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  }
  function fieldSection(id) {
    if (FIELD_TO_SECTION[id]) return FIELD_TO_SECTION[id];
    if (id.startsWith('f_p_') || id.startsWith('f_d_')) return 1;
    if (id.startsWith('f_m_')) return 2;
    if (id.startsWith('f_hdb_') || id === 'f_duration' || id === 'f_relief') return 5;
    if (id.startsWith('f_child_') || id.startsWith('f_self_')) return 6;
    if (id.startsWith('f_bk')) return 7;
    if (id.startsWith('f_declare') || id === 'f_declarant') return 8;
    return engine.form.activeSection || 1;
  }
  function normalizeFieldValue(id, value) {
    const v = String(value ?? '').trim();
    if (!v) return '';
    if (id.endsWith('_sal') || id.includes('_naf')) {
      const num = parseMoney(v);
      return Number.isFinite(num) ? `SGD ${num}/mth` : v;
    }
    return v;
  }

  engine.setField = function (id, value) {
    const val = normalizeFieldValue(id, value);
    if (id === 'f_m_prior') engine.form.showRevocRow = /^yes/i.test(val);
    if (id === 'f_bk') engine.form.showBkRow = /^yes/i.test(val);
    if (val) fill(id, val, sectionDomId(fieldSection(id)));
    else {
      delete engine.form.fields[id];
      delete engine.form.filled[id];
      notify();
    }
    engine.form.validationIssues[fieldSection(id)] = [];
    persist();
  };
  engine.isSectionComplete = function (n) {
    if (n === 7) {
      const status = String(engine.form.fields.f_bk || '').toLowerCase();
      if (!status) return false;
      return !status.includes('yes') || Boolean(String(engine.form.fields.f_bk_details || '').trim());
    }
    if (n === 2) {
      const baseDone = (SECTION_REQUIRED[n] || []).every((id) => String(engine.form.fields[id] || '').trim());
      const prior = String(engine.form.fields.f_m_prior || '').toLowerCase();
      return baseDone && (!prior.includes('yes') || Boolean(String(engine.form.fields.f_m_revoc || '').trim()));
    }
    if (n === 8) return true;
    return (SECTION_REQUIRED[n] || []).every((id) => String(engine.form.fields[id] || '').trim());
  };
  engine.validateSection = function (n) {
    const issues = [];
    if (!engine.isSectionComplete(n)) issues.push('Some required fields are still missing.');
    if (n === 1) {
      salaryIssue('Plaintiff', engine.form.fields.f_p_occ, engine.form.fields.f_p_sal, issues);
      salaryIssue('Defendant', engine.form.fields.f_d_occ, engine.form.fields.f_d_sal, issues);
    }
    if (n === 6) {
      const child = parseMoney(engine.form.fields.f_child_naf);
      const self = parseMoney(engine.form.fields.f_self_naf);
      if (child > 20000 || self > 20000) issues.push('One maintenance amount looks unusually high. Please confirm it is a monthly amount.');
    }
    return issues;
  };
  engine.forceContinueSection = function (n) { engine.continueSection(Number(n), true); };
  engine.continueSection = function (n, force = false) {
    n = Number(n || engine.form.activeSection || 1);
    setActiveSection(n);
    const issues = engine.validateSection(n);
    engine.form.validationIssues[n] = issues;
    notify();
    if (issues.length && !force) {
      addAI(() => addMsg(`<p>${t('verify_review')}</p>
        <div class="warn-banner">${issues.map(escapeHtml).join('<br>')}</div>
        <div class="choice-btns" style="margin-top:8px">
          <button class="btn btn-secondary live" data-act="forceContinueSection" data-arg="${n}">${t('continue_anyway')}</button>
        </div>`));
      return;
    }
    engine.form.validationIssues[n] = [];
    markSectionDone(n);
    const next = n + 1;
    if (next <= TOTAL_STEPS) unlockSection(next);
    addAI(() => addMsg(`<p>${n < TOTAL_STEPS ? t('section_saved_next').replace('{n}', String(next)) : t('section_saved_review')}</p>`));
    const act = SECTION_NEXT_ACT[n];
    if (act && engine[act]) setTimeout(() => engine[act](), 950);
    persist();
  };

  // ── persistence ──
  function snapshotForSave() {
    return {
      lang: engine.lang,
      step: engine.step,
      resumeAt: engine._resumeAt || null,
      form: {
        fields: engine.form.fields, filled: engine.form.filled, secDone: engine.form.secDone,
        talakRows: engine.form.talakRows, childrenRows: engine.form.childrenRows,
        showRevocRow: engine.form.showRevocRow, showBkRow: engine.form.showBkRow,
        progressPct: engine.form.progressPct, activeSection: engine.form.activeSection,
        unlockedSection: engine.form.unlockedSection, validationIssues: engine.form.validationIssues,
      },
      vars: {
        talakData: engine.talakData, numTalakSessions: engine.numTalakSessions,
        selectedGroundValue: engine.selectedGroundValue, custodyValue: engine.custodyValue,
        reliefValue: engine.reliefValue, childNaf: engine.childNaf, selfNaf: engine.selfNaf,
        bkStatus: engine.bkStatus, bkDetails: engine.bkDetails, addlData: engine.addlData,
      },
    };
  }
  function persist() { saveSession(snapshotForSave()); }
  engine.persist = persist;

  // compact context for the chat assistant + fact-checker
  engine.formSnapshot = () => ({ step: engine.step, fields: engine.form.fields });
  engine.knownContext = () => ({
    plaintiff: engine.form.fields.f_p_name || null,
    defendant: engine.form.fields.f_d_name || null,
  });

  // ── upload step ──
  // Adds an upload prompt; on confirm, apply(extracted) fills the form and next() runs.
  function uploadStep({ specKey, promptKey, context, apply, next, sectionDone }) {
    push({
      kind: 'upload', specKey, promptKey, context: context || engine.knownContext(),
      lang: engine.lang, done: false,
      onConfirm: (extracted) => {
        const m = engine.messages.find((x) => x.specKey === specKey && !x.done);
        if (m) m.done = true;
        try { apply && apply(extracted || {}); } catch (e) { console.warn(e); }
        if (sectionDone) markSectionDone(sectionDone);
        notify();
        setTimeout(() => next && next(), 200);
      },
      onSkip: () => {
        engine._resumeAt = next?.resumeKey || engine._resumeAt;
        saveSessionAndHalt(next);
      },
    });
  }
  function saveSessionAndHalt(next) {
    engine._resumeAt = next?.resumeKey || engine._resumeAt || null;
    persist();
    addUser(t('upload_skip'));
    addAI(() => addMsg(`<p>${t('saved_msg')}</p>`));
  }

  // helper to build a localized button
  const btn = (cls, act, labelKey, { arg, userKey } = {}) =>
    `<button class="btn ${cls}" data-act="${act}"${arg !== undefined ? ` data-arg="${arg}"` : ''}` +
    `${userKey ? ` data-userkey="${userKey}"` : ''}>${t(labelKey)}</button>`;

  // ════════════════════════════════════════════════════════════════════════
  //  FLOW
  // ════════════════════════════════════════════════════════════════════════
  engine.start = function start() {
    addAI(() => {
      addMsg(`<p>${t('greeting')}</p>
        <div class="choice-btns">
          ${btn('btn-secondary live', 'showLIP', 'divorce', { userKey: 'divorce' })}
          ${btn('live', 'showFaraid', 'faraid', { userKey: 'faraid' })}
        </div>`);
    });
  };
  engine.showFaraid = () => addAI(() => addMsg(`<p>${t('farewell')}</p>`));

  engine.showLIP = function () {
    setStep(1);
    addAI(() => addMsg(`<p>${t('lip')}</p>
      <div class="choice-btns">
        ${btn('btn-secondary live', 'showMCP', 'yes', { userKey: 'yes' })}
        ${btn('live', 'showLawyer', 'with_lawyer', { userKey: 'with_lawyer' })}
      </div>`));
  };
  engine.showLawyer = () => addAI(() => addMsg(`<p>${t('lawyer_msg')}</p>`));

  engine.showMCP = function () {
    setStep(2);
    engine._resumeAt = 'showMCP';
    addAI(() => addMsg(`<p>${t('mcp_check')}</p>`), () => uploadStep({
      specKey: 'mcp', promptKey: 'upload_mcp', sectionDone: null,
      apply: () => {},
      next: Object.assign(() => engine.showConsent(), { resumeKey: 'showMCP' }),
    }));
  };

  engine.showConsent = function () {
    setStep(3);
    engine._resumeAt = 'showConsent';
    addAI(() => addMsg(`<p>${t('data_consent')}</p>
      <div class="note" style="margin-top:8px">${t('privacy')}</div>
      <div class="choice-btns" style="margin-top:10px">
        ${btn('btn-primary live', 'showPersonal', 'i_consent', { userKey: 'i_consent' })}
        ${btn('live', 'showDecline', 'i_decline', { userKey: 'i_decline' })}
      </div>`));
  };
  engine.showDecline = () => addAI(() => addMsg(`<p>${t('consent_decline')}</p>`));

  // ── Personal: upload plaintiff NRIC, then defendant NRIC, then manual extras ──
  engine.showPersonal = function () {
    setStep(4);
    engine._resumeAt = 'showPersonal';
    addAI(() => addMsg(`<p>${t('personal_details')}</p>`), () => uploadStep({
      specKey: 'nric_p', promptKey: 'upload_nric_p',
      apply: (ex) => {
        if (ex.name) fill('f_p_name', ex.name, 'sec_parties');
        if (ex.nric) fill('f_p_nric', ex.nric);
        if (ex.dob) fill('f_p_dob', ex.dob);
        fill('f_p_citizenship', ex.citizenship || t('singapore_citizen'));
        fill('f_p_religion', 'Islam');
      },
      next: Object.assign(() => engine.showDefendantNric(), { resumeKey: 'showPersonal' }),
    }));
  };
  engine.showDefendantNric = function () {
    uploadStep({
      specKey: 'nric_d', promptKey: 'upload_nric_d',
      apply: (ex) => {
        if (ex.name) fill('f_d_name', ex.name, 'sec_parties');
        if (ex.nric) fill('f_d_nric', ex.nric);
        if (ex.dob) fill('f_d_dob', ex.dob);
        fill('f_d_citizenship', ex.citizenship || t('singapore_citizen'));
        fill('f_d_religion', 'Islam');
      },
      next: Object.assign(() => engine.showPersonalAdditional(), { resumeKey: 'showPersonal' }),
    });
  };
  engine.showPersonalAdditional = function () {
    const a = engine.addlData;
    setActiveSection(1);
    fill('f_p_edu', engine.form.fields.f_p_edu || a.p.edu, 'sec_parties');
    fill('f_p_occ', engine.form.fields.f_p_occ || a.p.occ);
    fill('f_p_sal', engine.form.fields.f_p_sal || `SGD ${a.p.sal}/mth`);
    fill('f_d_edu', engine.form.fields.f_d_edu || a.d.edu);
    fill('f_d_occ', engine.form.fields.f_d_occ || a.d.occ);
    fill('f_d_sal', engine.form.fields.f_d_sal || `SGD ${a.d.sal}/mth`);
    addAI(() => addMsg(`<p>${t('addl_details')}</p>
      <p>${t('chat_type_to_fill')}</p>
      <div class="note">${t('verify_before_next')}</div>`));
  };
  engine.confirmAddl = function () {
    const a = engine.addlData;
    a.p.edu = engine.form.fields.f_p_edu || ''; a.p.occ = engine.form.fields.f_p_occ || ''; a.p.sal = engine.form.fields.f_p_sal || '';
    a.d.edu = engine.form.fields.f_d_edu || ''; a.d.occ = engine.form.fields.f_d_occ || ''; a.d.sal = engine.form.fields.f_d_sal || '';
    disableLive(); addUser(t('confirm_addl'));
    engine.continueSection(1);
  };
  engine.checkCitizenship = function () {
    addAI(() => addMsg(`<div class="bypass-card"><div class="bypass-icon">✓</div>
      <div><div class="bypass-main">${t('jurisdiction')}</div><div class="bypass-note">${t('step_bypassed')}</div></div></div>
      ${btn('btn-secondary live', 'showMarriage', 'continue_btn', { userKey: 'continue_btn' })}`));
  };

  // ── Marriage: upload ROMM cert ──
  engine.showMarriage = function () {
    setStep(5);
    setActiveSection(2);
    engine._resumeAt = 'showMarriage';
    addAI(() => addMsg(`<p>${t('marriage_details')}</p>`), () => uploadStep({
      specKey: 'marriage', promptKey: 'upload_marriage',
      apply: (ex) => {
        if (ex.certNo) fill('f_m_cert', ex.certNo, 'sec_marriage');
        if (ex.marriageDate) fill('f_m_date', ex.marriageDate);
        if (ex.venue) fill('f_m_venue', ex.venue);
        if (ex.wali) fill('f_m_wali', ex.wali);
        if (ex.mahr) fill('f_m_mahr', ex.mahr);
        fill('f_m_prior', t('no'));
        engine.marriage = ex;
      },
      next: Object.assign(() => engine.askPrior(), { resumeKey: 'showMarriage' }),
    }));
  };
  engine.askPrior = function () {
    setActiveSection(2);
    addAI(() => addMsg(`<div class="note">${t('prior_q')}</div>
      <p>${t('chat_type_to_fill')}</p>`));
  };
  engine.showRevocation = function () {
    fill('f_m_prior', t('yes_prior'));
    engine.form.showRevocRow = true;
    setActiveSection(2);
    addAI(() => addMsg(`<p>${t('revocation')}</p>
      <p>${t('chat_type_to_fill')}</p>
      <div class="note">${t('verify_before_next')}</div>`));
  };
  engine.confirmRevoc = function () {
    engine.revocData.certNo = engine.form.fields.f_m_revoc || '';
    engine.revocData.regDate = '';
    engine.form.showRevocRow = true;
    disableLive(); addUser(t('confirm_revoc'));
    engine.continueSection(2);
  };

  // ── Grounds ──
  engine.showGrounds = function () {
    markSectionDone(2);
    setActiveSection(3);
    addAI(() => addMsg(`<p>${t('grounds')}</p>
      <p>${t('chat_type_to_fill')}</p>
      <div class="note" style="margin-top:8px">${t('grounds_note')}</div>`));
  };
  engine.groundChoice = function (type) {
    const name = t(type);
    engine.selectedGroundValue = name;
    fill('f_ground', name, 'sec_grounds');
    disableLive(); addUser(name);
    setTimeout(() => {
      if (type === 'talak') engine.showTalak();
      else if (type === 'fasakh') engine.showSubGround('fasakh');
      else if (type === 'taklik') engine.showSubGround('taklik');
      else engine.showSubGround('khuluk');
    }, 280);
  };
  const SUBGROUNDS = {
    fasakh: ['nafkah', 'cruelty', 'imprisonment', 'impotency'],
    taklik: ['desertion', 'harm', 'nafkah_taklik'],
    khuluk: ['agreed_comp', 'not_agreed'],
  };
  engine.showSubGround = function (kind) {
    addAI(() => addMsg(`<div class="choice-btns">${SUBGROUNDS[kind]
      .map((k) => btn('live', 'showChildren', k, { userKey: k })).join('')}</div>`));
  };
  engine.showTalak = function () {
    addAI(() => addMsg(`<div class="grid-4">
      <div class="ground-card live-card" data-act="selectTalak" data-arg="1"><div class="ground-arabic">١</div><div class="ground-en">${t('talak_1')}</div></div>
      <div class="ground-card live-card" data-act="selectTalak" data-arg="2"><div class="ground-arabic">٢</div><div class="ground-en">${t('talak_2')}</div></div>
      <div class="ground-card live-card" data-act="showChildren" data-userkey="not_yet"><div class="ground-arabic">？</div><div class="ground-en">${t('not_yet')}</div></div>
    </div>`));
  };
  engine.selectTalak = function (numStr) {
    const num = Number(numStr);
    engine.numTalakSessions = num;
    const label = num === 1 ? t('talak_1') : t('talak_2');
    disableLive(); addUser(label);
    fill('f_ground', 'Talak — ' + label, 'sec_grounds');
    setTimeout(() => engine.showTalakSession(1), 280);
  };
  engine.showTalakSession = function (sn) {
    addAI(() => addMsg(`<p><span class="sess-badge">${t('session')} ${sn} ${t('of')} ${engine.numTalakSessions}</span></p>
      <div class="fbox">
        <div class="fbox-t">${t('date_talak')}</div>
        <div class="fgrid full"><div class="fg"><label class="flbl">${t('date_talak')}</label><input type="date" class="fin" id="talak_date_${sn}"></div></div>
        <div class="fbox-sect">${t('mode')}</div>
        <div class="fradg">
          <label class="frad"><input type="radio" name="mode_${sn}" value="verbal"> ${t('verbal')}</label>
          <label class="frad"><input type="radio" name="mode_${sn}" value="written"> ${t('written')}</label>
        </div>
        <div class="fbox-sect">${t('witnesses')}</div>
        <div style="display:flex;gap:8px;margin:6px 0 2px">
          <button type="button" class="btn" data-act="setWitness" data-arg="${sn}:0" style="padding:5px 16px;background:#f0f2f5;color:#555;border:1.5px solid #ddd">${t('no')}</button>
          <button type="button" class="btn" data-act="setWitness" data-arg="${sn}:1" style="padding:5px 16px;background:#f0f2f5;color:#555;border:1.5px solid #ddd">${t('yes_prior')}</button>
        </div>
        <div id="witness_form_${sn}" style="display:none">
          <div class="fbox-sect">${t('witness_name')} 1</div>
          <div class="fgrid">
            <div class="fg"><label class="flbl">${t('witness_name')}</label><input class="fin" id="w1_name_${sn}"></div>
            <div class="fg"><label class="flbl">${t('witness_nric')}</label><input class="fin" id="w1_nric_${sn}"></div>
          </div>
        </div>
        ${btn('btn-secondary live', 'confirmTalakSession', 'confirm_session', { arg: sn })}
      </div>`));
  };
  engine.setWitness = function (arg) {
    const [sn, valStr] = arg.split(':');
    const val = valStr === '1';
    engine.witnessState[sn] = val;
    const f = document.getElementById('witness_form_' + sn);
    if (f) f.style.display = val ? 'block' : 'none';
  };
  engine.confirmTalakSession = function (snStr) {
    const sn = Number(snStr);
    const data = {
      date: document.getElementById('talak_date_' + sn)?.value || '',
      mode: document.querySelector('input[name="mode_' + sn + '"]:checked')?.value || '',
      witnesses: engine.witnessState[sn] || false,
      witness1: { name: document.getElementById('w1_name_' + sn)?.value || '', nric: document.getElementById('w1_nric_' + sn)?.value || '' },
    };
    engine.talakData.push(data);
    const ml = data.mode === 'verbal' ? t('verbal') : data.mode === 'written' ? t('written') : '—';
    const wStr = data.witnesses ? (data.witness1.name ? `${data.witness1.name} (${data.witness1.nric})` : t('yes_prior')) : t('no');
    engine.form.talakRows.push(`<strong>${t('session')} ${sn}:</strong> ${data.date || '—'} &bull; ${ml} &bull; Witness: ${wStr}`);
    engine.form.showTalakBlock = true;
    disableLive(); addUser(`${t('confirm_session')} ${sn} ${t('session_confirmed')}`);
    setTimeout(() => {
      // optional evidence upload per session, then next
      uploadStep({
        specKey: 'talak', promptKey: 'upload_talak',
        apply: () => {},
        next: Object.assign(() => {
          if (sn < engine.numTalakSessions) engine.showTalakSession(sn + 1);
          else engine.showChildren();
        }, { resumeKey: 'showGrounds' }),
      });
    }, 280);
  };

  // ── Children: upload birth certs ──
  engine.showChildren = function () {
    setStep(6);
    markSectionDone(3);
    setActiveSection(4);
    engine._resumeAt = 'showChildren';
    addAI(() => addMsg(`<p>${t('children')}</p>`), () => uploadStep({
      specKey: 'birth', promptKey: 'upload_birth',
      apply: (ex) => {
        const kids = Array.isArray(ex.children) ? ex.children : [];
        engine.children = kids;
        engine.form.childrenRows = kids.map((c, i) =>
          `<strong>${i + 1}. ${c.name || '—'}</strong> &bull; DOB: ${c.dob || '—'} &bull; BC: ${c.birthCertNo || '—'} &bull; ${c.citizenship || t('singapore_citizen')}`);
      },
      next: Object.assign(() => engine.askCustody(), { resumeKey: 'showChildren' }),
    }));
  };
  engine.askCustody = function () {
    setActiveSection(4);
    addAI(() => addMsg(`<div class="note">${t('parenting')}</div>
      <p>${t('chat_type_to_fill')}</p>`));
  };
  engine.pickCustody = function (key) {
    const val = t(key);
    engine.custodyValue = val;
    fill('f_custody', val, 'sec_children');
    markSectionDone(4);
    disableLive(); addUser(val);
    setTimeout(() => engine.showHDB(), 280);
  };

  // ── Assets: upload HDB statement (and CPF) ──
  engine.showHDB = function () {
    setStep(7);
    setActiveSection(5);
    engine._resumeAt = 'showHDB';
    addAI(() => addMsg(`<p>${t('hdb_details')}</p>`), () => uploadStep({
      specKey: 'hdb', promptKey: 'upload_hdb',
      apply: (ex) => {
        if (ex.address) fill('f_hdb_addr', ex.address, 'sec_property');
        if (ex.leaseYear) fill('f_hdb_lease', String(ex.leaseYear));
        if (ex.value) fill('f_hdb_value', ex.value);
        if (ex.loan) fill('f_hdb_loan', ex.loan);
        fill('f_duration', '16 years & 1 month');
        engine.property = ex;
      },
      next: Object.assign(() => engine.askRelief(), { resumeKey: 'showHDB' }),
    }));
  };
  engine.askRelief = function () {
    addAI(() => addMsg(`<div style="margin-top:4px;font-size:12px"><strong>${t('duration')}:</strong>
        <span class="duration-pill">16 years & 1 month <span class="duration-badge">${t('auto_calc')}</span></span></div>
      <p style="margin-top:10px">${t('relief')}</p>
      <p>${t('chat_type_to_fill')}</p>`));
  };
  engine.pickRelief = function (key) {
    const val = t(key);
    engine.reliefValue = val;
    fill('f_relief', val, 'sec_property');
    markSectionDone(5);
    disableLive(); addUser(val);
    setTimeout(() => engine.showMaintenance(), 280);
  };

  engine.showMaintenance = function () {
    setStep(8);
    setActiveSection(6);
    fill('f_child_naf', engine.form.fields.f_child_naf || 'SGD 0/mth', 'sec_maint');
    fill('f_self_naf', engine.form.fields.f_self_naf || 'SGD 0/mth');
    addAI(() => addMsg(`<p>${t('maintenance')}</p>
      <p>${t('chat_type_to_fill')}</p>
      <div class="note">${t('verify_before_next')}</div>`));
  };
  engine.submitMaint = function () {
    engine.childNaf = String(engine.form.fields.f_child_naf || 'SGD 0/mth');
    engine.selfNaf = String(engine.form.fields.f_self_naf || 'SGD 0/mth');
    disableLive(); addUser(t('confirm_maint'));
    engine.continueSection(6);
  };
  engine.showBankruptcy = function () {
    setActiveSection(7);
    addAI(() => addMsg(`<div style="font-weight:700;color:#660d07;margin-bottom:6px">${t('bk_title')}</div>
      <p>${t('bk_q')}</p>
      <p>${t('chat_type_to_fill')}</p>`));
  };
  engine.handleBK = function (arg) {
    const hasIt = arg === '1';
    engine.bkStatus = hasIt;
    fill('f_bk', hasIt ? 'Yes — proceedings exist' : 'None declared', 'sec_bk');
    disableLive(); addUser(hasIt ? t('bk_yes') : t('bk_no'));
    setTimeout(() => {
      if (hasIt) {
        addAI(() => addMsg(`<div class="fbox">
          <div class="fg"><label class="flbl">${t('bk_details_lbl')}</label>
            <textarea class="fin" id="bk_details" rows="3" placeholder="${t('bk_details_ph')}" style="width:100%;padding:8px"></textarea></div>
          ${btn('btn-secondary live', 'submitBKDetails', 'submit_bk')}</div>`));
      } else { markSectionDone(7); engine.showPreview(); }
    }, 280);
  };
  engine.submitBKDetails = function () {
    engine.bkDetails = engine.form.fields.f_bk_details || '';
    fill('f_bk_details', engine.bkDetails || '(no details)');
    engine.form.showBkRow = true;
    disableLive(); addUser(t('submit_bk'));
    engine.continueSection(7);
  };

  engine.showPreview = function () {
    setActiveSection(8);
    const today = new Date().toLocaleDateString(engine.lang === 'en' ? 'en-SG' : 'ms-MY');
    fill('f_ref', 'SYC/OS/2026/04/18742');
    fill('f_date', today);
    addAI(() => {
      const f = engine.form.fields;
      const talak = engine.form.talakRows.length
        ? engine.form.talakRows.map((r) => `<div style="margin-bottom:4px">${r}</div>`).join('') : '<div style="color:#888">N/A</div>';
      const kids = engine.form.childrenRows.length
        ? engine.form.childrenRows.map((r) => `<div>${r}</div>`).join('') : '—';
      addMsg(`<div class="preview-doc">
        <div class="doc-header">${t('preview')}</div>
        <div class="doc-section"><div class="doc-label">${t('personal_section')}</div><div class="doc-value" style="font-size:11.5px">
          <strong>${t('plaintiff')}:</strong> ${f.f_p_name || '—'} (${f.f_p_nric || '—'})<br>
          <strong>${t('defendant')}:</strong> ${f.f_d_name || '—'} (${f.f_d_nric || '—'})</div></div>
        <div class="doc-section"><div class="doc-label">${t('marriage_section')}</div><div class="doc-value" style="font-size:11.5px">${f.f_m_cert || '—'} &bull; ${f.f_m_date || '—'} &bull; ${f.f_m_venue || '—'}</div></div>
        <div class="doc-section"><div class="doc-label">${t('grounds_section')}</div><div class="doc-value" style="font-size:11.5px">${engine.selectedGroundValue || '—'}</div></div>
        ${engine.form.talakRows.length ? `<div class="doc-section"><div class="doc-label">${t('talak_section')}</div><div class="doc-value">${talak}</div></div>` : ''}
        <div class="doc-section"><div class="doc-label">${t('custody_section')}</div><div class="doc-value" style="font-size:11.5px">${kids}<br><strong>${t('custody')}:</strong> ${engine.custodyValue || '—'}</div></div>
        <div class="doc-section"><div class="doc-label">${t('property_section')}</div><div class="doc-value" style="font-size:11.5px">${f.f_hdb_addr || '—'}<br><strong>${t('relief')}:</strong> ${engine.reliefValue || '—'}</div></div>
        <div class="doc-section"><div class="doc-label">${t('maint_section')}</div><div class="doc-value" style="font-size:11.5px">${t('child_nafkah')}: SGD ${engine.childNaf}/mth &bull; ${t('self_nafkah')}: SGD ${engine.selfNaf}</div></div>
        <div class="doc-section"><div class="doc-label">${t('bk_section')}</div><div class="doc-value" style="font-size:11.5px">${engine.bkStatus ? '<span style="color:#c0392b">⚠ Yes — ' + engine.bkDetails + '</span>' : '<span style="color:#27ae60">✓ None declared</span>'}</div></div>
      </div>
      <p style="margin:10px 0 6px;font-size:12px">${t('declare_prompt')}</p>
      <div class="check-box"><input type="checkbox" id="declare_chk" data-act="toggleDeclare"><label for="declare_chk" style="font-size:12px">${t('i_declare')}</label></div>
      <button class="btn btn-primary live" id="submit_btn" data-act="doSubmit" disabled style="width:100%;margin-top:10px">${t('complete_btn')}</button>`);
    });
  };
  engine.toggleDeclare = function () {
    const chk = document.getElementById('declare_chk');
    const sb = document.getElementById('submit_btn');
    if (chk && sb) sb.disabled = !chk.checked;
  };
  engine.doSubmit = function () {
    const chk = document.getElementById('declare_chk');
    if (chk && !chk.checked) return;
    const today = new Date().toLocaleDateString(engine.lang === 'en' ? 'en-SG' : 'ms-MY');
    fill('f_declarant', engine.form.fields.f_p_name || '—');
    fill('f_declare_date', today);
    fill('f_declare_status', 'Declared & Submitted ✓', 'sec_declare');
    markSectionDone(8);
    disableLive(); addUser(t('complete_btn'));
    setTimeout(() => engine.showSuccess(), 280);
  };
  engine.showSuccess = function () {
    engine._resumeAt = null; persist();
    addAI(() => addMsg(`<div class="success-box"><div class="success-icon">✓</div>
      <div class="success-title">${t('success')}</div>
      <div class="success-ref">${t('ref_no')} SYC/OS/2026/04/18742</div>
      <div class="success-text">${t('pending')}<br>${t('next_step')}</div></div>
      <p style="margin:12px 0 8px;font-size:12.5px">${t('process_complete')}</p>
      <div class="choice-btns">
        ${btn('btn-primary live', 'showThankYou', 'relieved', { userKey: 'relieved' })}
        ${btn('live', 'showNext', 'whats_next', { userKey: 'whats_next' })}
      </div>`));
  };
  engine.showThankYou = () => addAI(() => addMsg(`<p>${t('thank_you')}</p>
    <div class="quote">"So keep your duty to Allah and fear Him as much as you can…" ${t('quran')}</div>`));
  engine.showNext = () => addAI(() => addMsg(`<div class="next-steps">
    ${[1, 2, 3, 4].map((n) => `<div class="step-item"><div class="step-num">${n}</div><div>${t('step' + n)}</div></div>`).join('')}</div>`));

  // ── free-text fallback handled in ChatPanel via askAssistant ──

  // ── act dispatcher (called by ChatPanel on data-act clicks) ──
  engine.handleAct = function (act, arg, userKey, userText) {
    if (!engine[act]) return;
    if (userKey) { disableLive(); addUser(t(userKey)); setTimeout(() => engine[act](arg), 280); }
    else if (userText) { disableLive(); addUser(userText); setTimeout(() => engine[act](arg), 280); }
    else engine[act](arg);
  };

  // push a raw user message (free text) + AI reply text
  engine.pushUserText = (txt) => addUser(txt);
  engine.pushAIText = (txt) => addMsg(`<p>${escapeHtml(txt).replace(/\n/g, '<br>')}</p>`);
  engine.addTyping = () => { const id = ++MSG_SEQ; engine.messages.push({ id, kind: 'typing' }); notify(); return id; };
  engine.removeMsg = (id) => { engine.messages = engine.messages.filter((m) => m.id !== id); notify(); };
  engine.handleChatText = function (txt) {
    const section = engine.form.activeSection || 1;
    if (isContinueIntent(txt)) {
      engine.continueSection(section, Boolean(engine.form.validationIssues?.[section]?.length));
      return true;
    }
    const updates = extractSectionUpdates(section, txt);
    if (!Object.keys(updates).length) return false;
    for (const [id, val] of Object.entries(updates)) engine.setField(id, val);
    const labels = Object.keys(updates).map((id) => fieldLabel(id)).join(', ');
    addAI(() => addMsg(`<p>${t('extracted_fields').replace('{fields}', escapeHtml(labels))}</p>
      <div class="note">${engine.isSectionComplete(section) ? t('ready_to_continue') : t('missing_more_details')}</div>`));
    return true;
  };

  // ── restore from a saved session ──
  engine.restore = function (saved) {
    engine.lang = saved.lang || 'en';
    Object.assign(engine.form, saved.form || {});
    Object.assign(engine, saved.vars || {});
    engine.step = saved.step || 1;
    engine._resumeAt = saved.resumeAt || null;
    engine.messages = [];
    notify();
    const resumeFn = engine._resumeAt && engine[engine._resumeAt];
    addMsg(`<p>${t('saved_msg')}</p>`);
    if (resumeFn) setTimeout(() => resumeFn(), 300);
    else setTimeout(() => engine.start(), 300);
  };

  engine.setLang = function (l) {
    engine.lang = l;
    notify();
  };

  return engine;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

function parseMoney(value) {
  const match = String(value || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : NaN;
}

function salaryIssue(who, occupation, salary, issues) {
  const occ = String(occupation || '').toLowerCase();
  const sal = parseMoney(salary);
  if (!Number.isFinite(sal)) return;
  const ordinaryRole = /(teacher|educator|admin|assistant|driver|clerk|cashier|nurse|technician|operator|executive)/.test(occ);
  if (ordinaryRole && sal >= 15000) {
    issues.push(`${who}'s salary (${salary}) looks high for "${occupation}". Please confirm whether it is monthly and keyed correctly.`);
  } else if (sal >= 30000) {
    issues.push(`${who}'s monthly salary (${salary}) looks unusually high. Please double-check the amount.`);
  }
}

function isContinueIntent(text) {
  return /\b(continue|next|proceed|save|section\s*\d+|go on|teruskan|sambung)\b/i.test(text);
}

function extractSectionUpdates(section, text) {
  const src = String(text || '').replace(/\r/g, '\n');
  if (section === 1) return extractParties(src);
  if (section === 2) return extractMarriage(src);
  if (section === 3) return extractGround(src);
  if (section === 4) return extractChildren(src);
  if (section === 5) return extractProperty(src);
  if (section === 6) return extractMaintenance(src);
  if (section === 7) return extractBankruptcy(src);
  return {};
}

function extractParties(text) {
  const updates = {};
  const p = sliceBetween(text, /plaintiff|applicant|you/i, /defendant|respondent|spouse/i) || text;
  const d = sliceFrom(text, /defendant|respondent|spouse/i);
  Object.assign(updates, extractPartyBlock(p, 'p'));
  if (d) Object.assign(updates, extractPartyBlock(d, 'd'));
  return updates;
}

function extractPartyBlock(block, party) {
  const out = {};
  const prefix = party === 'p' ? 'f_p_' : 'f_d_';
  const education = firstMatch(block, /education(?:\s+level)?\s*[:\n ]+(.+?)(?=\n|occupation|gross|salary|$)/i) || educationFromText(block);
  const occupation = firstMatch(block, /occupation\s*[:\n ]+(.+?)(?=\n|gross|salary|education|$)/i);
  const salary = firstMatch(block, /(?:gross\s+monthly\s+)?salary\s*[:\n ]+(?:sgd\s*)?([\d,]+(?:\.\d+)?)/i);
  const name = firstMatch(block, /(?:full\s+)?name\s*[:\n ]+(.+?)(?=\n|nric|date|dob|$)/i);
  const nric = firstMatch(block, /\b([STFGM]\d{7}[A-Z])\b/i);
  const dob = firstMatch(block, /(?:dob|date\s+of\s+birth)\s*[:\n ]+(.+?)(?=\n|citizenship|religion|$)/i);
  const citizenship = firstMatch(block, /citizenship\s*[:\n ]+(.+?)(?=\n|religion|education|$)/i);
  if (name) out[prefix + 'name'] = cleanValue(name);
  if (nric) out[prefix + 'nric'] = nric.toUpperCase();
  if (dob) out[prefix + 'dob'] = cleanValue(dob);
  if (citizenship) out[prefix + 'citizenship'] = cleanValue(citizenship);
  if (/islam/i.test(block)) out[prefix + 'religion'] = 'Islam';
  if (education) out[prefix + 'edu'] = cleanValue(education);
  if (occupation) out[prefix + 'occ'] = cleanValue(occupation);
  if (salary) out[prefix + 'sal'] = `SGD ${salary.replace(/,/g, '')}/mth`;
  return out;
}

function extractMarriage(text) {
  const out = {};
  const pairs = [
    ['f_m_cert', /(?:certificate|cert)\s*(?:no\.?|number)?\s*[:\n ]+(.+?)(?=\n|date|venue|wali|mahr|$)/i],
    ['f_m_date', /(?:date\s+of\s+marriage|marriage\s+date)\s*[:\n ]+(.+?)(?=\n|venue|wali|mahr|$)/i],
    ['f_m_venue', /venue\s*[:\n ]+(.+?)(?=\n|wali|mahr|prior|$)/i],
    ['f_m_wali', /wali\s*[:\n ]+(.+?)(?=\n|mahr|prior|$)/i],
    ['f_m_mahr', /mahr\s*[:\n ]+(.+?)(?=\n|prior|revocation|$)/i],
    ['f_m_revoc', /revocation\s*(?:cert|certificate)?\s*[:\n ]+(.+?)(?=\n|$)/i],
  ];
  for (const [id, rx] of pairs) {
    const v = firstMatch(text, rx);
    if (v) out[id] = cleanValue(v);
  }
  if (/\b(no|none|never)\b.*prior/i.test(text) || /prior.*\b(no|none|never)\b/i.test(text)) out.f_m_prior = 'No';
  if (/\b(yes)\b.*prior/i.test(text) || /prior.*\b(yes)\b/i.test(text)) out.f_m_prior = 'Yes';
  return out;
}

function extractGround(text) {
  const ground = firstMatch(text, /\b(talak|fasakh|taklik|khuluk)\b/i);
  return ground ? { f_ground: titleCase(ground) } : {};
}

function extractChildren(text) {
  const custody = firstMatch(text, /\b(joint custody|sole custody|court to determine|court decide)\b/i);
  if (!custody) return {};
  return { f_custody: custody.toLowerCase().includes('court') ? 'Court to determine' : titleCase(custody) };
}

function extractProperty(text) {
  const out = {};
  const address = firstMatch(text, /(?:hdb\s+)?address\s*[:\n ]+(.+?)(?=\n|lease|value|loan|relief|$)/i);
  const lease = firstMatch(text, /lease\s*(?:year)?\s*[:\n ]+(\d{4})/i);
  const value = firstMatch(text, /(?:estimated\s+)?value\s*[:\n ]+(?:sgd\s*)?([\d,]+)/i);
  const loan = firstMatch(text, /(?:loan|outstanding)\s*[:\n ]+(?:sgd\s*)?([\d,]+)/i);
  const duration = firstMatch(text, /duration\s*[:\n ]+(.+?)(?=\n|relief|$)/i);
  const relief = firstMatch(text, /relief\s*[:\n ]+(.+?)(?=\n|$)/i) || firstMatch(text, /\b(sell.+|transfer.+|retain.+)$/im);
  if (address) out.f_hdb_addr = cleanValue(address);
  if (lease) out.f_hdb_lease = lease;
  if (value) out.f_hdb_value = `SGD ${value.replace(/,/g, '')}`;
  if (loan) out.f_hdb_loan = `SGD ${loan.replace(/,/g, '')}`;
  if (duration) out.f_duration = cleanValue(duration);
  if (relief) out.f_relief = cleanValue(relief);
  return out;
}

function extractMaintenance(text) {
  const out = {};
  const child = firstMatch(text, /(?:child|nafkah).*?(?:sgd\s*)?([\d,]+(?:\.\d+)?)/i);
  const self = firstMatch(text, /(?:self|iddah|alimony).*?(?:sgd\s*)?([\d,]+(?:\.\d+)?)/i);
  if (child) out.f_child_naf = `SGD ${child.replace(/,/g, '')}/mth`;
  if (self) out.f_self_naf = `SGD ${self.replace(/,/g, '')}/mth`;
  return out;
}

function extractBankruptcy(text) {
  const lower = text.toLowerCase();
  if (/\b(no|none|nil|nothing)\b/.test(lower)) return { f_bk: 'None declared' };
  if (/\b(yes|bankrupt|bankruptcy|case|proceeding|court)\b/.test(lower)) return { f_bk: 'Yes - proceedings exist', f_bk_details: cleanValue(text) };
  return {};
}

function firstMatch(text, rx) {
  const m = String(text || '').match(rx);
  return m ? cleanValue(m[1]) : '';
}

function sliceBetween(text, startRx, endRx) {
  const start = text.search(startRx);
  if (start < 0) return '';
  const rest = text.slice(start);
  const end = rest.search(endRx);
  return end > 0 ? rest.slice(0, end) : rest;
}

function sliceFrom(text, startRx) {
  const start = text.search(startRx);
  return start >= 0 ? text.slice(start) : '';
}

function educationFromText(text) {
  const options = ["Bachelor's Degree", 'Polytechnic Diploma', "Master's/PhD", 'ITE/NITEC', 'Secondary School', 'Primary School'];
  return options.find((o) => text.toLowerCase().includes(o.toLowerCase())) || '';
}

function cleanValue(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/^[-:]+|[-:]+$/g, '').trim();
}

function titleCase(value) {
  return cleanValue(value).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function fieldLabel(id) {
  return ({
    f_p_edu: 'plaintiff education', f_p_occ: 'plaintiff occupation', f_p_sal: 'plaintiff salary',
    f_d_edu: 'defendant education', f_d_occ: 'defendant occupation', f_d_sal: 'defendant salary',
    f_m_cert: 'marriage certificate number', f_m_date: 'marriage date', f_m_venue: 'venue',
    f_ground: 'ground', f_custody: 'custody', f_hdb_addr: 'HDB address',
    f_child_naf: 'child nafkah', f_self_naf: 'self nafkah', f_bk: 'bankruptcy status',
  }[id] || id);
}
