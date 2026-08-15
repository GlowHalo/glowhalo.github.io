# PromptDeck

Chrome extension (Manifest V3) — save your favorite AI prompts and insert them into ChatGPT, Claude, Gemini, or any text box on the web with one click or a right-click.

작업실 컴퍼니 A2 상품(카테고리: 마이크로 SaaS/Chrome 확장). 회사 의사결정 배경은 [`niche-templates/execution/A2-promptdeck.md`](../niche-templates/execution/A2-promptdeck.md) 참고.

## What it does

- Save prompts (title + body, `[bracketed]` fill-in-later placeholders) in `chrome.storage.sync` — no backend, no account, syncs across your own Chrome install for free via Google.
- Insert a saved prompt into whatever text field is currently focused, via the popup, a right-click context menu, or the `Ctrl/Cmd+Shift+P` shortcut.
- Free tier: up to 3 saved prompts. **PromptDeck Pro** (one-time purchase via Gumroad license key, verified client-side against Gumroad's public license API — no server of our own): unlimited prompts + one-click import of the full 15-prompt [AI Board of Directors](https://nadacompany.gumroad.com/l/ai-board-of-directors) prompt pack.

## Monetization model

Chrome Web Store dropped native paid-extension support in 2020, so this follows the standard indie pattern: **the extension itself is free to install; premium features unlock via a Gumroad-issued license key**, checked against `POST https://api.gumroad.com/v2/licenses/verify` (a public endpoint — no seller auth token needed client-side). This reuses the exact same Gumroad seller account and payment/payout infrastructure already validated for A1, so there's no new payment integration to stand up.

## What's left for a human (회장) to do

1. Register a Chrome Web Store developer account — **one-time $5 fee, requires a Google account + payment method** (AI can't do this: it's an identity/payment step).
2. Zip this folder's contents (excluding `README.md`, `privacy.html` stays included since it needs to be *hosted*, not zipped — see below) and upload via the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. The store listing requires a **hosted privacy policy URL** — once this repo is deployed, that's `https://tossneon.github.io/promptdeck/privacy.html` (already written, ships with this folder).
4. Everything else (code, icons, license-key monetization wiring, the Gumroad companion product for the license key itself) is done — see execution doc for the Gumroad product status.

## Local testing

`chrome://extensions` → enable Developer mode → "Load unpacked" → select this folder.
