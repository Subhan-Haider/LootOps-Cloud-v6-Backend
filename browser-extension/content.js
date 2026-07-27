// LootOps Vault - Content Script
// Detects login forms, offers auto-fill, captures credentials on submit

(function() {
  'use strict';

  // Don't run in iframes or extension pages
  if (window !== window.top) return;
  if (window.location.protocol === 'chrome-extension:') return;

  const HOSTNAME = window.location.hostname.replace('www.', '');
  let savedMatches = [];
  let fillButtonInjected = false;

  // =============================================
  // FIND FORM FIELDS
  // =============================================

  function findLoginForms() {
    const passwordInputs = Array.from(document.querySelectorAll(
      'input[type="password"]:not([disabled]):not([readonly])'
    ));
    return passwordInputs.map(pwdInput => {
      // Find associated username/email field (search preceding siblings and parent form)
      const form = pwdInput.closest('form');
      let userInput = null;

      const candidates = form
        ? Array.from(form.querySelectorAll('input'))
        : Array.from(document.querySelectorAll('input'));

      for (const input of candidates) {
        if (input === pwdInput) break;
        const type = input.type?.toLowerCase();
        const name = (input.name + input.id + input.placeholder + input.autocomplete).toLowerCase();
        if (
          type === 'text' || type === 'email' || type === 'tel' ||
          name.includes('user') || name.includes('email') || name.includes('login') ||
          name.includes('phone') || name.includes('name')
        ) {
          userInput = input;
        }
      }

      return { pwdInput, userInput, form };
    }).filter(f => f.pwdInput);
  }

  function findCreditCardForms() {
    const inputs = Array.from(document.querySelectorAll('input:not([disabled]):not([readonly])'));
    const ccFields = {};
    for (const input of inputs) {
      const name = (input.name + input.id + input.placeholder + input.autocomplete).toLowerCase();
      if (name.includes('cc-number') || name.includes('cardnumber') || name.includes('card-number') || name.includes('creditcard')) {
        ccFields.cardNumber = input;
      }
      if (name.includes('cc-exp') || name.includes('expiry') || name.includes('exp-date') || name.includes('expiration')) {
        ccFields.exp = input;
      }
      if (name.includes('cc-csc') || name.includes('cvc') || name.includes('cvv') || name.includes('security-code')) {
        ccFields.cvv = input;
      }
    }
    return Object.keys(ccFields).length > 0 ? ccFields : null;
  }

  function findIdentityForms() {
    const inputs = Array.from(document.querySelectorAll('input:not([disabled]):not([readonly])'));
    const idFields = {};
    for (const input of inputs) {
      const name = (input.name + input.id + input.placeholder + input.autocomplete).toLowerCase();
      if (name.includes('identity') || name.includes('ssn') || name.includes('id-number')) {
        idFields.identityNumber = input;
      }
    }
    return Object.keys(idFields).length > 0 ? idFields : null;
  }

  function findTotpForms() {
    const inputs = Array.from(document.querySelectorAll('input:not([disabled]):not([readonly])'));
    for (const input of inputs) {
      const name = (input.name + input.id + input.placeholder + input.autocomplete).toLowerCase();
      // Look for indicators of a 2FA/TOTP field
      if (
        name.includes('totp') || 
        name.includes('2fa') || 
        name.includes('authcode') || 
        name.includes('authenticator') || 
        name.includes('mfa') ||
        name.includes('otp') ||
        (name.includes('code') && input.maxLength === 6) ||
        (name.includes('token') && input.maxLength === 6) ||
        (name.includes('verification') && input.maxLength === 6)
      ) {
        return input;
      }
    }
    return null;
  }

  function fillCreditCard(fields, match) {
    if (!match.customFields) return;
    if (fields.cardNumber && match.customFields.cardNumber && !fields.cardNumber.dataset.lootopsAutofilled) {
      fields.cardNumber.dataset.lootopsAutofilled = '1';
      setNativeValue(fields.cardNumber, match.customFields.cardNumber);
    }
    if (fields.exp && match.customFields.exp && !fields.exp.dataset.lootopsAutofilled) {
      fields.exp.dataset.lootopsAutofilled = '1';
      setNativeValue(fields.exp, match.customFields.exp);
    }
    if (fields.cvv && match.customFields.cvv && !fields.cvv.dataset.lootopsAutofilled) {
      fields.cvv.dataset.lootopsAutofilled = '1';
      setNativeValue(fields.cvv, match.customFields.cvv);
    }
    showToast('✓ Credit Card filled!', '#10b981');
  }

  function fillIdentity(fields, match) {
    if (!match.customFields) return;
    if (fields.identityNumber && match.customFields.identityNumber && !fields.identityNumber.dataset.lootopsAutofilled) {
      fields.identityNumber.dataset.lootopsAutofilled = '1';
      setNativeValue(fields.identityNumber, match.customFields.identityNumber);
      showToast('✓ Identity info filled!', '#10b981');
    }
  }

  function fillTotp(input, match) {
    if (!match.totpSecret || input.dataset.lootopsAutofilled) return;
    input.dataset.lootopsAutofilled = '1';
    chrome.runtime.sendMessage({ type: 'GENERATE_TOTP', secret: match.totpSecret }, (res) => {
      if (res?.success && res.code) {
        setNativeValue(input, res.code);
        showToast('✓ 2FA Code Auto-Filled!', '#10b981');
      }
    });
  }

  // =============================================
  // INJECT FILL BUTTON (key icon next to password field)
  // =============================================

  function injectFillButton(pwdInput) {
    if (pwdInput.dataset.lootopsInjected) return;
    pwdInput.dataset.lootopsInjected = '1';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 9999;
      cursor: pointer;
    `;
    wrapper.innerHTML = `
      <div id="lootops-fill-btn" title="Fill with LootOps Vault" style="
        width: 22px;
        height: 22px;
        border-radius: 5px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(99,102,241,0.4);
        transition: transform 0.15s;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
    `;

    const btn = wrapper.querySelector('#lootops-fill-btn');
    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.15)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showFillDropdown(pwdInput, wrapper);
    });

    // Make parent position:relative so absolute positioning works
    const parent = pwdInput.parentElement;
    const parentPos = window.getComputedStyle(parent).position;
    if (parentPos === 'static') parent.style.position = 'relative';
    parent.appendChild(wrapper);
  }

  // =============================================
  // FILL DROPDOWN
  // =============================================

  let activeDropdown = null;

  function showFillDropdown(pwdInput, anchor) {
    closeDropdown();

    if (savedMatches.length === 0) {
      chrome.runtime.sendMessage({ type: 'GET_MATCHES_FOR_TAB', hostname: HOSTNAME }, (res) => {
        savedMatches = res?.matches || [];
        renderDropdown(pwdInput, anchor);
      });
    } else {
      renderDropdown(pwdInput, anchor);
    }
  }

  function renderDropdown(pwdInput, anchor) {
    const dropdown = document.createElement('div');
    dropdown.id = 'lootops-dropdown';
    dropdown.style.cssText = `
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 260px;
      max-width: 320px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
      animation: lootops-slide-in 0.15s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes lootops-slide-in {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      #lootops-dropdown * { box-sizing: border-box; }
      .lootops-item:hover { background: rgba(99,102,241,0.08) !important; }
    `;
    document.head.appendChild(style);

    const header = document.createElement('div');
    header.style.cssText = 'padding: 10px 14px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px;';
    header.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span style="font-size:11px;font-weight:600;color:#4f46e5;letter-spacing:0.05em;">LOOTOPS VAULT</span>
    `;
    dropdown.appendChild(header);

    const forms = findLoginForms();
    const { userInput } = forms.find(f => f.pwdInput === pwdInput) || {};

    if (savedMatches.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 16px 14px; color: #64748b; font-size: 12px; text-align: center;';
      empty.textContent = 'No saved credentials for this site.';
      dropdown.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.style.cssText = 'max-height: 200px; overflow-y: auto;';
      savedMatches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'lootops-item';
        item.style.cssText = 'padding: 10px 14px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.1s;';
        item.innerHTML = `
          <div style="width:28px;height:28px;border-radius:6px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
            ${match.website ? `<img src="https://www.google.com/s2/favicons?domain=${match.website}&sz=32" style="width:16px;height:16px;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
            <svg style="display:${match.website ? 'none' : 'flex'};width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:500;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(match.title || match.website || 'Untitled')}</div>
            <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(match.username || '')}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="m9 18 6-6-6-6"/></svg>
        `;
        item.addEventListener('click', () => {
          fillCredentials(pwdInput, userInput, match);
          closeDropdown();
        });
        list.appendChild(item);
      });
      dropdown.appendChild(list);
    }

    // Footer actions
    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 8px 14px; border-top: 1px solid #e2e8f0; display: flex; gap: 6px;';
    footer.innerHTML = `
      <button id="lootops-open-vault" style="flex:1;padding:6px;border:none;border-radius:7px;background:rgba(99,102,241,0.12);color:#4f46e5;font-size:11px;cursor:pointer;font-weight:600;">Open Vault</button>
    `;
    footer.querySelector('#lootops-open-vault').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      closeDropdown();
    });
    dropdown.appendChild(footer);

    anchor.appendChild(dropdown);
    activeDropdown = dropdown;

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', closeDropdownOnOutside, { once: true });
    }, 100);
  }

  function closeDropdownOnOutside(e) {
    if (activeDropdown && !activeDropdown.contains(e.target)) closeDropdown();
  }

  function closeDropdown() {
    if (activeDropdown) {
      activeDropdown.remove();
      activeDropdown = null;
    }
  }

  // =============================================
  // FILL CREDENTIALS
  // =============================================

  function fillCredentials(pwdInput, userInput, match) {
    if (userInput && match.username) {
      setNativeValue(userInput, match.username);
    }
    if (match.password) {
      setNativeValue(pwdInput, match.password);
    }
    showToast('✓ Credentials filled!', '#10b981');
  }

  // Properly trigger React/Vue onChange handlers
  function setNativeValue(el, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // =============================================
  // AUTO-SAVE: CAPTURE ON FORM SUBMIT
  // =============================================

  function setupFormCapture() {
    document.addEventListener('submit', async (e) => {
      const form = e.target;
      if (!form || form.tagName !== 'FORM') return;

      const pwdInput = form.querySelector('input[type="password"]');
      if (!pwdInput || !pwdInput.value) return;

      const userInput = Array.from(form.querySelectorAll('input')).find(input => {
        if (input === pwdInput || input.type === 'password') return false;
        const t = input.type?.toLowerCase();
        return t === 'text' || t === 'email' || t === 'tel';
      });

      const credentials = {
        title: document.title || HOSTNAME,
        username: userInput?.value || '',
        password: pwdInput.value,
        website: window.location.hostname,
        notes: '',
        type: 'password',
        category: 'Personal',
        favorite: false
      };

      // Check if credentials already exist
      chrome.runtime.sendMessage({ type: 'GET_MATCHES_FOR_TAB', hostname: HOSTNAME }, (res) => {
        const matches = res?.matches || [];
        const exists = matches.some(m =>
          m.username === credentials.username && m.password === credentials.password
        );
        if (!exists) {
          chrome.runtime.sendMessage({ type: 'SAVE_CAPTURED', ...credentials, website: window.location.hostname });
        }
      });
    }, true); // capture phase
  }

  // =============================================
  // INLINE SAVE PROMPT (top-of-page banner)
  // =============================================

  function showSavePrompt(credentials) {
    const existing = document.getElementById('lootops-save-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'lootops-save-banner';
    banner.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 420px;
      width: calc(100vw - 32px);
      animation: lootops-slide-in 0.2s ease;
    `;
    banner.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:#0f172a;">Save password to LootOps Vault?</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(credentials.username || credentials.website)}</div>
      </div>
      <button id="lo-save-btn" style="padding:7px 14px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">Save</button>
      <button id="lo-dismiss-btn" style="padding:7px;background:transparent;border:none;cursor:pointer;color:#64748b;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    banner.querySelector('#lo-save-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'SAVE_PASSWORD', payload: credentials }, (res) => {
        if (res?.success) {
          showToast('✓ Password saved to vault!', '#10b981');
          banner.remove();
        }
      });
    });
    banner.querySelector('#lo-dismiss-btn').addEventListener('click', () => banner.remove());
    document.body.appendChild(banner);
    setTimeout(() => banner?.remove(), 15000);
  }

  // =============================================
  // TOAST NOTIFICATION
  // =============================================

  function showToast(message, color = '#6366f1') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: ${color};
      color: white;
      padding: 10px 16px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: lootops-slide-in 0.2s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // =============================================
  // LISTEN FOR MESSAGES FROM POPUP/BACKGROUND
  // =============================================

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'FILL_CREDENTIALS') {
      const forms = findLoginForms();
      if (forms.length > 0) {
        const { pwdInput, userInput } = forms[0];
        fillCredentials(pwdInput, userInput, msg.credentials);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No login form found' });
      }
    }
    if (msg.type === 'SHOW_SAVE_PROMPT') {
      showSavePrompt(msg.credentials);
      sendResponse({ success: true });
    }
    if (msg.type === 'GET_FORM_DATA') {
      const forms = findLoginForms();
      if (forms.length > 0) {
        const { pwdInput, userInput } = forms[0];
        sendResponse({
          username: userInput?.value || '',
          password: pwdInput?.value || '',
          hasForm: true
        });
      } else {
        sendResponse({ hasForm: false });
      }
    }
    if (msg.type === 'FILL_FROM_CONTEXT_MENU') {
      if (lastRightClickedElement && savedMatches.length > 0) {
        // If it's a password field, fill password. If text, fill username.
        if (lastRightClickedElement.type === 'password') {
          setNativeValue(lastRightClickedElement, savedMatches[0].password || '');
        } else {
          setNativeValue(lastRightClickedElement, savedMatches[0].username || '');
        }
        showToast('✓ Filled from Vault', '#10b981');
      } else {
        showToast('No saved credentials found', '#ef4444');
      }
      sendResponse({ success: true });
    }
    if (msg.type === 'GENERATE_FROM_CONTEXT_MENU') {
      if (lastRightClickedElement) {
        chrome.runtime.sendMessage({ type: 'GENERATE_PASSWORD', length: 16 }, (res) => {
          if (res?.password) {
            setNativeValue(lastRightClickedElement, res.password);
            showToast('✓ Strong password generated', '#10b981');
          }
        });
      }
      sendResponse({ success: true });
    }
    return true;
  });

  let lastRightClickedElement = null;
  document.addEventListener('contextmenu', (e) => {
    lastRightClickedElement = e.target;
  }, true);

  // =============================================
  // INIT
  // =============================================

  function init() {
    // Get matching passwords for this domain
    chrome.runtime.sendMessage({ type: 'GET_MATCHES_FOR_TAB', hostname: HOSTNAME }, (res) => {
      savedMatches = res?.matches || [];
      
      // Auto-fill immediately if forms are already present
      if (savedMatches.length > 0) {
        autoFillAllForms();
      }
    });

    // Observe DOM for dynamically added forms (SPAs)
    const observer = new MutationObserver(() => {
      const forms = findLoginForms();
      forms.forEach(({ pwdInput }) => {
        injectFillButton(pwdInput);
      });
      if (savedMatches.length > 0) {
        autoFillAllForms();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial scan to inject fill buttons
    const forms = findLoginForms();
    forms.forEach(({ pwdInput }) => injectFillButton(pwdInput));

    // Setup form capture
    setupFormCapture();
  }

  function autoFillAllForms() {
    // Passwords
    const pwdMatch = savedMatches.find(m => m.type === 'password' || !m.type);
    if (pwdMatch) {
      const forms = findLoginForms();
      forms.forEach(({ pwdInput, userInput }) => {
        if (!pwdInput.dataset.lootopsAutofilled) {
          pwdInput.dataset.lootopsAutofilled = '1';
          fillCredentials(pwdInput, userInput, pwdMatch);
        }
      });
    }

    // Credit Cards
    const ccMatch = savedMatches.find(m => m.type === 'credit_card');
    if (ccMatch) {
      const ccFields = findCreditCardForms();
      if (ccFields) fillCreditCard(ccFields, ccMatch);
    }

    // Identities
    const idMatch = savedMatches.find(m => m.type === 'identity');
    if (idMatch) {
      const idFields = findIdentityForms();
      if (idFields) fillIdentity(idFields, idMatch);
    }

    // 2FA / TOTP
    const totpMatch = savedMatches.find(m => m.totpSecret);
    if (totpMatch) {
      const totpInput = findTotpForms();
      if (totpInput) fillTotp(totpInput, totpMatch);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
