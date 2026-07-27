// LootOps Vault - Popup Script
// Handles all UI state, routing between screens, and background communication

'use strict';

// =============================================
// STATE
// =============================================

let passwords = [];
let filteredPasswords = [];
let selectedEntry = null;
let currentScreen = 'login';
let searchQuery = '';
let activeCategory = 'All';
let pinValue = '';
let currentTabUrl = '';
let currentTabHostname = '';
let editingId = null;
let revealedFields = new Set();

// =============================================
// SCREEN ROUTER
// =============================================

function showScreen(name) {
  // Clear TOTP timer when navigating away from detail screen
  if (currentScreen === 'detail' && name !== 'detail') {
    if (totpTimerInterval) { clearInterval(totpTimerInterval); totpTimerInterval = null; }
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const screen = document.getElementById(`screen-${name}`);
  if (screen) screen.classList.remove('hidden');
  currentScreen = name;
}

// =============================================
// MESSAGING
// =============================================

function sendMsg(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res);
    });
  });
}

// =============================================
// INIT
// =============================================

async function init() {
  // Get current tab info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      currentTabUrl = tab.url;
      currentTabHostname = new URL(tab.url).hostname.replace('www.', '');
    }
  } catch {}

  let auth;
  try {
    auth = await sendMsg({ type: 'GET_AUTH' });
  } catch (err) {
    document.body.innerHTML = `<div style="padding:20px;color:red;">Error: ${err.message}</div>`;
    return;
  }

  if (!auth.isLoggedIn) {
    const { baseUrl } = await chrome.storage.local.get('baseUrl');
    if (baseUrl) document.getElementById('login-base-url').value = baseUrl;
    showScreen('login');
  } else if (!auth.hasVault) {
    document.getElementById('otp-email-label').textContent = auth.email || '';
    showScreen('otp');
  } else {
    await loadVault();
    showScreen('vault');
  }
}

// =============================================
// LOGIN
// =============================================

document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const baseUrl = document.getElementById('login-base-url').value.trim();
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');

  if (!email || !password) {
    showError(errorEl, 'Please enter email and password.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errorEl.classList.add('hidden');

  try {
    if (baseUrl) await sendMsg({ type: 'SET_BASE_URL', url: baseUrl });
    const res = await sendMsg({ type: 'SIGN_IN', email, password });
    if (res.success) {
      document.getElementById('otp-email-label').textContent = res.email || email;
      showScreen('otp');
    } else {
      showError(errorEl, res.error || 'Login failed');
    }
  } catch (err) {
    showError(errorEl, err.message || 'Connection failed');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

// =============================================
// OTP
// =============================================

let otpTimer = null;

document.getElementById('btn-send-otp').addEventListener('click', async () => {
  const btn = document.getElementById('btn-send-otp');
  const errorEl = document.getElementById('otp-error');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  errorEl.classList.add('hidden');
  try {
    const res = await sendMsg({ type: 'SEND_OTP' });
    if (res.success) {
      document.getElementById('otp-input-section').classList.remove('hidden');
      
      // Change to ghost button for Resend
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-ghost');
      
      let timeLeft = 60;
      if (otpTimer) clearInterval(otpTimer);
      
      btn.textContent = `Resend Code (${timeLeft}s)`;
      otpTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(otpTimer);
          btn.disabled = false;
          btn.textContent = 'Resend Code';
        } else {
          btn.textContent = `Resend Code (${timeLeft}s)`;
        }
      }, 1000);
      
    } else {
      showError(errorEl, res.error || 'Failed to send OTP');
      btn.disabled = false;
      btn.textContent = 'Send Code';
    }
  } catch (err) {
    showError(errorEl, err.message || 'Connection failed');
    btn.disabled = false;
    btn.textContent = 'Send Code';
  }
});

document.getElementById('btn-verify-otp').addEventListener('click', async () => {
  const code = document.getElementById('otp-input').value;
  if (code.length < 6) return;
  const btn = document.getElementById('btn-verify-otp');
  const errorEl = document.getElementById('otp-error');
  btn.disabled = true;
  btn.textContent = 'Verifying...';
  errorEl.classList.add('hidden');
  try {
    const res = await sendMsg({ type: 'VERIFY_OTP', code });
    if (res.success) {
      await loadVault();
      showScreen('vault');
    } else {
      showError(errorEl, res.error || 'Invalid Code');
    }
  } catch (err) {
    showError(errorEl, 'Connection failed. Is the server running?');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify Code';
  }
});

document.getElementById('btn-signout-from-otp').addEventListener('click', async () => {
  await sendMsg({ type: 'SIGN_OUT' });
  showScreen('login');
});

// =============================================
// VAULT
// =============================================

async function loadVault() {
  showLoading(true);
  try {
    const res = await sendMsg({ type: 'GET_PASSWORDS' });
    if (res.success) {
      passwords = res.passwords || [];
      buildCategoryChips();
      filterAndRender();
      updateSiteBanner();
    } else {
      // Vault locked
      showScreen('otp');
    }
  } catch (err) {
    console.error('Failed to load vault', err);
  } finally {
    showLoading(false);
  }
}

function buildCategoryChips() {
  const cats = ['All', 'Favorites', ...Array.from(new Set(
    passwords.filter(p => p.category && !p.deletedAt).map(p => p.category)
  ))];
  const container = document.getElementById('category-chips');
  container.innerHTML = '';
  cats.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `chip${cat === activeCategory ? ' active' : ''}`;
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      activeCategory = cat;
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterAndRender();
    });
    container.appendChild(chip);
  });
}

function filterAndRender() {
  const q = searchQuery.toLowerCase();
  filteredPasswords = passwords.filter(p => {
    if (p.deletedAt) return false;
    if (activeCategory === 'Favorites' && !p.favorite) return false;
    if (activeCategory !== 'All' && activeCategory !== 'Favorites' && p.category !== activeCategory) return false;
    if (!q) return true;
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.website || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  renderList();
}

function renderList() {
  const list = document.getElementById('password-list');
  const empty = document.getElementById('empty-state');
  list.innerHTML = '';

  if (filteredPasswords.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  filteredPasswords.forEach(entry => {
    const isSiteMatch = currentTabHostname && entry.website &&
      (entry.website.includes(currentTabHostname) ||
       currentTabHostname.includes(entry.website.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0]));

    const item = document.createElement('div');
    item.className = `pw-item${isSiteMatch ? ' site-match' : ''}`;
    item.innerHTML = `
      <div class="pw-icon">
        ${getEntryIcon(entry)}
      </div>
      <div class="pw-info">
        <div class="pw-name">${esc(entry.title || entry.website || 'Untitled')}</div>
        <div class="pw-sub">${esc(entry.username || getEntrySubtitle(entry))}</div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;">
        ${getTypeTag(entry.type)}
        <div class="pw-actions">
          ${entry.username || entry.password ? `
            <button class="pw-action-btn" data-action="copy-user" title="Copy username" data-id="${entry.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            <button class="pw-action-btn" data-action="copy-pass" title="Copy password" data-id="${entry.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </button>
          ` : ''}
          ${isSiteMatch ? `
            <button class="pw-action-btn fill-btn" data-action="fill" title="Auto-fill this page" data-id="${entry.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Click on row = open detail
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      openDetail(entry);
    });

    // Action buttons
    item.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const entry = passwords.find(p => p.id === btn.dataset.id);
        if (!entry) return;

        if (action === 'copy-user') {
          await copyText(entry.username || '');
          showToast('Username copied!');
        } else if (action === 'copy-pass') {
          await copyText(entry.password || '');
          showToast('Password copied!');
        } else if (action === 'fill') {
          fillInTab(entry);
        }
      });
    });

    list.appendChild(item);

    // Fix broken favicons (inline onerror is blocked by extension CSP)
    const img = item.querySelector('.site-icon');
    if (img) {
      img.addEventListener('error', () => {
        img.style.display = 'none';
        const fallback = item.querySelector('.fallback-icon');
        if (fallback) fallback.style.display = 'block';
      });
    }
  });
}

function getEntryIcon(entry) {
  if (entry.type === 'credit_card') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;
  }
  if (entry.type === 'identity') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
  if (entry.type === 'api_key') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
  }
  const defaultSvg = `<svg class="fallback-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

  if (entry.website) {
    return `<img src="https://www.google.com/s2/favicons?domain=${entry.website}&sz=32" width="16" height="16" class="site-icon">
            <svg class="fallback-icon" style="display:none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  }
  return defaultSvg;
}

function getEntrySubtitle(entry) {
  if (entry.type === 'api_key') return entry.customFields?.baseUrl || 'API Key';
  if (entry.type === 'credit_card') return '•••• •••• •••• ' + (entry.customFields?.cardNumber?.slice(-4) || '????');
  return entry.website || '';
}

function getTypeTag(type) {
  if (type === 'api_key') return `<span class="tag-type tag-api">API</span>`;
  if (type === 'credit_card') return `<span class="tag-type tag-card">Card</span>`;
  if (type === 'identity') return `<span class="tag-type tag-id">ID</span>`;
  return '';
}

function updateSiteBanner() {
  const banner = document.getElementById('site-match-banner');
  const text = document.getElementById('site-match-text');

  if (!currentTabHostname) { banner.classList.add('hidden'); return; }

  const matches = passwords.filter(p =>
    !p.deletedAt && p.website &&
    (p.website.includes(currentTabHostname) ||
     currentTabHostname.includes(p.website.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0]))
  );

  if (matches.length > 0) {
    banner.classList.remove('hidden');
    text.textContent = `${matches.length} credential${matches.length > 1 ? 's' : ''} for ${currentTabHostname}`;
  } else {
    banner.classList.add('hidden');
  }
}

// =============================================
// AUTO-FILL
// =============================================

async function fillInTab(entry) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_CREDENTIALS',
      credentials: { username: entry.username, password: entry.password }
    });
    showToast('✓ Filled!');
    window.close();
  } catch (err) {
    showToast('Could not fill — no form found', '#ef4444');
  }
}

// =============================================
// DETAIL VIEW
// =============================================

function openDetail(entry) {
  selectedEntry = entry;
  revealedFields = new Set();
  document.getElementById('detail-title').textContent = entry.title || entry.website || 'Untitled';
  renderDetail(entry);
  showScreen('detail');
}

function renderDetail(entry) {
  const content = document.getElementById('detail-content');
  const fields = [];

  const isSiteMatch = currentTabHostname && entry.website && (
    entry.website.includes(currentTabHostname) ||
    currentTabHostname.includes(entry.website.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0])
  );

  // Fill button (only when on matching site)
  if (isSiteMatch && (entry.username || entry.password)) {
    fields.push(`
      <button class="fill-form-btn" id="detail-fill-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Auto-fill on this page
      </button>
    `);
  }

  // Website
  if (entry.website) {
    fields.push(detailField('Website', `<a href="${entry.website}" target="_blank" style="color:#818cf8;text-decoration:none;">${entry.website}</a>`, null, false));
  }

  // Category
  if (entry.category) {
    fields.push(detailField('Category', entry.category, null, false));
  }

  // Type-specific fields
  if (entry.type === 'api_key') {
    if (entry.username) fields.push(detailField('Service / Provider', entry.username, 'username', false));
    if (entry.customFields?.apiKey) fields.push(detailField('API Key / Token', entry.customFields.apiKey, 'apiKey', true));
    if (entry.customFields?.clientSecret) fields.push(detailField('Client Secret', entry.customFields.clientSecret, 'clientSecret', true));
    if (entry.customFields?.baseUrl) fields.push(detailField('Base URL', entry.customFields.baseUrl, 'baseUrl', false));
    if (entry.customFields?.environment) {
      const env = entry.customFields.environment;
      fields.push(`<div class="detail-field"><div class="detail-label">Environment</div><div><span class="env-badge env-${env}">${env}</span></div></div>`);
    }
  } else if (entry.type === 'credit_card') {
    if (entry.username) fields.push(detailField('Cardholder', entry.username, 'username', false));
    if (entry.customFields?.cardNumber) fields.push(detailField('Card Number', entry.customFields.cardNumber, 'cardNumber', true));
    if (entry.customFields?.exp) fields.push(detailField('Expiry', entry.customFields.exp, 'exp', false));
    if (entry.customFields?.cvv) fields.push(detailField('CVV', entry.customFields.cvv, 'cvv', true));
    if (entry.password) fields.push(detailField('Card PIN', entry.password, 'password', true));
  } else {
    if (entry.username) fields.push(detailField('Username / Email', entry.username, 'username', false));
    if (entry.password) fields.push(detailField('Password', entry.password, 'password', true));
  }

  // Notes
  if (entry.notes) {
    fields.push(`<div class="detail-field"><div class="detail-label">Notes</div><div class="detail-value" style="font-family:inherit;white-space:pre-wrap;">${esc(entry.notes)}</div></div>`);
  }

  // TOTP / 2FA section
  if (entry.totpSecret) {
    fields.push(`
      <div class="detail-field">
        <div class="detail-label">2FA Authenticator Code</div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
          <div style="position:relative;width:44px;height:44px;flex-shrink:0;">
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" stroke-width="3"/>
              <circle id="totp-ring" cx="22" cy="22" r="18" fill="none" stroke="#6366f1" stroke-width="3"
                stroke-linecap="round" stroke-dasharray="113" stroke-dashoffset="0"
                style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 1s linear;"/>
            </svg>
            <div id="totp-seconds" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#6366f1;">30</div>
          </div>
          <div style="flex:1;">
            <div id="totp-code" style="font-size:24px;font-weight:800;letter-spacing:6px;color:#0f172a;font-family:monospace;">------</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Refreshes every 30s</div>
          </div>
          <button id="totp-copy-btn" style="padding:6px 10px;background:rgba(99,102,241,0.1);border:none;border-radius:8px;color:#6366f1;font-size:11px;font-weight:600;cursor:pointer;">Copy</button>
        </div>
      </div>
    `);
  }

  content.innerHTML = fields.join('');

  // Start TOTP timer if applicable
  if (entry.totpSecret) {
    startTotpTimer(entry.totpSecret);
  }

  // Bind fill button
  content.querySelector('#detail-fill-btn')?.addEventListener('click', () => fillInTab(entry));

  // Bind copy buttons
  content.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const field = btn.dataset.copy;
      let value = '';
      if (field === 'password') value = entry.password;
      else if (field === 'username') value = entry.username;
      else if (field === 'apiKey') value = entry.customFields?.apiKey;
      else if (field === 'clientSecret') value = entry.customFields?.clientSecret;
      else if (field === 'cardNumber') value = entry.customFields?.cardNumber;
      else if (field === 'cvv') value = entry.customFields?.cvv;
      else if (field === 'exp') value = entry.customFields?.exp;
      else if (field === 'baseUrl') value = entry.customFields?.baseUrl;
      else value = btn.closest('.detail-field')?.querySelector('.detail-value')?.textContent;

      await copyText(value || '');
      btn.classList.add('copied');
      btn.innerHTML = copyCheckSvg();
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = copySvg(); }, 2000);
      showToast('Copied!');
    });
  });

  // Bind reveal buttons
  content.querySelectorAll('[data-reveal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.reveal;
      const valueEl = content.querySelector(`[data-value="${field}"]`);
      if (!valueEl) return;

      if (revealedFields.has(field)) {
        revealedFields.delete(field);
        valueEl.textContent = '••••••••••••••••••••';
        valueEl.classList.add('secret');
        btn.innerHTML = eyeSvg();
      } else {
        revealedFields.add(field);
        let val = '';
        if (field === 'password') val = entry.password;
        else if (field === 'apiKey') val = entry.customFields?.apiKey;
        else if (field === 'clientSecret') val = entry.customFields?.clientSecret;
        else if (field === 'cvv') val = entry.customFields?.cvv;
        else if (field === 'cardNumber') val = entry.customFields?.cardNumber;
        valueEl.textContent = val;
        valueEl.classList.remove('secret');
        btn.innerHTML = eyeOffSvg();
      }
    });
  });
}

function detailField(label, value, fieldKey, isSecret) {
  const displayValue = isSecret ? '••••••••••••••••••••' : value;
  return `
    <div class="detail-field">
      <div class="detail-label">${label}</div>
      <div class="detail-value-row">
        <div class="detail-value${isSecret ? ' secret' : ''}" data-value="${fieldKey || ''}">${displayValue}</div>
        ${fieldKey ? `
          <button class="copy-btn" data-copy="${fieldKey}" title="Copy">${copySvg()}</button>
          ${isSecret ? `<button class="reveal-btn" data-reveal="${fieldKey}" title="Reveal">${eyeSvg()}</button>` : ''}
        ` : ''}
      </div>
    </div>
  `;
}

// =============================================
// TOTP LIVE TIMER
// =============================================

let totpTimerInterval = null;

function startTotpTimer(secret) {
  if (totpTimerInterval) clearInterval(totpTimerInterval);

  const CIRCUMFERENCE = 2 * Math.PI * 18; // r=18 → ~113.1

  function updateTotp() {
    const secondsNow = Math.floor(Date.now() / 1000);
    const secsInPeriod = secondsNow % 30;
    const secsLeft = 30 - secsInPeriod;

    const ring = document.getElementById('totp-ring');
    const secsEl = document.getElementById('totp-seconds');
    const codeEl = document.getElementById('totp-code');

    if (!ring || !secsEl || !codeEl) {
      clearInterval(totpTimerInterval);
      return;
    }

    // Update ring dashoffset (full = 0 offset, empty = full circumference)
    const progress = secsLeft / 30;
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    // Change color to red when <= 5s
    const ringColor = secsLeft <= 5 ? '#ef4444' : '#6366f1';
    ring.style.stroke = ringColor;
    secsEl.style.color = ringColor;
    secsEl.textContent = secsLeft;

    // Refresh code at start of new period
    if (secsInPeriod === 0 || codeEl.textContent === '------') {
      sendMsg({ type: 'GENERATE_TOTP', secret }).then(res => {
        if (res?.success && codeEl) {
          codeEl.textContent = res.code;
          // Bind copy button with fresh code
          const copyBtn = document.getElementById('totp-copy-btn');
          if (copyBtn) copyBtn.onclick = () => { copyText(res.code); showToast('2FA Code copied!'); };
        }
      }).catch(() => {});
    }
  }

  // Initial fetch immediately
  sendMsg({ type: 'GENERATE_TOTP', secret }).then(res => {
    const codeEl = document.getElementById('totp-code');
    if (res?.success && codeEl) {
      codeEl.textContent = res.code;
      const copyBtn = document.getElementById('totp-copy-btn');
      if (copyBtn) copyBtn.onclick = () => { copyText(res.code); showToast('2FA Code copied!'); };
    }
  }).catch(() => {});

  updateTotp();
  totpTimerInterval = setInterval(updateTotp, 1000);
}

// =============================================
// EDIT / ADD
// =============================================

document.getElementById('btn-edit').addEventListener('click', () => {
  if (!selectedEntry) return;
  openForm(selectedEntry);
});

document.getElementById('btn-delete').addEventListener('click', async () => {
  if (!selectedEntry || !confirm('Delete this entry?')) return;
  try {
    await sendMsg({ type: 'DELETE_PASSWORD', id: selectedEntry.id });
    passwords = passwords.filter(p => p.id !== selectedEntry.id);
    filterAndRender();
    buildCategoryChips();
    showScreen('vault');
    showToast('Deleted');
  } catch (err) {
    showToast('Failed to delete', '#ef4444');
  }
});

document.getElementById('btn-add').addEventListener('click', () => openForm(null));
document.getElementById('btn-add-empty')?.addEventListener('click', () => openForm(null));

function openForm(entry) {
  editingId = entry?.id || null;
  document.getElementById('form-title').textContent = entry ? 'Edit Entry' : 'New Entry';

  // Populate fields
  document.getElementById('f-title').value = entry?.title || '';
  document.getElementById('f-username').value = entry?.username || '';
  document.getElementById('f-password').value = entry?.password || '';
  document.getElementById('f-website').value = entry?.website || currentTabUrl || '';
  document.getElementById('f-category').value = entry?.category || 'Personal';
  document.getElementById('f-notes').value = entry?.notes || '';
  document.getElementById('f-type').value = entry?.type || 'password';
  document.getElementById('f-api-key').value = entry?.customFields?.apiKey || '';
  document.getElementById('f-client-secret').value = entry?.customFields?.clientSecret || '';
  document.getElementById('f-base-url').value = entry?.customFields?.baseUrl || '';
  document.getElementById('f-environment').value = entry?.customFields?.environment || 'production';

  updateFormType(document.getElementById('f-type').value);
  showScreen('form');
}

function updateFormType(type) {
  const isApi = type === 'api_key';
  const isCard = type === 'credit_card';

  document.getElementById('fg-username').style.display = '';
  document.getElementById('lbl-username').textContent =
    isApi ? 'Service / Provider Name' :
    isCard ? 'Cardholder Name' : 'Username / Email';

  document.getElementById('fg-password').style.display = isApi ? 'none' : '';
  document.getElementById('lbl-password').textContent = isCard ? 'Card PIN' : 'Password';

  document.getElementById('fg-api-key').style.display = isApi ? '' : 'none';
  document.getElementById('fg-client-secret').style.display = isApi ? '' : 'none';
  document.getElementById('fg-base-url').style.display = isApi ? '' : 'none';
  document.getElementById('fg-environment').style.display = isApi ? '' : 'none';
  document.getElementById('fg-website').style.display = isApi ? 'none' : '';
}

document.getElementById('f-type').addEventListener('change', (e) => updateFormType(e.target.value));

document.getElementById('btn-gen-inline').addEventListener('click', async () => {
  const res = await sendMsg({ type: 'GENERATE_PASSWORD', length: 20 });
  if (res?.password) {
    document.getElementById('f-password').value = res.password;
    document.getElementById('f-password').type = 'text';
  }
});

document.getElementById('btn-save').addEventListener('click', async () => {
  const type = document.getElementById('f-type').value;
  const payload = {
    title: document.getElementById('f-title').value.trim(),
    username: document.getElementById('f-username').value.trim(),
    password: document.getElementById('f-password').value,
    website: document.getElementById('f-website').value.trim(),
    category: document.getElementById('f-category').value.trim() || 'Personal',
    notes: document.getElementById('f-notes').value.trim(),
    totpSecret: '',
    type,
    favorite: selectedEntry?.favorite || false,
    customFields: type === 'api_key' ? {
      apiKey: document.getElementById('f-api-key').value,
      clientSecret: document.getElementById('f-client-secret').value,
      baseUrl: document.getElementById('f-base-url').value.trim(),
      environment: document.getElementById('f-environment').value
    } : {}
  };

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    let res;
    if (editingId) {
      res = await sendMsg({ type: 'UPDATE_PASSWORD', id: editingId, payload });
      if (res.success) {
        const idx = passwords.findIndex(p => p.id === editingId);
        if (idx !== -1) passwords[idx] = res.password;
        selectedEntry = res.password;
        renderDetail(res.password);
        showScreen('detail');
      }
    } else {
      res = await sendMsg({ type: 'SAVE_PASSWORD', payload });
      if (res.success) {
        passwords.push(res.password);
        showScreen('vault');
      }
    }
    buildCategoryChips();
    filterAndRender();
    updateSiteBanner();
    showToast('✓ Saved!');
  } catch (err) {
    showToast('Failed to save', '#ef4444');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
});

// =============================================
// NAVIGATION
// =============================================

document.getElementById('btn-back').addEventListener('click', () => showScreen('vault'));
document.getElementById('btn-form-back').addEventListener('click', () => {
  showScreen(selectedEntry ? 'detail' : 'vault');
});
document.getElementById('btn-gen').addEventListener('click', () => showScreen('generator'));
document.getElementById('btn-gen-back').addEventListener('click', () => showScreen('vault'));
document.getElementById('btn-lock').addEventListener('click', async () => {
  await sendMsg({ type: 'LOCK_VAULT' });
  passwords = [];
  showScreen('pin');
  showToast('Vault locked');
});

// =============================================
// SEARCH
// =============================================

document.getElementById('search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  filterAndRender();
});

// =============================================
// GENERATOR
// =============================================

const genOutput = document.getElementById('gen-output-text');
const genLenVal = document.getElementById('gen-len-val');
const genStrengthFill = document.getElementById('gen-strength-fill');
const genStrengthLabel = document.getElementById('gen-strength-label');

document.getElementById('gen-length').addEventListener('input', (e) => {
  genLenVal.textContent = e.target.value;
});

document.getElementById('btn-generate').addEventListener('click', generatePassword);
document.getElementById('btn-copy-gen').addEventListener('click', async () => {
  const val = genOutput.textContent;
  if (val && val !== 'Click Generate') {
    await copyText(val);
    showToast('Password copied!');
  }
});

function generatePassword() {
  const len = parseInt(document.getElementById('gen-length').value);
  const upper = document.getElementById('gen-upper').checked;
  const lower = document.getElementById('gen-lower').checked;
  const numbers = document.getElementById('gen-numbers').checked;
  const symbols = document.getElementById('gen-symbols').checked;

  let chars = '';
  if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!chars) { showToast('Select at least one character type', '#ef4444'); return; }

  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  const pwd = Array.from(arr).map(n => chars[n % chars.length]).join('');
  genOutput.textContent = pwd;
  updateStrength(pwd);
}

function updateStrength(pwd) {
  let score = 0;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const pct = (score / 6) * 100;
  const color = score <= 2 ? '#ef4444' : score <= 4 ? '#f59e0b' : '#10b981';
  const label = score <= 2 ? 'Weak' : score <= 4 ? 'Fair' : score <= 5 ? 'Strong' : 'Very Strong';

  genStrengthFill.style.width = `${pct}%`;
  genStrengthFill.style.background = color;
  genStrengthLabel.textContent = label;
  genStrengthLabel.style.color = color;
}

// =============================================
// REVEAL TOGGLE BUTTONS (show/hide on forms)
// =============================================

document.querySelectorAll('.toggle-btn[data-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// =============================================
// UTILITIES
// =============================================

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
  }
}

function showToast(msg, color = '#10b981') {
  const existing = document.getElementById('lootops-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'lootops-toast';
  toast.textContent = msg;
  toast.style.background = color;
  document.body.appendChild(toast);
  setTimeout(() => toast?.remove(), 2500);
}

function showLoading(show) {
  document.getElementById('loading-state').style.display = show ? 'flex' : 'none';
  document.getElementById('password-list').style.display = show ? 'none' : '';
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function copySvg() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
}

function copyCheckSvg() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
}

function eyeSvg() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function eyeOffSvg() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

// =============================================
// START
// =============================================

init();
