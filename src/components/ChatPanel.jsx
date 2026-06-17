import React, { useEffect, useRef, useState } from 'react';
import { text } from '../i18n.js';
import UploadPrompt from './UploadPrompt.jsx';
import { askAssistant, extractFields, hasApiKey } from '../lib/openai.js';

export default function ChatPanel({ engine, lang, messages, progressPct }) {
  const t = (k) => text[lang][k] ?? k;
  const boxRef = useRef(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Autoscroll to the newest message. The engine mutates `messages` in place
  // (stable reference), so we run this every render and key it off the live
  // length + last id to catch new bubbles, typing dots, and removals alike.
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    return () => cancelAnimationFrame(raf);
  }, [messages.length, lastId, sending]);

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

    // "continue / next / save" → run the gated continue (includes the LLM sense-check).
    if (engine.isContinueIntent?.(msg)) {
      engine.continueSection(engine.form.activeSection || 1);
      return;
    }

    // No API key → fall back to the legacy regex extractor.
    if (!hasApiKey()) {
      if (engine.handleChatText?.(msg)) return;
      engine.pushAIText(t('use_buttons'));
      return;
    }

    setSending(true);
    const typingId = engine.addTyping();
    try {
      const section = engine.form.activeSection || 1;
      const { updates, note } = await extractFields(msg, {
        lang,
        section,
        fields: engine.typedFieldsForSection(section),
        formSnapshot: engine.formSnapshot(),
      });
      if (updates && Object.keys(updates).length && engine.applyExtraction(section, updates)) {
        engine.removeMsg(typingId);
      } else if (note) {
        engine.removeMsg(typingId);
        engine.pushAIText(note);
      } else {
        const reply = await askAssistant(msg, { lang, formSnapshot: engine.formSnapshot() });
        engine.removeMsg(typingId);
        engine.pushAIText(reply || t('use_buttons'));
      }
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
          <div className="chat-name">Aisha AI</div>
          <div className="chat-sub">GenAI Filing Assistant</div>
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
