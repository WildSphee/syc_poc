// localStorage-backed save/resume for a single in-progress application.
// Front-end only — one saved case per browser, keyed below.

const KEY = 'syc_os_session_v1';
const MAX_ATTACHMENT_BYTES = 1_500_000; // ~1.5MB data-URL guard per attachment

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(state) {
  try {
    // Drop oversized attachment data URLs but keep their metadata, so resume
    // doesn't blow the localStorage quota.
    const slim = {
      ...state,
      sections: Object.fromEntries(
        Object.entries(state.sections || {}).map(([id, s]) => {
          if (s?.attachment?.dataUrl && s.attachment.dataUrl.length > MAX_ATTACHMENT_BYTES) {
            const { dataUrl, ...meta } = s.attachment;
            return [id, { ...s, attachment: { ...meta, dropped: true } }];
          }
          return [id, s];
        })
      ),
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(slim));
    return true;
  } catch (e) {
    console.warn('saveSession failed', e);
    return false;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
