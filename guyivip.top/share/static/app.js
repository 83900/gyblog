async function api(path, opts = {}) {
  const r = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  if (!r.ok) {
    let msg = '请求失败';
    try {
      const e = await r.json();
      if (e.error) msg = e.error;
    } catch {}
    throw new Error(msg);
  }
  return r.json();
}

function $(id) { return document.getElementById(id); }

function showAlert(msg) {
  const box = $('alertBox');
  if (!box) return;
  if (!msg) {
    box.classList.add('d-none');
    box.textContent = '';
  } else {
    box.textContent = msg;
    box.classList.remove('d-none');
  }
}

function setAuthVisible(flag) {
  $('authSection').classList.toggle('d-none', !flag);
  $('appSection').classList.toggle('d-none', flag);
  $('logout-btn').classList.toggle('d-none', flag);
  $('navbar-user').classList.toggle('d-none', flag);
}

let chart;
let candleSeries;
let currentCode = '';

function initChart() {
  const el = $('chartContainer');
  if (!el || !window.LightweightCharts) return;
  chart = LightweightCharts.createChart(el, {
    width: el.clientWidth,
    height: 420,
    layout: { background: { color: '#fff' }, textColor: '#222' },
    grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
    rightPriceScale: { borderVisible: false },
    timeScale: { timeVisible: true, secondsVisible: false },
  });
  candleSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderUpColor: '#26a69a',
    borderDownColor: '#ef5350',
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  });
  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: el.clientWidth, height: 420 });
    chart.timeScale().fitContent();
  });
  ro.observe(el);
}

async function loadHistory(ts_code, limit = 200) {
  if (!ts_code) return;
  const data = await api('/api/history?ts_code=' + encodeURIComponent(ts_code) + '&limit=' + limit);
  const candles = data.candles || [];
  if (candleSeries) {
    candleSeries.setData(candles);
    chart.timeScale().fitContent();
  }
}

async function loadMe() {
  try {
    const me = await api('/api/me');
    $('navbar-user').textContent = '你好，' + me.username;
    $('cashAmount').textContent = Number(me.cash).toFixed(2);
    setAuthVisible(false);
    initChart();
    await refreshPortfolio();
    await loadTransactions();
  } catch {
    setAuthVisible(true);
  }
}

async function register() {
  const username = $('reg-username').value.trim();
  const password = $('reg-password').value;
  const cash = $('reg-cash').value;
  showAlert('');
  await api('/api/register', { method: 'POST', body: JSON.stringify({ username, password, cash }) });
  await loadMe();
}

async function login() {
  const username = $('login-username').value.trim();
  const password = $('login-password').value;
  showAlert('');
  await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  await loadMe();
}

async function logout() {
  await api('/api/logout', { method: 'POST' });
  setAuthVisible(true);
}

async function loadHoldings() {
  const data = await api('/api/portfolio');
  return data.holdings || [];
}

async function getQuote(ts_code) {
  const q = await api('/api/quote?ts_code=' + encodeURIComponent(ts_code));
  return q.price;
}

function renderHoldings(rows) {
  const tb = $('holdingsBody');
  tb.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const price = r.lastPrice != null ? Number(r.lastPrice) : null;
    const shares = Number(r.shares);
    const avg = Number(r.avg_cost);
    const mv = price != null ? price * shares : null;
    const pnl = price != null ? (price - avg) * shares : null;
    tr.innerHTML = [
      `<td class="code-cell" data-code="${r.ts_code}">${r.ts_code}</td>`,
      `<td class="text-end">${shares.toFixed(2)}</td>`,
      `<td class="text-end">${avg.toFixed(4)}</td>`,
      `<td class="text-end">${price != null ? price.toFixed(4) : '--'}</td>`,
      `<td class="text-end">${mv != null ? mv.toFixed(2) : '--'}</td>`,
      `<td class="text-end ${pnl != null ? (pnl>=0?'text-success':'text-danger') : ''}">${pnl != null ? pnl.toFixed(2) : '--'}</td>`
    ].join('');
    tb.appendChild(tr);
  });
  tb.querySelectorAll('.code-cell').forEach(td => {
    td.ondblclick = () => {
      const code = td.getAttribute('data-code');
      selectCode(code);
    };
  });
}

function renderKPIs(rows) {
  let mv = 0;
  let pnl = 0;
  rows.forEach(r => {
    if (r.lastPrice == null) return;
    const shares = Number(r.shares);
    const avg = Number(r.avg_cost);
    const price = Number(r.lastPrice);
    mv += price * shares;
    pnl += (price - avg) * shares;
  });
  $('mvAmount').textContent = mv.toFixed(2);
  const pnlEl = $('pnlAmount');
  pnlEl.textContent = pnl.toFixed(2);
  pnlEl.classList.toggle('text-success', pnl >= 0);
  pnlEl.classList.toggle('text-danger', pnl < 0);
}

async function refreshValuation(rows) {
  const r = rows.slice();
  for (let i = 0; i < r.length; i++) {
    try {
      const p = await getQuote(r[i].ts_code);
      r[i].lastPrice = p;
    } catch {}
  }
  renderHoldings(r);
  renderKPIs(r);
}

async function refreshPortfolio() {
  const rows = await loadHoldings();
  renderHoldings(rows);
  await refreshValuation(rows);
}

async function loadTransactions() {
  const data = await api('/api/transactions');
  const tb = $('txBody');
  tb.innerHTML = '';
  data.transactions.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = [
      `<td>${t.created_at}</td>`,
      `<td>${t.side}</td>`,
      `<td>${t.ts_code}</td>`,
      `<td class="text-end">${Number(t.price).toFixed(4)}</td>`,
      `<td class="text-end">${Number(t.shares).toFixed(2)}</td>`
    ].join('');
    tb.appendChild(tr);
  });
}

async function onQuote() {
  const code = $('inputTsCode').value.trim();
  if (!code) return;
  const price = await getQuote(code);
  $('labelQuote').textContent = '价格：' + Number(price).toFixed(4);
  await loadHistory(code, 200);
  currentCode = code;
}

async function onBuySell(side) {
  const code = $('inputTsCode').value.trim();
  const shares = Number($('inputShares').value);
  if (!code || !shares || shares <= 0) {
    showAlert('请输入正确的代码与股数');
    return;
  }
  showAlert('');
  const path = side === 'BUY' ? '/api/buy' : '/api/sell';
  await api(path, { method: 'POST', body: JSON.stringify({ ts_code: code, shares }) });
  await loadMe();
}

function getWatchlist() {
  try {
    const v = localStorage.getItem('watchlist');
    if (!v) return [];
    const arr = JSON.parse(v);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch { return []; }
}

function setWatchlist(arr) {
  localStorage.setItem('watchlist', JSON.stringify(arr));
}

function ensureDefaultWatchlist() {
  let list = getWatchlist();
  if (list.length === 0) {
    list = ['000001.SZ','600000.SH','600519.SH','000002.SZ'];
    setWatchlist(list);
  }
}

function renderWatchlist() {
  ensureDefaultWatchlist();
  const list = getWatchlist();
  const box = $('watchlist');
  box.innerHTML = '';
  list.forEach(code => {
    const a = document.createElement('a');
    a.href = 'javascript:void(0)';
    a.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
    a.innerHTML = `<span>${code}</span><i class="bi bi-chevron-right"></i>`;
    a.onclick = () => selectCode(code);
    box.appendChild(a);
  });
}

function selectCode(code) {
  $('inputTsCode').value = code;
  onQuote().catch(e => showAlert(e.message));
}

function addCurrentToWatch() {
  const code = $('inputTsCode').value.trim();
  if (!code) return;
  const list = getWatchlist();
  if (!list.includes(code)) {
    list.unshift(code);
    if (list.length > 30) list.pop();
    setWatchlist(list);
    renderWatchlist();
  }
}

function bind() {
  $('reg-btn').addEventListener('click', () => register().catch(e => showAlert(e.message)));
  $('login-btn').addEventListener('click', () => login().catch(e => showAlert(e.message)));
  $('logout-btn').addEventListener('click', () => logout().catch(e => showAlert(e.message)));
  $('btnQuote').addEventListener('click', () => onQuote().catch(e => showAlert(e.message)));
  $('btnBuy').addEventListener('click', () => onBuySell('BUY').catch(e => showAlert(e.message)));
  $('btnSell').addEventListener('click', () => onBuySell('SELL').catch(e => showAlert(e.message)));
  $('btnRefreshValuation').addEventListener('click', () => refreshPortfolio().catch(e => showAlert(e.message)));
  const btnAdd = $('btnAddWatch');
  if (btnAdd) btnAdd.addEventListener('click', () => addCurrentToWatch());
  const btn50 = $('btnLoad50');
  const btnDay = $('btnLoadDay');
  if (btn50) btn50.addEventListener('click', () => loadHistory($('inputTsCode').value.trim() || currentCode, 50).catch(()=>{}));
  if (btnDay) btnDay.addEventListener('click', () => loadHistory($('inputTsCode').value.trim() || currentCode, 200).catch(()=>{}));
}

bind();
renderWatchlist();
loadMe();
