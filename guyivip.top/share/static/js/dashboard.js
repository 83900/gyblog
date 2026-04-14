async function getQuote(ts_code) {
  try {
    const res = await api('/api/realtime?ts_code=' + encodeURIComponent(ts_code));
    if (res.quote) return { price: res.quote.price, name: res.quote.name };
  } catch(e) {}
  const q = await api('/api/quote?ts_code=' + encodeURIComponent(ts_code));
  return { price: q.price, name: ts_code };
}

async function loadHoldings() {
  const data = await api('/api/portfolio');
  return data.holdings || [];
}

async function loadTxs(limit=10) {
  const data = await api('/api/transactions');
  return (data.transactions || []).slice(0, limit);
}

function renderKPIs(rows, cash) {
  let mv = 0, pnl = 0;
  rows.forEach(r => {
    if (r.lastPrice == null) return;
    const shares = Number(r.shares), avg = Number(r.avg_cost), price = Number(r.lastPrice);
    mv += price * shares;
    pnl += (price - avg) * shares;
  });
  document.getElementById('kpiCash').textContent = cash.toFixed(2);
  document.getElementById('kpiMV').textContent = mv.toFixed(2);
  const pnlEl = document.getElementById('kpiPNL');
  pnlEl.textContent = pnl.toFixed(2);
  pnlEl.classList.toggle('text-success', pnl >= 0);
  pnlEl.classList.toggle('text-danger', pnl < 0);
}

function renderHoldings(rows) {
  const tb = document.getElementById('dashHoldings');
  tb.innerHTML = '';
  rows.slice(0, 8).forEach(r => {
    const price = r.lastPrice != null ? Number(r.lastPrice) : null;
    const shares = Number(r.shares);
    const avg = Number(r.avg_cost);
    const mv = price != null ? price * shares : null;
    const pnl = price != null ? (price - avg) * shares : null;
    const tr = document.createElement('tr');
    tr.innerHTML = [
      `<td><a href="${(typeof makeUrl==='function')? makeUrl('trade.html?ts_code='+r.ts_code) : 'trade.html?ts_code='+r.ts_code}" class="text-decoration-none app-link fw-bold" data-file="trade.html">${r.name || r.ts_code} <br><small class="text-muted fw-normal">${r.ts_code}</small></a></td>`,
      `<td class="text-end">${shares.toFixed(2)}</td>`,
      `<td class="text-end">${avg.toFixed(4)}</td>`,
      `<td class="text-end">${price != null ? price.toFixed(4) : '--'}</td>`,
      `<td class="text-end">${mv != null ? mv.toFixed(2) : '--'}</td>`,
      `<td class="text-end ${pnl != null ? (pnl>=0?'text-success':'text-danger') : ''}">${pnl != null ? pnl.toFixed(2) : '--'}</td>`
    ].join('');
    tb.appendChild(tr);
  });
}

function renderTxs(rows) {
  const tb = document.getElementById('dashTx');
  tb.innerHTML = '';
  rows.forEach(t => {
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

async function refresh() {
  const me = await requireAuth();
  let rows = await loadHoldings();
  for (let i = 0; i < rows.length; i++) {
    try { const q = await getQuote(rows[i].ts_code); rows[i].lastPrice = q.price; rows[i].name = q.name; } catch {}
  }
  renderKPIs(rows, Number(me.cash));
  renderHoldings(rows);
  const tx = await loadTxs(10);
  renderTxs(tx);
}

document.addEventListener('DOMContentLoaded', () => {
  refresh().catch(e => console.error(e));
});
