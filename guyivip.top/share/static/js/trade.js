let chart;
let candleSeries;
let currentCode = '';

async function getQuote(ts_code) {
  const q = await api('/api/quote?ts_code=' + encodeURIComponent(ts_code));
  return q.price;
}

async function loadHistory(ts_code, limit = 200) {
  const data = await api('/api/history?ts_code=' + encodeURIComponent(ts_code) + '&limit=' + limit);
  return data.candles || [];
}

function initChart() {
  const el = document.getElementById('chartContainer');
  if (!el || !window.LightweightCharts) return;
  chart = LightweightCharts.createChart(el, {
    width: el.clientWidth, height: 420,
    layout: { background: { color: '#fff' }, textColor: '#222' },
    grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
    rightPriceScale: { borderVisible: false },
    timeScale: { timeVisible: true, secondsVisible: false },
  });
  candleSeries = chart.addCandlestickSeries({
    upColor: '#26a69a', downColor: '#ef5350',
    borderUpColor: '#26a69a', borderDownColor: '#ef5350',
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
  });
  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: el.clientWidth, height: 420 });
    chart.timeScale().fitContent();
  });
  ro.observe(el);
}

function getWatchlist() {
  try { const v = localStorage.getItem('watchlist'); if (!v) return []; const arr = JSON.parse(v); return Array.isArray(arr) ? arr : []; } catch { return []; }
}
function setWatchlist(arr) { localStorage.setItem('watchlist', JSON.stringify(arr)); }
function ensureDefaultWatchlist() {
  let list = getWatchlist();
  if (list.length === 0) { list = ['000001.SZ','600000.SH','600519.SH','000002.SZ']; setWatchlist(list); }
}
function renderWatchlist() {
  ensureDefaultWatchlist();
  const list = getWatchlist();
  const box = document.getElementById('watchlist');
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
function addCurrentToWatch() {
  const code = document.getElementById('inputTsCode').value.trim();
  if (!code) return;
  const list = getWatchlist();
  if (!list.includes(code)) {
    list.unshift(code); if (list.length > 30) list.pop();
    setWatchlist(list); renderWatchlist();
  }
}

async function selectCode(code) {
  document.getElementById('inputTsCode').value = code;
  currentCode = code;
  const price = await getQuote(code);
  document.getElementById('labelQuote').textContent = '价格：' + Number(price).toFixed(4);
  const candles = await loadHistory(code, 200);
  if (candleSeries) {
    candleSeries.setData(candles);
    chart.timeScale().fitContent();
  }
}

async function onQuote() {
  const code = document.getElementById('inputTsCode').value.trim();
  if (!code) return;
  await selectCode(code);
}

async function onBuySell(side) {
  const code = document.getElementById('inputTsCode').value.trim();
  const shares = Number(document.getElementById('inputShares').value);
  if (!code || !shares || shares <= 0) { showAlert('请输入正确的代码与股数'); return; }
  showAlert('');
  const path = side === 'BUY' ? '/api/buy' : '/api/sell';
  await api(path, { method: 'POST', body: JSON.stringify({ ts_code: code, shares }) });
  await onQuote();
}

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  initChart();
  renderWatchlist();
  document.getElementById('btnAddWatch').addEventListener('click', () => addCurrentToWatch());
  document.getElementById('btnLoad50').addEventListener('click', () => { if (currentCode) loadHistory(currentCode, 50).then(c => { candleSeries.setData(c); chart.timeScale().fitContent(); }); });
  document.getElementById('btnLoadDay').addEventListener('click', () => { if (currentCode) loadHistory(currentCode, 200).then(c => { candleSeries.setData(c); chart.timeScale().fitContent(); }); });
  document.getElementById('btnQuote').addEventListener('click', () => onQuote().catch(e => showAlert(e.message)));
  document.getElementById('btnBuy').addEventListener('click', () => onBuySell('BUY').catch(e => showAlert(e.message)));
  document.getElementById('btnSell').addEventListener('click', () => onBuySell('SELL').catch(e => showAlert(e.message)));
});
