const APP_BASE = (() => {
  const meta = document.querySelector('meta[name="app-base"]');
  let base = (meta && meta.content) ? meta.content.trim() : '/';
  if (!base.startsWith('/')) base = '/' + base;
  if (base.endsWith('/')) base = base.slice(0, -1);
  if (base === '' || base === '/') {
    const pages = ['/login.html','/dashboard.html','/trade.html','/portfolio.html','/transactions.html','/login','/dashboard','/trade','/portfolio','/transactions'];
    const path = location.pathname;
    for (const p of pages) {
      const idx = path.indexOf(p);
      if (idx > 0) { base = path.slice(0, idx); break; }
    }
  }
  
  // 对于 LiveServer 纯静态文件直接打开的情况，不做强行剔除 /static 的处理，
  // 否则相对路径就会错位。
  if (base.endsWith('/static') && location.pathname.includes('/static/')) {
    // 只有当明确是通过 Flask 等代理环境时才需要剔除 /static 访问根路由。
    // 如果是 LiveServer，其实保留 base 原样即可（文件在同一级）。
    // 为了兼容线上 Nginx/Flask 代理，我们在下面再做一次判断：
    // 如果当前就是纯文件协议或带 /static/ 的直接文件访问，保留当前目录结构
  } else if (base.endsWith('/static')) {
      base = base.slice(0, -7);
  }
  return base || '';
})();

function makeUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  
  // 核心修复：如果是直接使用 Live Server 等纯静态文件服务器访问，
  // 且当前 URL 包含 .html 文件，直接使用相对路径，剥离前缀的 /
  if (path.startsWith('/')) {
      // 只要不是部署在云端服务器 /share/ 子路径下的特殊代理环境，
      // 我们直接截掉前导斜杠，让浏览器用当前目录解析
      // 如果当前不是根目录且通过纯静态文件访问，我们把 / 前导的斜杠剥离
      // 避免退回到 127.0.0.1 根目录
      if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
          return window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + path.substring(1);
      }
      path = '/' + path.substring(1);
  }
  return APP_BASE + path;
}

async function api(path, opts = {}) {
  path = makeUrl(path);
  const r = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  if (!r.ok) {
    let msg = '请求失败';
    try { const e = await r.json(); if (e.error) msg = e.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

function $(id) { return document.getElementById(id); }

function showAlert(msg) {
  const box = $('alertBox');
  if (!box) return;
  if (!msg) { box.classList.add('d-none'); box.textContent = ''; }
  else { box.textContent = msg; box.classList.remove('d-none'); }
}

async function requireAuth() {
  try {
    const me = await api('/api/me');
    const navUser = document.querySelector('#navbar-user');
    if (navUser) navUser.textContent = '你好，' + me.username;
    const cashEl = document.querySelector('#cashAmount');
    if (cashEl) cashEl.textContent = Number(me.cash).toFixed(2);
    return me;
  } catch {
    if (!location.pathname.endsWith('login') && !location.pathname.endsWith('login.html')) {
      location.href = makeUrl('login.html');
    }
    throw new Error('unauthorized');
  }
}

async function logout() {
  try { await api('/api/logout', { method: 'POST' }); } catch {}
  location.href = makeUrl('login.html');
}

const bindLogout = () => {
  const btn = document.querySelector('#logout-btn');
  if (btn) btn.addEventListener('click', () => logout());
};

function fixAppLinks() {
  document.querySelectorAll('a.app-link').forEach(a => {
    const file = a.getAttribute('data-file');
    const p = a.getAttribute('data-path');
    let target = file || p || a.getAttribute('href') || '';
    if (file && !target.endsWith('.html')) target = file;
    // 使用纯相对路径替换绝对路径
    if (target.startsWith('/')) {
        target = target.substring(1);
    }
    a.setAttribute('href', makeUrl(target));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindLogout();
  fixAppLinks();
});
