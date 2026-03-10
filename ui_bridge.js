(function initUIBridgeModule(ns) {
  ns.modules = ns.modules || {};

  function UIBridge(opts) {
    var options = opts || {};
    this.debug = !!options.debug;

    this.started = false;
    this.armed = false;
    this.logPanelEnabled = options.logPanelEnabled !== false;
    this._logRows = [];

    this._listeners = {
      armed: [],
      started: [],
    };

    this._panelEl = null;
  }

  UIBridge.prototype._log = function _log(message, payload) {
    if (!this.debug) return;
    console.log('[MPB][UIBridge] ' + message, payload || '');
  };

  UIBridge.prototype.on = function on(eventName, handler) {
    if (!this._listeners[eventName] || typeof handler !== 'function') return function noop() {};

    this._listeners[eventName].push(handler);
    var self = this;

    return function unsubscribe() {
      self._listeners[eventName] = self._listeners[eventName].filter(function (fn) {
        return fn !== handler;
      });
    };
  };

  UIBridge.prototype._emit = function _emit(eventName, payload) {
    var list = this._listeners[eventName] || [];
    for (var i = 0; i < list.length; i++) {
      try {
        list[i](payload);
      } catch (err) {
        this._log('listener failed for event=' + eventName, err);
      }
    }
  };

  UIBridge.prototype.isArmed = function isArmed() {
    return !!this.armed;
  };

  UIBridge.prototype.isStarted = function isStarted() {
    return !!this.started;
  };

  UIBridge.prototype.setArmed = function setArmed(nextState) {
    this.armed = !!nextState;
    this._emit('armed', { armed: this.armed });
    this.pushLog('Armed=' + this.armed);
    this._updatePanel();
  };

  UIBridge.prototype.setStarted = function setStarted(nextState) {
    this.started = !!nextState;
    this._emit('started', { started: this.started });
    this.pushLog('Started=' + this.started);
    this._updatePanel();
  };

  UIBridge.prototype.toggleArmed = function toggleArmed() {
    this.setArmed(!this.armed);
    return this.armed;
  };

  UIBridge.prototype.pushLog = function pushLog(message) {
    var row = {
      ts: Date.now(),
      text: String(message || ''),
    };

    this._logRows.push(row);
    if (this._logRows.length > 120) {
      this._logRows = this._logRows.slice(this._logRows.length - 120);
    }

    this._updatePanel();
  };

  UIBridge.prototype.getState = function getState() {
    return {
      started: this.started,
      armed: this.armed,
      logs: this._logRows.slice(),
    };
  };

  UIBridge.prototype._ensurePanel = function _ensurePanel() {
    if (!this.logPanelEnabled) return;
    if (this._panelEl) return;

    var panel = document.createElement('div');
    panel.id = 'mpb-exec-debug';
    panel.style.cssText = [
      'position:fixed',
      'right:14px',
      'bottom:14px',
      'z-index:2147483647',
      'width:260px',
      'max-height:220px',
      'overflow:auto',
      'padding:10px',
      'font-size:11px',
      'font-family:monospace',
      'border-radius:10px',
      'background:rgba(3,10,18,0.92)',
      'border:1px solid rgba(70,120,190,0.7)',
      'color:#d8ecff',
      'box-shadow:0 10px 30px rgba(0,0,0,0.55)',
    ].join(';');

    panel.innerHTML =
      '<div id="mpb-exec-title" style="font-weight:700;margin-bottom:8px;">MPB Execution Bridge</div>' +
      '<div id="mpb-exec-state" style="margin-bottom:8px;"></div>' +
      '<button id="mpb-exec-arm-btn" style="margin-right:6px;">Toggle ARM</button>' +
      '<button id="mpb-exec-hide-btn">Hide</button>' +
      '<div id="mpb-exec-log" style="margin-top:8px;line-height:1.35;"></div>';

    (document.body || document.documentElement).appendChild(panel);

    var self = this;
    var armBtn = panel.querySelector('#mpb-exec-arm-btn');
    var hideBtn = panel.querySelector('#mpb-exec-hide-btn');

    if (armBtn) {
      armBtn.addEventListener('click', function () {
        self.toggleArmed();
      });
    }

    if (hideBtn) {
      hideBtn.addEventListener('click', function () {
        panel.style.display = 'none';
      });
    }

    this._panelEl = panel;
  };

  UIBridge.prototype._updatePanel = function _updatePanel() {
    this._ensurePanel();
    if (!this._panelEl) return;

    var stateEl = this._panelEl.querySelector('#mpb-exec-state');
    var logEl = this._panelEl.querySelector('#mpb-exec-log');

    if (stateEl) {
      stateEl.textContent = 'started=' + this.started + ' | armed=' + this.armed;
    }

    if (logEl) {
      var lines = this._logRows.slice(-8).map(function (row) {
        var d = new Date(row.ts);
        return d.toLocaleTimeString() + ' - ' + row.text;
      });
      logEl.innerHTML = lines.map(function (line) {
        return '<div>' + line + '</div>';
      }).join('');
    }
  };

  ns.modules.UIBridge = UIBridge;
})(window.__MPB_TRADER__ || (window.__MPB_TRADER__ = {}));
