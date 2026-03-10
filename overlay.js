
/* ================= MONEY PRINTER - STABLE UI LOADER ================= */
(function MPBStableUILoader() {
  if (window.__MPB_UI_BOOT__) return;
  window.__MPB_UI_BOOT__ = true;

  function waitForStableDOM(cb) {
    const targetStableFrames = 10;
    let stableFrames = 0;

    const interval = setInterval(() => {
      const el = document.querySelector('#sub-menu-robot-modal');
      if (el) {
        stableFrames++;
        if (stableFrames >= targetStableFrames) {
          clearInterval(interval);
          requestAnimationFrame(cb);
        }
      } else {
        stableFrames = 0;
      }
    }, 150);
  }

  waitForStableDOM(initMoneyPrinterUI);
})();

function initMoneyPrinterUI() {
  try {
    if (window.__MPB_UI_ACTIVE__) return;
    window.__MPB_UI_ACTIVE__ = true;


/* ================= MPB INSTANT UNIVERSAL LOADER =================
   Guarantees platform DOM is ready before overlay runs
================================================================== */
(function MPBWaitForPlatform() {
  if (window.__MPB_BOOTSTRAP__) return;
  window.__MPB_BOOTSTRAP__ = true;

  var tries = 0;
  var MAX_TRIES = 180;

  function isReady() {
    return (
      document.querySelector('#sub-menu-robot-modal') &&
      document.getElementById('ss_button') &&
      document.body
    );
  }

  var timer = setInterval(function () {
    tries++;
    if (isReady()) {
      clearInterval(timer);
      requestAnimationFrame(function(){
        initMoneyPrinterUI();
      });
    } else if (tries > MAX_TRIES) {
      clearInterval(timer);
      initMoneyPrinterUI();
    }
  }, 100);
})();


function initMoneyPrinterUI() {
(function () {
  // Make sure we only run once per page
  if (window.__MPB_OVERLAY_FINAL__) return;
  window.__MPB_OVERLAY_FINAL__ = true;

  try {
    var PNL_EPS = 0.05; // 5¢ tolerance around SL/TP

    // ---- GLOBAL SL/TP (single source of truth) ----
    var gStopLoss = 0;     // dollars
    var gTakeProfit = 0;   // dollars

    // ===== CSS =====
    var css = `
#mpb-toast-wrap {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 2147483647;
  pointer-events: none;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.mpb-toast {
  min-width: 220px;
  max-width: 320px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.65);
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.85);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e5f0ff;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2px;
  pointer-events: auto;
  transition: opacity 0.25s, transform 0.25s;
}
.mpb-toast--ok { border-color: rgba(20, 255, 114, 0.55); }
.mpb-toast--warn { border-color: rgba(255, 71, 105, 0.7); }

#mpb-pnl-top {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  background: rgba(15, 23, 42, 0.94);
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #eaf2ff;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
/* === Money Printer Bot - Top Banner === */
#mpb-top-banner {
  position: fixed;
  top: 38px; /* sits directly under the PnL pill */
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  background: transparent;   /* NO DARK STRIP */
  border: none;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #00e5ff;
  pointer-events: none;
}

#mpb-top-left {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.4px;
  color: #00e5ff;
  text-shadow: 0 0 6px rgba(0,229,255,0.6);
}

#mpb-top-right {
  display: none;
}

#mpb-ui-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22ff88;
  box-shadow: 0 0 8px #22ff88;
}


#mpb-dock-simple {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 2147483647;
  min-width: 240px;
  max-width: 280px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #eaf2ff;
  background: radial-gradient(circle at top left, rgba(34, 211, 238, 0.16), rgba(3, 7, 18, 0.98));
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.55);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.9);
  padding: 10px 12px;
  font-size: 12px;
}
.mpb-dock-title {
  font-weight: 800;
  font-size: 11px;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #eaf2ff;
}
.mpb-dock-sub {
  font-size: 11px;
  color: #9fb4d6;
  margin-bottom: 4px;
}
.mpb-dock-sub span { font-weight: 700; }
.mpb-dock-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 8px;
}
.mpb-dock-label {
  font-size: 11px;
  color: #9fb4d6;
  white-space: nowrap;
}
.mpb-dock-input {
  flex: 1;
  min-width: 0;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.8);
  color: #eaf2ff;
  padding: 4px 6px;
  font-size: 11px;
  outline: none;
}
.mpb-dock-input:focus {
  border-color: rgba(56, 189, 248, 0.9);
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.5);
}
.mpb-dock-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
#mpb-reset {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.95), rgba(56, 189, 248, 0.7));
  border: none;
  border-radius: 999px;
  color: #0b1120;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(8, 47, 73, 0.9);
}
#mpb-reset:hover { filter: brightness(1.05); }
#mpb-reset:active {
  transform: translateY(1px);
  box-shadow: 0 4px 10px rgba(8, 47, 73, 0.9);
}

/* tiny debug line so we can see SL/TP/PnL */
#mpb-debug {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}
/* Hide unused expiry/timeframe row cleanly */
#bb_signals,
#bb_signals * {
  display: none !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}


/* === MONEY PRINTER BOT — FULL UI REFRESH (layout only, no logic) === */
#sub-menu-robot-modal {
  padding: 24px 26px !important;
  border-radius: 22px !important;
  box-shadow: 0 24px 80px rgba(0,0,0,0.85) !important;
  backdrop-filter: blur(18px);
}

/* Arrange the main stat cards in a responsive row */
#sub-menu-robot-modal .po-container {
  display: flex !important;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
}

/* Futuristic stat cards for Min Profit / Delay / Deals */
#sub-menu-robot-modal .input-box {
  width: 30% !important;
  min-width: 140px;
  background: radial-gradient(circle at top left, rgba(56,189,248,0.16), rgba(15,23,42,0.96)) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(148,163,184,0.6) !important;
  margin-bottom: 10px !important;
  position: relative;
  overflow: hidden;
}

#sub-menu-robot-modal .input-box_title {
  position: relative !important;
  top: 0 !important;
  transform: none !important;
  margin: 0 !important;
  padding: 8px 10px !important;
  width: 100% !important;
  background: linear-gradient(90deg, rgba(15,23,42,0.95), rgba(30,64,175,0.85)) !important;
  border-bottom: 1px solid rgba(51,65,85,0.9);
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px !important;
}

#sub-menu-robot-modal .input-box_value {
  padding: 10px 10px 8px !important;
  justify-content: center;
  font-size: 20px !important;
}

#sub-menu-robot-modal .input-box_value input {
  font-weight: 700;
  font-size: 20px !important;
}

/* Remove old footer look and make the unit labels cleaner */
#sub-menu-robot-modal .input-box_buttons {
  border-top: none !important;
  background: transparent !important;
  padding-bottom: 10px;
  font-size: 11px !important;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #9fb4d6 !important;
}

/* Toggle row: place toggles in a single horizontal strip */
#sub-menu-robot-modal .bb_pt {
  display: flex !important;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  margin: 12px 0 4px;
}

/* Strategy row as a wide pill bar */
#sub-menu-robot-modal .bb_pt .sub-text,
#sub-menu-robot-modal .sub-text {
  margin: 0 0 6px !important;
  font-size: 11px !important;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9fb4d6 !important;
}

#sub-menu-robot-modal select,
#sub-menu-robot-modal .po-strategy-select {
  width: 100% !important;
  border-radius: 999px !important;
  border: 1px solid rgba(148,163,184,0.7) !important;
  background: radial-gradient(circle at top left, rgba(30,64,175,0.5), rgba(15,23,42,0.98)) !important;
  padding: 10px 14px !important;
  font-size: 13px !important;
}

/* Start button: big centered neon capsule */
#sub-menu-robot-modal .po-ss_button {
  margin-top: 18px;
  display: flex !important;
  justify-content: center;
  align-items: center;
}

#sub-menu-robot-modal #ss_button {
  min-width: 180px;
  height: 42px !important;
  border-radius: 999px !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: radial-gradient(circle at top left, #22c55e, #16a34a) !important;
  box-shadow: 0 16px 40px rgba(22,163,74,0.65);
}

/* Hover/press feedback */
#sub-menu-robot-modal #ss_button:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

#sub-menu-robot-modal #ss_button:active {
  transform: translateY(1px);
  box-shadow: 0 8px 24px rgba(22,163,74,0.55);
}

/* Hide legacy big SL panel so only the new one is visible */
.mpb-header,
.mpb-tile,
#mpb-sl-panel,
#mpb-sl-root {
  display: none !important;
}
`;
    var style = document.createElement('style');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);

    // ===== Top Banner =====
    function mountTopBanner() {
      if (document.getElementById('mpb-top-banner')) return;

      var bar = document.createElement('div');
      bar.id = 'mpb-top-banner';
      bar.innerHTML =
        '<div id="mpb-top-left">🖨 MONEY PRINTER BOT — NEON v4</div>';

      // Prefer body; fall back to documentElement
      (document.body || document.documentElement).appendChild(bar);
    }


    // ===== Toast helper =====
    var lastToastKind = '';
    function toast(msg, ok, kind) {
      try {
        if (kind && kind === lastToastKind) return; // avoid spamming
        lastToastKind = kind || '';

        var wrap = document.getElementById('mpb-toast-wrap');
        if (!wrap) {
          wrap = document.createElement('div');
          wrap.id = 'mpb-toast-wrap';
          document.documentElement.appendChild(wrap);
        }
        var t = document.createElement('div');
        t.className = 'mpb-toast ' + (ok ? 'mpb-toast--ok' : 'mpb-toast--warn');
        t.textContent = msg;
        wrap.appendChild(t);
        setTimeout(function () {
          t.style.opacity = '0';
          t.style.transform = 'translateY(-6px)';
        }, 3200);
        setTimeout(function () {
          if (t && t.parentNode) t.parentNode.removeChild(t);
        }, 3800);
      } catch (e) {}
    }

    // ===== PnL bar =====
    function mountPnlTop() {
      var bar = document.getElementById('mpb-pnl-top');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'mpb-pnl-top';
        bar.textContent = 'PnL: +0.00';
        document.documentElement.appendChild(bar);
      }
    }

    function updatePnlUI(pnl, bal, base, slVal, tpVal) {
      if (!isFinite(pnl)) pnl = 0;
      if (!isFinite(slVal)) slVal = 0;
      if (!isFinite(tpVal)) tpVal = 0;

      var pnlText = (pnl >= 0 ? '+' : '') + pnl.toFixed(2);

      var bar = document.getElementById('mpb-pnl-top');
      if (bar) {
        bar.textContent = 'PnL: ' + pnlText;
        if (pnl < 0) {
          bar.style.color = '#ff4769';
          bar.style.borderColor = 'rgba(255,71,105,0.8)';
        } else {
          bar.style.color = '#eaf2ff';
          bar.style.borderColor = 'rgba(0,229,255,0.6)';
        }
      }

      var baseSpan = document.getElementById('mpb-base');
      var balSpan = document.getElementById('mpb-bal');
      var pnlSpan = document.getElementById('mpb-pnl');
      if (baseSpan) baseSpan.textContent = isFinite(base) ? base.toFixed(2) : '--';
      if (balSpan) balSpan.textContent = isFinite(bal) ? bal.toFixed(2) : '--';
      if (pnlSpan) pnlSpan.textContent = pnlText;

      var dbg = document.getElementById('mpb-debug');
      if (dbg) {
        dbg.textContent =
          'SL: ' + slVal.toFixed(2) +
          ' | TP: ' + tpVal.toFixed(2) +
          ' | PnL: ' + pnlText;
      }
    }

    // ===== Balance helpers =====
    function parseMoney(text) {
      if (!text) return NaN;
      var cleaned = String(text).replace(/[^0-9.,-]/g, '');
      cleaned = cleaned.replace(/,/g, '');
      var n = parseFloat(cleaned);
      return isFinite(n) ? n : NaN;
    }

    function readBalanceFromDOM() {
      var best = NaN;

      var cands = document.querySelectorAll(
        '[data-test*="balance" i],[class*="balance" i],[id*="balance" i]'
      );
      for (var i = 0; i < cands.length; i++) {
        var tx =
          cands[i].getAttribute('data-balance') || cands[i].textContent || '';
        var n = parseMoney(tx);
        if (isFinite(n) && n > 0 && n < 1000000) {
          return n;
        }
      }

      var head = document.querySelector('header, [class*="header" i]');
      if (head) {
        var nums = (head.textContent || '').match(
          /\d{1,3}(?:,\d{3})*(?:\.\d+)?/g
        );
        if (nums && nums.length) {
          var last = parseFloat(nums[nums.length - 1].replace(/,/g, ''));
          if (isFinite(last) && last > 0 && last < 1000000) {
            return last;
          }
        }
      }

      var nodes = document.querySelectorAll('span,div');
      for (var j = 0; j < nodes.length; j++) {
        var t = nodes[j].textContent || '';
        if (t.indexOf('$') === -1 || t.length > 24) continue;
        var v = parseMoney(t);
        if (isFinite(v) && v > 0 && v < 1000000 && (isNaN(best) || v > best)) {
          best = v;
        }
      }

      return best;
    }

    // ===== STOP button helper =====
    function tryStopBot() {
      var btn = document.querySelector('#ss_button');
      if (!btn) return 'no-button';
      var txt = (btn.textContent || '').toLowerCase();
      if (txt.indexOf('stop') === -1) return 'already-stopped'; // shows START
      btn.click();
      return 'clicked';
    }

    // ===== Dock =====
    function mountDock() {
      var dock = document.getElementById('mpb-dock-simple');
      if (!dock) {
        dock = document.createElement('div');
        dock.id = 'mpb-dock-simple';
        dock.innerHTML =
          '<div class="mpb-dock-title">MONEY PRINTER LIMITS</div>' +
          '<div class="mpb-dock-sub">Start: <span id="mpb-base">--</span> • Now: <span id="mpb-bal">--</span></div>' +
          '<div class="mpb-dock-sub">PnL (session): <span id="mpb-pnl">+0.00</span></div>' +
          '<div id="mpb-debug">SL: 0.00 | TP: 0.00 | PnL: +0.00</div>' +
          '<div class="mpb-dock-row">' +
          '  <span class="mpb-dock-label">STOP LOSS ($)</span>' +
          '  <input id="mpb-sl2" class="mpb-dock-input" type="number" step="0.01" value="0" />' +
          '</div>' +
          '<div class="mpb-dock-row">' +
          '  <span class="mpb-dock-label">TAKE PROFIT ($)</span>' +
          '  <input id="mpb-tp" class="mpb-dock-input" type="number" step="0.01" value="0" />' +
          '</div>' +
          '<div class="mpb-dock-footer">' +
          '  <button id="mpb-reset">Reset session</button>' +
          '</div>';
        document.documentElement.appendChild(dock);
      }

      var slInput = document.getElementById('mpb-sl2');   // NEW ID
      var tpInput = document.getElementById('mpb-tp');
      if (!slInput || !tpInput) return;

      // initialize globals from inputs
      gStopLoss = parseFloat(slInput.value) || 0;
      gTakeProfit = parseFloat(tpInput.value) || 0;

      slInput.addEventListener('input', function () {
        var v = parseFloat(this.value);
        gStopLoss = isFinite(v) && v > 0 ? v : 0;
      });
      tpInput.addEventListener('input', function () {
        var v = parseFloat(this.value);
        gTakeProfit = isFinite(v) && v > 0 ? v : 0;
      });

      document.getElementById('mpb-reset').addEventListener('click', function () {
        sessionBase = NaN;
        currentPnl = 0;
        lastToastKind = '';

        gStopLoss = 0;
        gTakeProfit = 0;
        slInput.value = '0';
        tpInput.value = '0';

        updatePnlUI(0, NaN, NaN, 0, 0);
        toast('Session reset. SL/TP and PnL reset. New session starts from current balance.', true, 'reset');
      });
    }

    // ===== State =====
    var sessionBase = NaN;
    var currentPnl = 0;

    // ===== Main loop =====
    function loop() {
      try {
        var bal = readBalanceFromDOM();
        if (!isFinite(bal)) return;

        if (!isFinite(sessionBase)) {
          sessionBase = bal;
          currentPnl = 0;
          updatePnlUI(0, bal, sessionBase, gStopLoss, gTakeProfit);
          return;
        }

        currentPnl = bal - sessionBase;

        if (Math.abs(currentPnl) > Math.max(5000, Math.abs(bal) * 2)) {
          sessionBase = bal;
          currentPnl = 0;
          updatePnlUI(0, bal, sessionBase, gStopLoss, gTakeProfit);
          toast('PnL out of range, session base reset.', false, 'rebase');
          return;
        }

        var pnlRounded = Math.round(currentPnl * 100) / 100;

        var slVal = gStopLoss;
        var tpVal = gTakeProfit;

        var haveSl = isFinite(slVal) && slVal > 0;
        var haveTp = isFinite(tpVal) && tpVal > 0;

        updatePnlUI(pnlRounded, bal, sessionBase, slVal, tpVal);

        if (!haveSl && !haveTp) return;

        // STOP LOSS: PnL <= -SL (+ tolerance)
        if (haveSl && pnlRounded <= -slVal + PNL_EPS) {
          var res1 = tryStopBot();
          toast('STOP LOSS hit: ' + pnlRounded.toFixed(2) + ' USD. Result: ' + res1, false, 'sl');
          return;
        }

        // TAKE PROFIT: PnL >= TP (- tolerance)
        if (haveTp && pnlRounded >= tpVal - PNL_EPS) {
          var res2 = tryStopBot();
          toast('Take Profit hit: +' + pnlRounded.toFixed(2) + ' USD. Result: ' + res2, true, 'tp');
          return;
        }

        if (!haveSl || pnlRounded > -slVal + PNL_EPS) {
          if (!haveTp || pnlRounded < tpVal - PNL_EPS) {
            lastToastKind = '';
          }
        }
      } catch (e) {}
    }

    function boot() {
      mountPnlTop();
      mountTopBanner();
      mountDock();
      updatePnlUI(0, NaN, NaN, gStopLoss, gTakeProfit);
      setInterval(loop, 1000);
    }

    boot();
  } catch (err) {
    console.log('[MPB overlay FINAL error]', err);
  }
})();



// === MPB STATUS PULSE INDICATOR (NO BUTTON, READ-ONLY, IFRAME SAFE) ===
(function () {
  try {
    if (document.getElementById('mpb-status-pulse-only')) return;

    // ---------- CSS ----------
    var style = document.createElement("style");
    style.textContent = `
      @keyframes mpb-breathe-green {
        0%   { box-shadow: 0 0 0 0 rgba(20,255,114,0.55); opacity: 0.75; }
        50%  { box-shadow: 0 0 12px 7px rgba(20,255,114,0.95); opacity: 1; }
        100% { box-shadow: 0 0 0 0 rgba(20,255,114,0.55); opacity: 0.75; }
      }

      @keyframes mpb-breathe-red {
        0%   { box-shadow: 0 0 0 0 rgba(255,71,105,0.55); opacity: 0.75; }
        50%  { box-shadow: 0 0 12px 7px rgba(255,71,105,0.95); opacity: 1; }
        100% { box-shadow: 0 0 0 0 rgba(255,71,105,0.55); opacity: 0.75; }
      }

      .mpb-dot-green {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #14ff72;
        animation: mpb-breathe-green 1.8s ease-in-out infinite;
        margin-right: 8px;
      }

      .mpb-dot-red {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ff4769;
        animation: mpb-breathe-red 1.8s ease-in-out infinite;
        margin-right: 8px;
      }
    `;
    (document.head || document.documentElement).appendChild(style);

    // ---------- UI ----------
    var dock = document.createElement("div");
    dock.id = "mpb-status-pulse-only";
    dock.style.cssText =
      "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);" +
      "z-index:2147483647;min-width:200px;padding:10px 18px;" +
      "border-radius:999px;background:rgba(10,15,25,0.92);" +
      "border:1px solid rgba(148,163,184,0.55);display:flex;" +
      "align-items:center;justify-content:center;gap:10px;" +
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
      "font-size:12px;font-weight:700;color:#eaf2ff;" +
      "box-shadow:0 12px 40px rgba(0,0,0,.75);";

    dock.innerHTML =
      '<span id="mpb-pulse-dot" class="mpb-dot-red"></span>' +
      '<span id="mpb-pulse-text">BOT STOPPED</span>';

    (document.body || document.documentElement).appendChild(dock);

    var dot  = document.getElementById("mpb-pulse-dot");
    var text = document.getElementById("mpb-pulse-text");
    var isRunning = false;

    function renderState() {
      if (isRunning) {
        dot.className = "mpb-dot-green";
        text.textContent = "BOT RUNNING";
      } else {
        dot.className = "mpb-dot-red";
        text.textContent = "BOT STOPPED";
      }
    }

    // ---------- FIND REAL START/STOP BUTTON (DOCUMENT + IFRAMES) ----------
    function findRealButton() {
      try {
        var btn = document.getElementById("ss_button");
        if (btn) return btn;

        var iframes = document.querySelectorAll("iframe");
        for (var i = 0; i < iframes.length; i++) {
          try {
            var doc = iframes[i].contentDocument || iframes[i].contentWindow.document;
            if (!doc) continue;
            var b = doc.getElementById("ss_button");
            if (b) return b;
          } catch (e) {}
        }
      } catch (e) {}
      return null;
    }

    // ---------- SYNC STATE FROM REAL BUTTON TEXT ----------
    function syncFromInterface() {
      var realBtn = findRealButton();
      if (!realBtn) return;

      var txt = (realBtn.textContent || realBtn.innerText || "").trim().toUpperCase();

      // When interface shows STOP => bot is running
      isRunning = txt.indexOf("STOP") !== -1;
      renderState();
    }

    // Initial sync + continuous safety sync (catches SL/TP auto-stops too)
    syncFromInterface();
    setInterval(syncFromInterface, 500);

  } catch (err) {}
})();


}


/* ================= MPB AUTO-REATTACH (LIVE/DEMO SWITCH FIX) ================= */
(function MPBAutoReattach(){
  if (window.__MPB_SELF_HEAL__) return;
  window.__MPB_SELF_HEAL__ = true;

  function safeReboot(){
    try {
      if (
        !document.getElementById('mpb-dock-simple') ||
        !document.getElementById('mpb-pnl-top')
      ) {
        initMoneyPrinterUI();
      }
    } catch(e){}
  }

  const observer = new MutationObserver(function(){
    safeReboot();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  document.addEventListener("visibilitychange", function(){
    if (!document.hidden) {
      setTimeout(safeReboot, 600);
    }
  });

  setInterval(safeReboot, 3000);
})();


  } catch (err) {
    console.error("[MPB UI ERROR]", err);
    window.__MPB_UI_ACTIVE__ = false;
  }
}

/* ================= AUTO REBIND ON LIVE/DEMO SWITCH ================= */
(function MPBRebinder(){
  if (window.__MPB_REBINDER__) return;
  window.__MPB_REBINDER__ = true;

  function rebind() {
    const modal = document.querySelector('#sub-menu-robot-modal');
    if (!modal && window.__MPB_UI_ACTIVE__) {
      window.__MPB_UI_ACTIVE__ = false;
      setTimeout(() => {
        initMoneyPrinterUI();
      }, 400);
    }
  }

  const obs = new MutationObserver(rebind);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) setTimeout(rebind, 600);
  });

  setInterval(rebind, 2500);
})();


/* ================= MPB COMPAT TOOLS TEST PANEL ================= */
(function MPBCompatToolsPanel() {
  if (window.__MPB_COMPAT_TOOLS__) return;
  window.__MPB_COMPAT_TOOLS__ = true;

  var runtimeState = {
    armed: false,
    started: false,
    queueSize: 0,
    queuedTrades: [],
    tracker: { pendingQueue: [], openOrders: [], closedOrders: [] }
  };
  var martingaleTunnels = {};
  var trackerCloseCursor = -1;

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function num(id, fallback) {
    var n = Number(val(id));
    return isFinite(n) ? n : fallback;
  }

  function post(act, extra) {
    var payload = { belobot: true, act: act };
    if (extra && typeof extra === 'object') {
      for (var k in extra) payload[k] = extra[k];
    }
    window.postMessage(payload, window.location.href);
  }

  function logLine(text, ok) {
    var box = document.getElementById('mpb-tools-log');
    if (!box) return;
    var row = document.createElement('div');
    row.style.color = ok ? '#b8ffd5' : '#ffd7dc';
    row.textContent = '[' + new Date().toLocaleTimeString() + '] ' + text;
    box.prepend(row);
    while (box.childNodes.length > 18) {
      box.removeChild(box.lastChild);
    }
  }

  function updateStatus() {
    var el = document.getElementById('mpb-tools-status');
    if (!el) return;
    var closed = (runtimeState.tracker && runtimeState.tracker.closedOrders) ? runtimeState.tracker.closedOrders.length : 0;
    var open = (runtimeState.tracker && runtimeState.tracker.openOrders) ? runtimeState.tracker.openOrders.length : 0;
    var activeTunnels = Object.keys(martingaleTunnels).length;
    el.textContent =
      'Armed: ' + (runtimeState.armed ? 'YES' : 'NO') +
      ' | Started: ' + (runtimeState.started ? 'YES' : 'NO') +
      ' | Queue: ' + runtimeState.queueSize +
      ' | Open: ' + open +
      ' | Closed: ' + closed +
      ' | M1: ' + activeTunnels;
  }

  function createTunnelId() {
    return String(Date.now()) + '-' + String(Math.floor(Math.random() * 100000));
  }

  function parseTunnelTag(tag) {
    var txt = String(tag || '');
    var marker = '|m1:';
    var at = txt.indexOf(marker);
    if (at < 0) return null;

    var rest = txt.slice(at + marker.length);
    var stepAt = rest.lastIndexOf(':s');
    if (stepAt < 0) return null;

    var tunnelId = rest.slice(0, stepAt);
    var step = rest.slice(stepAt + 2);
    if (!tunnelId || (step !== '1' && step !== '2')) return null;

    return {
      tunnelId: tunnelId,
      step: step
    };
  }

  function getTradeFromInputs(multiplier) {
    var amount = num('mpb-tools-amount', 1);
    var trade = {
      asset: val('mpb-tools-asset').trim(),
      direction: val('mpb-tools-direction') || 'call',
      amount: Math.max(0.35, Math.round(amount * (multiplier || 1) * 100) / 100),
      mode: val('mpb-tools-mode') || 'demo',
      strategyTag: val('mpb-tools-tag').trim() || 'compat-tools'
    };
    return trade;
  }

  function refreshSnapshot() {
    post('runtimeSnapshot');
  }

  function wireEvents() {
    var queueBtn = document.getElementById('mpb-tools-queue');
    var runBtn = document.getElementById('mpb-tools-run');
    var queueRunBtn = document.getElementById('mpb-tools-queue-run');
    var clearBtn = document.getElementById('mpb-tools-clear');
    var armBtn = document.getElementById('mpb-tools-arm');
    var debugBtn = document.getElementById('mpb-tools-debug');
    var snapBtn = document.getElementById('mpb-tools-snapshot');
    var m1Btn = document.getElementById('mpb-tools-m1');
    var startStopBtn = document.getElementById('mpb-tools-startstop');

    if (queueBtn) {
      queueBtn.addEventListener('click', function () {
        var trade = getTradeFromInputs(1);
        post('enqueueTrade', { trade: trade });
        logLine('Queued trade request: ' + trade.asset + ' ' + trade.direction + ' ' + trade.amount, true);
        setTimeout(refreshSnapshot, 120);
      });
    }

    if (runBtn) {
      runBtn.addEventListener('click', function () {
        if (!runtimeState.armed) {
          post('setArmed', { armed: true });
        }
        post('placeQueuedTradeNow');
        logLine('Requested run for queued trade.', true);
        setTimeout(refreshSnapshot, 180);
      });
    }

    if (queueRunBtn) {
      queueRunBtn.addEventListener('click', function () {
        var trade = getTradeFromInputs(1);
        if (!runtimeState.armed) {
          post('setArmed', { armed: true });
        }
        post('placeSignalTrade', { trade: trade });
        logLine('Direct signal trade request: ' + trade.asset + ' ' + trade.direction + ' ' + trade.amount, true);
        setTimeout(refreshSnapshot, 220);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        post('clearQueuedTrades');
        logLine('Requested queue clear.', false);
        setTimeout(refreshSnapshot, 120);
      });
    }

    if (armBtn) {
      armBtn.addEventListener('click', function () {
        post('setArmed', { armed: !runtimeState.armed });
        logLine('Set armed -> ' + (!runtimeState.armed), true);
        setTimeout(refreshSnapshot, 180);
      });
    }

    if (debugBtn) {
      debugBtn.addEventListener('click', function () {
        var enable = debugBtn.getAttribute('data-on') !== '1';
        debugBtn.setAttribute('data-on', enable ? '1' : '0');
        debugBtn.textContent = enable ? 'Debug: ON' : 'Debug: OFF';
        post('setDebug', { enabled: enable });
      });
    }

    if (snapBtn) {
      snapBtn.addEventListener('click', refreshSnapshot);
    }

    if (startStopBtn) {
      startStopBtn.addEventListener('click', function () {
        post('start_stop');
        setTimeout(refreshSnapshot, 180);
      });
    }

    if (m1Btn) {
      m1Btn.addEventListener('click', function () {
        var multiplier = Math.max(1.1, num('mpb-tools-multi', 2));
        var baseTrade = getTradeFromInputs(1);
        if (!runtimeState.armed) {
          post('setArmed', { armed: true });
        }

        var tunnelId = createTunnelId();
        var rootTag = (baseTrade.strategyTag || 'compat-tools') + '|m1:' + tunnelId;
        var step1Trade = {
          asset: baseTrade.asset,
          direction: baseTrade.direction,
          amount: baseTrade.amount,
          mode: baseTrade.mode,
          strategyTag: rootTag + ':s1'
        };

        martingaleTunnels[tunnelId] = {
          tunnelId: tunnelId,
          rootTag: rootTag,
          baseTrade: baseTrade,
          multiplier: multiplier,
          state: 'await-step1-close',
          createdAt: Date.now()
        };

        post('placeSignalTrade', { trade: step1Trade });
        logLine('Martingale tunnel ' + tunnelId + ' started (step 1): ' + step1Trade.asset + ' ' + step1Trade.direction + ' ' + step1Trade.amount, true);
        setTimeout(refreshSnapshot, 240);
      });
    }
  }

  function mount() {
    if (document.getElementById('mpb-compat-tools')) return;

    var css = document.createElement('style');
    css.id = 'mpb-compat-tools-style';
    css.textContent = '' +
      '#mpb-compat-tools{position:fixed;top:86px;right:16px;z-index:2147483647;width:310px;background:rgba(8,12,22,.96);border:1px solid rgba(120,156,210,.5);border-radius:12px;box-shadow:0 14px 38px rgba(0,0,0,.62);padding:10px;color:#e8f1ff;font:12px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}' +
      '#mpb-compat-tools h4{margin:0 0 8px 0;font-size:12px;letter-spacing:.3px;text-transform:uppercase;color:#a7c8ff;}' +
      '#mpb-compat-tools .mpb-row{display:flex;gap:6px;margin-bottom:6px;}' +
      '#mpb-compat-tools input,#mpb-compat-tools select{flex:1;min-width:0;background:#0f1a31;border:1px solid rgba(120,156,210,.45);border-radius:8px;color:#eef5ff;padding:6px;font-size:11px;outline:none;}' +
      '#mpb-compat-tools button{background:#13305f;border:1px solid rgba(120,156,210,.45);color:#eaf2ff;border-radius:8px;padding:6px 8px;font-size:11px;cursor:pointer;}' +
      '#mpb-compat-tools button:hover{filter:brightness(1.08);}' +
      '#mpb-tools-status{font-size:10px;color:#8fb0e6;margin-bottom:6px;}' +
      '#mpb-tools-log{max-height:110px;overflow:auto;background:rgba(5,8,14,.78);border:1px solid rgba(120,156,210,.32);border-radius:8px;padding:6px;font-size:10px;}' +
      '#mpb-tools-log:empty::before{content:"No logs yet";color:#6987b8;}';
    document.documentElement.appendChild(css);

    var root = document.createElement('div');
    root.id = 'mpb-compat-tools';
    root.innerHTML =
      '<h4>MPB Compat Tools</h4>' +
      '<div id="mpb-tools-status">Loading runtime snapshot...</div>' +
      '<div class="mpb-row">' +
      '  <input id="mpb-tools-asset" placeholder="asset/pair" value="EURUSD_otc" />' +
      '  <select id="mpb-tools-direction"><option value="call">call</option><option value="put">put</option></select>' +
      '</div>' +
      '<div class="mpb-row">' +
      '  <input id="mpb-tools-amount" type="number" step="0.01" value="1" placeholder="amount" />' +
      '</div>' +
      '<div class="mpb-row">' +
      '  <select id="mpb-tools-mode"><option value="demo">demo</option><option value="live">live</option></select>' +
      '  <input id="mpb-tools-tag" value="compat-tools" placeholder="strategy tag" />' +
      '</div>' +
      '<div class="mpb-row">' +
      '  <button id="mpb-tools-queue">Queue</button>' +
      '  <button id="mpb-tools-run">Run Queued</button>' +
      '  <button id="mpb-tools-queue-run">Queue+Run</button>' +
      '</div>' +
      '<div class="mpb-row">' +
      '  <button id="mpb-tools-arm">Arm/Disarm</button>' +
      '  <button id="mpb-tools-startstop">Start/Stop</button>' +
      '  <button id="mpb-tools-clear">Clear Queue</button>' +
      '</div>' +
      '<div class="mpb-row">' +
      '  <input id="mpb-tools-multi" type="number" step="0.1" value="2" placeholder="M1 mult" />' +
      '  <button id="mpb-tools-m1">Run 1-Step Martin</button>' +
      '</div>' +
      '<div class="mpb-row">' +
      '  <button id="mpb-tools-debug" data-on="0">Debug: OFF</button>' +
      '  <button id="mpb-tools-snapshot">Refresh Snapshot</button>' +
      '</div>' +
      '<div id="mpb-tools-log"></div>';

    document.documentElement.appendChild(root);
    wireEvents();
    refreshSnapshot();
    setInterval(refreshSnapshot, 3000);
  }

  function fireMartingaleStep2(tunnel, lastProfit) {
    if (!tunnel) return;

    var step2 = {
      asset: tunnel.baseTrade.asset,
      direction: tunnel.baseTrade.direction,
      amount: Math.round(tunnel.baseTrade.amount * tunnel.multiplier * 100) / 100,
      mode: tunnel.baseTrade.mode,
      strategyTag: tunnel.rootTag + ':s2'
    };

    post('placeSignalTrade', { trade: step2 });
    tunnel.state = 'await-step2-close';
    logLine('Martingale tunnel ' + tunnel.tunnelId + ' step 2 fired after loss ' + Number(lastProfit || 0).toFixed(2) + ': amount ' + step2.amount, false);
    setTimeout(refreshSnapshot, 220);
  }

  function closeTunnel(tunnel, lastProfit, reason) {
    if (!tunnel) return;
    logLine('Martingale tunnel ' + tunnel.tunnelId + ' closed [' + reason + '] pnl ' + Number(lastProfit || 0).toFixed(2), true);
    delete martingaleTunnels[tunnel.tunnelId];
    updateStatus();
    setTimeout(refreshSnapshot, 220);
  }

  function processClosedOrders(closedOrders) {
    if (!Array.isArray(closedOrders)) return;

    if (trackerCloseCursor < 0) {
      trackerCloseCursor = closedOrders.length;
      return;
    }

    if (closedOrders.length <= trackerCloseCursor) {
      return;
    }

    var fresh = closedOrders.slice(trackerCloseCursor);
    trackerCloseCursor = closedOrders.length;

    for (var i = 0; i < fresh.length; i++) {
      var order = fresh[i] || {};
      var tagInfo = parseTunnelTag(order.strategyTag);
      if (!tagInfo) {
        continue;
      }

      var tunnel = martingaleTunnels[tagInfo.tunnelId];
      if (!tunnel) {
        continue;
      }

      var pnl = Number(order.profit);
      if (!isFinite(pnl)) pnl = 0;

      if (tagInfo.step === '1') {
        if (tunnel.state !== 'await-step1-close') {
          continue;
        }
        if (pnl < 0) {
          fireMartingaleStep2(tunnel, pnl);
        } else {
          closeTunnel(tunnel, pnl, 'step1-no-loss');
        }
        continue;
      }

      if (tagInfo.step === '2') {
        if (tunnel.state === 'await-step2-close') {
          closeTunnel(tunnel, pnl, 'step2-complete');
        }
      }
    }
  }

  function evaluateMartingaleFromTracker(snapshot) {
    var tracker = snapshot && snapshot.tracker ? snapshot.tracker : null;
    var closedOrders = tracker && Array.isArray(tracker.closedOrders) ? tracker.closedOrders : [];
    processClosedOrders(closedOrders);
  }

  window.addEventListener('message', function (evt) {
    var d = evt && evt.data ? evt.data : {};
    if (!d.belobot) return;

    if (d.act === 'runtimeSnapshot' && d.snapshot) {
      runtimeState = d.snapshot;
      updateStatus();
      evaluateMartingaleFromTracker(d.snapshot);
      return;
    }

    if (d.info_text) {
      logLine(String(d.info_text), true);
      return;
    }
  }, true);

  function bootWhenReady() {
    if (!document.documentElement) return;
    mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootWhenReady);
  } else {
    bootWhenReady();
  }
})();
