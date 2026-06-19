import React from 'react';

// The Originating-Summons 4-step progress indicator, replicated from the SYC
// "Filing of Originating Summons for Divorce" page. Used full-size on the filing
// screen and compact inside the demo's white step bar.
export const OS_STEPS = ['Filing of Originating Summons', 'Agreement', 'Make Payment', 'Complete'];

export default function OsFlow({ active = 1 }) {
  return (
    <div className="osflow">
      {OS_STEPS.map((label, i) => {
        const n = i + 1;
        const cls = n === active ? 'active' : n < active ? 'done' : '';
        return (
          <React.Fragment key={n}>
            <div className={`osflow-step ${cls}`}>
              <div className="osflow-num">{n < active ? '✓' : n}</div>
              <div className="osflow-lbl">{label}</div>
            </div>
            {n < OS_STEPS.length && <div className="osflow-line" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
