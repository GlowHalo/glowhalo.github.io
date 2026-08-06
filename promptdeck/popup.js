const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const searchEl = document.getElementById('search');
const tierBadge = document.getElementById('tierBadge');
const editForm = document.getElementById('editForm');
const editTitle = document.getElementById('editTitle');
const editBody = document.getElementById('editBody');
const addBtn = document.getElementById('addBtn');
const optionsBtn = document.getElementById('optionsBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

let allPrompts = [];
let editingId = null;

async function refresh() {
  allPrompts = await Storage.getPrompts();
  const license = await Storage.getLicense();
  tierBadge.textContent = license.valid ? 'Pro' : 'Free';
  tierBadge.classList.toggle('pro', license.valid);
  render(searchEl.value);
}

function render(filter) {
  const q = (filter || '').toLowerCase();
  const items = allPrompts.filter(
    (p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)
  );
  listEl.innerHTML = '';
  emptyEl.style.display = items.length === 0 ? 'block' : 'none';
  for (const p of items) {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="title">${escapeHtml(p.title)}</div>
      <div class="body">${escapeHtml(p.body.slice(0, 80))}</div>
      <div class="actions">
        <button data-action="insert">Insert</button>
        <button data-action="copy">Copy</button>
        <button data-action="edit">Edit</button>
        <button data-action="delete">Delete</button>
      </div>`;
    el.querySelector('[data-action="insert"]').onclick = (e) => {
      e.stopPropagation();
      insertPrompt(p.body);
    };
    el.querySelector('[data-action="copy"]').onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(p.body);
    };
    el.querySelector('[data-action="edit"]').onclick = (e) => {
      e.stopPropagation();
      openEdit(p);
    };
    el.querySelector('[data-action="delete"]').onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${p.title}"?`)) {
        await Storage.deletePrompt(p.id);
        refresh();
      }
    };
    el.onclick = () => insertPrompt(p.body);
    listEl.appendChild(el);
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function insertPrompt(text) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PROMPTDECK_INSERT', text });
    window.close();
  } catch (e) {
    // content script may not be injected on this page (e.g. chrome:// pages) — fall back to copy
    await navigator.clipboard.writeText(text);
    alert("Couldn't insert on this page — copied to clipboard instead.");
  }
}

function openEdit(prompt) {
  editingId = prompt ? prompt.id : null;
  editTitle.value = prompt ? prompt.title : '';
  editBody.value = prompt ? prompt.body : '';
  editForm.style.display = 'block';
  listEl.style.display = 'none';
  emptyEl.style.display = 'none';
}

function closeEdit() {
  editForm.style.display = 'none';
  listEl.style.display = 'block';
  editingId = null;
}

document.getElementById('importPresetLink').onclick = async (e) => {
  e.preventDefault();
  const license = await Storage.getLicense();
  const preset = license.valid ? BOARD_OF_DIRECTORS_PRESET : STARTER_PRESET;
  for (const p of preset) {
    try {
      await Storage.addPrompt({ title: p.title, body: p.body, tags: ['imported'] });
    } catch (err) {
      break; // hit free limit partway through — stop silently, refresh will show what made it in
    }
  }
  if (!license.valid) {
    alert('Imported 2 starter prompts. Get PromptDeck Pro to import the full 15-prompt AI Board of Directors pack.');
  }
  refresh();
};

addBtn.onclick = () => openEdit(null);
cancelBtn.onclick = closeEdit;
optionsBtn.onclick = () => chrome.runtime.openOptionsPage();
searchEl.oninput = () => render(searchEl.value);

saveBtn.onclick = async () => {
  const title = editTitle.value.trim();
  const body = editBody.value.trim();
  if (!title || !body) return;
  if (editingId) {
    await Storage.updatePrompt(editingId, { title, body });
  } else {
    try {
      await Storage.addPrompt({ title, body, tags: [] });
    } catch (e) {
      if (e.message === 'FREE_LIMIT_REACHED') {
        alert('Free plan is limited to 3 saved prompts. Click "⚙ License" to unlock unlimited prompts with PromptDeck Pro.');
        return;
      }
      throw e;
    }
  }
  closeEdit();
  refresh();
};

refresh();
