import React from 'react';

// Persistent Singapore-Government style header shown across every screen
// (the lead-up mockup pages and the filing demo). White nav bar — replaces the
// old maroon top bar. Tabs are click-through; Dashboard + Divorce navigate.
const TABS = [
  { key: 'dashboard', label: 'Dashboard', route: 'dashboard' },
  { key: 'inheritance', label: 'Inheritance', route: null },
  { key: 'divorce', label: 'Divorce', route: 'divorce' },
  { key: 'queue', label: 'Queue Request', route: null },
];

export default function GovHeader({ route, onNav }) {
  // which top tab should read as "active" for a given route
  const activeTab =
    route === 'dashboard' ? 'dashboard'
    : route === 'divorce' || route === 'eservices' || route === 'filing' || route === 'demo' ? 'divorce'
    : '';
  return (
    <header className="gov-header">
      <div className="gov-nav">
        <div className="gov-brand" onClick={() => onNav('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="gov-crest">⚖</div>
          <div className="gov-brand-text">
            <div className="l1">SYARIAH COURT</div>
            <div className="l2">SINGAPORE</div>
          </div>
        </div>
        <nav className="gov-tabs">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              className={`gov-tab${activeTab === tb.key ? ' active' : ''}`}
              onClick={() => tb.route && onNav(tb.route)}
            >
              {tb.label}
            </button>
          ))}
        </nav>
        <div className="gov-right">
          <div className="gov-bell">🔔<span className="gov-badge">75</span></div>
          <div className="gov-user"><span className="av">👤</span><span>⌄</span></div>
        </div>
      </div>
    </header>
  );
}
