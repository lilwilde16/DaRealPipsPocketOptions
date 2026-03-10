(function MPBAutoTraderCleanup() {
  if (window.__MPB_AUTOTRADER_CLEANUP__) return;

  // Skip auth pages where the trading UI is not available.
  if (/\/(login|register|registration|sign-up|sign-in)(\/|$)/i.test(window.location.pathname)) {
    return;
  }

  window.__MPB_AUTOTRADER_CLEANUP__ = true;

  var BUILTIN_STRATEGIES = {
    signals: true,
    candles: true,
    martin: true,
  };

  var CUSTOM_PREFIX = 'custom:';
  var STORE_KEY = 'mpb.strategy.modules.v1';
  var runtimeHandlers = {};
  var lastKnownStrategy = 'signals';
  var toolsState = {
    latestClosedCount: 0,
    martingaleTest: null,
    executionWatch: null,
  };

  function removeNode(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  function hideInputRow(modal, inputId) {
    var input = modal.querySelector('#' + inputId);
    if (!input) return;

    var row = input.closest('label');
    if (!row) row = input.parentElement;
    if (row) row.style.display = 'none';
  }

  function safeParseJSON(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function normalizeId(id) {
    return String(id || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
  }

  function isCustomStrategyValue(value) {
    return typeof value === 'string' && value.indexOf(CUSTOM_PREFIX) === 0;
  }

  function customIdFromValue(value) {
    return isCustomStrategyValue(value) ? value.slice(CUSTOM_PREFIX.length) : '';
  }

  function cloneObject(value) {
    return safeParseJSON(JSON.stringify(value || {}), {});
  }

  function loadCustomModules() {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};

    var parsed = safeParseJSON(raw, {});
    var result = {};
    var key;

    if (Array.isArray(parsed)) {
      for (var i = 0; i < parsed.length; i++) {
        var row = parsed[i] || {};
        var id = normalizeId(row.id);
        if (!id) continue;
        result[id] = {
          id: id,
          name: row.name || id,
          description: row.description || '',
          version: row.version || '0.1.0',
          enabled: row.enabled !== false,
          config: cloneObject(row.config),
          updatedAt: row.updatedAt || Date.now(),
        };
      }
      return result;
    }

    for (key in parsed) {
      if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
      var moduleRow = parsed[key] || {};
      var normalizedId = normalizeId(moduleRow.id || key);
      if (!normalizedId) continue;

      result[normalizedId] = {
        id: normalizedId,
        name: moduleRow.name || normalizedId,
        description: moduleRow.description || '',
        version: moduleRow.version || '0.1.0',
        enabled: moduleRow.enabled !== false,
        config: cloneObject(moduleRow.config),
        updatedAt: moduleRow.updatedAt || Date.now(),
      };
    }

    return result;
  }

  function saveCustomModules(modules) {
    localStorage.setItem(STORE_KEY, JSON.stringify(modules || {}));
  }

  function getAllowedValues(modules) {
    var allowed = {};
    var key;
    for (key in BUILTIN_STRATEGIES) {
      if (Object.prototype.hasOwnProperty.call(BUILTIN_STRATEGIES, key)) {
        allowed[key] = true;
      }
    }
    for (key in modules) {
      if (!Object.prototype.hasOwnProperty.call(modules, key)) continue;
      if (modules[key] && modules[key].enabled !== false) {
        allowed[CUSTOM_PREFIX + key] = true;
      }
    }
    return allowed;
  }

  function syncCustomStrategyOptions(modal, modules) {
    var select = modal.querySelector('#strategy');
    if (!select) return;

    var previous = Array.prototype.slice.call(
      select.querySelectorAll('option[data-mpb-custom="1"]')
    );
    for (var i = 0; i < previous.length; i++) previous[i].remove();

    var ids = Object.keys(modules).sort();
    for (var j = 0; j < ids.length; j++) {
      var id = ids[j];
      var mod = modules[id];
      if (!mod || mod.enabled === false) continue;

      var option = document.createElement('option');
      option.value = CUSTOM_PREFIX + id;
      option.textContent = 'Custom: ' + mod.name;
      option.setAttribute('data-mpb-custom', '1');
      select.appendChild(option);
    }
  }

  function postStrategyState(value) {
    window.postMessage(
      {
        belobot: true,
        act: 'setState',
        settings: { strategy: value },
      },
      window.location.href
    );
    window.postMessage({ belobot: true, act: 'readState' }, window.location.href);
  }

  function getRuntime() {
    return window.MPBTraderRuntime || null;
  }

  function getToolsRoot(modal) {
    if (!modal) return null;
    return modal.querySelector('#mpb-tools-tab-content');
  }

  function setToolsStatus(modal, message, isError) {
    var root = getToolsRoot(modal);
    if (!root) return;
    var status = root.querySelector('#mpb-tools-status');
    if (!status) return;
    status.textContent = String(message || '');
    status.style.color = isError ? '#ff9db0' : '#bfe4ff';
  }

  function appendToolsLog(modal, message, isError) {
    var root = getToolsRoot(modal);
    if (!root) return;
    var logEl = root.querySelector('#mpb-tools-log');
    if (!logEl) return;

    var row = document.createElement('div');
    row.textContent =
      new Date().toLocaleTimeString() + ' - ' + String(message || '');
    row.style.color = isError ? '#ff9db0' : '#bfe4ff';
    logEl.prepend(row);

    while (logEl.childNodes.length > 8) {
      logEl.removeChild(logEl.lastChild);
    }
  }

  function clearExecutionWatch() {
    if (!toolsState.executionWatch) return;
    if (toolsState.executionWatch.intervalId) {
      clearInterval(toolsState.executionWatch.intervalId);
    }
    toolsState.executionWatch = null;
  }

  function startExecutionWatch(modal, runtime, label, baseline) {
    clearExecutionWatch();

    var startMs = Date.now();
    var timeoutMs = 15000;

    toolsState.executionWatch = {
      label: label,
      startedAt: startMs,
      intervalId: setInterval(function () {
        if (!runtime || typeof runtime.snapshot !== 'function') {
          clearExecutionWatch();
          setToolsStatus(modal, label + ' failed: runtime unavailable during watch.', true);
          appendToolsLog(modal, label + ' watch failed (runtime unavailable).', true);
          return;
        }

        var snap = runtime.snapshot();
        var openOrders = (snap && snap.tracker && snap.tracker.openOrders) || [];
        var closedOrders = (snap && snap.tracker && snap.tracker.closedOrders) || [];

        var opened = openOrders.length > baseline.openCount;
        var closed = closedOrders.length > baseline.closedCount;

        if (opened || closed) {
          clearExecutionWatch();

          var ref = null;
          if (opened && openOrders.length) {
            ref = openOrders[openOrders.length - 1];
          } else if (closed && closedOrders.length) {
            ref = closedOrders[closedOrders.length - 1];
          }

          var refId = ref && ref.orderId ? ref.orderId : 'n/a';
          var refAsset = ref && ref.asset ? ref.asset : 'unknown-asset';

          setToolsStatus(
            modal,
            label + ' confirmed by server event. orderId=' + refId + ' asset=' + refAsset,
            false
          );
          appendToolsLog(
            modal,
            label + ' confirmed. orderId=' + refId + ' asset=' + refAsset,
            false
          );
          return;
        }

        if (Date.now() - startMs > timeoutMs) {
          clearExecutionWatch();
          setToolsStatus(
            modal,
            label + ' timed out. No open/close confirmation within 15s.',
            true
          );
          appendToolsLog(
            modal,
            label + ' timeout. Check broker session/account mode and asset.',
            true
          );
        }
      }, 400),
    };
  }

  function executeTradeWithVerification(modal, tradeIntent, label) {
    var runtime = getRuntime();
    if (!runtime || typeof runtime.placeSignalTrade !== 'function') {
      setToolsStatus(modal, 'Runtime unavailable. Reload page and retry.', true);
      appendToolsLog(modal, label + ' failed: runtime unavailable.', true);
      return false;
    }

    var before = runtime.snapshot();
    var baseline = {
      openCount:
        before && before.tracker && Array.isArray(before.tracker.openOrders)
          ? before.tracker.openOrders.length
          : 0,
      closedCount:
        before && before.tracker && Array.isArray(before.tracker.closedOrders)
          ? before.tracker.closedOrders.length
          : 0,
    };

    runtime.start();
    runtime.setArmed(true);
    runtime.placeSignalTrade(tradeIntent);

    setToolsStatus(
      modal,
      label + ' sent. Waiting for server open/close confirmation...',
      false
    );
    appendToolsLog(
      modal,
      label + ' dispatched: ' +
        tradeIntent.asset + ' ' + tradeIntent.direction + ' amount=' + tradeIntent.amount,
      false
    );

    startExecutionWatch(modal, runtime, label, baseline);
    return true;
  }

  function collectTradeIntentFromTools(modal) {
    var root = getToolsRoot(modal);
    if (!root) throw new Error('Tools panel is not ready');

    var asset = (root.querySelector('#mpb-tools-asset').value || '').trim();
    var direction = (root.querySelector('#mpb-tools-direction').value || 'call').trim();
    var amount = Number(root.querySelector('#mpb-tools-amount').value || 0);
    var expiryRaw = (root.querySelector('#mpb-tools-expiry').value || '').trim();
    var mode = (root.querySelector('#mpb-tools-mode').value || '').trim();
    var strategyTag = (root.querySelector('#mpb-tools-tag').value || 'manual-tools-test').trim();

    if (!asset) throw new Error('Asset is required');
    if (!isFinite(amount) || amount <= 0) throw new Error('Amount must be > 0');

    return {
      asset: asset,
      direction: direction,
      amount: amount,
      expiry: expiryRaw ? Number(expiryRaw) : undefined,
      mode: mode || undefined,
      strategyTag: strategyTag,
    };
  }

  function renderToolsSnapshot(modal) {
    var runtime = getRuntime();
    if (!runtime || typeof runtime.snapshot !== 'function') {
      setToolsStatus(modal, 'Runtime not initialized yet.', true);
      return;
    }

    var snap = runtime.snapshot();
    var queueCount =
      snap && snap.queue && Array.isArray(snap.queue.pendingQueue)
        ? snap.queue.pendingQueue.length
        : 0;
    var openCount =
      snap && snap.tracker && Array.isArray(snap.tracker.openOrders)
        ? snap.tracker.openOrders.length
        : 0;
    var closedCount =
      snap && snap.tracker && Array.isArray(snap.tracker.closedOrders)
        ? snap.tracker.closedOrders.length
        : 0;

    setToolsStatus(
      modal,
      'armed=' + !!(snap && snap.ui && snap.ui.armed) +
        ' | queue=' + queueCount +
        ' | open=' + openCount +
        ' | closed=' + closedCount,
      false
    );
  }

  function placeManualTrade(modal) {
    var runtime = getRuntime();
    if (!runtime || typeof runtime.placeSignalTrade !== 'function') {
      setToolsStatus(modal, 'Runtime unavailable. Reload page and retry.', true);
      return;
    }

    try {
      var tradeIntent = collectTradeIntentFromTools(modal);
      executeTradeWithVerification(modal, tradeIntent, 'Manual real trade test');
    } catch (err) {
      setToolsStatus(modal, 'Manual trade failed: ' + err.message, true);
      appendToolsLog(modal, 'Manual trade failed: ' + err.message, true);
    }
  }

  function startOneStepMartingaleTest(modal) {
    var runtime = getRuntime();
    if (!runtime || typeof runtime.placeSignalTrade !== 'function') {
      setToolsStatus(modal, 'Runtime unavailable. Reload page and retry.', true);
      return;
    }

    try {
      var baseTrade = collectTradeIntentFromTools(modal);
      var root = getToolsRoot(modal);
      var multiplier = Number(root.querySelector('#mpb-tools-multiplier').value || 2);
      if (!isFinite(multiplier) || multiplier <= 1) {
        throw new Error('Martingale multiplier must be > 1');
      }

      var strategyTag = baseTrade.strategyTag || 'martingale-test';
      baseTrade.strategyTag = strategyTag + ':base';

      toolsState.martingaleTest = {
        active: true,
        baseClosedCount: toolsState.latestClosedCount,
        multiplier: multiplier,
        stepTrade: {
          asset: baseTrade.asset,
          direction: baseTrade.direction,
          amount: Math.round(baseTrade.amount * multiplier * 100) / 100,
          expiry: baseTrade.expiry,
          mode: baseTrade.mode,
          strategyTag: strategyTag + ':m1',
        },
      };

        appendToolsLog(
          modal,
          '1-step martingale armed. Step2 amount=' + toolsState.martingaleTest.stepTrade.amount,
          false
        );

        executeTradeWithVerification(modal, baseTrade, 'Martingale base trade');
    } catch (err) {
      toolsState.martingaleTest = null;
      setToolsStatus(modal, 'Martingale test failed: ' + err.message, true);
        appendToolsLog(modal, 'Martingale test failed: ' + err.message, true);
    }
  }

  function maybeProcessMartingaleFromDeals(robotDeals) {
    var state = toolsState.martingaleTest;
    if (!state || !state.active) return;
    if (!robotDeals || !Array.isArray(robotDeals.closed)) return;

    var closed = robotDeals.closed;
    if (closed.length <= state.baseClosedCount) return;

    var firstResult = Number(closed[state.baseClosedCount]);
    var runtime = getRuntime();
    if (!runtime || typeof runtime.placeSignalTrade !== 'function') {
      state.active = false;
      toolsState.martingaleTest = null;
      return;
    }

    if (isFinite(firstResult) && firstResult < 0) {
      try {
        var modal = document.getElementById('sub-menu-robot-modal');
        appendToolsLog(
          modal,
          'Base trade lost (' + firstResult + '). Sending martingale step 2.',
          false
        );
        executeTradeWithVerification(modal, state.stepTrade, 'Martingale step 2');
      } catch (err) {
        console.warn('[MPB Tools] Martingale step dispatch failed', err);
      }
    } else {
      appendToolsLog(
        document.getElementById('sub-menu-robot-modal'),
        'Base trade not a loss (' + firstResult + '). Step 2 not sent.',
        false
      );
    }

    state.active = false;
    toolsState.martingaleTest = null;
  }

  function switchTab(modal, tabName) {
    if (!modal) return;

    var main = modal.querySelector('#mpb-main-tab-content');
    var tools = modal.querySelector('#mpb-tools-tab-content');
    var mainBtn = modal.querySelector('#mpb-tab-main-btn');
    var toolsBtn = modal.querySelector('#mpb-tab-tools-btn');

    var showTools = tabName === 'tools';
    if (main) main.style.display = showTools ? 'none' : '';
    if (tools) tools.style.display = showTools ? '' : 'none';

    if (mainBtn) mainBtn.classList.toggle('is-active', !showTools);
    if (toolsBtn) toolsBtn.classList.toggle('is-active', showTools);

    if (showTools) {
      renderToolsSnapshot(modal);
    }
  }

  function ensureToolsStyles() {
    if (document.getElementById('mpb-tools-tab-style')) return;

    var style = document.createElement('style');
    style.id = 'mpb-tools-tab-style';
    style.textContent = [
      '#sub-menu-robot-modal #mpb-tab-nav{display:flex;gap:8px;margin:10px 0 14px 0;}',
      '#sub-menu-robot-modal .mpb-tab-btn{border:1px solid rgba(120,150,255,0.55);background:rgba(16,24,48,0.85);color:#d4e7ff;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;}',
      '#sub-menu-robot-modal .mpb-tab-btn.is-active{background:rgba(36,84,175,0.85);border-color:rgba(130,190,255,0.9);}',
      '#sub-menu-robot-modal #mpb-tools-tab-content{padding:6px 0;}',
      '#sub-menu-robot-modal .mpb-tools-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
      '#sub-menu-robot-modal .mpb-tools-grid label{display:flex;flex-direction:column;font-size:11px;color:#a8c4eb;gap:4px;}',
      '#sub-menu-robot-modal .mpb-tools-grid input,#sub-menu-robot-modal .mpb-tools-grid select{height:28px;padding:4px 8px;background:rgba(11,18,36,0.92);border:1px solid rgba(104,141,215,0.7);border-radius:6px;color:#e1f1ff;}',
      '#sub-menu-robot-modal .mpb-tools-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}',
      '#sub-menu-robot-modal .mpb-tools-actions button{border:1px solid rgba(120,150,255,0.55);background:rgba(16,24,48,0.85);color:#d4e7ff;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:11px;}',
      '#sub-menu-robot-modal #mpb-tools-status{margin-top:10px;font-size:11px;line-height:1.4;color:#bfe4ff;}',
        '#sub-menu-robot-modal #mpb-tools-log{margin-top:8px;padding:8px;border:1px solid rgba(104,141,215,0.45);background:rgba(10,16,30,0.75);border-radius:8px;font-size:10px;line-height:1.35;max-height:120px;overflow:auto;}',
      '@media (max-width: 640px){#sub-menu-robot-modal .mpb-tools-grid{grid-template-columns:1fr;}}'
    ].join('');

    (document.head || document.documentElement).appendChild(style);
  }

  function bindToolsEvents(modal) {
    if (!modal || modal.__mpbToolsBound) return;
    modal.__mpbToolsBound = true;

    var mainBtn = modal.querySelector('#mpb-tab-main-btn');
    var toolsBtn = modal.querySelector('#mpb-tab-tools-btn');
    var armBtn = modal.querySelector('#mpb-tools-arm');
    var manualBtn = modal.querySelector('#mpb-tools-manual-trade');
    var m1Btn = modal.querySelector('#mpb-tools-m1-test');
    var snapshotBtn = modal.querySelector('#mpb-tools-refresh');

    if (mainBtn) {
      mainBtn.addEventListener('click', function () {
        switchTab(modal, 'main');
      });
    }
    if (toolsBtn) {
      toolsBtn.addEventListener('click', function () {
        switchTab(modal, 'tools');
      });
    }
    if (armBtn) {
      armBtn.addEventListener('click', function () {
        var runtime = getRuntime();
        if (!runtime || typeof runtime.setArmed !== 'function') {
          setToolsStatus(modal, 'Runtime unavailable. Reload page and retry.', true);
          return;
        }
        runtime.setArmed(true);
        setToolsStatus(modal, 'Runtime armed for execution.', false);
      });
    }
    if (manualBtn) {
      manualBtn.addEventListener('click', function () {
        placeManualTrade(modal);
      });
    }
    if (m1Btn) {
      m1Btn.addEventListener('click', function () {
        startOneStepMartingaleTest(modal);
      });
    }
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', function () {
        renderToolsSnapshot(modal);
      });
    }
  }

  function ensureToolsTab(modal) {
    if (!modal) return;
    ensureToolsStyles();

    var nav = modal.querySelector('#mpb-tab-nav');
    var main = modal.querySelector('#mpb-main-tab-content');
    var tools = modal.querySelector('#mpb-tools-tab-content');

    if (!nav || !main || !tools) {
      var existingNodes = [];
      while (modal.firstChild) {
        existingNodes.push(modal.firstChild);
        modal.removeChild(modal.firstChild);
      }

      nav = document.createElement('div');
      nav.id = 'mpb-tab-nav';
      nav.innerHTML =
        '<button id="mpb-tab-main-btn" class="mpb-tab-btn is-active" type="button">Trader</button>' +
        '<button id="mpb-tab-tools-btn" class="mpb-tab-btn" type="button">Tools</button>';

      main = document.createElement('div');
      main.id = 'mpb-main-tab-content';

      tools = document.createElement('div');
      tools.id = 'mpb-tools-tab-content';
      tools.style.display = 'none';
      tools.innerHTML =
        '<div class="mpb-tools-grid">' +
        '  <label>Asset / Pair<input id="mpb-tools-asset" type="text" value="EURUSD_otc" /></label>' +
        '  <label>Direction<select id="mpb-tools-direction"><option value="call">call / buy</option><option value="put">put / sell</option></select></label>' +
        '  <label>Amount<input id="mpb-tools-amount" type="number" step="0.01" min="0.01" value="1" /></label>' +
        '  <label>Expiry (optional)<input id="mpb-tools-expiry" type="number" step="1" min="1" value="" /></label>' +
          '  <label>Mode<select id="mpb-tools-mode"><option value="live">live</option><option value="demo">demo</option><option value="">leave unchanged</option></select></label>' +
        '  <label>Strategy Tag<input id="mpb-tools-tag" type="text" value="manual-tools" /></label>' +
        '  <label>Martingale x<input id="mpb-tools-multiplier" type="number" step="0.1" min="1.1" value="2" /></label>' +
        '</div>' +
        '<div class="mpb-tools-actions">' +
        '  <button id="mpb-tools-arm" type="button">Arm Runtime</button>' +
          '  <button id="mpb-tools-manual-trade" type="button">Execute Real Trade</button>' +
          '  <button id="mpb-tools-m1-test" type="button">Execute Real 1-Step M1</button>' +
        '  <button id="mpb-tools-refresh" type="button">Refresh Snapshot</button>' +
        '</div>' +
          '<div id="mpb-tools-status">Tools ready.</div>' +
          '<div id="mpb-tools-log"></div>';

      modal.appendChild(nav);
      modal.appendChild(main);
      modal.appendChild(tools);

      for (var i = 0; i < existingNodes.length; i++) {
        main.appendChild(existingNodes[i]);
      }
    }

    bindToolsEvents(modal);
  }

  function cleanupStrategySelect(modal) {
    var select = modal.querySelector('#strategy');
    if (!select) return;

    var modules = loadCustomModules();
    syncCustomStrategyOptions(modal, modules);

    var selected = select.value;
    var changed = false;
    var allowedValues = getAllowedValues(modules);

    var options = Array.prototype.slice.call(select.options);
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var value = (option.value || '').trim();
      var text = (option.textContent || '').trim();
      var isCustom = isCustomStrategyValue(value);

      var removeBecausePlaceholder =
        !isCustom &&
        (!value ||
          /^n\/a$/i.test(text) ||
          /test/i.test(text) ||
          value === 'cci' ||
          value === 'pinBar');

      var removeBecauseNotAllowed = !allowedValues[value];

      if (removeBecausePlaceholder || removeBecauseNotAllowed) {
        option.remove();
        changed = true;
      }
    }

    if (!select.options.length) return;

    var stillValid = false;
    for (var j = 0; j < select.options.length; j++) {
      if (select.options[j].value === selected) {
        stillValid = true;
        break;
      }
    }

    if (!stillValid) {
      var fallback = allowedValues[lastKnownStrategy] ? lastKnownStrategy : 'signals';
      select.value = fallback;
      if (select.value !== fallback && select.options.length) {
        select.selectedIndex = 0;
      }
      changed = true;
    }

    lastKnownStrategy = select.value;

    if (changed) {
      postStrategyState(select.value);
    }
  }

  function cleanupModal() {
    var modal = document.getElementById('sub-menu-robot-modal');
    if (!modal) return;

    ensureToolsTab(modal);

    cleanupStrategySelect(modal);

    // Remove non-essential controls for cleaner function-calling tests.
    hideInputRow(modal, 'show_stat');

    var share = modal.querySelector('#po_share_mes');
    if (share) share.style.display = 'none';

    var statsOverlay = document.getElementById('ss_overlay');
    if (statsOverlay) statsOverlay.style.display = 'none';

    // Keep only the primary action button visible in the action row.
    var actionRow = modal.querySelector('.po-ss_button');
    var startButton = modal.querySelector('#ss_button');
    if (actionRow && startButton) {
      var children = Array.prototype.slice.call(actionRow.children);
      for (var i = 0; i < children.length; i++) {
        if (!children[i].contains(startButton)) {
          children[i].style.display = 'none';
        }
      }
      actionRow.style.display = 'flex';
      actionRow.style.justifyContent = 'flex-end';
      actionRow.style.alignItems = 'center';
      actionRow.style.gap = '0';
    }
  }

  function removeOverlayArtifacts() {
    var selectors = [
      '#mpb-dock-simple',
      '#mpb-pnl-top',
      '#mpb-top-banner',
      '#mpb-status-pulse-only',
      '#mpb-toast-wrap',
      '#mpb-sl-panel',
      '#mpb-sl-root',
      '#mpb-reset',
    ];

    for (var i = 0; i < selectors.length; i++) {
      var node = document.querySelector(selectors[i]);
      if (node) removeNode(node);
    }
  }

  function publicModuleList() {
    var modules = loadCustomModules();
    var ids = Object.keys(modules).sort();
    var list = [];
    for (var i = 0; i < ids.length; i++) {
      list.push(cloneObject(modules[ids[i]]));
    }
    return list;
  }

  function registerModule(definition) {
    var def = definition || {};
    var id = normalizeId(def.id || def.key || def.name);
    if (!id) throw new Error('Strategy id is required');

    var modules = loadCustomModules();
    modules[id] = {
      id: id,
      name: String(def.name || id),
      description: String(def.description || ''),
      version: String(def.version || '0.1.0'),
      enabled: def.enabled !== false,
      config: cloneObject(def.config),
      updatedAt: Date.now(),
    };

    saveCustomModules(modules);
    runCleanup();
    return cloneObject(modules[id]);
  }

  function updateModule(idInput, patchInput) {
    var id = normalizeId(idInput);
    if (!id) throw new Error('Strategy id is required');

    var patch = patchInput || {};
    var modules = loadCustomModules();
    if (!modules[id]) throw new Error('Strategy not found: ' + id);

    if (typeof patch.name !== 'undefined') modules[id].name = String(patch.name);
    if (typeof patch.description !== 'undefined') {
      modules[id].description = String(patch.description);
    }
    if (typeof patch.version !== 'undefined') modules[id].version = String(patch.version);
    if (typeof patch.enabled !== 'undefined') modules[id].enabled = !!patch.enabled;
    if (typeof patch.config !== 'undefined') modules[id].config = cloneObject(patch.config);
    modules[id].updatedAt = Date.now();

    saveCustomModules(modules);
    runCleanup();
    return cloneObject(modules[id]);
  }

  function removeModule(idInput) {
    var id = normalizeId(idInput);
    if (!id) throw new Error('Strategy id is required');

    var modules = loadCustomModules();
    if (!modules[id]) return false;
    delete modules[id];
    delete runtimeHandlers[id];

    saveCustomModules(modules);
    runCleanup();
    return true;
  }

  function setModuleEnabled(idInput, enabled) {
    return updateModule(idInput, { enabled: !!enabled });
  }

  function selectStrategy(value) {
    var select = document.querySelector('#sub-menu-robot-modal #strategy');
    if (!select) throw new Error('Strategy select is not mounted yet');

    var modules = loadCustomModules();
    var allowed = getAllowedValues(modules);
    if (!allowed[value]) throw new Error('Strategy is not available: ' + value);

    select.value = value;
    if (select.value !== value) {
      throw new Error('Could not select strategy: ' + value);
    }

    lastKnownStrategy = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return value;
  }

  function attachRuntimeHandler(idInput, handler) {
    var id = normalizeId(idInput);
    if (!id) throw new Error('Strategy id is required');
    if (typeof handler !== 'function' && (typeof handler !== 'object' || !handler)) {
      throw new Error('Handler must be a function or object');
    }
    runtimeHandlers[id] = handler;
    return true;
  }

  function detachRuntimeHandler(idInput) {
    var id = normalizeId(idInput);
    if (!id) throw new Error('Strategy id is required');
    delete runtimeHandlers[id];
    return true;
  }

  function emitToActiveCustom(eventName, payload) {
    if (!isCustomStrategyValue(lastKnownStrategy)) return;

    var id = customIdFromValue(lastKnownStrategy);
    var handler = runtimeHandlers[id];
    if (!handler) return;

    try {
      if (typeof handler === 'function') {
        handler({
          event: eventName,
          strategyId: id,
          payload: payload,
        });
        return;
      }

      if (handler && typeof handler[eventName] === 'function') {
        handler[eventName](payload);
      }
    } catch (err) {
      console.warn('[MPB StrategyHub handler error]', err);
    }
  }

  function installStrategyHubAPI() {
    var hub = {
      version: '1.0.0',
      prefix: CUSTOM_PREFIX,
      register: registerModule,
      update: updateModule,
      remove: removeModule,
      enable: function (id) {
        return setModuleEnabled(id, true);
      },
      disable: function (id) {
        return setModuleEnabled(id, false);
      },
      list: publicModuleList,
      get: function (idInput) {
        var id = normalizeId(idInput);
        if (!id) return null;
        var modules = loadCustomModules();
        return modules[id] ? cloneObject(modules[id]) : null;
      },
      select: selectStrategy,
      on: attachRuntimeHandler,
      off: detachRuntimeHandler,
      active: function () {
        return lastKnownStrategy;
      },
    };

    window.MPBStrategyHub = hub;
  }

  function observeBelobotMessages() {
    window.addEventListener('message', function (evt) {
      var data = evt && evt.data;
      if (!data || !data.belobot) return;

      if (data.act === 'robotSettings' && data.settings && data.settings.strategy) {
        lastKnownStrategy = data.settings.strategy;
        emitToActiveCustom('onSettings', data.settings);
        return;
      }

      if (data.act === 'newDeal') {
        emitToActiveCustom('onNewDeal', data);
        return;
      }

      if (data.robotDeals) {
        if (Array.isArray(data.robotDeals.closed)) {
          toolsState.latestClosedCount = data.robotDeals.closed.length;
        }
        maybeProcessMartingaleFromDeals(data.robotDeals);
        emitToActiveCustom('onRobotDeals', data.robotDeals);
      }
    });

    document.addEventListener(
      'click',
      function (evt) {
        var target = evt.target;
        if (!target || target.id !== 'ss_button') return;
        emitToActiveCustom('onToggleRequest', { at: Date.now() });
      },
      true
    );
  }

  function runCleanup() {
    removeOverlayArtifacts();
    cleanupModal();
  }

  installStrategyHubAPI();
  observeBelobotMessages();
  runCleanup();

  var observer = new MutationObserver(function () {
    runCleanup();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  setInterval(runCleanup, 1200);
})();
