import React from 'react';

// Landing page (mockup) — welcome + the "What I need to do" task list.
// Static / non-functional, purely to set the scene before the filing demo.
const TASKS = [
  { cat: 'Pre-Divorce', id: 'MCP-2025-000006', task: 'Schedule 1st Appointment', status: 'Pending 1st Appointment - ', overdue: true, date: '22/02/2025' },
  { cat: 'Divorce', id: 'WV-2025-000034', task: 'Payment Waiver Request', status: 'Returned As Incomplete (Please see Remarks under Divorce > Ongoing Case folder) - ', overdue: true, date: '27/02/2025' },
  { cat: 'Divorce', id: 'WV-2025-000038', task: 'Payment Waiver Request', status: 'Returned As Incomplete (Please see Remarks under Divorce > Ongoing Case folder) - ', overdue: true, date: '27/02/2025' },
  { cat: 'Divorce', id: 'WV-2025-000041', task: 'Payment Waiver Request', status: 'Returned As Incomplete (Please see Remarks under Divorce > Ongoing Case folder) - ', overdue: true, date: '01/03/2025' },
  { cat: 'Divorce', id: 'WV-2025-000059', task: 'Payment Waiver Request', status: 'Returned As Incomplete (Please see Remarks under Divorce > Ongoing Case folder) - ', overdue: true, date: '05/03/2025' },
  { cat: 'Others', id: 'OS/O-2025-000112', task: 'Appointment - Pre-Trial Conference', status: 'Booked', booked: true, date: '16/04/2025' },
];

export default function DashboardScreen({ onNav }) {
  return (
    <div className="screen">
      <div className="hero">
        <div className="crumb">DASHBOARD / DASHBOARD</div>
        <h1>Dashboard</h1>
      </div>
      <div className="page-wrap">
        <div className="dash-salam">Assalamualaikum!</div>
        <div className="dash-welcome">
          Welcome Dominic D`Silva,
          <span className="dash-update">✎ Update My Particulars</span>
        </div>
        <p className="dash-lead">
          This is your personalised portal where you can view your transactions, correspondence,
          and cases with Syariah Court at a glance.
        </p>

        <div className="search-row">
          <div className="lbl">Search case by Case ID (i.e. OS-XXXX-XXXXX)</div>
          <div className="search-controls">
            <input className="search-input" placeholder="Enter Case ID" />
            <button className="btn-solid">Search</button>
          </div>
        </div>

        <div className="todo-title">What I need to do... - 22 items</div>
        <table className="todo-table">
          <thead>
            <tr>
              <th>Category</th><th>Case ID</th><th>Case/ Appointments/ Tasks</th>
              <th>Status</th><th>Date ↑</th><th>More Options</th>
            </tr>
          </thead>
          <tbody>
            {TASKS.map((r) => (
              <tr key={r.id}>
                <td>{r.cat}</td>
                <td><span className="cid">{r.id}</span></td>
                <td><span className="task-link">{r.task}</span></td>
                <td>
                  {r.status}
                  {r.overdue && <span className="overdue">Overdue</span>}
                  {r.booked && <span className="booked">Booked</span>}
                </td>
                <td>{r.date}</td>
                <td><span className="dots">⋮</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="dash-lead" style={{ marginTop: 18 }}>
          To start a new divorce filing, open the <button className="task-link" style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }} onClick={() => onNav('divorce')}>Divorce</button> tab.
        </p>
      </div>
    </div>
  );
}
