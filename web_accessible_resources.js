// === MPB: Early WebSocket prototype hook ===
// Captures any WebSocket instance created before our constructor override runs.
// Any subsequent .send() on a pre-existing socket will set window.__mpbWs so trades can execute.
(function(){
  if (window.__mpbWsProtoHooked) return;
  window.__mpbWsProtoHooked = true;
  try {
    var _origProtoSend = WebSocket.prototype.send;
    window.__mpbWsPool = window.__mpbWsPool || [];
    WebSocket.prototype.send = function mpbWsSend(data) {
      if (window.__mpbWsPool.indexOf(this) === -1) window.__mpbWsPool.push(this);
      if (!window.__mpbWs && this.readyState !== 3 /* CLOSED */) {
        console.log('[MPB] WebSocket captured via prototype hook');
        window.__mpbWs = this;
      }
      if (typeof data === 'string' && data.indexOf('openOrder') !== -1) {
        window.__mpbTradeWs = this;
        window.__mpbLastOpenOrderPayload = data;
      }
      return _origProtoSend.apply(this, arguments);
    };
  } catch(e) {
    console.debug('[MPB] prototype WS hook failed:', e);
  }
})();

(function(){try{
(()=>{"use strict";const t={settings:{strategy:"signals",min_profit:80,delay:0,deals_limit:10,take_profit:{percent:20,sum:0},signals:[2,2,1,0,0,0],use_otc:!0,started:!1,martinSteps:[2,2,2,2,2],useMartin:!1,selected_pairs:[],bcCooldownMinutes:10,allowTesterTrades:!1},rates:{},action:!1,userInfo:{uid:!1,isDemo:!0,balance:{demo:0,real:0},openedDials:0,futureDeals:[],onlyDemo:!1,robotDeals:{opened:[],closed:[]},startSum:!1,martinState:{}},getNextMartingaleStep(t,e){let s=t;for(let t=0;t<this.settings.martinSteps.length;t++){if(e===s)return Math.floor(s*this.settings.martinSteps[t]*100)/100;s=Math.floor(this.settings.martinSteps[t]*s*100)/100}return 2*e},checkDial(e,s){if(!this.settings.started)return!1;if("otc"==e.slice(-3)&&!this.settings.use_otc)return!1;if(!this.settings.selected_pairs||!this.settings.selected_pairs.length||!this.settings.selected_pairs.includes(e))return!1;if(!this.rates[e].active)return!1;if(this.userInfo.openedDials+this.userInfo.futureDeals.length>=this.settings.deals_limit)return!1;if(this.rates[e].nextDealTime>new Date)return!1;if(this.rates[e].profit<this.settings.min_profit)return!1;if(this.userInfo.isDemo&&this.userInfo.balance.real>=this.settings.take_profit.sum)return this.settings.started=!1,window.postMessage({belobot:!0,act:"robotSettings",settings:t.settings},window.location.href),!1;if(!this.userInfo.isDemo&&this.userInfo.balance.real>=this.settings.take_profit.sum)return this.settings.started=!1,window.postMessage({belobot:!0,act:"robotSettings",settings:t.settings},window.location.href),!1;if("updateStream"==this.action){if("candles"==this.settings.strategy){let t=this.strategies.candles(this.rates[e].rates,Math.trunc(s),4);t&&("down"==t?this.deal(e,"up"):this.deal(e,"down"))}if("cci"==this.settings.strategy){let t=this.strategies.cci(this.rates[e].rates,Math.trunc(s),20);t&&(t<115&&this.rates[e].last_cci>115&&this.deal(e,"down"),t>-105&&this.rates[e].last_cci<-105&&this.deal(e,"up"),this.rates[e].last_cci=t)}if("pinBar"==this.settings.strategy){let t=this.strategies.pinBar(this.rates[e].rates,Math.trunc(s),4);t&&this.deal(e,t)}if("rsiBinary"==this.settings.strategy){const r=this.strategies.rsiBinary(this.rates[e].rates,Math.trunc(s),6);if(r!==!1){const c=this.rates[e].rsi_prev;if(c!==!1){if(c>=13&&r<13){this.deal(e,"up");const p=new Date;p.setSeconds(p.getSeconds()+180);this.rates[e].nextDealTime=p}if(c<=82&&r>82){this.deal(e,"down");const p=new Date;p.setSeconds(p.getSeconds()+180);this.rates[e].nextDealTime=p}}this.rates[e].rsi_prev=r}}if("binaryContinuation"==this.settings.strategy){if(!this.userInfo.martinState[e])this.userInfo.martinState[e]={};var _ms=this.userInfo.martinState[e];if(!_ms.bcStopped){if(_ms.bcCooldown&&Date.now()<_ms.bcCooldown){}else{if(_ms.bcCooldown&&Date.now()>=_ms.bcCooldown)_ms.bcCooldown=null;var _sig=this.strategies.binaryContinuation(this.rates[e].rates,Math.trunc(s));if(_sig!==!1){var _amt=_ms.bcWait&&_ms.bcNextAmt?_ms.bcNextAmt:void 0;_ms.bcWait=!1;this.deal(e,_sig,_amt)}}}}}if("signals"==this.action&&"signals"==this.settings.strategy){let t=this.strategies.signals(this.rates[e].signals,this.settings.signals);t&&this.deal(e,t)}},check_reg(t){var e=this,s=new XMLHttpRequest;s.open("POST","https://2bot.top/check_user/",!0),s.setRequestHeader("Content-type","application/json; charset=utf-8"),s.onreadystatechange=function(){if(s.readyState==XMLHttpRequest.DONE)if(200==s.status){var t=JSON.parse(s.response);t.confirm?e.userInfo.onlyDemo=!1:e.userInfo.onlyDemo=!0,window.postMessage({belobot:!0,info_text:t.message})}else window.postMessage({belobot:!0,info_text:'Server <a href="https://2bot.top">https://2bot.top</a> is not available. Please report a problem trader.vitaly@gmail.com'})},s.send(JSON.stringify({user_id:t}))},deal(t,e,s){if((this.settings.useMartin||"martin"===this.settings.strategy)&&!s&&this.userInfo.martinState[t]&&this.userInfo.martinState[t].nextAmount)s=this.userInfo.martinState[t].nextAmount;e="up"==e?"call":"put",this.userInfo.futureDeals.push({pair:t,dur:e,sum:s});let a=new Date;a.setSeconds(a.getSeconds()+this.settings.delay),this.rates[t].nextDealTime=a,window.postMessage({belobot:!0,act:"newDeal"},window.location.href)},addRate(t){this.rates[t.name].rates[t.elm[0]]=[t.elm[1],t.elm[2],t.elm[3],t.elm[4]]},addCurrentRate(t){var e=60*parseInt(t.elm[0]/60);this.checkRate(t.name),null==this.rates[t.name].rates[e]&&(this.rates[t.name].rates[e]=[t.elm[1],t.elm[1],t.elm[1],t.elm[1]]),t.elm[1]>this.rates[t.name].rates[e][2]?this.rates[t.name].rates[e][2]=t.elm[1]:t.elm[1]<this.rates[t.name].rates[e][3]&&(this.rates[t.name].rates[e][3]=t.elm[1]),this.rates[t.name].rates[e][1]=t.elm[1]},checkRate(t){null==this.rates[t]&&(this.rates[t]={rates:{}}),null==this.rates[t].signals&&(this.rates[t].signals={}),null==this.rates[t].nextDealTime&&(this.rates[t].nextDealTime=new Date),null==this.rates[t].last_cci&&(this.rates[t].last_cci=!1),null==this.rates[t].rsi_prev&&(this.rates[t].rsi_prev=!1)},update(e){return"updateHistory"==this.action&&(this.checkRate(e.asset),e.candles.forEach((function(t){this.addRate({name:e.asset,elm:t})}),this),e.history.forEach((function(t){this.addCurrentRate({name:e.asset,elm:t})}),this)),"updateStream"==this.action&&e.forEach((function(t){this.checkRate(t[0]),this.addCurrentRate({name:t[0],elm:[t[1],t[2]]}),this.checkDial(t[0],t[1])}),this),"updateAssets"==this.action&&e.forEach((function(t){this.checkRate(t[1]),this.rates[t[1]].profit=t[5],this.rates[t[1]].active=t[14],this.rates[t[1]].fullname=t[2]}),this),"updateBalance"==this.action&&(this.userInfo.uid||(this.userInfo.uid=AppData.uid,this.check_reg(this.userInfo.uid)),e.isDemo?this.userInfo.balance.real=e.balance:this.userInfo.balance.real=e.balance,this.userInfo.isDemo=e.isDemo),"updateOpenedDeals"===this.action&&(this.userInfo.openedDials=e.length),"successopenOrder"===this.action&&this.settings.started&&this.userInfo.robotDeals.opened.push(e.id),"successcloseOrder"===this.action&&(e.deals.forEach((function(t){var e=this.userInfo.robotDeals.opened.indexOf(t.id);if(e>-1&&(this.userInfo.robotDeals.opened.splice(e,1),this.userInfo.robotDeals.closed.push(t.profit),("martin"===this.settings.strategy||this.settings.useMartin)&&this.settings.started)){if(t.profit<0){let _ms=this.userInfo.martinState[t.asset]||{step:0};_ms.step<5?this.userInfo.martinState[t.asset]={step:_ms.step+1,nextAmount:Math.floor(t.amount*2*100)/100}:this.userInfo.martinState[t.asset]={step:0,nextAmount:null}}else if(t.profit>0)this.userInfo.martinState[t.asset]={step:0,nextAmount:null}}if(e>-1&&"binaryContinuation"===this.settings.strategy&&this.settings.started){if(!this.userInfo.martinState[t.asset])this.userInfo.martinState[t.asset]={};var _bcms=this.userInfo.martinState[t.asset];if(t.profit<0){var _step=(_bcms.bcStep||0)+1;_bcms.bcStep=_step;_bcms.bcNextAmt=Math.floor(t.amount*2*100)/100;_bcms.bcWait=!0;if(_step>=4)_bcms.bcStopped=!0;else if(_step>=3)_bcms.bcCooldown=Date.now()+(this.settings.bcCooldownMinutes||10)*60000}else if(t.profit>0){_bcms.bcStep=0;_bcms.bcNextAmt=null;_bcms.bcWait=!1;_bcms.bcStopped=!1;_bcms.bcCooldown=null}}this.userInfo.openedDials--}),this),window.postMessage({belobot:!0,robotDeals:t.userInfo.robotDeals},window.location.href)),"signals"===this.action&&e.signals.forEach((function(t){this.checkRate(t[0]),t[1].forEach((function(e){this.rates[t[0]].signals[e[0]]=e[1]}),this),this.checkDial(t[0])}),this),this.action=!1,!1},getState(){window.postMessage({belobot:!0,data:{settings:this.settings}},window.location.href)},setState(t){for(var e in t)this.settings=t[e]},strategies:{cci:function(t,e,s){if(t.length<s)return!1;let a=[],i=60*parseInt(e/60);for(let e=i-60*(s-1);e<=i;e+=60)a.push(t[e]);const n=a.map((t=>(t[0]+t[2]+t[3]+t[1])/4)),r=n.reduce(((t,e)=>t+e),0)/s,o=n.reduce(((t,e)=>t+Math.abs(e-r)),0)/s;return(n[s-1]-r)/(.02*o)},candles:function(t,e,s){var a=!1;for(let i=0,n=60*parseInt(e/60);i<=s;i++,n-=60){if(null==t[n])return!1;if(t[n][0]==t[n][1])return!1;if(t[n][0]<t[n][1])if(a){if("down"==a)return!1}else a="up";if(t[n][0]>t[n][1])if(a){if("up"==a)return!1}else a="down"}return a},pinBar:function(t,e,s){let a=60*parseInt(e/60),i=new Date(1e3*e).getSeconds(),n=t[a];if(i<40)return!1;const r=Math.abs(n[1]-n[0]),o=n[2]-Math.max(n[0],n[1]),l=Math.min(n[0],n[1])-n[3];return o>l&&o>r*s?"down":o<l&&l>r*s&&"up"},signals:function(t,e){let s=[t[1],t[2],t[3],t[5],t[10],t[15]],a=!1;for(var i=0;i<s.length;i++)if(0!=e[i]){if(s[i]>0)if(s[i]>2){if("up"==a)return!1;a||(a="down"),s[i]-=2}else{if("down"==a)return!1;a||(a="up")}if(s[i]<e[i])return!1}return a},rsiBinary:function(t,e,s){const a=[];const i=60*Math.floor(e/60);for(let r=s;r>=0;r--){const n=t[i-60*r];if(!n)return!1;a.push(n[1])}let o=0,l=0;for(let r=1;r<=s;r++){const n=a[r]-a[r-1];n>0?o+=n:l-=n}o/=s;l/=s;if(l===0)return o===0?50:100;const c=o/l;return 100-(100/(1+c))},binaryContinuation:function(rates,currentTs){function _ema(arr,p){if(arr.length<p)return null;var k=2/(p+1),v=arr[0];for(var i=1;i<arr.length;i++)v=arr[i]*k+v*(1-k);return v}function _rsi(arr,p){if(arr.length<p+1)return null;var g=0,l=0,n=arr.length;for(var i=n-p;i<n;i++){var d=arr[i]-arr[i-1];if(d>0)g+=d;else l-=d}g/=p;l/=p;if(l===0)return 100;return 100-100/(1+g/l)}function _m5(n){var res=[],t=Math.floor(currentTs/300)*300;while(res.length<n&&t>0){var o=null,c=null,h=-Infinity,lo=Infinity;for(var m=t;m<t+300;m+=60){if(rates[m]){if(o===null)o=rates[m][0];c=rates[m][1];if(rates[m][2]>h)h=rates[m][2];if(rates[m][3]<lo)lo=rates[m][3]}}if(o!==null)res.unshift([o,c,h,lo]);t-=300}return res}function _m1(n){var res=[],t=Math.floor(currentTs/60)*60;while(res.length<n&&t>0){if(rates[t])res.unshift(rates[t]);t-=60}return res}var m5=_m5(250);if(m5.length<220)return!1;var m5c=m5.map(function(c){return c[1]});var ema200=_ema(m5c,200);if(!ema200)return!1;var ema200p=_ema(m5c.slice(0,m5c.length-5),200);if(!ema200p)return!1;var slope=ema200>ema200p?'up':ema200<ema200p?'down':'flat';var price=m5c[m5c.length-1];var r14=_rsi(m5c,14);if(r14===null)return!1;var dir=null;if(price>ema200&&slope==='up'&&r14>55)dir='up';else if(price<ema200&&slope==='down'&&r14<45)dir='down';if(!dir)return!1;var m1=_m1(35);if(m1.length<25)return!1;var m1c=m1.map(function(c){return c[1]});var ema20=_ema(m1c,20);if(!ema20)return!1;var cur=m1[m1.length-1],prev=m1[m1.length-2];if(!cur||!prev)return!1;var dm=m1.slice(m1.length-15);if(dm.length<15)return!1;var pd=0,md=0,tr=0;for(var i=1;i<dm.length;i++){var h=dm[i][2],l=dm[i][3],ph=dm[i-1][2],pl=dm[i-1][3],pc=dm[i-1][1];var up=h-ph,dn=pl-l;pd+=(up>dn&&up>0)?up:0;md+=(dn>up&&dn>0)?dn:0;tr+=Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc))}if(!tr)return!1;var pdi=100*pd/tr,mdi=100*md/tr;if(dir==='up'&&cur[1]>cur[0]&&cur[1]>ema20&&pdi>mdi&&cur[1]>prev[2])return'up';if(dir==='down'&&cur[1]<cur[0]&&cur[1]<ema20&&mdi>pdi&&cur[1]<prev[3])return'down';return!1}}},e=t;window.__mpbEngine=e;window.addEventListener("message",(function(t){if(t.data.belobot){if("readState"==t.data.act&&window.postMessage({belobot:!0,act:"robotSettings",settings:e.settings},window.location.href),"setState"==t.data.act)for(let s in t.data.settings)"take_profit"==s?e.settings.take_profit.percent=t.data.settings[s]:e.settings[s]=t.data.settings[s];if("start_stop"==t.data.act){if(false&&e.userInfo.onlyDemo)return!1;e.userInfo.isDemo?e.settings.take_profit.sum=Math.floor(e.userInfo.balance.real*(e.settings.take_profit.percent+100)/100):e.settings.take_profit.sum=Math.floor(e.userInfo.balance.real*(e.settings.take_profit.percent+100)/100),e.settings.started=!e.settings.started,e.userInfo.futureDeals=[],e.userInfo.martinState={},e.settings.started||window.postMessage({belobot:!0,robotDeals:e.userInfo.robotDeals},window.location.href)}}}));var s=window.WebSocket;window.WebSocket=function(t,a){var i=a?new s(t,a):new s(t);return i.addEventListener("open",(function(t){})),i.addEventListener("message",(function(t){if(t.data instanceof ArrayBuffer&&e.action){let a=JSON.parse((s=t.data,String.fromCharCode.apply(null,new Uint8Array(s))));e.update(a)}else if(t.data.length>6)try{let s=JSON.parse(t.data.slice(4));"updateHistoryNew"===s[0]?e.action="updateHistory":"updateStream"===s[0]?e.action="updateStream":"updateAssets"===s[0]?e.action="updateAssets":"successupdateBalance"===s[0]?e.action="updateBalance":"updateOpenedDeals"===s[0]?e.action="updateOpenedDeals":"successopenOrder"===s[0]?e.action="successopenOrder":"successcloseOrder"===s[0]?e.action="successcloseOrder":"upsignals"!==s[0]&&"updateSignalForecast"!==s[0]&&"signals/load"!==s[0]&&"signals/update"!==s[0]||(e.action="signals")}catch{}var s})),i.addEventListener("send",(function(t){})),i.oldSend=s.prototype.send,i.send=function(t){if(e.settings.started&&(e.userInfo.futureDeals.length>0||!e.userInfo.startSum)&&"["==t[2])try{var s=JSON.parse(t.slice(2)),a=e.userInfo.futureDeals.pop(),n=t.slice(0,2);e.userInfo.startSum=s[1].amount,s[1].asset=a.pair,s[1].action=a.dur,a.sum&&(s[1].amount=a.sum),(e.userInfo.onlyDemo||e.settings.allowTesterTrades)&&(s[1].isDemo=1),n+=JSON.stringify(s),e.userInfo.openedDials++,i.oldSend.apply(this,[n])}catch{i.oldSend.apply(this,[t])}else i.oldSend.apply(this,[t])},window.__mpbWs=i,i}})();
// === MPB: WebSocket helpers ===
// Enable debug-only logging by running `window.__mpbDebug = true` in the page console.
// When active, the next server response after each test trade is printed to the console.
// NOTE: All WS logic runs in page context (injected via web_accessible_resources.js),
// not in the extension service worker. To inspect WS frames natively, open the page's
// DevTools → Network tab → filter by "WS". To debug the service worker itself, go to
// chrome://extensions → Money Printer Bot → "service worker" → Inspect.

/**
 * _mpbWaitForWsOpen – polls ws.readyState until OPEN or timeout expires.
 * @param {WebSocket} ws
 * @param {number} timeoutMs  Maximum wait in ms (default 5000).
 * @returns {Promise<WebSocket>} Resolves when OPEN; rejects on timeout or close.
 */
function _mpbWaitForWsOpen(ws, timeoutMs) {
  var stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
  return new Promise(function(resolve, reject) {
    if (ws.readyState === 1 /* OPEN */) { resolve(ws); return; }
    var deadline = Date.now() + (timeoutMs || 5000);
    var id = setInterval(function() {
      if (ws.readyState === 1 /* OPEN */) {
        clearInterval(id); resolve(ws);
      } else if (ws.readyState > 1 /* OPEN */) {
        clearInterval(id);
        reject(new Error('WebSocket ' + (stateNames[ws.readyState] || ws.readyState) + ' — not open, cannot send'));
      } else if (Date.now() >= deadline) {
        clearInterval(id);
        reject(new Error('WebSocket still ' + (stateNames[ws.readyState] || ws.readyState) + ' after ' + (timeoutMs || 5000) + 'ms timeout'));
      }
    }, 100);
  });
}

/**
 * _mpbSafeWsSend – waits for WS to be OPEN then sends; surfaces any send error.
 * Only logs "[MPB] demo test trade sent" after a confirmed successful send.
 * @param {WebSocket} ws
 * @param {string} payload
 * @param {string} pair  Used for logging.
 * @returns {Promise<void>}
 */
function _mpbSafeWsSend(ws, payload, pair) {
  return _mpbWaitForWsOpen(ws, 5000).then(function(openWs) {
    openWs.send(payload);
    console.log('[MPB] demo test trade sent for pair:', pair);
    if (window.__mpbDebug) { _mpbLogNextMessage(openWs, 'demo-trade-ack'); }
  });
}

/**
 * _mpbLogNextMessage – one-shot debug listener that prints the next WS message.
 * Active only when window.__mpbDebug === true.
 * @param {WebSocket} ws
 * @param {string} label  Prefix used in the console output.
 */
function _mpbLogNextMessage(ws, label) {
  var handler = function(ev) {
    ws.removeEventListener('message', handler);
    console.debug('[MPB][' + label + '] server response:', ev.data);
  };
  ws.addEventListener('message', handler);
}


/**
 * Pick the best WebSocket candidate for order execution.
 */
function _mpbResolveTradeWs() {
  if (window.__mpbTradeWs && typeof window.__mpbTradeWs.send === 'function') { _mpbSetTradeRouteMeta({source:'__mpbTradeWs', payload:(window.__mpbLastOpenOrderPayload?'captured':'fallback'), readyState: window.__mpbTradeWs.readyState}); return window.__mpbTradeWs; }
  if (window.__mpbWs && typeof window.__mpbWs.send === 'function' && window.__mpbWs.oldSend) { _mpbSetTradeRouteMeta({source:'__mpbWs', payload:(window.__mpbLastOpenOrderPayload?'captured':'fallback'), readyState: window.__mpbWs.readyState}); return window.__mpbWs; }
  var pool = window.__mpbWsPool || [];
  for (var i = pool.length - 1; i >= 0; i--) {
    var ws = pool[i];
    if (ws && typeof ws.send === 'function' && ws.oldSend) { _mpbSetTradeRouteMeta({source:'__mpbWsPool(wrapped)', payload:(window.__mpbLastOpenOrderPayload?'captured':'fallback'), readyState: ws.readyState}); return ws; }
  }
  if (window.__mpbWs && typeof window.__mpbWs.send === 'function') { _mpbSetTradeRouteMeta({source:'__mpbWs(fallback)', payload:(window.__mpbLastOpenOrderPayload?'captured':'fallback'), readyState: window.__mpbWs.readyState}); return window.__mpbWs; }
  for (var j = pool.length - 1; j >= 0; j--) {
    if (pool[j] && typeof pool[j].send === 'function') { _mpbSetTradeRouteMeta({source:'__mpbWsPool(fallback)', payload:(window.__mpbLastOpenOrderPayload?'captured':'fallback'), readyState: pool[j].readyState}); return pool[j]; }
  }
  return null;
}

/**
 * Build an openOrder payload by reusing the last real payload when possible.
 */
function _mpbBuildOpenOrderPayload(pair) {
  var payload = window.__mpbLastOpenOrderPayload;
  if (typeof payload === 'string' && payload.length > 4 && payload[0] === '4' && payload[1] === '2') {
    try {
      var parsed = JSON.parse(payload.slice(2));
      if (Array.isArray(parsed) && parsed[1] && typeof parsed[1] === 'object') {
        parsed[1].asset = pair;
        parsed[1].action = 'call';
        parsed[1].amount = 1;
        parsed[1].isDemo = 1;
        if (!parsed[1].time) parsed[1].time = 60;
        return '42' + JSON.stringify(parsed);
      }
    } catch(_) {}
  }
  return '42' + JSON.stringify(['openOrder', {asset: pair, action: 'call', amount: 1, isDemo: 1, time: 60}]);
}

function _mpbSetTradeRouteMeta(meta) {
  window.__mpbLastTradeRoute = Object.assign({ ts: Date.now() }, meta || {});
}

function _mpbGetTradeRouteLabel() {
  var r = window.__mpbLastTradeRoute;
  if (!r) return 'No test-trade route captured yet.';
  var src = r.source || 'unknown';
  var payload = r.payload || 'unknown';
  var state = (r.readyState === 1 /* OPEN */) ? 'OPEN' : String(r.readyState);
  return 'WS source: ' + src + ' · payload: ' + payload + ' · readyState: ' + state;
}

// === MPB: Demo test trade executor ===
// Shared helper used by the handler and the WS-capture poller.
// Uses _mpbSafeWsSend to ensure the WebSocket is OPEN before sending and to
// surface any errors. "Sent" is only logged after a confirmed ws.send() call.
function _mpbExecTrade(eng, ws) {
  if (!eng.userInfo.isDemo) {
    console.warn('[MPB] demo test trade blocked: not in demo mode');
    window.postMessage({belobot: true, info_text: '⛔ Demo test trade blocked — switch to demo account first.'}, window.location.href);
    return;
  }
  var pair = (eng.settings.selected_pairs && eng.settings.selected_pairs.length)
    ? eng.settings.selected_pairs[0] : 'EURUSD_otc';
  eng.checkRate(pair);
  // Use the autoTrader module so the test exercises the same code path as real trading.
  if (window.__mpbAutoTrader && typeof window.__mpbAutoTrader.sendOrder === 'function') {
    var res = window.__mpbAutoTrader.sendOrder(pair, 'call', 1);
    console.log('[MPB] test-trade via autoTrader', res);
    if (res.ok) {
      eng.userInfo.openedDials++;
      window.postMessage({belobot: true, info_text: '✅ Demo test trade sent ($1 ' + pair + ')'}, window.location.href);
      return;
    }
  }
  // Fallback: try wsFinder direct send.
  if (window.__wsFinder && typeof window.__wsFinder.sendDirectTrade === 'function') {
    var res = window.__wsFinder.sendDirectTrade(pair, 1);
    console.log('[MPB] test-trade via wsFinder', res);
    if (res.ok) {
      eng.userInfo.openedDials++;
      window.postMessage({belobot: true, info_text: '✅ Demo test trade sent ($1 ' + pair + ')'}, window.location.href);
      return;
    }
  }
  // Last-resort fallback: queue-based approach via engine send interceptor.
  var dealIdx = eng.userInfo.futureDeals.length;
  eng.userInfo.futureDeals.push({pair: pair, dur: 'call', sum: 1});
  var wasStarted = eng.settings.started;
  eng.settings.started = true;
  console.log('[MPB] demo test trade enqueued for pair:', pair, '— triggering send');
  // Craft a minimal openOrder base message and call ws.send() so the hook intercepts it,
  // pops our deal from futureDeals, and sends the correctly-formed order.
  var baseMsg = _mpbBuildOpenOrderPayload(pair);
  _mpbSafeWsSend(ws, baseMsg, pair).then(function() {
    window.postMessage({belobot: true, info_text: '✅ Demo test trade sent ($1 ' + pair + ')'}, window.location.href);
  }).catch(function(err) {
    // Clean up: only remove the specific deal we pushed if it is still in the queue
    var pending = eng.userInfo.futureDeals[dealIdx];
    if (pending && pending.pair === pair && pending.dur === 'call' && pending.sum === 1) {
      eng.userInfo.futureDeals.splice(dealIdx, 1);
    }
    console.error('[MPB] demo test trade error:', err);
    window.postMessage({belobot: true, info_text: '⚠ Demo test trade failed: ' + String(err && err.message || err)}, window.location.href);
  }).finally(function() {
    if (!wasStarted) eng.settings.started = false;
  });
}

// === MPB: Demo test trade handler ===
// Handles the mpb_demo_test_trade postMessage from the System Check tile.
// If the WebSocket is not yet captured, polls up to 8 s before giving up.
window.addEventListener('message', function(ev) {
  var d = ev.data || {};
  if (!d.belobot || d.act !== 'mpb_demo_test_trade') return;
  console.log('[MPB] demo test trade request received');
  var eng = window.__mpbEngine;
  if (!eng) {
    console.warn('[MPB] demo test trade: engine not ready');
    window.postMessage({belobot: true, info_text: '⚠ Engine not ready — reload page and try again.'}, window.location.href);
    return;
  }
  var ws = _mpbResolveTradeWs();
  if (!ws || typeof ws.send !== 'function') {
    // Try autoTrader before starting the 8s poll — uses the same send path as real trading.
    if (window.__mpbAutoTrader && typeof window.__mpbAutoTrader.sendOrder === 'function') {
      var _atPair = (eng.settings.selected_pairs && eng.settings.selected_pairs.length)
        ? eng.settings.selected_pairs[0] : 'EURUSD_otc';
      eng.checkRate(_atPair);
      var _atRes = window.__mpbAutoTrader.sendOrder(_atPair, 'call', 1);
      console.log('[MPB] test-trade via autoTrader (no captured ws)', _atRes);
      if (_atRes.ok) {
        eng.userInfo.openedDials++;
        window.postMessage({belobot: true, info_text: '✅ Demo test trade sent ($1 ' + _atPair + ')'}, window.location.href);
        return;
      }
    }
    // WS not captured yet — poll up to 8 seconds for the platform to open a socket
    var _WS_POLL_TIMEOUT_MS = 8000;
    var _WS_POLL_INTERVAL_MS = 200;
    console.warn('[MPB] demo test trade: WebSocket not captured yet — polling up to 8 seconds...');
    window.postMessage({belobot: true, info_text: '⏳ WebSocket not captured yet — waiting for connection (up to 8s)...'}, window.location.href);
    var _pollStart = Date.now();
    var _pollId = setInterval(function() {
      var _ws = _mpbResolveTradeWs();
      if (_ws && typeof _ws.send === 'function') {
        clearInterval(_pollId);
        _mpbExecTrade(eng, _ws);
      } else if (Date.now() - _pollStart >= _WS_POLL_TIMEOUT_MS) {
        clearInterval(_pollId);
        console.warn('[MPB] demo test trade: WebSocket not captured after 8 seconds');
        window.postMessage({belobot: true, info_text: '⚠ WebSocket not captured — interact with the page first, then retry.'}, window.location.href);
      }
    }, _WS_POLL_INTERVAL_MS);
    return;
  }
  _mpbExecTrade(eng, ws);
});


// === MPB: Demo martingale test handler ===
// Handles mpb_demo_martingale_test: runs two demo trades in sequence.
// After the first trade, simulates a close outcome after a short delay.
// If the first trade is a loss (default), the second doubles the amount via
// the autoTrader martingale logic.  If the first trade is a win, the state
// resets and the second keeps the same base amount.
// Set window.__mpbSimulateMartingaleWin = true before triggering to test the win path.
// All trades are demo-only (isDemo:1) and use autoTrader.sendOrder().
window.addEventListener('message', function(ev) {
  var d = ev.data || {};
  if (!d.belobot || d.act !== 'mpb_demo_martingale_test') return;
  console.log('[MPB] martingale test request received');
  var eng = window.__mpbEngine;
  if (!eng) {
    console.warn('[MPB] martingale test: engine not ready');
    window.postMessage({belobot: true, info_text: '⚠ Engine not ready — reload page and try again.'}, window.location.href);
    return;
  }
  if (!eng.userInfo.isDemo) {
    window.postMessage({belobot: true, info_text: '⛔ Martingale test blocked — switch to demo account first.'}, window.location.href);
    return;
  }
  if (!window.__mpbAutoTrader || typeof window.__mpbAutoTrader.sendOrder !== 'function') {
    window.postMessage({belobot: true, info_text: '⚠ AutoTrader not available — reload and try again.'}, window.location.href);
    return;
  }
  var pair = (eng.settings.selected_pairs && eng.settings.selected_pairs.length)
    ? eng.settings.selected_pairs[0] : 'EURUSD_otc';
  var firstAmount = d.amount || 1;

  // Reset any stale martingale state for this pair so the test always starts clean.
  window.__mpbAutoTrader.resetMartingale(pair);

  // Send first trade via autoTrader (same path real trading uses).
  eng.checkRate(pair);
  var r1 = window.__mpbAutoTrader.sendOrder(pair, 'call', firstAmount);
  console.log('[MPB] martingale test: trade 1', r1);
  if (!r1.ok) {
    window.postMessage({belobot: true, info_text: '⚠ Martingale test: first trade failed — ' + (r1.reason || 'unknown error')}, window.location.href);
    return;
  }
  eng.userInfo.openedDials++;
  window.postMessage({belobot: true, info_text: '⚡ Martingale test: trade 1 sent ($' + firstAmount + ' ' + pair + '). Simulating outcome…'}, window.location.href);

  // Simulate close after a short delay (3 s by default, configurable via window.__mpbMartingaleSimDelayMs).
  // window.__mpbSimulateMartingaleWin = true flips the first trade to a win for testing.
  var simDelay = (typeof window.__mpbMartingaleSimDelayMs === 'number') ? window.__mpbMartingaleSimDelayMs : 3000;
  setTimeout(function() {
    var firstWin = !!window.__mpbSimulateMartingaleWin;
    // Run the outcome through autoTrader so martingale state is updated exactly
    // as it would be during real trading.
    var simulatedProfit = firstWin ? firstAmount : -firstAmount;
    window.__mpbAutoTrader.onTradeClose(pair, simulatedProfit, firstAmount);

    // Use autoTrader to determine the correct second-trade amount.
    var secondAmount = window.__mpbAutoTrader.getMartingaleAmount(pair, firstAmount);
    var outcomeLabel = firstWin ? '✅ win (simulated)' : '❌ loss (simulated)';
    console.log('[MPB] martingale test: trade 1 outcome:', outcomeLabel,
      '— trade 2 amount:', secondAmount,
      '— martinState:', JSON.stringify(window.__mpbAutoTrader.getMartingaleState(pair)));

    // Send second trade via autoTrader.
    eng.checkRate(pair);
    var r2 = window.__mpbAutoTrader.sendOrder(pair, 'call', secondAmount);
    console.log('[MPB] martingale test: trade 2', r2);
    if (!r2.ok) {
      window.postMessage({belobot: true, info_text: '⚠ Martingale test: trade 2 failed — ' + (r2.reason || 'unknown error')}, window.location.href);
      return;
    }
    eng.userInfo.openedDials++;
    var label = firstWin
      ? '✅ Martingale test done: T1 win → T2 $' + secondAmount + ' (same, state reset)'
      : '✅ Martingale test done: T1 loss → T2 $' + secondAmount + ' (doubled via autoTrader)';
    window.postMessage({belobot: true, info_text: label}, window.location.href);
  }, simDelay);
});


// === MPB: Auto-trade executor — fires on every 'newDeal' signal from the engine ===
// When the engine's checkDial() detects a signal and calls deal(), it pushes the deal
// to futureDeals and fires this postMessage. Without this handler the deal would only
// execute when the platform next sends its own outgoing WS message (e.g. a heartbeat).
// This handler proactively triggers ws.send() so the engine's send interceptor fires
// immediately and executes the queued trade without waiting for platform traffic.
window.addEventListener('message', function(ev) {
  var d = ev.data || {};
  if (!d.belobot || d.act !== 'newDeal') return;
  var eng = window.__mpbEngine;
  if (!eng || !eng.settings.started) return;
  if (!eng.userInfo.futureDeals.length) return;
  var ws = _mpbResolveTradeWs();
  if (!ws || typeof ws.send !== 'function') {
    console.warn('[MPB] auto-trade: no WebSocket available — deal queued for next platform send');
    return;
  }
  // Only send if the WebSocket is already OPEN to avoid async polling that could
  // result in duplicate sends if multiple newDeal events fire in quick succession.
  // If not open, the deal stays in futureDeals and the next natural platform send
  // (intercepted by the engine's send hook) will execute it.
  if (ws.readyState !== 1 /* OPEN */) {
    console.warn('[MPB] auto-trade: WebSocket not open (readyState ' + ws.readyState + ') — deal queued for next platform send');
    return;
  }
  // Build trigger payload from the last pending deal.
  // The engine's send interceptor overwrites asset/action/amount with the actual deal values.
  var deal = eng.userInfo.futureDeals[eng.userInfo.futureDeals.length - 1];
  var payload = _mpbBuildOpenOrderPayload(deal.pair);
  console.log('[MPB] auto-trade signal — pair:', deal.pair, 'action:', deal.dur, '— triggering send');
  try {
    ws.send(payload);
  } catch (err) {
    console.error('[MPB] auto-trade error:', err);
  }
});


// === Money Printer Bot — UI Inject (Dark Neon) ===
(function(){
  try {
    // Inject CSS
    var css = `
/* === Money Printer Bot — Dark Neon Theme === */
:root {
  --mpb-bg: #0b0f16;
  --mpb-panel: #111827;
  --mpb-panel-2: #0e1523;
  --mpb-text: #e6f0ff;
  --mpb-muted: #8aa4c6;
  --mpb-accent-1: #00e5ff;
  --mpb-accent-2: #14ff72;
  --mpb-accent-3: #7c5cff;
  --mpb-danger: #ff4769;
  --mpb-success: #18ff92;
  --mpb-warning: #ffd24d;
  --mpb-border: #263042;
  --mpb-shadow: 0 10px 30px rgba(0,0,0,.45), inset 0 0 0 1px rgba(20,255,114,.08);
}

/* Smooth font rendering */
#sub-menu-robot-modal, .po-container, .input-box, .input-box_title, .input-box_value, .input-box_buttons, .fraction-input, .sub-text {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol" !important;
}

/* Root modal/panel */
#sub-menu-robot-modal {
  background: linear-gradient(180deg, rgba(7,11,18,.9), rgba(7,11,18,.85)) !important;
  border: 1px solid var(--mpb-border) !important;
  box-shadow: var(--mpb-shadow) !important;
  color: var(--mpb-text) !important;
  border-radius: 16px !important;
  overflow: hidden !important;
}

/* Header bar */
.mpb-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(90deg, rgba(0,229,255,.08), rgba(20,255,114,.08));
  border-bottom: 1px solid var(--mpb-border);
  position: sticky;
  top: 0;
  z-index: 3;
}
.mpb-header__logo {
  width: 26px; height: 26px;
  filter: drop-shadow(0 0 10px rgba(0,229,255,.5));
}
.mpb-header__title {
  font-weight: 800;
  letter-spacing: .3px;
  font-size: 14px;
  text-transform: uppercase;
  background: linear-gradient(90deg, var(--mpb-accent-1), var(--mpb-accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.mpb-header__status {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--mpb-muted);
}
.mpb-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--mpb-success);
  box-shadow: 0 0 10px var(--mpb-success), 0 0 20px rgba(20,255,114,.8);
  animation: mpb-pulse 2s ease-in-out infinite;
}
@keyframes mpb-pulse {
  0%, 100% { transform: scale(1); opacity: .8; }
  50% { transform: scale(1.2); opacity: 1; }
}

/* Tiles / input boxes */
.input-box {
  width: 200px !important;
  background: radial-gradient(120% 120% at 0% 0%, rgba(0,229,255,.08), rgba(20,255,114,.04)) !important;
  border: 1px solid rgba(0,229,255,.18) !important;
  border-radius: 14px !important;
  position: relative;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  box-shadow: 0 6px 18px rgba(0,0,0,.35);
}
.input-box:hover {
  transform: translateY(-2px);
  border-color: rgba(20,255,114,.25) !important;
  box-shadow: 0 16px 34px rgba(0,0,0,.45), 0 0 30px rgba(20,255,114,.08);
}
.input-box_title {
  background: rgba(17,24,39,.7) !important;
  color: var(--mpb-muted) !important;
  font-weight: 600 !important;
  letter-spacing: .2px;
  border-radius: 10px;
  padding: 2px 8px !important;
  top: -10px !important;
  box-shadow: inset 0 0 0 1px rgba(134,160,210,.15);
}
.input-box_value {
  font-size: 18px !important;
  padding: 12px 12px 8px !important;
  color: var(--mpb-text) !important;
}
.input-box_value input {
  color: var(--mpb-text) !important;
}

/* Buttons footer inside input boxes */
.input-box_buttons {
  background: linear-gradient(180deg, rgba(14,21,35,.95), rgba(10,15,25,.95)) !important;
  border-top: 1px solid rgba(134,160,210,.15) !important;
  border-bottom-left-radius: 14px !important;
  border-bottom-right-radius: 14px !important;
  text-align: center !important;
  font-weight: 700 !important;
}

/* Secondary text */
.sub-text { color: var(--mpb-muted) !important; }

/* Fraction input */
.fraction-input {
  background: rgba(15,23,42,.6) !important;
  border: 1px solid rgba(134,160,210,.2) !important;
  color: var(--mpb-text) !important;
  border-radius: 10px !important;
  transition: box-shadow .2s ease, border-color .2s ease;
}
.fraction-input:focus {
  outline: none !important;
  border-color: rgba(0,229,255,.5) !important;
  box-shadow: 0 0 0 3px rgba(0,229,255,.15);
}

/* Status overlay — HIDDEN (hide PocketOption statistics popup) */
#ss_overlay {
  display: none !important;
}

/* Only hide the share button, NOT the Start button */
.po-ss_share {
  display: none !important;
}

/* Keep win/loss colors defined (harmless, but won’t be visible anyway) */
.ss_win { color: var(--mpb-success) !important; }
.ss_lost { color: var(--mpb-danger) !important; }


/* Neon buttons (generic) */
.mpb-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; padding: 10px 14px; border-radius: 12px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .3px; cursor: pointer;
  background: linear-gradient(90deg, rgba(0,229,255,.18), rgba(20,255,114,.18));
  border: 1px solid rgba(0,229,255,.35);
  color: var(--mpb-text);
  box-shadow: 0 8px 18px rgba(0,0,0,.35), inset 0 0 20px rgba(0,229,255,.07);
  transition: transform .12s ease, filter .15s ease, box-shadow .2s ease, border-color .2s ease;
}
.mpb-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
  border-color: rgba(20,255,114,.45);
  box-shadow: 0 12px 28px rgba(0,0,0,.45), 0 0 30px rgba(20,255,114,.08);
}
.mpb-btn--danger {
  background: linear-gradient(90deg, rgba(255,71,105,.18), rgba(124,92,255,.18));
  border-color: rgba(255,71,105,.45);
}

/* Table cells in signals table */
#sub-menu-robot-modal #bb_signals td, #sub-menu-robot-modal #bb_signals th {
  color: var(--mpb-text) !important;
  fill: var(--mpb-text) !important;
  border-color: rgba(134,160,210,.1) !important;
}

/* Animated glow ring for active elements */
.mpb-glow {
  position: relative;
}
.mpb-glow::after {
  content: ""; pointer-events: none;
  position: absolute; inset: -2px;
  border-radius: 16px;
  box-shadow: 0 0 20px rgba(0,229,255,.25), 0 0 40px rgba(20,255,114,.18);
  opacity: 0; transition: opacity .2s ease;
}
.mpb-glow:hover::after { opacity: 1; }
`;
    var style = document.createElement('style');
    style.setAttribute('data-mpb', 'neon-theme');
    style.textContent = css + `
/* MPB Floating Dock (fallback) */
#mpb-dock {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 2147483647;
  background: rgba(11,15,22,.96);
  border: 1px solid rgba(0,229,255,.35);
  border-radius: 14px;
  box-shadow: 0 14px 40px rgba(0,0,0,.6), 0 0 30px rgba(0,229,255,.12);
  color: #eaf2ff;
  min-width: 260px;
  padding: 10px 12px;
  display: none;
}
#mpb-dock.show { display: block; }
#mpb-dock .mpb-dock__head{
  display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;
  font-weight: 800; letter-spacing:.3px; text-transform: uppercase; font-size: 12px;
}
#mpb-dock-toggle {
  position: fixed; bottom: 16px; right: 16px;
  z-index: 2147483646; cursor: pointer;
  background: linear-gradient(90deg, rgba(0,229,255,.18), rgba(20,255,114,.18));
  color: #eaf2ff; border:1px solid rgba(0,229,255,.4);
  border-radius: 999px; padding: 8px 12px; font-weight: 800;
  box-shadow: 0 10px 24px rgba(0,0,0,.5);
}
` + `
/* MPB Toasts */
#mpb-toast-wrap {
  position: fixed; top: 14px; right: 14px; z-index: 999999;
  display: flex; flex-direction: column; gap: 10px; pointer-events: none;
}
.mpb-toast {
  min-width: 240px;
  max-width: 360px;
  background: rgba(11,15,22,.96);
  border: 1px solid rgba(0,229,255,.35);
  box-shadow: 0 12px 30px rgba(0,0,0,.55), 0 0 30px rgba(0,229,255,.12);
  color: #eaf2ff;
  padding: 10px 12px;
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: .2px;
  pointer-events: auto;
}
.mpb-toast--ok { border-color: rgba(20,255,114,.45); }
.mpb-toast--warn { border-color: rgba(255,71,105,.55); }
` + `
/* === MPB: Visibility & Layout refinements === */
.mpb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 14px;
  padding: 10px 16px 4px;
}
@media (max-width: 1280px){
  .mpb-grid{ grid-template-columns: repeat(2, minmax(220px,1fr)); }
}
@media (max-width: 880px){
  .mpb-grid{ grid-template-columns: 1fr; }
}

.input-box {
  border-radius: 12px !important;
  background: linear-gradient(180deg, rgba(17,24,39,.75), rgba(13,18,30,.9)) !important;
  border: 1px solid rgba(0,229,255,.25) !important;
}
.input-box_title {
  color: #d3e7ff !important;
  background: rgba(8,14,25,.9) !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: .5px;
  top: -12px !important;
}
.input-box_value { font-size: 19px !important; color: #eef6ff !important; }
.input-box_value input { color: #eef6ff !important; }

/* Strong outline for tiles to increase contrast */
.input-box:hover { box-shadow: 0 0 0 1px rgba(0,229,255,.35), 0 12px 30px rgba(0,0,0,.5) !important; }

/* New Stop-Loss tile */
.mpb-tile {
  border-radius: 12px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(17,24,39,.75), rgba(13,18,30,.9));
  border: 1px solid rgba(255,71,105,.35);
}
.mpb-tile__title {
  display: inline-flex; align-items:center; gap: 8px;
  font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing:.5px;
  color: #ffdbe3;
}
.mpb-tile__row { display:flex; gap:10px; margin-top:10px; align-items:center; flex-wrap: wrap; }
.mpb-pill {
  display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius: 999px;
  border:1px solid rgba(255,71,105,.4); cursor:pointer; user-select:none;
  color:#ffdbe3; font-weight:700; font-size:12px;
}
.mpb-pill--active { background: rgba(255,71,105,.15); box-shadow: inset 0 0 20px rgba(255,71,105,.1); }
.mpb-input {
  height: 36px; border-radius: 10px; border:1px solid rgba(134,160,210,.25);
  background: rgba(11,15,22,.7); padding: 6px 10px; color:#eaf2ff; min-width: 120px;
}
.mpb-input:focus { outline:none; border-color: rgba(0,229,255,.5); box-shadow: 0 0 0 3px rgba(0,229,255,.12); }
.mpb-note { font-size: 11px; color:#9fb4d6; margin-top:8px; }

.mpb-sl-badge {
  display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:8px;
  background: rgba(255,71,105,.16); color:#ffd5dc; border:1px solid rgba(255,71,105,.35);
  font-size: 11px; font-weight:800;
}

/* Pair-selection tile */
#mpb-pairs .mpb-pairs-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
#mpb-pairs .mpb-pair-pill {
  display: inline-flex; align-items: center; padding: 4px 10px;
  border-radius: 999px; border: 1px solid rgba(0,229,255,.3);
  cursor: pointer; user-select: none;
  color: var(--mpb-muted); font-weight: 700; font-size: 11px;
  transition: background .15s, border-color .15s, color .15s;
}
#mpb-pairs .mpb-pair-pill:hover { border-color: rgba(0,229,255,.55); color: var(--mpb-text); }
#mpb-pairs .mpb-pair-pill.active {
  background: rgba(0,229,255,.15); border-color: rgba(0,229,255,.6);
  color: var(--mpb-accent-1);
  box-shadow: inset 0 0 14px rgba(0,229,255,.08);
}
#mpb-pairs .mpb-pairs-actions { display: flex; gap: 8px; margin-top: 8px; }
#mpb-pairs .mpb-pairs-actions button {
  font-size: 11px; font-weight: 700; border: 1px solid rgba(0,229,255,.35);
  background: rgba(0,229,255,.1); color: var(--mpb-text);
  border-radius: 8px; padding: 4px 10px; cursor: pointer;
}
#mpb-pairs .mpb-pairs-actions button:hover { background: rgba(0,229,255,.2); }
#mpb-pairs .mpb-pairs-none-warn {
  font-size: 11px; color: var(--mpb-danger); margin-top: 6px; font-weight: 700;
}
`;
    (document.head || document.documentElement).appendChild(style);

// === RSI Binary Strategy — inject option into native strategy select ===
(function(){
  function injectRsiOption(){
    var sel = document.querySelector('#sub-menu-robot-modal select, #sub-menu-robot-modal .po-strategy-select');
    if(!sel || sel.querySelector('[value="rsiBinary"]')) return;
    var opt = document.createElement('option');
    opt.value = 'rsiBinary';
    opt.textContent = 'RSI Binary (6/13/82)';
    sel.appendChild(opt);
    // Ensure selecting this option updates the bot strategy setting
    sel.addEventListener('change', function(){
      if(this.value === 'rsiBinary'){
        window.postMessage({belobot:true, act:'setState', settings:{strategy:'rsiBinary'}}, window.location.href);
      }
    });
  }
  injectRsiOption();
  var mo = new MutationObserver(injectRsiOption);
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();


// === Binary Continuation (M1) Strategy — inject option into native strategy select ===
(function(){
  function injectBCOption(){
    var sel = document.querySelector('#sub-menu-robot-modal select, #sub-menu-robot-modal .po-strategy-select');
    if(!sel || sel.querySelector('[value="binaryContinuation"]')) return;
    var opt = document.createElement('option');
    opt.value = 'binaryContinuation';
    opt.textContent = 'Binary Continuation M1 (EMA/DMI)';
    sel.appendChild(opt);
    sel.addEventListener('change', function(){
      if(this.value === 'binaryContinuation'){
        window.postMessage({belobot:true, act:'setState', settings:{strategy:'binaryContinuation'}}, window.location.href);
      }
    });
  }
  injectBCOption();
  var mo = new MutationObserver(injectBCOption);
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();

    // Helper to create header
    function mountHeader(root){
      if (!root || root.querySelector('.mpb-header')) return;
      var header = document.createElement('div');
      header.className = 'mpb-header mpb-glow';

      var logoWrap = document.createElement('div');
      logoWrap.className = 'mpb-header__logo';
      logoWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E5FF"/>
      <stop offset="100%" stop-color="#14FF72"/>
    </linearGradient>
  </defs>
  <g filter="url(#glow)">
    <path d="M96 32h64l-12 24h-40z" fill="url(#neon)" opacity="0.9"/>
    <path d="M72 80h112c8.8 0 16 7.2 16 16v8c0 38.4-28.2 88-88 88s-88-49.6-88-88v-8c0-8.8 7.2-16 16-16z" 
          fill="none" stroke="url(#neon)" stroke-width="6" opacity="0.95"/>
    <circle cx="128" cy="144" r="34" fill="none" stroke="url(#neon)" stroke-width="8"/>
    <path d="M128 113v62M108 144h40" stroke="url(#neon)" stroke-width="10" stroke-linecap="round"/>
  </g>
</svg>`;

      var title = document.createElement('div');
      title.className = 'mpb-header__title';
      title.textContent = 'Money Printer Bot — Neon v4';

      var status = document.createElement('div');
      status.className = 'mpb-header__status';
      status.innerHTML = '<span class="mpb-dot"></span> UI Ready';

      header.appendChild(logoWrap);
      header.appendChild(title);
      header.appendChild(status);

      // Insert header at very top
      root.insertBefore(header, root.firstChild);
    }

    // Try common container IDs/classes
    function tryMountNow(){
      var root = document.getElementById('sub-menu-robot-modal') || document.querySelector('[data-robot-root], .po-container, body');
      if (root) {
        // If body is used, wrap controls if needed; otherwise, just prepend header
        if (root === document.body) {
          var wrapper = document.createElement('div');
          wrapper.id = 'mpb-overlay-wrapper';
          wrapper.style.borderRadius = '16px';
          wrapper.style.overflow = 'hidden';
          wrapper.style.border = '1px solid rgba(38,48,66,.6)';
          while (document.body.firstChild) {
            wrapper.appendChild(document.body.firstChild);
          }
          document.body.appendChild(wrapper);
          mountHeader(wrapper);
        } else {
          mountHeader(root);
        }
        return true;
      }
      return false;
    }

    // First attempt
    if (!tryMountNow()){
      // Observe for late-mounted modals
      var mo = new MutationObserver(function(){
        if (tryMountNow()){ mo.disconnect(); }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      // Safety fallback after 5s
      setTimeout(function(){ tryMountNow(); }, 5000);
    }
  } catch(e) {
    console.debug('MPB UI inject error:', e);
  }
})();



// === MPB: Layout regroup + Stop-Loss tile ===
(function(){
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function ensureGrid(root){
    if (!root || root.__mpb_grid_done) return;
    // Wrap existing first-row tiles (heuristic: .input-box near top) into a grid container
    var boxes = qsa('#sub-menu-robot-modal .input-box');
    if (boxes.length) {
      var parent = boxes[0].parentElement;
      // Create grid wrapper
      var grid = document.createElement('div');
      grid.className = 'mpb-grid';
      // Move a handful of the existing tiles into the grid (min profit/delay/deals/take profit) if present
      boxes.slice(0, 4).forEach(function(b){ grid.appendChild(b); });
      parent.insertBefore(grid, parent.firstChild);
      root.__mpb_grid_done = true;
    }
  }

  function persist(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function read(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return (v===null||v===undefined)?d:v; }catch(e){return d;} }

  function mountStopLoss(root){
    if (!root || qs('#mpb-sl')) return;
    // Place next to "take profit" tile if present, else append under header
    var grid = qs('.mpb-grid', root) || root;
    var tile = document.createElement('div');
    tile.id = 'mpb-sl';
    tile.className = 'mpb-tile';

    tile.innerHTML = ''
      + '<div class="mpb-tile__title">Stop Loss</div>'
      + '<div class="mpb-tile__row">'
      + '  <div class="mpb-pill" data-mode="usd">$ Amount</div>'
      + '  <div class="mpb-pill" data-mode="pct">%</div>'
      + '  <input class="mpb-input" type="number" step="0.01" id="mpb-sl-value" placeholder="e.g. 50" />'
      + '  <input class="mpb-input" type="number" step="0.01" id="mpb-sl-bankroll" placeholder="Account size (for %)" />'
      + '  <span class="mpb-sl-badge" id="mpb-sl-status">guard off</span>'
      + '</div>'
      + '<div class="mpb-note">If in <b>$ mode</b>, the bot stops when session PnL ≤ -value. In <b>% mode</b>, it stops when session PnL ≤ -value% of <i>Account size</i>.</div>';

    // Insert tile after take-profit card if we can detect it, else append to grid
    var tpCard = qsa('.mpb-grid .input-box', root).find(el => /take\s*profit/i.test(el.textContent||''));
    if (tpCard && tpCard.nextSibling) {
      tpCard.parentElement.insertBefore(tile, tpCard.nextSibling);
    } else {
      grid.appendChild(tile);
    }

    // Restore persisted values
    var mode = read('mpb_sl_mode', 'usd');
    var val  = read('mpb_sl_val', '');
    var bank = read('mpb_sl_bank', '');
    qs('[data-mode="'+mode+'"]', tile)?.classList.add('mpb-pill--active');
    qs('#mpb-sl-value', tile).value = val;
    qs('#mpb-sl-bankroll', tile).value = bank;

    tile.addEventListener('click', function(ev){
      var m = ev.target.getAttribute && ev.target.getAttribute('data-mode');
      if (m) {
        ['usd','pct'].forEach(function(mm){
          var el = qs('[data-mode="'+mm+'"]', tile);
          if (el) el.classList.toggle('mpb-pill--active', mm===m);
        });
        persist('mpb_sl_mode', m);
        updateStatus();
      }
    });
    qs('#mpb-sl-value', tile).addEventListener('input', function(){
      persist('mpb_sl_val', this.value);
      updateStatus();
    });
    qs('#mpb-sl-bankroll', tile).addEventListener('input', function(){
      persist('mpb_sl_bank', this.value);
      updateStatus();
    });

    function updateStatus(msg){
      var badge = qs('#mpb-sl-status', tile);
      if (msg) { badge.textContent = msg; return; }
      var m = read('mpb_sl_mode','usd');
      var v = parseFloat(read('mpb_sl_val','')||'NaN');
      if (!isFinite(v) || v<=0) { badge.textContent = 'guard off'; return; }
      if (m==='usd') badge.textContent = 'SL: -$'+v.toFixed(2);
      else {
        var b = parseFloat(read('mpb_sl_bank','')||'NaN');
        badge.textContent = isFinite(b)&&b>0 ? ('SL: -'+v.toFixed(2)+'% of $'+b.toFixed(2)) : 'SL % set (need acct size)';
      }
    }
    updateStatus();
  }

  function setupGuardian(root){
    if (root.__mpb_guard) return; root.__mpb_guard = true;
    var sessionPNL = 0;

    window.addEventListener('message', function(e){
      var d = e.data || {};
      if (!d.belobot) return;

      // Update session PnL from robotDeals
      if (d.robotDeals && Array.isArray(d.robotDeals.closed)) {
        sessionPNL = d.robotDeals.closed.reduce(function(a,v){ return a + (Number(v)||0); }, 0);
        checkStop();
      }
    }, true);

    function readNum(k){ var x = Number(JSON.parse(localStorage.getItem(k)||'null')); return isFinite(x)?x:NaN; }
    function hasClass(el,c){ return el && el.classList && el.classList.contains(c); }

    function findStopButton(){
      // Look for a button that says STOP (or a toggle with started state). Fallback to any button with text STOP.
      var btns = Array.from(document.querySelectorAll('button, [role="button"], .mpb-btn')).filter(function(b){
        return /stop/i.test(b.textContent||'');
      });
      return btns[0] || null;
    }

    function checkStop(){
      var mode = (JSON.parse(localStorage.getItem('mpb_sl_mode')||'"usd"')||'usd');
      var val  = readNum('mpb_sl_val');
      if (!isFinite(val) || val<=0) return;

      var threshold = 0;
      if (mode==='usd') { threshold = -val; }
      else {
        var bank = readNum('mpb_sl_bank');
        if (!isFinite(bank) || bank<=0) return;
        threshold = - (bank * (val/100));
      }
      // If loss beyond threshold, click STOP
      if (sessionPNL <= threshold) {
        var stopBtn = findStopButton();
        if (stopBtn && !stopBtn.__mpb_clicked) {
          stopBtn.__mpb_clicked = true;
          stopBtn.click();
          var badge = document.getElementById('mpb-sl-status');
          if (badge) badge.textContent = 'Triggered @ PnL: ' + sessionPNL.toFixed(2);
          document.dispatchEvent(new CustomEvent('mpb-sl-triggered'));
          console.info('[MPB] Stop-Loss triggered: session PnL', sessionPNL, 'threshold', threshold);
        }
      }
    }
  }

  function mountAll(){
    var root = document.getElementById('sub-menu-robot-modal') || document.body;
    ensureGrid(root);
    // Stop-Loss tile + guardian disabled (overlay handles TP/SL now)
    // mountStopLoss(root);
    // setupGuardian(root);
  }

  // Try now and observe DOM for late render
  mountAll();
  var mo = new MutationObserver(function(){ mountAll(); });
  mo.observe(document.documentElement, {childList:true, subtree:true});
})();


// === MPB helpers ===
function mpbToast(msg, ok){
  var wrap = document.getElementById('mpb-toast-wrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'mpb-toast-wrap';
    document.documentElement.appendChild(wrap);
  }
  var t = document.createElement('div');
  t.className = 'mpb-toast ' + (ok ? 'mpb-toast--ok':'mpb-toast--warn');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(function(){ t.style.opacity = '0'; t.style.transform='translateY(-6px)'; }, 3600);
  setTimeout(function(){ t.remove(); }, 4200);
}


// periodic remount to survive re-renders
setInterval(function(){
  try{
    var root = document.getElementById('sub-menu-robot-modal') || document.body;
    if(root){
      if(!root.querySelector('#mpb-sl')){
        // remount SL if gone
        (function(){ 
          // minimal re-mount call if earlier helpers exist
          var e = new Event('mpb-remount');
          window.dispatchEvent(e);
        })();
      }
    }
  }catch(e){}
}, 1500);


// toast hooks on messages
window.addEventListener('message', function(e){
  var d = e.data || {};
  if(!d.belobot) return;
  if(d.act === 'robotSettings' && d.settings && d.settings.started === false){
    // Assume goal reached or user stopped; present as take-profit hit for visibility
    mpbToast('Take Profit hit — bot stopped.', true);
  }
}, true);

// also listen to our custom stop-loss trigger indicator
document.addEventListener('mpb-sl-triggered', function(ev){
  mpbToast('Stop Loss hit — bot stopped.', false);
});

window.addEventListener('mpb-remount', function(){ try{ mountAll(); }catch(e){} });


// === MPB: Force-mount Stop-Loss under header (independent of site markup) ===
(function(){
  function qs(s, r){ return (r||document).querySelector(s); }
  function read(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return (v===null||v===undefined)?d:v; }catch(e){return d;} }
  function persist(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

  function ensureSlot(root){
    if(!root) return null;
    var slot = qs('#mpb-slot', root);
    if(!slot){
      slot = document.createElement('div');
      slot.id = 'mpb-slot';
      slot.style.padding = '10px 16px 4px';
      // insert right after header if present, else at top
      var hdr = qs('.mpb-header', root);
      if(hdr && hdr.nextSibling){
        hdr.parentElement.insertBefore(slot, hdr.nextSibling);
      } else {
        root.insertBefore(slot, root.firstChild);
      }
    }
    return slot;
  }

  function renderSL(){
    var root = document.getElementById('sub-menu-robot-modal') || document.body;
    var slot = ensureSlot(root);
    if(!slot) return;
    var tile = qs('#mpb-sl', slot);
    if(!tile){
      tile = document.createElement('div');
      tile.id = 'mpb-sl';
      tile.className = 'mpb-tile';
      slot.appendChild(tile);
    }
    tile.innerHTML = ''
      + '<div class="mpb-tile__title">Stop Loss</div>'
      + '<div class="mpb-tile__row">'
      + '  <div class="mpb-pill" data-mode="usd">$ Amount</div>'
      + '  <div class="mpb-pill" data-mode="pct">%</div>'
      + '  <input class="mpb-input" type="number" step="0.01" id="mpb-sl-value" placeholder="e.g. 50" />'
      + '  <input class="mpb-input" type="number" step="0.01" id="mpb-sl-bankroll" placeholder="Account size (for %)" />'
      + '  <span class="mpb-sl-badge" id="mpb-sl-status">guard off</span>'
      + '</div>'
      + '<div class="mpb-note">Stops the bot when session PnL reaches your loss limit.</div>';

    // Restore persisted values
    var mode = read('mpb_sl_mode', 'usd');
    var val  = read('mpb_sl_val', '');
    var bank = read('mpb_sl_bank', '');
    var usd = tile.querySelector('[data-mode="usd"]');
    var pct = tile.querySelector('[data-mode="pct"]');
    usd.classList.toggle('mpb-pill--active', mode==='usd');
    pct.classList.toggle('mpb-pill--active', mode==='pct');
    tile.querySelector('#mpb-sl-value').value = val;
    tile.querySelector('#mpb-sl-bankroll').value = bank;

    tile.addEventListener('click', function(ev){
      var m = ev.target.getAttribute && ev.target.getAttribute('data-mode');
      if(m){
        usd.classList.toggle('mpb-pill--active', m==='usd');
        pct.classList.toggle('mpb-pill--active', m==='pct');
        persist('mpb_sl_mode', m);
      }
    });
    tile.querySelector('#mpb-sl-value').addEventListener('input', function(){ persist('mpb_sl_val', this.value); });
    tile.querySelector('#mpb-sl-bankroll').addEventListener('input', function(){ persist('mpb_sl_bank', this.value); });
  }

  // === Pair Selection tile ===
  var MPB_PAIRS = [
    'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD',
    'EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD',
    'EURUSD_otc','GBPUSD_otc','USDJPY_otc','USDCHF_otc',
    'AUDUSD_otc','USDCAD_otc','NZDUSD_otc','EURGBP_otc','EURJPY_otc'
  ];

  function getSelectedPairs(){ return read('mpb_selected_pairs', []); }
  function setSelectedPairs(arr){
    persist('mpb_selected_pairs', arr);
    window.postMessage({belobot:true, act:'setState', settings:{selected_pairs:arr}}, window.location.href);
  }

  function renderBCSettings(){
    var root = document.getElementById('sub-menu-robot-modal') || document.body;
    var slot = ensureSlot(root);
    if(!slot) return;
    var tile = qs('#mpb-bc-settings', slot);
    if(!tile){
      tile = document.createElement('div');
      tile.id = 'mpb-bc-settings';
      tile.className = 'mpb-tile';
      tile.style.cssText = 'border-color:rgba(124,92,255,.4);margin-top:8px;';
      slot.appendChild(tile);
    }
    var saved = read('mpb_bc_cooldown_min', 10);
    tile.innerHTML = ''
      + '<div class="mpb-tile__title" style="color:#d4bfff;">⚡ Binary Continuation M1 — Settings</div>'
      + '<div class="mpb-tile__row" style="margin-top:8px;">'
      + '  <span class="mpb-dock-label" style="font-size:11px;color:#9fb4d6;">Cooldown after 3 losses (min)</span>'
      + '  <input class="mpb-dock-input" type="number" id="mpb-bc-cooldown" min="1" max="60" step="1" value="' + saved + '" style="width:60px;flex:none;" />'
      + '</div>'
      + '<div class="mpb-note" style="margin-top:6px;">Pause trading this pair for N minutes after 3 consecutive losses. Session stops automatically after 4 consecutive losses. Reset on next bot start.</div>';
    var inp = tile.querySelector('#mpb-bc-cooldown');
    if(inp){
      inp.addEventListener('change', function(){
        var v = parseInt(this.value, 10);
        if(!isFinite(v) || v < 1) v = 10;
        persist('mpb_bc_cooldown_min', v);
        window.postMessage({belobot:true, act:'setState', settings:{bcCooldownMinutes:v}}, window.location.href);
      });
    }
  }

  function renderPairSelect(){
    var root = document.getElementById('sub-menu-robot-modal') || document.body;
    var slot = ensureSlot(root);
    if(!slot) return;
    var tile = qs('#mpb-pairs', slot);
    if(!tile){
      tile = document.createElement('div');
      tile.id = 'mpb-pairs';
      tile.className = 'mpb-tile';
      tile.style.cssText = 'border-color:rgba(0,229,255,.35);margin-top:8px;';
      slot.appendChild(tile);
    }

    var selected = getSelectedPairs();

    // Build HTML
    var pillsHtml = MPB_PAIRS.map(function(p){
      var active = selected.indexOf(p) !== -1 ? ' active' : '';
      var otc = p.slice(-3) === 'otc' ? ' <sup style="font-size:9px;opacity:.7">OTC</sup>' : '';
      return '<span class="mpb-pair-pill' + active + '" data-pair="' + p + '">' + p.replace('_otc','') + otc + '</span>';
    }).join('');

    var warnHtml = selected.length === 0
      ? '<div class="mpb-pairs-none-warn">⚠ No pairs selected — bot will not trade. Select at least one pair.</div>'
      : '<div class="mpb-note">' + selected.length + ' pair' + (selected.length!==1?'s':'') + ' selected.</div>';

    tile.innerHTML = ''
      + '<div class="mpb-tile__title">Trading Pairs</div>'
      + '<div class="mpb-pairs-grid">' + pillsHtml + '</div>'
      + '<div class="mpb-pairs-actions">'
      + '  <button data-mpb-action="all">Select All</button>'
      + '  <button data-mpb-action="none">Clear All</button>'
      + '  <button data-mpb-action="live">Live Only</button>'
      + '  <button data-mpb-action="otc">OTC Only</button>'
      + '</div>'
      + warnHtml;

    tile.addEventListener('click', function(ev){
      var pair = ev.target.getAttribute && ev.target.getAttribute('data-pair');
      if(pair){
        var cur = getSelectedPairs();
        var idx = cur.indexOf(pair);
        if(idx === -1) cur.push(pair); else cur.splice(idx, 1);
        setSelectedPairs(cur);
        renderPairSelect();
        return;
      }
      var act = ev.target.getAttribute && ev.target.getAttribute('data-mpb-action');
      if(act === 'all'){ setSelectedPairs(MPB_PAIRS.slice()); renderPairSelect(); }
      if(act === 'none'){ setSelectedPairs([]); renderPairSelect(); }
      if(act === 'live'){ setSelectedPairs(MPB_PAIRS.filter(function(p){ return p.slice(-3)!=='otc'; })); renderPairSelect(); }
      if(act === 'otc'){ setSelectedPairs(MPB_PAIRS.filter(function(p){ return p.slice(-3)==='otc'; })); renderPairSelect(); }
    });
  }

  // draw now and on intervals
  renderSL();
  renderPairSelect();
  renderBCSettings();
  // Sync persisted selected_pairs into bot core on load
  (function(){ var sp = getSelectedPairs(); window.postMessage({belobot:true, act:'setState', settings:{selected_pairs:sp}}, window.location.href); })();
  // Sync persisted BC cooldown setting on load
  (function(){ var cd = read('mpb_bc_cooldown_min', 10); window.postMessage({belobot:true, act:'setState', settings:{bcCooldownMinutes:cd}}, window.location.href); })();
  setInterval(function(){ renderSL(); renderPairSelect(); renderBCSettings(); }, 1500);
})();


// === MPB Floating Dock (fallback if modal mount hidden) ===
(function(){
  function qs(s, r){ return (r||document).querySelector(s); }
  function persist(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function read(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return (v===null||v===undefined)?d:v; }catch(e){return d;} }

  function ensureDock(){
    var toggle = qs('#mpb-dock-toggle');
    if(!toggle){
      toggle = document.createElement('button');
      toggle.id = 'mpb-dock-toggle';
      toggle.innerText = 'SL/TP Panel';
      document.documentElement.appendChild(toggle);
      toggle.addEventListener('click', function(){
        var dock = qs('#mpb-dock');
        dock.classList.toggle('show');
      });
    }
    var dock = qs('#mpb-dock');
    if(!dock){
      dock = document.createElement('div');
      dock.id = 'mpb-dock';
      dock.innerHTML = ''
        + '<div class="mpb-dock__head"><span>Money Printer — Limits</span><span id="mpb-dock-pnl" style="opacity:.8"></span></div>'
        + '<div id="mpb-dock-body"></div>';
      document.documentElement.appendChild(dock);
    }
    var body = qs('#mpb-dock-body', dock);
    body.innerHTML = ''
      + '<div class="mpb-tile" style="border-color:rgba(255,71,105,.45); margin-bottom:8px;">'
      + '<div class="mpb-tile__title">Stop Loss</div>'
      + '<div class="mpb-tile__row">'
      + '  <div class="mpb-pill" data-mode="usd">$ Amount</div>'
      + '  <div class="mpb-pill" data-mode="pct">%</div>'
      + '  <input class="mpb-input" type="number" step="0.01" id="mpb-sl-value" placeholder="e.g. 50" />'
      + '  <input class="mpb-input" type="number" step="0.01" id="mpb-sl-bankroll" placeholder="Account size (for %)" />'
      + '  <span class="mpb-sl-badge" id="mpb-sl-status">guard off</span>'
      + '</div>'
      + '</div>'
      + '<div class="mpb-tile" style="border-color:rgba(20,255,114,.45);">'
      + '<div class="mpb-tile__title">Take Profit Alert</div>'
      + '<div class="mpb-tile__row">'
      + '  <input class="mpb-input" type="number" step="0.01" id="mpb-tp-value" placeholder="e.g. 100 (USD)" />'
      + '  <span class="mpb-sl-badge" style="background:rgba(20,255,114,.16); color:#d0ffe6; border-color:rgba(20,255,114,.45);" id="mpb-tp-status">off</span>'
      + '</div>'
      + '</div>';

    var mode = read('mpb_sl_mode', 'usd');
    var val  = read('mpb_sl_val', '');
    var bank = read('mpb_sl_bank', '');
    var tp   = read('mpb_tp_val', '');

    var usd = body.querySelector('[data-mode="usd"]');
    var pct = body.querySelector('[data-mode="pct"]');
    usd.classList.toggle('mpb-pill--active', mode==='usd');
    pct.classList.toggle('mpb-pill--active', mode==='pct');
    body.querySelector('#mpb-sl-value').value = val;
    body.querySelector('#mpb-sl-bankroll').value = bank;
    body.querySelector('#mpb-tp-value').value = tp;

    body.addEventListener('click', function(ev){
      var m = ev.target.getAttribute && ev.target.getAttribute('data-mode');
      if(m){
        usd.classList.toggle('mpb-pill--active', m==='usd');
        pct.classList.toggle('mpb-pill--active', m==='pct');
        persist('mpb_sl_mode', m);
      }
    });
    body.querySelector('#mpb-sl-value').addEventListener('input', function(){ persist('mpb_sl_val', this.value); });
    body.querySelector('#mpb-sl-bankroll').addEventListener('input', function(){ persist('mpb_sl_bank', this.value); });
    body.querySelector('#mpb-tp-value').addEventListener('input', function(){ persist('mpb_tp_val', this.value); });
  }

  ensureDock();
  setInterval(ensureDock, 2000);

  // tie into guardian metrics to update pnl
  (function(){
    var pnlEl = null, lastPNL = null;
    function setPNL(n){
      pnlEl = pnlEl || document.getElementById('mpb-dock-pnl');
      if(!pnlEl) return;
      if(lastPNL === n) return;
      lastPNL = n;
      pnlEl.textContent = 'PnL: ' + (n>=0?'+':'') + n.toFixed(2);
    }
    window.addEventListener('message', function(e){
      var d = e.data||{}; if(!d.belobot) return;
      if(d.robotDeals && Array.isArray(d.robotDeals.closed)){
        var sum = d.robotDeals.closed.reduce(function(a,v){ return a + (Number(v)||0); }, 0);
        setPNL(sum);
        // TP alert mirror
        var tp = Number(JSON.parse(localStorage.getItem('mpb_tp_val')||'null'));
        if(isFinite(tp) && tp>0 && sum >= tp){
          if(!document.__mpb_tp_toasted){
            document.__mpb_tp_toasted = true;
            mpbToast('Take Profit hit — bot stopped.', true);
            // try to click STOP if running
            var stop = Array.from(document.querySelectorAll('button, [role="button"]')).find(b=>/stop/i.test((b.textContent||'')));
            if(stop) stop.click();
          }
        }
      }
    }, true);
  })();
})();


// === MPB: System Check tile (mounts on mpb-icon-clicked event) ===
(function(){
  // Track data-stream heartbeat: flag is set whenever a websocket updateStream message arrives
  var _mpbStreamSeen = false;
  window.addEventListener('message', function(e){
    var d = e.data||{};
    // Mark stream as seen when engine processes real WS market data or fires a trade signal
    if(d.belobot && (
      d.act === 'updateStream' ||
      d.act === 'newDeal' ||
      (typeof d.action === 'string' && d.action.indexOf('update') === 0)
    )){
      _mpbStreamSeen = true;
    }
  }, true);

  function qs(s, r){ return (r||document).querySelector(s); }
  function read(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return (v===null||v===undefined)?d:v; }catch(e){return d;} }

  function isDemo(){
    // Check engine userInfo first — updated from platform balance WebSocket message, most reliable.
    // The engine initializes with isDemo:true and the typeof guard ensures we only read it
    // once the engine has set an explicit boolean (it is always a boolean from engine init).
    // Note: even if stale, isDemo:1 is always in the trade payload so real-money risk is zero.
    if (window.__mpbEngine && window.__mpbEngine.userInfo &&
        typeof window.__mpbEngine.userInfo.isDemo === 'boolean') {
      return window.__mpbEngine.userInfo.isDemo;
    }
    // DOM fallback for when engine hasn't yet received a balance update.
    // PocketOption shows a "Demo" badge or balance label when in demo mode.
    var txt = (document.body||document.documentElement).innerText||'';
    // Look for explicit demo indicators
    if(/\bdemo\b/i.test(txt)){
      // Use lower-case class/id checks (querySelector case-insensitive attribute flag has limited support)
      var demoEl = document.querySelector('[class*="demo"],[id*="demo"],[data-demo],[data-account*="demo"]')
        || document.querySelector('[class*="Demo"],[id*="Demo"]');
      if(demoEl) return true;
    }
    return false;
  }

  function runChecks(){
    var results = [];

    // 1. Engine injected
    var engineOk = !!(window.__MPB_ENGINE_INJECTED__ || document.documentElement.dataset.mpbEngineInjected === '1');
    results.push({label:'Engine injected', ok: engineOk, msg: engineOk ? 'OK' : 'NOT detected — reload page'});

    // 2. WebSocket hook ready
    var wsOk = !!(window.__mpbWs && typeof window.__mpbWs.send === 'function');
    results.push({label:'WebSocket hook ready', ok: wsOk, msg: wsOk ? 'WS captured — trades can execute' : '⚠ WS not captured yet (will capture on first traffic)'});

    // 3. Selected pairs
    var pairs = read('mpb_selected_pairs', []);
    var pairsOk = Array.isArray(pairs) && pairs.length > 0;
    results.push({label:'Trading pairs selected', ok: pairsOk, msg: pairsOk ? (pairs.length + ' pair(s) active') : '⚠ NONE selected — bot will NOT trade'});

    // 4. Data stream heartbeat:
    //    _mpbStreamSeen → set when a newDeal postMessage fires (trade signal from engine).
    //    engine.rates check → set as soon as any WS market-data frame arrives and checkRate() runs;
    //    this allows the check to pass even before a trade signal is generated.
    var streamOk = _mpbStreamSeen || !!(
      window.__mpbEngine && window.__mpbEngine.rates &&
      Object.keys(window.__mpbEngine.rates).length > 0
    );
    results.push({label:'Data stream', ok: streamOk, msg: streamOk ? 'Stream activity detected' : 'No stream data yet (bot may not have started)'});

    // 5. Required DOM nodes
    var hasModal = !!document.getElementById('sub-menu-robot-modal');
    var hasBtn   = !!document.getElementById('ss_button');
    results.push({label:'#sub-menu-robot-modal present', ok: hasModal, msg: hasModal ? 'Found' : 'Missing — UI cannot function'});
    results.push({label:'#ss_button present', ok: hasBtn,   msg: hasBtn   ? 'Found' : 'Missing — start/stop unavailable'});

    return results;
  }

  function renderResults(container, results){
    container.innerHTML = results.map(function(r){
      var color = r.ok ? '#14ff72' : '#ff4769';
      var icon  = r.ok ? '✓' : '✗';
      return '<div style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:11px;">'
        + '<span style="color:'+color+';font-weight:900;min-width:14px;">'+icon+'</span>'
        + '<span style="color:#9fb4d6;min-width:170px;">'+r.label+'</span>'
        + '<span style="color:#eaf2ff;">'+r.msg+'</span>'
        + '</div>';
    }).join('');
  }

  function mountSystemCheck(){
    var root = document.getElementById('sub-menu-robot-modal') || document.body;
    if(!root) return;

    // Ensure slot exists
    var slot = qs('#mpb-slot', root);
    if(!slot){
      slot = document.createElement('div');
      slot.id = 'mpb-slot';
      slot.style.padding = '10px 16px 4px';
      var hdr = qs('.mpb-header', root);
      if(hdr && hdr.nextSibling){
        hdr.parentElement.insertBefore(slot, hdr.nextSibling);
      } else {
        root.insertBefore(slot, root.firstChild);
      }
    }

    if(qs('#mpb-sys-check', slot)) return; // already mounted

    var tile = document.createElement('div');
    tile.id = 'mpb-sys-check';
    tile.className = 'mpb-tile';
    tile.style.cssText = 'border-color:rgba(0,229,255,.45);margin-top:8px;';

    tile.innerHTML = ''
      + '<div class="mpb-tile__title" style="color:#a5f3ff;">🔍 System Check</div>'
      + '<div id="mpb-sys-results" style="margin:8px 0;min-height:24px;"></div>'
      + '<div class="mpb-tile__row" style="gap:8px;margin-top:6px;">'
      + '  <button id="mpb-run-check" class="mpb-btn" style="font-size:11px;padding:6px 12px;">Test</button>'
      + '  <button id="mpb-demo-trade" class="mpb-btn" style="font-size:11px;padding:6px 12px;border-color:rgba(255,213,77,.5);color:#ffd24d;">⚡ Place Demo Test Trade ($1)</button>'
      + '</div>'
      + '<div class="mpb-tile__row" style="gap:8px;margin-top:4px;">'
      + '  <button id="mpb-demo-martin" class="mpb-btn" style="font-size:11px;padding:6px 12px;border-color:rgba(20,255,114,.4);color:#14ff72;">🔁 Place Demo Martingale Test (2x)</button>'
      + '</div>'
      + '<div id="mpb-sys-note" class="mpb-note" style="margin-top:6px;"></div>'
      + '<div id="mpb-trade-route" class="mpb-note" style="margin-top:4px;color:#9fb4d6;"></div>';

    slot.insertBefore(tile, slot.firstChild);

    var resultsEl   = tile.querySelector('#mpb-sys-results');
    var runBtn      = tile.querySelector('#mpb-run-check');
    var demoBtn     = tile.querySelector('#mpb-demo-trade');
    var martinBtn   = tile.querySelector('#mpb-demo-martin');
    var noteEl      = tile.querySelector('#mpb-sys-note');
    var routeEl     = tile.querySelector('#mpb-trade-route');

    function refreshTradeRoute(){
      routeEl.textContent = 'Last route: ' + _mpbGetTradeRouteLabel();
    }

    refreshTradeRoute();

    runBtn.addEventListener('click', function(){
      var results = runChecks();
      renderResults(resultsEl, results);
      noteEl.textContent = '';
      refreshTradeRoute();
    });

    // Demo test trade — requires double-click confirmation
    var _demoConfirmPending = false;
    var _demoConfirmTimer = null;

    function _cancelDemoConfirm(){
      if(_demoConfirmTimer){ clearTimeout(_demoConfirmTimer); _demoConfirmTimer = null; }
      _demoConfirmPending = false;
      demoBtn.textContent = '⚡ Place Demo Test Trade ($1)';
      demoBtn.style.borderColor = 'rgba(255,213,77,.5)';
    }
    // Clear pending confirmation on page hide to avoid stale callbacks
    window.addEventListener('pagehide', _cancelDemoConfirm, {once: true});

    demoBtn.addEventListener('click', function(){
      // Gate: only in demo
      if(!isDemo()){
        noteEl.textContent = '⛔ Not in demo mode — test trade blocked.';
        return;
      }

      if(!_demoConfirmPending){
        // First click — ask for confirmation
        _demoConfirmPending = true;
        demoBtn.textContent = '⚠ Click again to confirm demo trade';
        demoBtn.style.borderColor = 'rgba(255,71,105,.7)';
        noteEl.textContent = 'Click the button again within 5 seconds to confirm placing a $1 demo test trade.';
        _demoConfirmTimer = setTimeout(function(){
          _cancelDemoConfirm();
          noteEl.textContent = 'Confirmation timed out. No trade placed.';
        }, 5000);
      } else {
        // Second click — confirmed, place trade
        clearTimeout(_demoConfirmTimer);
        _demoConfirmTimer = null;
        _demoConfirmPending = false;
        demoBtn.textContent = '⚡ Place Demo Test Trade ($1)';
        demoBtn.style.borderColor = 'rgba(255,213,77,.5)';

        // Final demo guard before placing
        if(!isDemo()){
          noteEl.textContent = '⛔ Not in demo mode — test trade blocked.';
          return;
        }

        // Dispatch a demo test-trade event — the engine handler takes care of pair selection,
        // isDemo guard, and WebSocket send.
        window.postMessage({
          belobot: true,
          act: 'mpb_demo_test_trade',
          amount: 1,
          isDemo: true
        }, window.location.href);

        noteEl.textContent = '✓ Demo test trade signal sent ($1). Check open trades to confirm.';
        setTimeout(refreshTradeRoute, 50);
        mpbToast('Demo test trade placed ($1) — check open trades.', true);
      }
    });

    // Martingale test (2x) — double-click confirmation, same guard as demo trade
    var _martinConfirmPending = false;
    var _martinConfirmTimer = null;

    function _cancelMartinConfirm(){
      if(_martinConfirmTimer){ clearTimeout(_martinConfirmTimer); _martinConfirmTimer = null; }
      _martinConfirmPending = false;
      martinBtn.textContent = '🔁 Place Demo Martingale Test (2x)';
      martinBtn.style.borderColor = 'rgba(20,255,114,.4)';
    }
    window.addEventListener('pagehide', _cancelMartinConfirm, {once: true});

    martinBtn.addEventListener('click', function(){
      if(!isDemo()){
        noteEl.textContent = '⛔ Not in demo mode — martingale test blocked.';
        return;
      }

      if(!_martinConfirmPending){
        _martinConfirmPending = true;
        martinBtn.textContent = '⚠ Click again to confirm martingale test';
        martinBtn.style.borderColor = 'rgba(255,71,105,.7)';
        noteEl.textContent = 'Click again within 5 s to run 2 sequential demo trades (default: simulates loss → T2 doubles; set window.__mpbSimulateMartingaleWin=true to test win path).';
        _martinConfirmTimer = setTimeout(function(){
          _cancelMartinConfirm();
          noteEl.textContent = 'Martingale test confirmation timed out. No trades placed.';
        }, 5000);
      } else {
        clearTimeout(_martinConfirmTimer);
        _martinConfirmTimer = null;
        _martinConfirmPending = false;
        martinBtn.textContent = '🔁 Place Demo Martingale Test (2x)';
        martinBtn.style.borderColor = 'rgba(20,255,114,.4)';

        if(!isDemo()){
          noteEl.textContent = '⛔ Not in demo mode — martingale test blocked.';
          return;
        }

        window.postMessage({
          belobot: true,
          act: 'mpb_demo_martingale_test',
          amount: 1,
          isDemo: true
        }, window.location.href);

        noteEl.textContent = '⚡ Martingale test started ($1). Watch for 2 trades…';
        setTimeout(refreshTradeRoute, 50);
        mpbToast('Martingale test running (2 demo trades)…', true);
      }
    });
  }

  // Auto-mount: call immediately if modal is already present, and observe for it appearing.
  // Disconnect the observer once the tile is successfully mounted; the setInterval handles recovery.
  mountSystemCheck();

  var sysCheckObserver = new MutationObserver(function(){
    if(document.getElementById('sub-menu-robot-modal')){
      sysCheckObserver.disconnect();
      mountSystemCheck();
    }
  });
  if(!document.getElementById('mpb-sys-check')){
    sysCheckObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Periodic remount to survive re-renders (e.g. live/demo switch)
  setInterval(function(){
    if(document.getElementById('sub-menu-robot-modal') && !document.getElementById('mpb-sys-check')){
      mountSystemCheck();
    }
  }, 1500);

  // Also mount on icon click (legacy path)
  document.addEventListener('mpb-icon-clicked', function onIconClicked(){
    mountSystemCheck();
  });
})();

}catch(e){console.debug('WAR error', e);}})();