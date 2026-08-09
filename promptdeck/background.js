// MV3 background script. On Chrome this runs as a service worker (classic
// script, not a module), so we use importScripts to reuse the shared storage
// helpers. On Firefox, background.js runs as a non-persistent background
// page loaded via manifest "background.scripts" — storage.js is already
// loaded first in that array and importScripts doesn't exist there, so we
// only call it when available (Chrome/Chromium service worker context).
if (typeof importScripts === 'function') {
  importScripts('storage.js');
}

const MENU_PARENT = 'promptdeck-parent';

async function rebuildContextMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_PARENT,
    title: 'Insert PromptDeck prompt',
    contexts: ['editable'],
  });
  const prompts = await Storage.getPrompts();
  for (const p of prompts) {
    chrome.contextMenus.create({
      id: `promptdeck-${p.id}`,
      parentId: MENU_PARENT,
      title: p.title.slice(0, 60),
      contexts: ['editable'],
    });
  }
}

chrome.runtime.onInstalled.addListener(rebuildContextMenu);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.prompts) rebuildContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId.startsWith('promptdeck-') || info.menuItemId === MENU_PARENT) return;
  const id = info.menuItemId.replace('promptdeck-', '');
  const prompts = await Storage.getPrompts();
  const prompt = prompts.find((p) => p.id === id);
  if (!prompt || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'PROMPTDECK_INSERT', text: prompt.body });
});
