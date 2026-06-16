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
      progressPct: 0,
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
        progressPct: engine.form.progressPct,
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
    addAI(() => addMsg(`<p>${t('addl_details')}</p>
      <div class="fbox">
        <div class="fbox-t">${t('plaintiff')}</div>
        <div class="fgrid">
          <div class="fg"><label class="flbl">${t('education')}</label>
            <select class="fsel" id="p_edu">${t('education_opts').map((o) => `<option ${o === a.p.edu ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="fg"><label class="flbl">${t('occupation')}</label><input class="fin" id="p_occ" value="${a.p.occ}"></div>
        </div>
        <div class="fgrid full"><div class="fg"><label class="flbl">${t('salary')}</label><div class="sgdi"><div class="sgdp">SGD</div><input type="number" class="fin" id="p_sal" value="${a.p.sal}" style="border:none"></div></div></div>
        <div class="fbox-t" style="margin-top:10px">${t('defendant')}</div>
        <div class="fgrid">
          <div class="fg"><label class="flbl">${t('education')}</label>
            <select class="fsel" id="d_edu">${t('education_opts').map((o) => `<option ${o === a.d.edu ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="fg"><label class="flbl">${t('occupation')}</label><input class="fin" id="d_occ" value="${a.d.occ}"></div>
        </div>
        <div class="fgrid full"><div class="fg"><label class="flbl">${t('salary')}</label><div class="sgdi"><div class="sgdp">SGD</div><input type="number" class="fin" id="d_sal" value="${a.d.sal}" style="border:none"></div></div></div>
        ${btn('btn-secondary live', 'confirmAddl', 'confirm_addl')}
      </div>`));
  };
  engine.confirmAddl = function () {
    const a = engine.addlData;
    a.p.edu = document.getElementById('p_edu').value; a.p.occ = document.getElementById('p_occ').value; a.p.sal = document.getElementById('p_sal').value;
    a.d.edu = document.getElementById('d_edu').value; a.d.occ = document.getElementById('d_occ').value; a.d.sal = document.getElementById('d_sal').value;
    fill('f_p_edu', a.p.edu); fill('f_p_occ', a.p.occ); fill('f_p_sal', 'SGD ' + a.p.sal + '/mth');
    fill('f_d_edu', a.d.edu); fill('f_d_occ', a.d.occ); fill('f_d_sal', 'SGD ' + a.d.sal + '/mth');
    markSectionDone(1);
    disableLive(); addUser(t('confirm_addl'));
    setTimeout(() => engine.checkCitizenship(), 280);
  };
  engine.checkCitizenship = function () {
    addAI(() => addMsg(`<div class="bypass-card"><div class="bypass-icon">✓</div>
      <div><div class="bypass-main">${t('jurisdiction')}</div><div class="bypass-note">${t('step_bypassed')}</div></div></div>
      ${btn('btn-secondary live', 'showMarriage', 'continue_btn', { userKey: 'continue_btn' })}`));
  };

  // ── Marriage: upload ROMM cert ──
  engine.showMarriage = function () {
    setStep(5);
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
    addAI(() => addMsg(`<div class="note">${t('prior_q')}</div>
      <div class="choice-btns" style="margin-top:8px">
        ${btn('btn-primary live', 'showGrounds', 'no', { userKey: 'no' })}
        ${btn('live', 'showRevocation', 'yes_prior', { userKey: 'yes_prior' })}
      </div>`));
  };
  engine.showRevocation = function () {
    fill('f_m_prior', t('yes_prior'));
    addAI(() => addMsg(`<p>${t('revocation')}</p>
      <div class="fbox">
        <div class="fgrid full"><div class="fg"><label class="flbl">${t('revoc_cert')}</label><input class="fin" id="revoc_cert"></div></div>
        <div class="fgrid full"><div class="fg"><label class="flbl">${t('revoc_date')}</label><input type="date" class="fin" id="revoc_date"></div></div>
        ${btn('btn-secondary live', 'confirmRevoc', 'confirm_revoc')}
      </div>`));
  };
  engine.confirmRevoc = function () {
    engine.revocData.certNo = document.getElementById('revoc_cert').value;
    engine.revocData.regDate = document.getElementById('revoc_date').value;
    engine.form.showRevocRow = true;
    fill('f_m_revoc', engine.revocData.certNo + ' (' + engine.revocData.regDate + ')');
    disableLive(); addUser(t('confirm_revoc'));
    setTimeout(() => engine.showGrounds(), 280);
  };

  // ── Grounds ──
  engine.showGrounds = function () {
    markSectionDone(2);
    addAI(() => addMsg(`<p>${t('grounds')}</p>
      <div class="grid-4">
        <div class="ground-card live-card" data-act="groundChoice" data-arg="talak"><div class="ground-arabic">١</div><div class="ground-en">${t('talak')}</div><div class="ground-bm">${t('talak_desc')}</div></div>
        <div class="ground-card live-card" data-act="groundChoice" data-arg="fasakh"><div class="ground-arabic">ف</div><div class="ground-en">${t('fasakh')}</div><div class="ground-bm">${t('fasakh_desc')}</div></div>
        <div class="ground-card live-card" data-act="groundChoice" data-arg="taklik"><div class="ground-arabic">ت</div><div class="ground-en">${t('taklik')}</div><div class="ground-bm">${t('taklik_desc')}</div></div>
        <div class="ground-card live-card" data-act="groundChoice" data-arg="khuluk"><div class="ground-arabic">خ</div><div class="ground-en">${t('khuluk')}</div><div class="ground-bm">${t('khuluk_desc')}</div></div>
      </div>
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
    addAI(() => addMsg(`<div class="note">${t('parenting')}</div>
      <div class="choice-btns" style="margin-top:8px">
        ${btn('live', 'pickCustody', 'joint', { arg: 'joint' })}
        ${btn('live', 'pickCustody', 'sole_me', { arg: 'sole_me' })}
        ${btn('live', 'pickCustody', 'court_decide', { arg: 'court_decide' })}
      </div>`));
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
      <div class="choice-btns" style="margin-top:6px">
        ${btn('live', 'pickRelief', 'sell_50', { arg: 'sell_50' })}
        ${btn('live', 'pickRelief', 'transfer', { arg: 'transfer' })}
        ${btn('live', 'pickRelief', 'retain', { arg: 'retain' })}
      </div>`));
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
    addAI(() => addMsg(`<p>${t('maintenance')}</p>
      <div class="fbox">
        <div class="fgrid">
          <div class="fg"><label class="flbl">${t('child_nafkah')}</label><div class="sgdi"><div class="sgdp">SGD</div><input type="number" id="child_naf" value="0" min="0" style="border:none;padding:6px 8px"></div></div>
          <div class="fg"><label class="flbl">${t('self_nafkah')}</label><div class="sgdi"><div class="sgdp">SGD</div><input type="number" id="self_naf" value="0" min="0" style="border:none;padding:6px 8px"></div></div>
        </div>
        ${btn('btn-secondary live', 'submitMaint', 'confirm_maint')}
      </div>`));
  };
  engine.submitMaint = function () {
    engine.childNaf = document.getElementById('child_naf').value || '0';
    engine.selfNaf = document.getElementById('self_naf').value || '0';
    fill('f_child_naf', 'SGD ' + engine.childNaf + '/mth', 'sec_maint');
    fill('f_self_naf', 'SGD ' + engine.selfNaf);
    markSectionDone(6);
    disableLive(); addUser(t('confirm_maint'));
    setTimeout(() => engine.showBankruptcy(), 280);
  };
  engine.showBankruptcy = function () {
    addAI(() => addMsg(`<div style="font-weight:700;color:#660d07;margin-bottom:6px">${t('bk_title')}</div>
      <p>${t('bk_q')}</p>
      <div class="choice-btns">
        ${btn('live', 'handleBK', 'bk_no', { arg: '0' })}
        ${btn('live', 'handleBK', 'bk_yes', { arg: '1' })}
      </div>`));
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
    engine.bkDetails = document.getElementById('bk_details').value;
    fill('f_bk_details', engine.bkDetails || '(no details)');
    engine.form.showBkRow = true;
    markSectionDone(7);
    disableLive(); addUser(t('submit_bk'));
    setTimeout(() => engine.showPreview(), 280);
  };

  engine.showPreview = function () {
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
