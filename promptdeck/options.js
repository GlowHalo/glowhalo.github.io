const statusBox = document.getElementById('statusBox');
const keyInput = document.getElementById('keyInput');
const activateBtn = document.getElementById('activateBtn');
const msg = document.getElementById('msg');

async function refresh() {
  const license = await Storage.getLicense();
  if (license.valid) {
    statusBox.textContent = 'Pro — unlimited prompts unlocked ✨';
    statusBox.className = 'status pro';
    keyInput.value = license.key || '';
  } else {
    statusBox.textContent = 'Free plan — up to 3 saved prompts';
    statusBox.className = 'status free';
  }
}

activateBtn.onclick = async () => {
  const key = keyInput.value.trim();
  if (!key) return;
  activateBtn.disabled = true;
  activateBtn.textContent = 'Checking...';
  msg.textContent = '';
  try {
    const license = await Storage.verifyLicense(key);
    if (license.valid) {
      msg.textContent = '✅ Activated! Unlimited prompts unlocked.';
      msg.style.color = '#2E7D32';
    } else {
      msg.textContent = '❌ That license key was not recognized. Double-check it and try again.';
      msg.style.color = '#C62828';
    }
  } catch (e) {
    msg.textContent = '⚠️ Could not reach the license server. Check your connection and try again.';
    msg.style.color = '#C62828';
  }
  activateBtn.disabled = false;
  activateBtn.textContent = 'Activate';
  refresh();
};

refresh();
