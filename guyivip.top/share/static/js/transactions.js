async function loadTransactions() {
  const data = await api('/api/transactions');
  return data.transactions || [];
}

function renderTx(rows) {
  const tb = document.getElementById('txBody');
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

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  const tx = await loadTransactions();
  renderTx(tx);
});
