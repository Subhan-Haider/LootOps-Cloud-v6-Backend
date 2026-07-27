// LootOps Vault - Background Service Worker
// Handles: auth token refresh, message routing, badge updates, save prompts

const FIREBASE_API_KEY = "AIzaSyD97kZ5nbdb3Y2x8D4mCSLwv-ldIz61PkQ";
const FIREBASE_SIGNIN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
const FIREBASE_REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;

// =============================================
// TOKEN MANAGEMENT
// =============================================

async function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['idToken', 'refreshToken', 'tokenExpiry', 'userEmail', 'vaultToken', 'baseUrl'], resolve);
  });
}

async function saveAuth(data) {
  return chrome.storage.local.set(data);
}

async function clearAuth() {
  return chrome.storage.local.remove(['idToken', 'refreshToken', 'tokenExpiry', 'userEmail', 'vaultToken']);
}

async function refreshIdToken(refreshToken) {
  try {
    const res = await fetch(FIREBASE_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken })
    });
    const data = await res.json();
    if (data.id_token) {
      const expiry = Date.now() + (parseInt(data.expires_in) * 1000);
      await saveAuth({
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        tokenExpiry: expiry
      });
      return data.id_token;
    }
  } catch (err) {
    console.error('[LootOps] Token refresh failed:', err);
  }
  return null;
}

async function getValidToken() {
  const { idToken, refreshToken, tokenExpiry } = await getStoredAuth();
  if (!idToken) return null;
  // If token expires in less than 5 minutes, refresh
  if (tokenExpiry && Date.now() > tokenExpiry - 300000) {
    if (refreshToken) return await refreshIdToken(refreshToken);
    return null;
  }
  return idToken;
}

// =============================================
// API HELPERS
// =============================================

async function apiRequest(method, path, body = null, vaultToken = null) {
  const { baseUrl } = await getStoredAuth();
  const apiBase = baseUrl || 'https://lootops-cloud.subhan.tech';
  const idToken = await getValidToken();
  if (!idToken) throw new Error('Not authenticated');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  };
  if (vaultToken) headers['x-vault-token'] = vaultToken;

  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : null
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// =============================================
// BADGE MANAGEMENT
// =============================================

async function updateBadge(tabId, url) {
  try {
    const { vaultToken } = await getStoredAuth();
    if (!vaultToken) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }
    const data = await apiRequest('GET', '/api/passwords', null, vaultToken);
    const passwords = data.passwords || [];
    const hostname = new URL(url).hostname.replace('www.', '');
    const matches = passwords.filter(p =>
      p.website && !p.deletedAt && (
        p.website.includes(hostname) ||
        hostname.includes(p.website.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0])
      )
    );
    if (matches.length > 0) {
      chrome.action.setBadgeText({ text: String(matches.length), tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#6366f1', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// =============================================
// MESSAGE HANDLER
// =============================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {

        case 'SIGN_IN': {
          const res = await fetch(FIREBASE_SIGNIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: msg.email, password: msg.password, returnSecureToken: true })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          const expiry = Date.now() + (parseInt(data.expiresIn) * 1000);
          await saveAuth({
            idToken: data.idToken,
            refreshToken: data.refreshToken,
            tokenExpiry: expiry,
            userEmail: data.email
          });
          sendResponse({ success: true, email: data.email });
          break;
        }

        case 'SIGN_OUT': {
          await clearAuth();
          sendResponse({ success: true });
          break;
        }

        case 'GET_AUTH': {
          const { idToken, userEmail, vaultToken, baseUrl } = await getStoredAuth();
          sendResponse({ isLoggedIn: !!idToken, email: userEmail, hasVault: !!vaultToken, baseUrl });
          break;
        }

        case 'VERIFY_VAULT': {
          const data = await apiRequest('POST', '/api/vault/verify', { pin: msg.pin });
          if (data.token) {
            await saveAuth({ vaultToken: data.token });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Invalid PIN' });
          }
          break;
        }

        case 'LOCK_VAULT': {
          await chrome.storage.local.remove('vaultToken');
          sendResponse({ success: true });
          break;
        }

        case 'GET_PASSWORDS': {
          const { vaultToken } = await getStoredAuth();
          if (!vaultToken) { sendResponse({ success: false, error: 'Vault locked' }); break; }
          const data = await apiRequest('GET', '/api/passwords', null, vaultToken);
          sendResponse({ success: true, passwords: data.passwords || [] });
          break;
        }

        case 'SAVE_PASSWORD': {
          const { vaultToken } = await getStoredAuth();
          if (!vaultToken) { sendResponse({ success: false, error: 'Vault locked' }); break; }
          const data = await apiRequest('POST', '/api/passwords', msg.payload, vaultToken);
          sendResponse({ success: true, password: data.password });
          break;
        }

        case 'UPDATE_PASSWORD': {
          const { vaultToken } = await getStoredAuth();
          if (!vaultToken) { sendResponse({ success: false, error: 'Vault locked' }); break; }
          const data = await apiRequest('PUT', `/api/passwords/${msg.id}`, msg.payload, vaultToken);
          sendResponse({ success: true, password: data.password });
          break;
        }

        case 'DELETE_PASSWORD': {
          const { vaultToken } = await getStoredAuth();
          if (!vaultToken) { sendResponse({ success: false, error: 'Vault locked' }); break; }
          await apiRequest('DELETE', `/api/passwords/${msg.id}`, null, vaultToken);
          sendResponse({ success: true });
          break;
        }

        case 'GENERATE_PASSWORD': {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~';
          const arr = new Uint32Array(msg.length || 20);
          crypto.getRandomValues(arr);
          const pwd = Array.from(arr).map(n => chars[n % chars.length]).join('');
          sendResponse({ password: pwd });
          break;
        }

        case 'GET_MATCHES_FOR_TAB': {
          const { vaultToken } = await getStoredAuth();
          if (!vaultToken) { sendResponse({ success: false, matches: [] }); break; }
          const data = await apiRequest('GET', '/api/passwords', null, vaultToken);
          const passwords = data.passwords || [];
          const hostname = msg.hostname?.replace('www.', '');
          const matches = hostname ? passwords.filter(p =>
            p.website && !p.deletedAt && (
              p.website.includes(hostname) ||
              hostname.includes(p.website.replace(/^https?:\/\//, '').replace('www.', '').split('/')[0])
            )
          ) : [];
          sendResponse({ success: true, matches });
          break;
        }

        case 'SAVE_CAPTURED': {
          // Triggered from content script after form submit
          const { vaultToken } = await getStoredAuth();
          if (!vaultToken) { sendResponse({ success: false }); break; }
          // Show notification asking user to save
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Save this password?',
            message: `Save credentials for ${msg.website}?`,
            buttons: [{ title: 'Save' }, { title: 'Never mind' }],
            requireInteraction: true
          });
          // Store pending save data
          await chrome.storage.session.set({ pendingSave: msg });
          sendResponse({ success: true });
          break;
        }

        case 'SET_BASE_URL': {
          await chrome.storage.local.set({ baseUrl: msg.url });
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('[LootOps BG]', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // async
});

// =============================================
// TAB EVENTS - Update badge on navigation
// =============================================

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    updateBadge(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url?.startsWith('http')) updateBadge(tabId, tab.url);
});

// =============================================
// NOTIFICATION BUTTON CLICKS
// =============================================

chrome.notifications.onButtonClicked.addListener(async (notifId, btnIdx) => {
  if (btnIdx === 0) {
    // "Save" clicked
    const { pendingSave } = await chrome.storage.session.get('pendingSave');
    if (pendingSave) {
      try {
        await chrome.runtime.sendMessage({ type: 'SAVE_PASSWORD', payload: pendingSave });
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Password Saved ✓',
          message: `Credentials for ${pendingSave.website} saved to your vault.`
        });
      } catch(e) {
        console.error('Failed to save captured password', e);
      }
    }
  }
  chrome.notifications.clear(notifId);
});
