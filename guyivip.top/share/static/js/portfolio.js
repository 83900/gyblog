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

function renderHoldings(rows) {
  const tb = document.getElementById('holdingsBody');
  tb.innerHTML = '';
  rows.forEach(r => {
    const price = r.lastPrice != null ? Number(r.lastPrice) : null;
    const shares = Number(r.shares);
    const avg = Number(r.avg_cost);
    const mv = price != null ? price * shares : null;
    const pnl = price != null ? (price - avg) * shares : null;
    const tr = document.createElement('tr');
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
      if (typeof makeUrl === 'function') location.href = makeUrl('trade.html');
      else location.href = 'trade.html';
    };
  });
}

async function refreshValuation() {
  let rows = await loadHoldings();
  for (let i = 0; i < rows.length; i++) {
    try { const q = await getQuote(rows[i].ts_code); rows[i].lastPrice = q.price; rows[i].name = q.name; } catch {}
  }
  renderHoldings(rows);
}

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  document.getElementById('btnRefreshValuation').addEventListener('click', () => refreshValuation());
  refreshValuation();
});
