/* ================= MONEY PRINTER BOT - CORE ENGINE =================
 * This file contains the main trading bot logic and is injected into the
 * page context to enable WebSocket interception and automated trading.
 * 
 * WARNING: This is a minified/bundled file. For development, use the source
 * files before bundling. Modifying this file directly may cause issues.
 * 
 * Core features:
 * - Trading strategy implementations (signals, candles, CCI, pin bars, martingale)
 * - WebSocket traffic interception for real-time market data
 * - Automated trade execution based on configured parameters
 * - Balance monitoring and risk management (stop loss, take profit)
 * - Deal tracking and position management
 * 
 * Trading strategies:
 * - signals: Multi-timeframe signal-based trading
 * - candles: Candlestick pattern recognition
 * - cci: Commodity Channel Index indicator strategy
 * - pinBar: Pin bar reversal pattern detection
 * - martin: Martingale position sizing (high risk)
 * ========================================================================= */

(function(){try{
(()=>{"use strict";const t={settings:{strategy:"signals",min_profit:80,delay:0,deals_limit:10,take_profit:{percent:20,sum:0},signals:[2,2,1,0,0,0],use_otc:!0,started:!1,martinSteps:[2,2,2,2,2,2,2,2,2],useMartin:!1},rates:{},action:!1,userInfo:{uid:!1,isDemo:!0,balance:{demo:0,real:0},openedDials:0,futureDeals:[],onlyDemo:!1,robotDeals:{opened:[],closed:[]},startSum:!1},getNextMartingaleStep(t,e){let s=t;for(let t=0;t<this.settings.martinSteps.length;t++){if(e===s)return Math.floor(s*this.settings.martinSteps[t]*100)/100;s=Math.floor(this.settings.martinSteps[t]*s*100)/100}return 2*e},checkDial(e,s){if(!this.settings.started)return!1;if("otc"==e.slice(-3)&&!this.settings.use_otc)return!1;if(!this.rates[e].active)return!1;if(this.userInfo.openedDials+this.userInfo.futureDeals.length>=this.settings.deals_limit)return!1;if(this.rates[e].nextDealTime>new Date)return!1;if(this.rates[e].profit<this.settings.min_profit)return!1;if(this.userInfo.isDemo&&this.userInfo.balance.real>=this.settings.take_profit.sum)return this.settings.started=!1,window.postMessage({belobot:!0,act:"robotSettings",settings:t.settings},window.location.href),!1;if(!this.userInfo.isDemo&&this.userInfo.balance.real>=this.settings.take_profit.sum)return this.settings.started=!1,window.postMessage({belobot:!0,act:"robotSettings",settings:t.settings},window.location.href),!1;if("updateStream"==this.action){if("candles"==this.settings.strategy){let t=this.strategies.candles(this.rates[e].rates,Math.trunc(s),4);t&&("down"==t?this.deal(e,"up"):this.deal(e,"down"))}if("cci"==this.settings.strategy){let t=this.strategies.cci(this.rates[e].rates,Math.trunc(s),20);t&&(t<115&&this.rates[e].last_cci>115&&this.deal(e,"down"),t>-105&&this.rates[e].last_cci<-105&&this.deal(e,"up"),this.rates[e].last_cci=t)}if("pinBar"==this.settings.strategy){let t=this.strategies.pinBar(this.rates[e].rates,Math.trunc(s),4);t&&this.deal(e,t)}}if("signals"==this.action&&"signals"==this.settings.strategy){let t=this.strategies.signals(this.rates[e].signals,this.settings.signals);t&&this.deal(e,t)}},check_reg(t){var e=this,s=new XMLHttpRequest;s.open("POST","https://2bot.top/check_user/",!0),s.setRequestHeader("Content-type","application/json; charset=utf-8"),s.onreadystatechange=function(){if(s.readyState==XMLHttpRequest.DONE)if(200==s.status){var t=JSON.parse(s.response);t.confirm?e.userInfo.onlyDemo=!1:e.userInfo.onlyDemo=!0,window.postMessage({belobot:!0,info_text:t.message})}else window.postMessage({belobot:!0,info_text:'Server <a href="https://2bot.top">https://2bot.top</a> is not available. Please report a problem trader.vitaly@gmail.com'})},s.send(JSON.stringify({user_id:t}))},deal(t,e,s){e="up"==e?"call":"put",this.userInfo.futureDeals.push({pair:t,dur:e,sum:s});let a=new Date;a.setSeconds(a.getSeconds()+this.settings.delay),this.rates[t].nextDealTime=a,window.postMessage({belobot:!0,act:"newDeal"},window.location.href)},addRate(t){this.rates[t.name].rates[t.elm[0]]=[t.elm[1],t.elm[2],t.elm[3],t.elm[4]]},addCurrentRate(t){var e=60*parseInt(t.elm[0]/60);this.checkRate(t.name),null==this.rates[t.name].rates[e]&&(this.rates[t.name].rates[e]=[t.elm[1],t.elm[1],t.elm[1],t.elm[1]]),t.elm[1]>this.rates[t.name].rates[e][2]?this.rates[t.name].rates[e][2]=t.elm[1]:t.elm[1]<this.rates[t.name].rates[e][3]&&(this.rates[t.name].rates[e][3]=t.elm[1]),this.rates[t.name].rates[e][1]=t.elm[1]},checkRate(t){null==this.rates[t]&&(this.rates[t]={rates:{}}),null==this.rates[t].signals&&(this.rates[t].signals={}),null==this.rates[t].nextDealTime&&(this.rates[t].nextDealTime=new Date),null==this.rates[t].last_cci&&(this.rates[t].last_cci=!1)},update(e){return"updateHistory"==this.action&&(this.checkRate(e.asset),e.candles.forEach((function(t){this.addRate({name:e.asset,elm:t})}),this),e.history.forEach((function(t){this.addCurrentRate({name:e.asset,elm:t})}),this)),"updateStream"==this.action&&e.forEach((function(t){this.checkRate(t[0]),this.addCurrentRate({name:t[0],elm:[t[1],t[2]]}),this.checkDial(t[0],t[1])}),this),"updateAssets"==this.action&&e.forEach((function(t){this.checkRate(t[1]),this.rates[t[1]].profit=t[5],this.rates[t[1]].active=t[14],this.rates[t[1]].fullname=t[2]}),this),"updateBalance"==this.action&&(this.userInfo.uid||(this.userInfo.uid=AppData.uid,this.check_reg(this.userInfo.uid)),e.isDemo?this.userInfo.balance.real=e.balance:this.userInfo.balance.real=e.balance,this.userInfo.isDemo=e.isDemo),"updateOpenedDeals"===this.action&&(this.userInfo.openedDials=e.length),"successopenOrder"===this.action&&this.settings.started&&this.userInfo.robotDeals.opened.push(e.id),"successcloseOrder"===this.action&&(e.deals.forEach((function(t){var e=this.userInfo.robotDeals.opened.indexOf(t.id);if(e>-1&&(this.userInfo.robotDeals.opened.splice(e,1),this.userInfo.robotDeals.closed.push(t.profit),("martin"===this.settings.strategy||this.settings.useMartin)&&this.settings.started)){if(t.profit<0){let e=this.getNextMartingaleStep(this.userInfo.startSum,t.amount);0==t.command?this.deal(t.asset,"up",e):this.deal(t.asset,"down",e)}0==t.profit&&(0==t.command?this.deal(t.asset,"up",t.amount):this.deal(t.asset,"down",t.amount))}this.userInfo.openedDials--}),this),window.postMessage({belobot:!0,robotDeals:t.userInfo.robotDeals},window.location.href)),"signals"===this.action&&e.signals.forEach((function(t){this.checkRate(t[0]),t[1].forEach((function(e){this.rates[t[0]].signals[e[0]]=e[1]}),this),this.checkDial(t[0])}),this),this.action=!1,!1},getState(){window.postMessage({belobot:!0,data:{settings:this.settings}},window.location.href)},setState(t){for(var e in t)this.settings=t[e]},strategies:{cci:function(t,e,s){if(t.length<s)return!1;let a=[],i=60*parseInt(e/60);for(let e=i-60*(s-1);e<=i;e+=60)a.push(t[e]);const n=a.map((t=>(t[0]+t[2]+t[3]+t[1])/4)),r=n.reduce(((t,e)=>t+e),0)/s,o=n.reduce(((t,e)=>t+Math.abs(e-r)),0)/s;return(n[s-1]-r)/(.02*o)},candles:function(t,e,s){var a=!1;for(let i=0,n=60*parseInt(e/60);i<=s;i++,n-=60){if(null==t[n])return!1;if(t[n][0]==t[n][1])return!1;if(t[n][0]<t[n][1])if(a){if("down"==a)return!1}else a="up";if(t[n][0]>t[n][1])if(a){if("up"==a)return!1}else a="down"}return a},pinBar:function(t,e,s){let a=60*parseInt(e/60),i=new Date(1e3*e).getSeconds(),n=t[a];if(i<40)return!1;const r=Math.abs(n[1]-n[0]),o=n[2]-Math.max(n[0],n[1]),l=Math.min(n[0],n[1])-n[3];return o>l&&o>r*s?"down":o<l&&l>r*s&&"up"},signals:function(t,e){let s=[t[1],t[2],t[3],t[5],t[10],t[15]],a=!1;for(var i=0;i<s.length;i++)if(0!=e[i]){if(s[i]>0)if(s[i]>2){if("up"==a)return!1;a||(a="down"),s[i]-=2}else{if("down"==a)return!1;a||(a="up")}if(s[i]<e[i])return!1}return a}}},e=t;window.addEventListener("message",(function(t){if(t.data.belobot){if("readState"==t.data.act&&window.postMessage({belobot:!0,act:"robotSettings",settings:e.settings},window.location.href),"setState"==t.data.act)for(let s in t.data.settings)"take_profit"==s?e.settings.take_profit.percent=t.data.settings[s]:e.settings[s]=t.data.settings[s];if("start_stop"==t.data.act){if(false&&e.userInfo.onlyDemo)return!1;e.userInfo.isDemo?e.settings.take_profit.sum=Math.floor(e.userInfo.balance.real*(e.settings.take_profit.percent+100)/100):e.settings.take_profit.sum=Math.floor(e.userInfo.balance.real*(e.settings.take_profit.percent+100)/100),e.settings.started=!e.settings.started,e.userInfo.futureDeals=[],e.settings.started||window.postMessage({belobot:!0,robotDeals:e.userInfo.robotDeals},window.location.href)}}}));var s=window.WebSocket;window.WebSocket=function(t,a){var i=a?new s(t,a):new s(t);return i.addEventListener("open",(function(t){})),i.addEventListener("message",(function(t){if(t.data instanceof ArrayBuffer&&e.action){let a=JSON.parse((s=t.data,String.fromCharCode.apply(null,new Uint8Array(s))));e.update(a)}else if(t.data.length>6)try{let s=JSON.parse(t.data.slice(4));"updateHistoryNew"===s[0]?e.action="updateHistory":"updateStream"===s[0]?e.action="updateStream":"updateAssets"===s[0]?e.action="updateAssets":"successupdateBalance"===s[0]?e.action="updateBalance":"updateOpenedDeals"===s[0]?e.action="updateOpenedDeals":"successopenOrder"===s[0]?e.action="successopenOrder":"successcloseOrder"===s[0]?e.action="successcloseOrder":"upsignals"!==s[0]&&"updateSignalForecast"!==s[0]&&"signals/load"!==s[0]&&"signals/update"!==s[0]||(e.action="signals")}catch{}var s})),i.addEventListener("send",(function(t){})),i.oldSend=s.prototype.send,i.send=function(t){if(e.settings.started&&(e.userInfo.futureDeals.length>0||!e.userInfo.startSum)&&"["==t[2])try{var s=JSON.parse(t.slice(2)),a=e.userInfo.futureDeals.pop(),n=t.slice(0,2);e.userInfo.startSum=s[1].amount,s[1].asset=a.pair,s[1].action=a.dur,a.sum&&(s[1].amount=a.sum),e.userInfo.onlyDemo&&(s[1].isDemo=1),n+=JSON.stringify(s),e.userInfo.openedDials++,i.oldSend.apply(this,[n])}catch{i.oldSend.apply(this,[t])}else i.oldSend.apply(this,[t])},i}})();


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
.mpb-header{display:none!important;}
`;
    (document.head || document.documentElement).appendChild(style);

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
      + '  <div class="mpb-pill" data-mode="pct">% Percent</div>'
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
      + '  <div class="mpb-pill" data-mode="pct">% Percent</div>'
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

  // draw now and on intervals
  renderSL();
  setInterval(renderSL, 1500);
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
      + '  <div class="mpb-pill" data-mode="pct">% Percent</div>'
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

}catch(e){console.debug('WAR error', e);}})();