import React, { useEffect, useRef, useState } from 'react';
import GovHeader from './components/GovHeader.jsx';
import OsStepBar from './components/OsStepBar.jsx';
import SectionSidebar from './components/SectionSidebar.jsx';
import OsForm from './components/OsForm.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import ResumeBanner from './components/ResumeBanner.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import DivorceScreen from './screens/DivorceScreen.jsx';
import EServicesScreen from './screens/EServicesScreen.jsx';
import FilingScreen from './screens/FilingScreen.jsx';
import { createEngine } from './state/createEngine.js';
import { loadSession, clearSession } from './lib/session.js';

export default function App() {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = createEngine();
  const engine = engineRef.current;

  // Mirror of engine state that drives React rendering.
  const [, forceTick] = useState(0);
  const [lang, setLang] = useState(engine.lang);
  const [saved, setSaved] = useState(null);
  // Lead-up navigation: dashboard → divorce → eservices → filing → demo.
  const [route, setRoute] = useState('dashboard');
  const startedRef = useRef(false);

  useEffect(() => {
    engine.onChange = () => {
      setLang(engine.lang);
      forceTick((n) => n + 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start (or offer to resume) the filing flow the first time we enter the demo.
  function enterDemo() {
    setRoute('demo');
    if (startedRef.current) return;
    startedRef.current = true;
    const existing = loadSession();
    if (existing && existing.resumeAt) {
      setSaved(existing);
    } else {
      engine.start();
    }
  }

  function navigate(to) {
    if (to === 'demo') enterDemo();
    else setRoute(to);
  }

  function resume() {
    setSaved(null);
    engine.restore(loadSession());
  }
  function startNew() {
    clearSession();
    setSaved(null);
    engine.messages = [];
    engine.start();
  }
  function onSetLang(l) {
    // Restart the flow in the chosen language (mirrors original setLang behaviour).
    clearSession();
    engine.lang = l;
    engine.step = 1;
    engine.form = {
      fields: {}, filled: {}, flash: {}, secDone: {}, talakRows: [], childrenRows: [],
      showRevocRow: false, showBkRow: false, progressPct: 0, activeSection: 1,
      unlockedSection: 1, validationIssues: {}, justUnlockedSection: null,
    };
    engine.talakData = []; engine.numTalakSessions = 0; engine.witnessState = {};
    engine.messages = [];
    setSaved(null);
    engine.start();
  }

  return (
    <>
      <GovHeader route={route} onNav={navigate} />

      {route === 'dashboard' && <DashboardScreen onNav={navigate} />}
      {route === 'divorce' && <DivorceScreen onNav={navigate} />}
      {route === 'eservices' && <EServicesScreen onNav={navigate} />}
      {route === 'filing' && <FilingScreen onNav={navigate} />}

      {route === 'demo' && (
        <>
          <OsStepBar lang={lang} onSetLang={onSetLang} />
          {saved && (
            <ResumeBanner lang={lang} saved={saved} onResume={resume} onStartNew={startNew} />
          )}
          <div className="main-layout">
            <SectionSidebar form={engine.form} />
            <OsForm lang={lang} form={engine.form} engine={engine} />
            <ChatPanel
              engine={engine}
              lang={lang}
              messages={engine.messages}
              progressPct={engine.form.progressPct}
            />
          </div>
        </>
      )}
    </>
  );
}
