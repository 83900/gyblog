async function login() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  showAlert('');
  await api('/api/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
  location.href = (typeof makeUrl === 'function') ? makeUrl('/dashboard.html') : '/dashboard.html';
}

async function registerUser() {
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value;
  const c = document.getElementById('reg-cash').value;
  showAlert('');
  await api('/api/register', { method: 'POST', body: JSON.stringify({ username: u, password: p, cash: c }) });
  location.href = (typeof makeUrl === 'function') ? makeUrl('/dashboard.html') : '/dashboard.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  try { await requireAuth(); location.href = (typeof makeUrl === 'function') ? makeUrl('/dashboard.html') : '/dashboard.html'; return; } catch {}
  const l = document.getElementById('login-btn');
  const r = document.getElementById('reg-btn');
  if (l) l.addEventListener('click', () => login().catch(e => showAlert(e.message)));
  if (r) r.addEventListener('click', () => registerUser().catch(e => showAlert(e.message)));
});
