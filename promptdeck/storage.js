// Shared storage helpers — used by popup, options, and background.
// Data model:
//   prompts: [{ id, title, body, tags: [], createdAt }]
//   license: { key, valid, verifiedAt, productPermalink }
const FREE_PROMPT_LIMIT = 3;
const GUMROAD_PRODUCT_PERMALINK = 'promptdeck-pro';

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
      license: { key: null, valid: false, verifiedAt: null, productPermalink: null },
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
      product_permalink: GUMROAD_PRODUCT_PERMALINK,
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
      productPermalink: GUMROAD_PRODUCT_PERMALINK,
    };
    await this.setLicense(license);
    return license;
  },
};

// Expose for non-module scripts (popup.js / options.js / background.js loaded as classic scripts)
if (typeof window !== 'undefined') window.Storage = Storage;
if (typeof self !== 'undefined') self.Storage = Storage;
