/**
 * Frontend Application: LDAP Auth, Secret Rotation & AES-256 DB Dashboard
 */

// DOM Elements - Views & Header
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const serviceStatus = document.getElementById("serviceStatus");
const statusText = document.getElementById("statusText");
const userProfileBadge = document.getElementById("userProfileBadge");
const userDisplayName = document.getElementById("userDisplayName");
const userDn = document.getElementById("userDn");
const btnLogout = document.getElementById("btnLogout");

// DOM Elements - Login Form
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const btnLoginSubmit = document.getElementById("btnLoginSubmit");
const loginFeedback = document.getElementById("loginFeedback");
const fillCredsButtons = document.querySelectorAll(".btn-fill-creds");

// DOM Elements - Dashboard Operations
const btnGetBackendStatus = document.getElementById("btnGetBackendStatus");
const btnGetLdapStatus = document.getElementById("btnGetLdapStatus");
const btnGetData = document.getElementById("btnGetData");
const btnPostData = document.getElementById("btnPostData");
const btnClearConsole = document.getElementById("btnClearConsole");
const consoleOutput = document.getElementById("consoleOutput");

// DOM Elements - Encrypted DB
const encryptForm = document.getElementById("encryptForm");
const itemTitle = document.getElementById("itemTitle");
const itemContent = document.getElementById("itemContent");
const btnLoadRecords = document.getElementById("btnLoadRecords");
const recordsList = document.getElementById("recordsList");
const recordCount = document.getElementById("recordCount");

/**
 * Console Logger
 */
function logToConsole(title, data, isError = false) {
  const time = new Date().toLocaleTimeString();
  const formattedData = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
  const colorClass = isError ? "console-error" : "console-success";

  consoleOutput.innerHTML = `
    <div class="${colorClass}">
      <strong>[${time}] ${title}</strong>
    </div>
    <pre><code>${formattedData}</code></pre>
  `;
}

/**
 * Checks system health via /health endpoint through NGINX.
 */
async function checkHealth() {
  try {
    const res = await fetch("/health");
    if (res.ok) {
      serviceStatus.className = "status-badge online";
      statusText.textContent = "System Active (NGINX Online)";
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    serviceStatus.className = "status-badge offline";
    statusText.textContent = "Connection Error";
  }
}

/**
 * Generic API Caller using relative paths (proxied through NGINX with injected x-api-key)
 */
async function callApi(endpoint, method = "GET", body = null) {
  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json"
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);
    const contentType = response.headers.get("content-type");
    let result;

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    logToConsole(`${method} ${endpoint} ➔ HTTP ${response.status}`, result, !response.ok);
    return { ok: response.ok, status: response.status, data: result };
  } catch (error) {
    logToConsole(`${method} ${endpoint} ➔ Network Error`, { error: error.message }, true);
    return { ok: false, error: error.message };
  }
}

/**
 * Session & View Management
 */
function setAuthenticatedState(userData) {
  sessionStorage.setItem("ldap_user", JSON.stringify(userData));

  userDisplayName.textContent = userData.displayName || userData.username;
  userDn.textContent = userData.dn || `uid=${userData.username}`;
  userProfileBadge.classList.remove("hidden");

  loginView.classList.remove("active");
  loginView.classList.add("hidden");

  dashboardView.classList.remove("hidden");
  dashboardView.classList.add("active");

  loadRecords();
}

function clearAuthenticatedState() {
  sessionStorage.removeItem("ldap_user");
  userProfileBadge.classList.add("hidden");

  dashboardView.classList.remove("active");
  dashboardView.classList.add("hidden");

  loginView.classList.remove("hidden");
  loginView.classList.add("active");

  usernameInput.value = "";
  passwordInput.value = "";
  loginFeedback.className = "feedback-box hidden";
  loginFeedback.textContent = "";
}

// -------------------------------------------------------------
// Authentication Flow
// -------------------------------------------------------------

// Quick Credentials Autofill
fillCredsButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    usernameInput.value = btn.dataset.user;
    passwordInput.value = btn.dataset.pass;
  });
});

// Login Form Submit (calls /ldap/login proxied to FastAPI)
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) return;

  btnLoginSubmit.disabled = true;
  btnLoginSubmit.innerHTML = `<span class="btn-icon">⏳</span> Authenticating with LDAP...`;
  loginFeedback.className = "feedback-box hidden";

  try {
    const res = await callApi("/ldap/login", "POST", { username, password });

    if (res.ok && res.data.authenticated) {
      loginFeedback.className = "feedback-box success";
      loginFeedback.textContent = `✓ Authentication successful for ${res.data.username}! Redirecting...`;
      loginFeedback.classList.remove("hidden");

      setTimeout(() => {
        setAuthenticatedState(res.data);
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.innerHTML = `<span class="btn-icon">⚡</span> Authenticate via LDAP`;
      }, 750);
    } else {
      const errorMsg = res.data && res.data.detail ? (typeof res.data.detail === "string" ? res.data.detail : res.data.detail.message || "Invalid credentials") : "LDAP authentication rejected";
      loginFeedback.className = "feedback-box error";
      loginFeedback.textContent = `✗ Error: ${errorMsg}`;
      loginFeedback.classList.remove("hidden");
      btnLoginSubmit.disabled = false;
      btnLoginSubmit.innerHTML = `<span class="btn-icon">⚡</span> Authenticate via LDAP`;
    }
  } catch (err) {
    loginFeedback.className = "feedback-box error";
    loginFeedback.textContent = `✗ Connection failed: ${err.message}`;
    loginFeedback.classList.remove("hidden");
    btnLoginSubmit.disabled = false;
    btnLoginSubmit.innerHTML = `<span class="btn-icon">⚡</span> Authenticate via LDAP`;
  }
});

// Logout
btnLogout.addEventListener("click", () => {
  clearAuthenticatedState();
});

// -------------------------------------------------------------
// Dashboard Operations & Rotation Verification
// -------------------------------------------------------------

// Backend Status (:3000)
btnGetBackendStatus.addEventListener("click", () => {
  callApi("/api/status", "GET");
});

// LDAP Status (:8000)
btnGetLdapStatus.addEventListener("click", () => {
  callApi("/ldap/status", "GET");
});

// Protected GET /api/data
btnGetData.addEventListener("click", () => {
  callApi("/api/data", "GET");
});

// Protected POST /api/data
btnPostData.addEventListener("click", () => {
  const currentUser = JSON.parse(sessionStorage.getItem("ldap_user") || "{}");
  callApi("/api/data", "POST", {
    clientTimestamp: new Date().toISOString(),
    authenticatedUser: currentUser.username || "anonymous",
    action: "Test POST request through NGINX with rotated secret"
  });
});

// Clear console
btnClearConsole.addEventListener("click", () => {
  consoleOutput.innerHTML = `<pre><code>// Console cleared. Click an action to test requests.</code></pre>`;
});

// -------------------------------------------------------------
// Encrypted Database Operations (AES-256)
// -------------------------------------------------------------

// Encrypt and Save Record (POST /api/items)
encryptForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = itemTitle.value.trim();
  const content = itemContent.value.trim();

  if (!content) return;

  const res = await callApi("/api/items", "POST", { title, content });
  if (res.ok) {
    itemTitle.value = "";
    itemContent.value = "";
    loadRecords();
  }
});

// Retrieve & Decrypt Records (GET /api/items)
async function loadRecords() {
  const res = await callApi("/api/items", "GET");
  if (res.ok && res.data.records) {
    const records = res.data.records;
    recordCount.textContent = `${records.length} record(s)`;

    if (records.length === 0) {
      recordsList.innerHTML = `<p class="empty-state">No records stored in database yet.</p>`;
      return;
    }

    recordsList.innerHTML = records.map(r => `
      <div class="record-item">
        <div class="record-item-header">
          <span class="record-item-title">${r.title || 'Untitled Record'}</span>
          <span class="record-item-time">${new Date(r.createdAt).toLocaleTimeString()}</span>
        </div>
        <div class="record-content-box">
          <div class="data-encrypted"><strong>Encrypted (DB):</strong> ${r.encryptedData}</div>
          <div class="data-decrypted"><strong>Decrypted (API):</strong> ${r.decryptedContent}</div>
        </div>
      </div>
    `).reverse().join("");
  }
}

btnLoadRecords.addEventListener("click", loadRecords);

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
checkHealth();
setInterval(checkHealth, 10000);

// Restore session if active
const savedUser = sessionStorage.getItem("ldap_user");
if (savedUser) {
  try {
    setAuthenticatedState(JSON.parse(savedUser));
  } catch {
    clearAuthenticatedState();
  }
}
