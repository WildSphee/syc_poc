import React, { useState } from 'react';

// DIVORCE / OTHERS landing (mockup). Left sub-tabs + ongoing-filing list and a
// "Divorce E-Services" button that leads into the new-case flow.
const ONGOING = [
  { id: 'OS-2025-000058', type: 'Originating Summons for Divorce', status: 'Draft', date: '18/06/2025' },
  { id: 'WV-2025-000059', type: 'Payment Waiver Request', status: 'Returned As Incomplete', date: '05/03/2025' },
  { id: 'MCP-2025-000006', type: 'Marriage Counselling Programme', status: 'Pending 1st Appointment', date: '22/02/2025' },
];

export default function DivorceScreen({ onNav }) {
  const [tab, setTab] = useState('ongoing');
  return (
    <div className="screen">
      <div className="hero">
        <div className="crumb">DASHBOARD / DIVORCE/OTHERS</div>
        <h1>Divorce/Others</h1>
      </div>
      <div className="page-wrap">
        <div className="div-layout">
          <div className="side-tabs">
            <button className={`side-tab${tab === 'ongoing' ? ' active' : ''}`} onClick={() => setTab('ongoing')}>Ongoing Filing</button>
            <button className={`side-tab${tab === 'completed' ? ' active' : ''}`} onClick={() => setTab('completed')}>Completed Filing</button>
            <button className={`side-tab${tab === 'cert' ? ' active' : ''}`} onClick={() => setTab('cert')}>Divorce Certificate availability date</button>
          </div>

          <div>
            <div className="search-row" style={{ marginTop: 0 }}>
              <div className="lbl">Search case by Case ID (i.e. OS-XXXX-XXXXX)</div>
              <div className="search-controls">
                <input className="search-input" placeholder="Enter Case ID" />
                <button className="btn-grey">Search</button>
                <button className="btn-outline" onClick={() => onNav('eservices')}>Divorce E-Services</button>
              </div>
            </div>

            <div className="note-strip">
              Draft applications will be automatically deleted from the system if they exceed a six-month
              period from the creation date. Ensure all necessary actions are taken before this period ends.
            </div>

            <div className="tbl-band">Latest Ongoing Filings</div>
            <table className="todo-table" style={{ borderRadius: '0 0 6px 6px' }}>
              <thead>
                <tr><th>Case ID</th><th>Filing Type</th><th>Status</th><th>Created</th><th>More Options</th></tr>
              </thead>
              <tbody>
                {ONGOING.map((r) => (
                  <tr key={r.id}>
                    <td><span className="cid">{r.id}</span></td>
                    <td>{r.type}</td>
                    <td>{r.status}</td>
                    <td>{r.date}</td>
                    <td><span className="dots">⋮</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
