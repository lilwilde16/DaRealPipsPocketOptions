(function initMPBWebSocketBridge() {
  if (window.MPBWebSocketBridge && window.MPBWebSocketBridge.patched) {
    return;
  }

  var debug = false;
  var listeners = {};
  var outboundInterceptors = [];
  var socketLog = [];
  var OriginalWebSocket = window.WebSocket;

  if (!OriginalWebSocket) {
    return;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function log(event, payload) {
    if (socketLog.length > 500) {
      socketLog.shift();
    }
    socketLog.push({ ts: nowIso(), event: event, payload: payload });
    if (debug) {
      console.debug('[MPB Bridge]', event, payload);
    }
  }

  function on(event, handler) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(handler);
    return function unsubscribe() {
      off(event, handler);
    };
  }

  function off(event, handler) {
    var list = listeners[event] || [];
    var idx = list.indexOf(handler);
    if (idx >= 0) {
      list.splice(idx, 1);
    }
  }

  function emit(event, data) {
    var list = listeners[event] || [];
    for (var i = 0; i < list.length; i += 1) {
      try {
        list[i](data);
      } catch (err) {
        log('handler.error', { event: event, error: String(err) });
      }
    }
  }

  function decodeArrayBuffer(buffer) {
    try {
      return new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    } catch (err) {
      return '';
    }
  }

  function encodeToArrayBuffer(text) {
    try {
      return new TextEncoder().encode(text).buffer;
    } catch (err) {
      return null;
    }
  }

  function tryParseSocketPayload(raw) {
    var rawType = Object.prototype.toString.call(raw);
    var sourceText = '';
    var format = {
      rawType: rawType,
      fromArrayBuffer: false,
      prefix: '',
      suffix: '',
      extracted: ''
    };

    if (raw instanceof ArrayBuffer) {
      sourceText = decodeArrayBuffer(raw);
      format.fromArrayBuffer = true;
    } else if (typeof raw === 'string') {
      sourceText = raw;
    } else {
      return {
        ok: false,
        raw: raw,
        parsed: null,
        format: format,
        error: 'Unsupported payload type'
      };
    }

    var firstBrace = sourceText.indexOf('{');
    var firstBracket = sourceText.indexOf('[');
    var start = -1;

    if (firstBrace >= 0 && firstBracket >= 0) {
      start = Math.min(firstBrace, firstBracket);
    } else if (firstBrace >= 0) {
      start = firstBrace;
    } else {
      start = firstBracket;
    }

    if (start < 0) {
      return {
        ok: false,
        raw: raw,
        parsed: null,
        format: format,
        text: sourceText,
        error: 'No JSON token found'
      };
    }

    var extracted = sourceText.slice(start);
    format.prefix = sourceText.slice(0, start);
    format.extracted = extracted;

    try {
      return {
        ok: true,
        raw: raw,
        parsed: JSON.parse(extracted),
        format: format,
        text: sourceText
      };
    } catch (err) {
      return {
        ok: false,
        raw: raw,
        parsed: null,
        format: format,
        text: sourceText,
        error: String(err)
      };
    }
  }

  function serializePayload(parsedValue, parseMeta) {
    try {
      var serialized = JSON.stringify(parsedValue);
      var baseText = (parseMeta && parseMeta.format ? parseMeta.format.prefix : '') + serialized;
      if (parseMeta && parseMeta.format && parseMeta.format.fromArrayBuffer) {
        var rebuffed = encodeToArrayBuffer(baseText);
        return rebuffed || parseMeta.raw;
      }
      return baseText;
    } catch (err) {
      return parseMeta ? parseMeta.raw : parsedValue;
    }
  }

  function setDebug(enabled) {
    debug = !!enabled;
  }

  function registerOutboundInterceptor(interceptor) {
    outboundInterceptors.push(interceptor);
    return function unregister() {
      var idx = outboundInterceptors.indexOf(interceptor);
      if (idx >= 0) {
        outboundInterceptors.splice(idx, 1);
      }
    };
  }

  function WrappedWebSocket(url, protocols) {
    var socket = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);
    var originalSend = socket.send.bind(socket);

    emit('socket.opening', { url: url, socket: socket });

    socket.addEventListener('open', function onOpen(evt) {
      log('socket.open', { url: url });
      emit('socket.open', { socket: socket, event: evt });
    });

    socket.addEventListener('close', function onClose(evt) {
      log('socket.close', { code: evt.code, reason: evt.reason || '' });
      emit('socket.close', { socket: socket, event: evt });
    });

    socket.addEventListener('error', function onError(evt) {
      log('socket.error', { message: 'WebSocket error' });
      emit('socket.error', { socket: socket, event: evt });
    });

    socket.addEventListener('message', function onMessage(evt) {
      var parsed = tryParseSocketPayload(evt.data);
      emit('inbound.raw', { socket: socket, event: evt, parsed: parsed, raw: evt.data });
      if (parsed.ok) {
        emit('inbound.parsed', { socket: socket, event: evt, parsed: parsed.parsed, meta: parsed });
      } else {
        log('inbound.parse_failed', { error: parsed.error });
      }
    });

    socket.send = function wrappedSend(raw) {
      var activeRaw = raw;
      var parseMeta = tryParseSocketPayload(raw);
      var ctx = {
        socket: socket,
        raw: raw,
        activeRaw: raw,
        parsed: parseMeta.ok ? parseMeta.parsed : null,
        parseMeta: parseMeta,
        modified: false
      };

      emit('outbound.raw', ctx);

      for (var i = 0; i < outboundInterceptors.length; i += 1) {
        var interceptor = outboundInterceptors[i];
        try {
          var next = interceptor({
            socket: socket,
            raw: activeRaw,
            parsed: parseMeta.ok ? parseMeta.parsed : null,
            parseMeta: parseMeta,
            serializePayload: serializePayload,
            tryParseSocketPayload: tryParseSocketPayload
          });
          if (typeof next !== 'undefined') {
            activeRaw = next;
            ctx.activeRaw = next;
            ctx.modified = true;
          }
        } catch (err) {
          log('outbound.interceptor_error', { error: String(err) });
        }
      }

      if (ctx.modified) {
        log('outbound.modified', {});
      }

      emit('outbound.final', ctx);
      return originalSend(activeRaw);
    };

    return socket;
  }

  WrappedWebSocket.prototype = OriginalWebSocket.prototype;

  try {
    WrappedWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    WrappedWebSocket.OPEN = OriginalWebSocket.OPEN;
    WrappedWebSocket.CLOSING = OriginalWebSocket.CLOSING;
    WrappedWebSocket.CLOSED = OriginalWebSocket.CLOSED;
  } catch (err) {
    log('static.copy_failed', { error: String(err) });
  }

  window.WebSocket = WrappedWebSocket;

  window.MPBWebSocketBridge = {
    patched: true,
    OriginalWebSocket: OriginalWebSocket,
    WrappedWebSocket: WrappedWebSocket,
    on: on,
    off: off,
    emit: emit,
    setDebug: setDebug,
    tryParseSocketPayload: tryParseSocketPayload,
    serializePayload: serializePayload,
    registerOutboundInterceptor: registerOutboundInterceptor,
    getSocketLog: function getSocketLog() {
      return socketLog.slice();
    }
  };

  log('bridge.ready', { patched: true });
})();
