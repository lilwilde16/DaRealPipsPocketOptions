(function initWebSocketBridgeModule(ns) {
  ns.modules = ns.modules || {};
  ns.utils = ns.utils || {};

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function decodeArrayBuffer(rawBuffer) {
    try {
      return new TextDecoder('utf-8').decode(rawBuffer);
    } catch (err) {
      return null;
    }
  }

  function createSerializableParseResult(raw, data, kind, prefix) {
    return {
      ok: true,
      kind: kind,
      prefix: prefix || '',
      raw: raw,
      data: data,
      serialize: function serialize(nextData) {
        if (kind === 'raw-object') return nextData;
        var encoded = JSON.stringify(nextData);
        if (kind === 'socketio-envelope') return (prefix || '') + encoded;
        return encoded;
      },
    };
  }

  function tryParseSocketPayload(raw) {
    if (raw && typeof raw === 'object' && !(raw instanceof ArrayBuffer) && !(raw instanceof Blob)) {
      return createSerializableParseResult(raw, raw, 'raw-object', '');
    }

    if (raw instanceof ArrayBuffer) {
      var decoded = decodeArrayBuffer(raw);
      if (!decoded) {
        return {
          ok: false,
          raw: raw,
          reason: 'arraybuffer-decode-failed',
          serialize: function serializeFallback() {
            return raw;
          },
        };
      }
      return tryParseSocketPayload(decoded);
    }

    if (typeof raw !== 'string') {
      return {
        ok: false,
        raw: raw,
        reason: 'unsupported-raw-type',
        serialize: function serializeUnsupported() {
          return raw;
        },
      };
    }

    var trimmed = raw.trim();
    if (!trimmed) {
      return {
        ok: false,
        raw: raw,
        reason: 'empty-string',
        serialize: function serializeEmpty() {
          return raw;
        },
      };
    }

    try {
      return createSerializableParseResult(raw, JSON.parse(trimmed), 'json-string', '');
    } catch (errA) {
      var startIdx = -1;
      var i;
      for (i = 0; i < trimmed.length; i++) {
        var c = trimmed.charAt(i);
        if (c === '[' || c === '{') {
          startIdx = i;
          break;
        }
      }

      if (startIdx > 0) {
        var prefix = trimmed.slice(0, startIdx);
        var body = trimmed.slice(startIdx);
        try {
          return createSerializableParseResult(raw, JSON.parse(body), 'socketio-envelope', prefix);
        } catch (errB) {
          return {
            ok: false,
            raw: raw,
            reason: 'json-parse-failed-with-prefix',
            serialize: function serializePrefixFail() {
              return raw;
            },
          };
        }
      }

      return {
        ok: false,
        raw: raw,
        reason: 'json-parse-failed',
        serialize: function serializeFail() {
          return raw;
        },
      };
    }
  }

  function WebSocketBridge(opts) {
    var options = opts || {};
    this.debug = !!options.debug;
    this.patched = false;
    this.originalWebSocket = null;
    this.activeSockets = [];
    this.inboundHooks = [];
    this.outboundHooks = [];
    this.socketHooks = [];
  }

  WebSocketBridge.prototype._log = function _log(message, payload) {
    if (!this.debug) return;
    console.log('[MPB][WebSocketBridge] ' + message, payload || '');
  };

  WebSocketBridge.prototype.onInbound = function onInbound(handler) {
    if (typeof handler !== 'function') return function noop() {};
    this.inboundHooks.push(handler);
    var self = this;
    return function unsubscribeInbound() {
      self.inboundHooks = self.inboundHooks.filter(function (h) {
        return h !== handler;
      });
    };
  };

  WebSocketBridge.prototype.onOutbound = function onOutbound(handler) {
    if (typeof handler !== 'function') return function noop() {};
    this.outboundHooks.push(handler);
    var self = this;
    return function unsubscribeOutbound() {
      self.outboundHooks = self.outboundHooks.filter(function (h) {
        return h !== handler;
      });
    };
  };

  WebSocketBridge.prototype.onSocket = function onSocket(handler) {
    if (typeof handler !== 'function') return function noop() {};
    this.socketHooks.push(handler);
    var self = this;
    return function unsubscribeSocket() {
      self.socketHooks = self.socketHooks.filter(function (h) {
        return h !== handler;
      });
    };
  };

  WebSocketBridge.prototype._emitSocket = function _emitSocket(socket, context) {
    for (var i = 0; i < this.socketHooks.length; i++) {
      try {
        this.socketHooks[i](socket, context || {});
      } catch (err) {
        this._log('Socket hook error', err);
      }
    }
  };

  WebSocketBridge.prototype._emitInbound = function _emitInbound(payload) {
    for (var i = 0; i < this.inboundHooks.length; i++) {
      try {
        this.inboundHooks[i](payload);
      } catch (err) {
        this._log('Inbound hook error', err);
      }
    }
  };

  WebSocketBridge.prototype._runOutboundHooks = function _runOutboundHooks(payload) {
    var currentPayload = payload;

    for (var i = 0; i < this.outboundHooks.length; i++) {
      try {
        var parseAttempt = tryParseSocketPayload(currentPayload);
        var hookResult = this.outboundHooks[i]({
          rawPayload: payload,
          currentPayload: currentPayload,
          parsed: parseAttempt,
          parseHelper: tryParseSocketPayload,
        });

        if (typeof hookResult === 'undefined' || hookResult === null) {
          continue;
        }

        if (Object.prototype.hasOwnProperty.call(hookResult, 'payload')) {
          currentPayload = hookResult.payload;
          continue;
        }

        currentPayload = hookResult;
      } catch (err) {
        this._log('Outbound hook failed, using previous payload', err);
      }
    }

    return currentPayload;
  };

  WebSocketBridge.prototype._wrapSocket = function _wrapSocket(socket) {
    var self = this;

    if (!socket || socket.__mpbSocketWrapped) return socket;
    socket.__mpbSocketWrapped = true;

    this.activeSockets.push(socket);

    var originalSend = socket.send;
    socket.__mpbOriginalSend = function __mpbOriginalSend(payload) {
      return originalSend.call(socket, payload);
    };

    socket.send = function patchedSend(payload) {
      var finalPayload = self._runOutboundHooks(payload);
      return originalSend.call(socket, finalPayload);
    };

    socket.addEventListener('open', function () {
      self._log('Socket connected', { url: socket.url });
      self._emitSocket(socket, { type: 'open' });
    });

    socket.addEventListener('close', function (evt) {
      self._log('Socket closed', { code: evt.code, reason: evt.reason });
      self._emitSocket(socket, { type: 'close', event: evt });
    });

    socket.addEventListener('message', function (evt) {
      var parsed = tryParseSocketPayload(evt.data);
      self._emitInbound({
        socket: socket,
        event: evt,
        raw: evt.data,
        parsed: parsed,
        timestamp: Date.now(),
      });
    });

    return socket;
  };

  WebSocketBridge.prototype.patchWindowWebSocket = function patchWindowWebSocket() {
    if (this.patched) return;

    var self = this;
    var OriginalWebSocket = window.WebSocket;
    if (!OriginalWebSocket) {
      this._log('WebSocket not found in page context');
      return;
    }

    this.originalWebSocket = OriginalWebSocket;

    function WrappedWebSocket(url, protocols) {
      var socket;
      if (arguments.length > 1) {
        socket = new OriginalWebSocket(url, protocols);
      } else {
        socket = new OriginalWebSocket(url);
      }
      return self._wrapSocket(socket);
    }

    WrappedWebSocket.prototype = OriginalWebSocket.prototype;

    var staticProps = Object.getOwnPropertyNames(OriginalWebSocket);
    for (var i = 0; i < staticProps.length; i++) {
      var key = staticProps[i];
      if (key === 'prototype') continue;
      try {
        var descriptor = Object.getOwnPropertyDescriptor(OriginalWebSocket, key);
        if (descriptor) {
          Object.defineProperty(WrappedWebSocket, key, descriptor);
        }
      } catch (err) {
        this._log('Failed to copy static prop: ' + key, err);
      }
    }

    window.WebSocket = WrappedWebSocket;
    this.patched = true;
    this._log('window.WebSocket patched successfully');
  };

  WebSocketBridge.prototype.unpatchWindowWebSocket = function unpatchWindowWebSocket() {
    if (!this.patched) return;
    if (!this.originalWebSocket) return;
    window.WebSocket = this.originalWebSocket;
    this.patched = false;
    this._log('window.WebSocket restored');
  };

  WebSocketBridge.prototype.tryParseSocketPayload = tryParseSocketPayload;

  ns.utils.tryParseSocketPayload = tryParseSocketPayload;
  ns.utils.clone = clone;
  ns.modules.WebSocketBridge = WebSocketBridge;
})(window.__MPB_TRADER__ || (window.__MPB_TRADER__ = {}));
