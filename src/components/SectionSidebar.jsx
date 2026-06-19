import React from 'react';

// Left status rail shown while filling the Case Statement, modelled on the SYC
// form's section sidebar: each section carries a status badge (complete / to do).
// Status is driven by the live engine form state so it updates as the user fills.
const SECTIONS = [
  { n: 1, label: 'Plaintiff & Defendant', dom: 'sec_parties' },
  { n: 2, label: 'Date & Place of Marriage', dom: 'sec_marriage' },
  { n: 3, label: 'Grounds of Divorce', dom: 'sec_grounds' },
  { n: 4, label: 'Child(ren) & Custody', dom: 'sec_children' },
  { n: 5, label: 'Matrimonial Property', dom: 'sec_property' },
  { n: 6, label: 'Maintenance & Nafkah', dom: 'sec_maint' },
  { n: 7, label: 'Related Court Proceedings', dom: 'sec_bk' },
  { n: 8, label: 'Declaration & Relief', dom: 'sec_declare' },
];

export default function SectionSidebar({ form }) {
  const secDone = form.secDone || {};
  const active = form.activeSection || 1;
  const unlocked = form.unlockedSection || 1;

  function go(dom) {
    const el = document.getElementById(dom);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <aside className="sec-sidebar">
      <div className="ss-head">Case Statement Sections</div>
      {SECTIONS.map((s) => {
        const done = !!secDone[s.n];
        const reached = s.n <= unlocked;
        const badge = done ? 'done' : reached ? 'inc' : 'idle';
        const mark = done ? '✓' : reached ? 'ⓘ' : s.n;
        return (
          <div
            key={s.n}
            className={`ss-item${active === s.n ? ' active' : ''}`}
            onClick={() => go(s.dom)}
          >
            <span className="ss-name">{s.n}. {s.label}</span>
            <span className={`ss-badge ${badge}`}>{mark}</span>
          </div>
        );
      })}
      <div className="ss-legend">
        <div><span className="dot done" /> Complete</div>
        <div><span className="dot inc" /> Incomplete</div>
      </div>
    </aside>
  );
}
