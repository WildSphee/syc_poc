import React, { useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import OsForm from './components/OsForm.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import ResumeBanner from './components/ResumeBanner.jsx';
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
  const [started, setStarted] = useState(false);

  useEffect(() => {
    engine.onChange = () => {
      setLang(engine.lang);
      forceTick((n) => n + 1);
    };
    const existing = loadSession();
    if (existing && existing.resumeAt) {
      setSaved(existing);
    } else {
      engine.start();
      setStarted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resume() {
    setSaved(null);
    setStarted(true);
    engine.restore(loadSession());
  }
  function startNew() {
    clearSession();
    setSaved(null);
    setStarted(true);
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
    setStarted(true);
    engine.start();
  }

  return (
    <>
      <TopBar lang={lang} step={engine.step} onSetLang={onSetLang} />
      {saved && (
        <ResumeBanner lang={lang} saved={saved} onResume={resume} onStartNew={startNew} />
      )}
      <div className="main-layout">
        <OsForm lang={lang} form={engine.form} engine={engine} />
        <ChatPanel
          engine={engine}
          lang={lang}
          messages={engine.messages}
          progressPct={engine.form.progressPct}
        />
      </div>
    </>
  );
}
