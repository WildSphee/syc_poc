import React, { useEffect, useRef, useState } from 'react';
import { text } from '../i18n.js';
import UploadPrompt from './UploadPrompt.jsx';
import { askAssistant, hasApiKey } from '../lib/openai.js';

export default function ChatPanel({ engine, lang, messages, progressPct }) {
  const t = (k) => text[lang][k] ?? k;
  const boxRef = useRef(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  // Delegate clicks on data-act buttons inside message HTML to the engine.
  function onBoxClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.closest('.msg-consumed')) return;
    const { act, arg, userkey, usertext } = el.dataset;
    engine.handleAct(act, arg, userkey, usertext);
  }

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput('');
    engine.pushUserText(msg);
    if (!hasApiKey()) {
      engine.pushAIText(t('use_buttons'));
      return;
    }
    setSending(true);
    const typingId = engine.addTyping();
    try {
      const reply = await askAssistant(msg, { lang, formSnapshot: engine.formSnapshot() });
      engine.removeMsg(typingId);
      engine.pushAIText(reply || t('use_buttons'));
    } catch (e) {
      engine.removeMsg(typingId);
      engine.pushAIText('⚠ ' + (e.message || 'AI request failed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-avatar">🤖</div>
        <div className="chat-header-info">
          <div className="chat-name">Aisha · SYC Navigator</div>
          <div className="chat-sub">Divorce Filing Assistant</div>
        </div>
        <div className="chat-user-badge">{t('user').split(' · ')[0]}</div>
      </div>
      <div className="chat-prog"><div className="chat-prog-fill" style={{ width: progressPct + '%' }} /></div>

      <div className="chat-messages" id="chatBox" ref={boxRef} onClick={onBoxClick}>
        {messages.map((m) => {
          if (m.kind === 'typing') {
            return (
              <div className="typing-dot" key={m.id}><span /><span /><span /></div>
            );
          }
          if (m.kind === 'user') {
            return <div className="user-bubble" key={m.id}>{m.text}</div>;
          }
          if (m.kind === 'upload') {
            return <UploadPrompt key={m.id} msg={m} />;
          }
          // ai
          return (
            <div
              key={m.id}
              className={m.consumed ? 'msg-consumed' : ''}
              dangerouslySetInnerHTML={{ __html: `<div class="ai-bubble">${m.html}</div>` }}
            />
          );
        })}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input-box"
          placeholder={t('use_buttons')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        />
        <button className="chat-send-btn" onClick={send} disabled={sending}>Send</button>
      </div>
    </div>
  );
}
