// Injected into every page. Inserts prompt text into whatever text field
// currently has focus — plain <textarea>/<input>, or a contenteditable div
// (how ChatGPT, Claude, and Gemini's chat boxes are built).
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'PROMPTDECK_INSERT') return;
  const ok = insertIntoActiveElement(message.text);
  sendResponse({ ok });
});

function insertIntoActiveElement(text) {
  const el = document.activeElement;
  if (!el) return false;

  const tag = el.tagName;
  if (tag === 'TEXTAREA' || (tag === 'INPUT' && el.type === 'text')) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    el.value = before + text + after;
    const cursor = start + text.length;
    el.setSelectionRange(cursor, cursor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  if (el.isContentEditable) {
    // Use execCommand where available (still works across Chromium for
    // contenteditable insertion and correctly notifies React-based editors
    // like ChatGPT/Claude's composer); fall back to manual DOM insert.
    const inserted = document.execCommand && document.execCommand('insertText', false, text);
    if (!inserted) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      } else {
        el.textContent += text;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }

  return false;
}
