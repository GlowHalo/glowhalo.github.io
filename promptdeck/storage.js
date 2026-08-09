// Shared storage helpers — used by popup, options, and background.
// Data model:
//   prompts: [{ id, title, body, tags: [], createdAt }]
//   license: { key, valid, verifiedAt, productId }
const FREE_PROMPT_LIMIT = 3;
// Gumroad requires product_id (not product_permalink) for license verification
// on products created on/after 2023-01-09 — this product was created 2026-08-09.
const GUMROAD_PRODUCT_ID = 'fMrJADLwfEA3j3A96sjaeA==';

const Storage = {
  async getPrompts() {
    const { prompts } = await chrome.storage.sync.get({ prompts: [] });
    return prompts;
  },

  async savePrompts(prompts) {
    await chrome.storage.sync.set({ prompts });
  },

  async addPrompt(prompt) {
    const prompts = await this.getPrompts();
    const license = await this.getLicense();
    if (!license.valid && prompts.length >= FREE_PROMPT_LIMIT) {
      throw new Error('FREE_LIMIT_REACHED');
    }
    const withId = { ...prompt, id: crypto.randomUUID(), createdAt: Date.now() };
    prompts.push(withId);
    await this.savePrompts(prompts);
    return withId;
  },

  async updatePrompt(id, updates) {
    const prompts = await this.getPrompts();
    const idx = prompts.findIndex((p) => p.id === id);
    if (idx === -1) return;
    prompts[idx] = { ...prompts[idx], ...updates };
    await this.savePrompts(prompts);
  },

  async deletePrompt(id) {
    const prompts = await this.getPrompts();
    await this.savePrompts(prompts.filter((p) => p.id !== id));
  },

  async getLicense() {
    const { license } = await chrome.storage.sync.get({
      license: { key: null, valid: false, verifiedAt: null, productId: null },
    });
    return license;
  },

  async setLicense(license) {
    await chrome.storage.sync.set({ license });
  },

  // Verifies a license key against the Gumroad public License Verification API.
  // No seller auth needed — this endpoint is designed to be called from client code.
  async verifyLicense(key) {
    const body = new URLSearchParams({
      product_id: GUMROAD_PRODUCT_ID,
      license_key: key.trim(),
      increment_uses_count: 'false',
    });
    const resp = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await resp.json();
    const valid = !!data.success;
    const license = {
      key: key.trim(),
      valid,
      verifiedAt: Date.now(),
      productId: GUMROAD_PRODUCT_ID,
    };
    await this.setLicense(license);
    return license;
  },
};

// Expose for non-module scripts (popup.js / options.js / background.js loaded as classic scripts)
if (typeof window !== 'undefined') window.Storage = Storage;
if (typeof self !== 'undefined') self.Storage = Storage;
