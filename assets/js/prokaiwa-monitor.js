/**
 * prokaiwa-monitor.js
 * ===========================================================
 * Client-side error capture, breadcrumb tracking, and
 * problem reporting for Prokaiwa.
 *
 * What this script does:
 *  - Generates a unique session ID for each page visit
 *  - Records a breadcrumb trail: every click and page load
 *  - Captures ALL JS errors, Promise failures, and console.errors
 *  - On any error: saves the full breadcrumb trail + error details
 *    to Supabase so you can replay exactly what the user did
 *  - Shows a floating "困っていますか？" button so students can
 *    manually report a problem in Japanese
 *  - Fires an alert to your email via the notify-admin edge function
 *
 * This script is self-contained — no imports, no dependencies.
 * It works on every page, even when the user is not logged in.
 * ===========================================================
 */

(function () {
  'use strict';

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  const SUPABASE_URL = 'https://luyzyzefgintksydmwoh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eXp5emVmZ2ludGtzeWRtd29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NzYyMDUsImV4cCI6MjA2ODU1MjIwNX0.he5_j99ZtAj4K_zzgm11NEEv7TrbRJYndJXot25s_Kg';

  // Max breadcrumbs to keep in memory per session
  // When full, oldest entries are dropped to keep memory usage low
  const MAX_BREADCRUMBS = 75;

  // Prevent duplicate error alerts within this window (milliseconds)
  const ERROR_DEDUPE_WINDOW_MS = 10000;

  // ==========================================================
  // SESSION SETUP
  // ==========================================================

  // Generate a unique session ID once per browser tab.
  // Stored in sessionStorage so it survives page navigations
  // within the same tab but resets when the tab is closed.
  function getOrCreateSessionId() {
    try {
      let sid = sessionStorage.getItem('pk_session_id');
      if (!sid) {
        // Simple unique ID: timestamp + random string
        sid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
        sessionStorage.setItem('pk_session_id', sid);
      }
      return sid;
    } catch (e) {
      // sessionStorage blocked (private mode edge case) — generate ephemeral ID
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    }
  }

  const SESSION_ID = getOrCreateSessionId();

  // Breadcrumb trail stored in memory
  let breadcrumbs = [];

  // Sequence counter — ensures breadcrumbs can be replayed in order
  let breadcrumbSequence = 0;

  // Deduplication: track the last error message and when it was logged
  let lastErrorMessage = null;
  let lastErrorTime = 0;

  // ==========================================================
  // ENVIRONMENT DETECTION
  // Figures out what browser, OS, and device type the user has
  // ==========================================================

  function detectEnvironment() {
    const ua = navigator.userAgent;

    // --- Device type ---
    let deviceType = 'desktop';
    if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
    }

    // --- OS ---
    let os = 'Unknown';
    if (/Windows NT/.test(ua))      os = 'Windows';
    else if (/Mac OS X/.test(ua))   os = 'macOS';
    else if (/Android/.test(ua))    os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua))      os = 'Linux';

    // --- Browser name and version ---
    let browser = 'Unknown';
    let browserVersion = 'Unknown';

    if (/Edg\//.test(ua)) {
      browser = 'Edge';
      browserVersion = (ua.match(/Edg\/([\d.]+)/) || [])[1] || 'Unknown';
    } else if (/OPR\/|Opera/.test(ua)) {
      browser = 'Opera';
      browserVersion = (ua.match(/(?:OPR|Opera)\/([\d.]+)/) || [])[1] || 'Unknown';
    } else if (/Chrome\//.test(ua)) {
      browser = 'Chrome';
      browserVersion = (ua.match(/Chrome\/([\d.]+)/) || [])[1] || 'Unknown';
    } else if (/Firefox\//.test(ua)) {
      browser = 'Firefox';
      browserVersion = (ua.match(/Firefox\/([\d.]+)/) || [])[1] || 'Unknown';
    } else if (/Safari\//.test(ua)) {
      browser = 'Safari';
      browserVersion = (ua.match(/Version\/([\d.]+)/) || [])[1] || 'Unknown';
    }

    return {
      deviceType,
      os,
      browser,
      browserVersion,
      screenResolution: `${window.screen.width}x${window.screen.height}`
    };
  }

  const ENV = detectEnvironment();

  // ==========================================================
  // USER IDENTITY
  // Tries to read the logged-in user's email from the Supabase
  // auth session in localStorage. This works without any API
  // call — Supabase stores the session locally.
  // Returns null if the user is not logged in.
  // ==========================================================

  function getCurrentUserEmail() {
    try {
      const raw = localStorage.getItem('prokaiwa-supabase-auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user?.email || null;
    } catch (e) {
      return null;
    }
  }

  function getCurrentUserId() {
    try {
      const raw = localStorage.getItem('prokaiwa-supabase-auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user?.id || null;
    } catch (e) {
      return null;
    }
  }

  // ==========================================================
  // BREADCRUMB TRACKING
  // Adds one entry to the in-memory breadcrumb trail.
  // When the trail reaches MAX_BREADCRUMBS, the oldest entry
  // is removed to make room (circular buffer behaviour).
  // ==========================================================

  function addBreadcrumb(eventType, data) {
    if (breadcrumbs.length >= MAX_BREADCRUMBS) {
      breadcrumbs.shift(); // remove oldest
    }
    breadcrumbs.push({
      session_id: SESSION_ID,
      sequence_number: ++breadcrumbSequence,
      event_type: eventType,
      element_tag: data.tag || null,
      element_id: data.id || null,
      element_text: data.text ? data.text.slice(0, 200) : null,
      element_href: data.href || null,
      page_url: window.location.href,
      event_timestamp: new Date().toISOString()
    });
  }

  // ==========================================================
  // SUPABASE REST API HELPERS
  // We call Supabase directly via fetch (no SDK needed).
  // This keeps the monitor self-contained.
  // ==========================================================

  const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  async function insertRow(table, row) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(row)
      });
      // 201 = created successfully, 200 = also fine
      return res.status === 201 || res.status === 200;
    } catch (e) {
      // Silently fail — the monitor must never cause additional errors
      return false;
    }
  }

  async function insertRows(table, rows) {
    if (!rows || rows.length === 0) return true;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(rows)
      });
      return res.status === 201 || res.status === 200;
    } catch (e) {
      return false;
    }
  }

  // ==========================================================
  // ALERT TRIGGER
  // Calls the notify-admin edge function which sends an email
  // to prokaiwa.english@gmail.com via Resend.
  // We pass a payload describing what happened.
  // ==========================================================

  async function triggerAlert(payload) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // Silently fail — never cause additional errors
    }
  }

  // ==========================================================
  // ERROR HANDLER
  // The core function called whenever any error is detected.
  // It:
  //  1. Deduplicates to prevent spam from the same error
  //  2. Saves the full breadcrumb trail to breadcrumb_log
  //  3. Saves the error details to error_log
  //  4. Triggers an email alert
  // ==========================================================

  async function handleError(errorMessage, errorStack, errorType) {
    const now = Date.now();

    // Deduplicate: skip if same error fired within the dedupe window
    if (
      errorMessage === lastErrorMessage &&
      now - lastErrorTime < ERROR_DEDUPE_WINDOW_MS
    ) {
      return;
    }
    lastErrorMessage = errorMessage;
    lastErrorTime = now;

    const userEmail = getCurrentUserEmail();
    const userId = getCurrentUserId();

    // Add one final breadcrumb marking the error itself
    addBreadcrumb('error', {
      text: errorMessage ? errorMessage.slice(0, 200) : 'Unknown error'
    });

    // Save the breadcrumb trail (snapshot of what was in memory)
    const trailToSave = [...breadcrumbs];

    // Build the error log row
    const errorRow = {
      user_id: userId || null,
      user_email: userEmail || null,
      error_message: (errorMessage || 'Unknown error').slice(0, 1000),
      error_stack: errorStack ? errorStack.slice(0, 3000) : null,
      error_type: errorType,
      page_url: window.location.href,
      page_path: window.location.pathname,
      browser: ENV.browser,
      browser_version: ENV.browserVersion,
      os: ENV.os,
      device_type: ENV.deviceType,
      screen_resolution: ENV.screenResolution,
      session_id: SESSION_ID,
      alert_sent: false,
      created_at: new Date().toISOString()
    };

    // Save everything to Supabase in parallel
    await Promise.all([
      insertRows('breadcrumb_log', trailToSave),
      insertRow('error_log', errorRow)
    ]);

    // Fire the email alert
    await triggerAlert({
      type: errorType,
      error_message: errorMessage,
      page_url: window.location.href,
      page_path: window.location.pathname,
      user_email: userEmail,
      browser: `${ENV.browser} ${ENV.browserVersion}`,
      device: `${ENV.deviceType} — ${ENV.os}`,
      session_id: SESSION_ID,
      breadcrumb_count: trailToSave.length
    });
  }

  // ==========================================================
  // ERROR LISTENERS
  // Three hooks that together catch every type of browser error
  // ==========================================================

  // 1. Uncaught JS errors (e.g. TypeError, ReferenceError)
  window.addEventListener('error', function (event) {
    handleError(
      event.message,
      event.error ? event.error.stack : null,
      'js_error'
    );
  });

  // 2. Unhandled Promise rejections
  // This catches failed Supabase calls, fetch failures, etc.
  window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : (typeof reason === 'string' ? reason : JSON.stringify(reason));
    const stack = reason instanceof Error ? reason.stack : null;
    handleError(message, stack, 'promise_rejection');
  });

  // 3. console.error override
  // Wraps the browser's built-in console.error so anything your
  // own code deliberately logs as an error also gets captured.
  const _originalConsoleError = console.error;
  console.error = function (...args) {
    // Still print to DevTools as normal
    _originalConsoleError.apply(console, args);

    // Also capture it
    const message = args
      .map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
      .join(' ');
    handleError(message, null, 'console_error');
  };

  // ==========================================================
  // CLICK TRACKING
  // Listens at the document level (event delegation) so every
  // click on any element is caught, including dynamically
  // added buttons created after page load.
  // ==========================================================

  document.addEventListener('click', function (event) {
    const target = event.target.closest('a, button, [role="button"], input[type="submit"]');
    if (!target) return;

    addBreadcrumb('click', {
      tag: target.tagName.toLowerCase(),
      id: target.id || null,
      text: (target.textContent || target.value || target.getAttribute('aria-label') || '').trim(),
      href: target.href || null
    });
  }, true); // useCapture: true ensures we catch clicks even if stopPropagation is called

  // ==========================================================
  // PAGE LOAD BREADCRUMB
  // Records the first breadcrumb: when and where the user arrived
  // ==========================================================

  addBreadcrumb('page_load', {
    text: document.title || window.location.pathname
  });

  // ==========================================================
  // REPORT A PROBLEM WIDGET
  // A floating button in Japanese that lets students flag issues
  // without needing to understand what went wrong technically.
  // ==========================================================

  function buildReportWidget() {
    // Inject the styles
    const style = document.createElement('style');
    style.textContent = `
      #pk-report-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        background: #008080;
        color: #fff;
        border: none;
        border-radius: 50px;
        padding: 12px 18px;
        font-size: 13px;
        font-family: 'Noto Sans JP', sans-serif;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        gap: 7px;
        transition: background 0.2s, transform 0.2s;
        line-height: 1.3;
      }
      #pk-report-btn:hover {
        background: #006666;
        transform: translateY(-2px);
      }
      #pk-report-modal-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.55);
        z-index: 100000;
        justify-content: center;
        align-items: center;
        padding: 16px;
      }
      #pk-report-modal-overlay.pk-visible {
        display: flex;
      }
      #pk-report-modal {
        background: #fff;
        border-radius: 16px;
        padding: 28px 24px 24px;
        max-width: 380px;
        width: 100%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        font-family: 'Noto Sans JP', sans-serif;
      }
      #pk-report-modal h3 {
        margin: 0 0 6px;
        font-size: 17px;
        color: #1a1a1a;
      }
      #pk-report-modal p.pk-sub {
        margin: 0 0 18px;
        font-size: 13px;
        color: #666;
        line-height: 1.5;
      }
      .pk-issue-btn {
        display: block;
        width: 100%;
        text-align: left;
        background: #f5f5f5;
        border: 2px solid transparent;
        border-radius: 10px;
        padding: 11px 14px;
        margin-bottom: 8px;
        font-size: 14px;
        color: #1a1a1a;
        cursor: pointer;
        font-family: 'Noto Sans JP', sans-serif;
        transition: border-color 0.15s, background 0.15s;
      }
      .pk-issue-btn:hover,
      .pk-issue-btn.pk-selected {
        border-color: #008080;
        background: #e6f2f2;
      }
      #pk-report-note {
        width: 100%;
        box-sizing: border-box;
        margin-top: 4px;
        margin-bottom: 14px;
        padding: 10px 12px;
        border: 1.5px solid #ddd;
        border-radius: 8px;
        font-size: 13px;
        font-family: 'Noto Sans JP', sans-serif;
        resize: vertical;
        min-height: 72px;
        color: #1a1a1a;
      }
      #pk-report-note:focus {
        outline: none;
        border-color: #008080;
      }
      #pk-report-submit {
        width: 100%;
        background: #008080;
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 13px;
        font-size: 15px;
        font-family: 'Noto Sans JP', sans-serif;
        cursor: pointer;
        transition: background 0.2s;
        font-weight: 600;
      }
      #pk-report-submit:hover {
        background: #006666;
      }
      #pk-report-submit:disabled {
        background: #aaa;
        cursor: not-allowed;
      }
      #pk-report-close {
        float: right;
        background: none;
        border: none;
        font-size: 22px;
        cursor: pointer;
        color: #888;
        line-height: 1;
        padding: 0;
        margin-top: -4px;
      }
      #pk-report-close:hover { color: #333; }
      #pk-report-success {
        display: none;
        text-align: center;
        padding: 12px 0 4px;
      }
      #pk-report-success p {
        font-size: 15px;
        color: #1a1a1a;
        margin: 10px 0 0;
        line-height: 1.6;
      }
    `;
    document.head.appendChild(style);

    // Floating trigger button
    const btn = document.createElement('button');
    btn.id = 'pk-report-btn';
    btn.setAttribute('aria-label', '問題を報告する');
    btn.innerHTML = `<span>⚠️</span><span>困っていますか？</span>`;

    // Modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'pk-report-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '問題を報告する');

    const issues = [
      { value: 'signup',  label: '📝 登録できない' },
      { value: 'login',   label: '🔐 ログインできない' },
      { value: 'payment', label: '💳 お支払いができない' },
      { value: 'line',    label: '📱 LINEが届かない' },
      { value: 'display', label: '🖥️ ページが正しく表示されない' },
      { value: 'other',   label: '❓ その他の問題' }
    ];

    let selectedIssue = null;

    overlay.innerHTML = `
      <div id="pk-report-modal">
        <button id="pk-report-close" aria-label="閉じる">×</button>
        <h3>お困りですか？</h3>
        <p class="pk-sub">問題の内容を選んでください。<br>すぐに確認してご連絡いたします。</p>
        <div id="pk-issue-list">
          ${issues.map(i => `
            <button class="pk-issue-btn" data-value="${i.value}">${i.label}</button>
          `).join('')}
        </div>
        <textarea
          id="pk-report-note"
          placeholder="詳細があれば教えてください（任意）"
          maxlength="500"
        ></textarea>
        <button id="pk-report-submit" disabled>送信する</button>
        <div id="pk-report-success">
          <div style="font-size:42px">✅</div>
          <p>ご報告ありがとうございます！<br>確認次第、ご連絡いたします。</p>
        </div>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(overlay);

    // --- Event wiring ---

    btn.addEventListener('click', () => {
      overlay.classList.add('pk-visible');
      addBreadcrumb('click', { tag: 'button', id: 'pk-report-btn', text: '困っていますか？' });
    });

    overlay.querySelector('#pk-report-close').addEventListener('click', () => {
      overlay.classList.remove('pk-visible');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('pk-visible');
    });

    overlay.querySelectorAll('.pk-issue-btn').forEach(issueBtn => {
      issueBtn.addEventListener('click', () => {
        overlay.querySelectorAll('.pk-issue-btn').forEach(b => b.classList.remove('pk-selected'));
        issueBtn.classList.add('pk-selected');
        selectedIssue = issueBtn.dataset.value;
        overlay.querySelector('#pk-report-submit').disabled = false;
      });
    });

    overlay.querySelector('#pk-report-submit').addEventListener('click', async () => {
      const submitBtn = overlay.querySelector('#pk-report-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      const note = overlay.querySelector('#pk-report-note').value.trim();
      const userEmail = getCurrentUserEmail();
      const userId = getCurrentUserId();

      // Map issue value to readable label for the email
      const issueLabel = issues.find(i => i.value === selectedIssue)?.label || selectedIssue;

      // Save a breadcrumb for the submission
      addBreadcrumb('form_submit', {
        tag: 'button',
        id: 'pk-report-submit',
        text: `Report: ${selectedIssue}`
      });

      // Save to error_log as a manual report
      const errorRow = {
        user_id: userId || null,
        user_email: userEmail || null,
        error_message: `Manual report: ${issueLabel}${note ? ' — ' + note : ''}`,
        error_stack: null,
        error_type: 'manual_report',
        page_url: window.location.href,
        page_path: window.location.pathname,
        browser: ENV.browser,
        browser_version: ENV.browserVersion,
        os: ENV.os,
        device_type: ENV.deviceType,
        screen_resolution: ENV.screenResolution,
        session_id: SESSION_ID,
        alert_sent: false,
        created_at: new Date().toISOString()
      };

      // Save the breadcrumb trail too so you can see what they did
      const trailToSave = [...breadcrumbs];

      await Promise.all([
        insertRows('breadcrumb_log', trailToSave),
        insertRow('error_log', errorRow)
      ]);

      // Fire the email alert
      await triggerAlert({
        type: 'manual_report',
        issue_category: selectedIssue,
        issue_label: issueLabel,
        note: note || null,
        page_url: window.location.href,
        user_email: userEmail || '未ログイン',
        browser: `${ENV.browser} ${ENV.browserVersion}`,
        device: `${ENV.deviceType} — ${ENV.os}`,
        session_id: SESSION_ID
      });

      // Show success message
      overlay.querySelector('#pk-issue-list').style.display = 'none';
      overlay.querySelector('#pk-report-note').style.display = 'none';
      submitBtn.style.display = 'none';
      overlay.querySelector('p.pk-sub').style.display = 'none';
      overlay.querySelector('#pk-report-success').style.display = 'block';

      // Auto-close after 3 seconds
      setTimeout(() => {
        overlay.classList.remove('pk-visible');
        // Reset modal state for next time
        setTimeout(() => {
          overlay.querySelector('#pk-issue-list').style.display = 'block';
          overlay.querySelector('#pk-report-note').style.display = 'block';
          submitBtn.style.display = 'block';
          submitBtn.disabled = true;
          submitBtn.textContent = '送信する';
          overlay.querySelector('p.pk-sub').style.display = 'block';
          overlay.querySelector('#pk-report-success').style.display = 'none';
          overlay.querySelectorAll('.pk-issue-btn').forEach(b => b.classList.remove('pk-selected'));
          overlay.querySelector('#pk-report-note').value = '';
          selectedIssue = null;
        }, 400);
      }, 3000);
    });
  }

  // Build the widget once the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildReportWidget);
  } else {
    buildReportWidget();
  }

})();
