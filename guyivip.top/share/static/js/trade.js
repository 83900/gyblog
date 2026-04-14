const qCode = document.getElementById('inputTsCode');
const qShares = document.getElementById('inputShares');
const lQuote = document.getElementById('labelQuote');
const btnQuote = document.getElementById('btnQuote');
const btnBuy = document.getElementById('btnBuy');
const btnSell = document.getElementById('btnSell');
const btnAddWatch = document.getElementById('btnAddWatch');
const listWatch = document.getElementById('watchlist');

let chart, candleSeries;

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    loadWatchlist();
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('ts_code');
    if (code) {
        qCode.value = code;
        fetchQuote(code);
        loadChartData(code, 200);
    }
});

function initChart() {
    const container = document.getElementById('chartContainer');
    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: '#1d1d1f',
        },
        grid: {
            vertLines: { color: 'rgba(0, 0, 0, 0.05)' },
            horzLines: { color: 'rgba(0, 0, 0, 0.05)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: 'rgba(0, 0, 0, 0.1)',
        },
        timeScale: {
            borderColor: 'rgba(0, 0, 0, 0.1)',
        },
    });
    
    // Check dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        chart.applyOptions({
            layout: { textColor: '#f5f5f7' },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            }
        });
    }

    candleSeries = chart.addCandlestickSeries({
        upColor: '#ff3b30',
        downColor: '#34c759',
        borderDownColor: '#34c759',
        borderUpColor: '#ff3b30',
        wickDownColor: '#34c759',
        wickUpColor: '#ff3b30',
    });
}

async function loadChartData(tsCode, limit=200) {
    if (!tsCode) return;
    try {
        const res = await api(`/api/history?ts_code=${tsCode}&limit=${limit}`);
        if (res.kline && res.kline.length > 0) {
            const data = res.kline.map(k => ({
                time: k.time,
                open: k.open,
                high: k.high,
                low: k.low,
                close: k.close
            }));
            candleSeries.setData(data);
            chart.timeScale().fitContent();
        } else {
            console.warn("No K-line data");
        }
    } catch (e) {
        console.error(e);
    }
}

async function fetchQuote(code) {
    if (!code) return;
    lQuote.innerHTML = '...';
    try {
        // try realtime
        const rt = await api(`/api/realtime?ts_code=${code}`);
        if (rt.quote && rt.quote.price) {
            const p = rt.quote.price;
            lQuote.textContent = `￥${p.toFixed(2)}`;
            lQuote.className = "fw-bold text-primary";
            return p;
        }
    } catch(e) {
        // fallback to old quote
        try {
            const res = await api(`/api/quote?ts_code=${code}`);
            if (res.price) {
                lQuote.textContent = `￥${res.price.toFixed(2)}`;
                lQuote.className = "fw-bold text-primary";
                return res.price;
            } else {
                lQuote.textContent = '暂无数据';
                lQuote.className = "fw-bold text-danger";
            }
        } catch(e2) {
            lQuote.textContent = '查价失败';
            lQuote.className = "fw-bold text-danger";
        }
    }
    return null;
}

btnQuote.addEventListener('click', () => {
    const c = qCode.value.trim();
    if(c) {
        fetchQuote(c);
        loadChartData(c, 200);
    }
});

[document.getElementById('btnLoadDay'), document.getElementById('btnLoad50')].forEach(btn => {
    if(btn) {
        btn.addEventListener('click', (e) => {
            const c = qCode.value.trim();
            if(c) loadChartData(c, e.target.dataset.range);
        });
    }
});

async function placeOrder(action) {
    const tsCode = qCode.value.trim();
    const shares = parseFloat(qShares.value);
    if (!tsCode || isNaN(shares) || shares <= 0) {
        alert('请输入正确的代码和股数');
        return;
    }
    btnBuy.disabled = true;
    btnSell.disabled = true;
    try {
        const p = await fetchQuote(tsCode);
        if (!p) {
            alert('获取最新价格失败，无法下单');
            return;
        }
        const endpoint = action === 'buy' ? '/api/buy' : '/api/sell';
        const res = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify({ ts_code: tsCode, shares: shares, price: p })
        });
        if (res.error) {
            alert(res.error);
        } else {
            alert(`${action === 'buy'?'买入':'卖出'}成功！成交价: ${p}`);
        }
    } catch (e) {
        alert(e.message || '操作失败');
    } finally {
        btnBuy.disabled = false;
        btnSell.disabled = false;
    }
}

btnBuy.addEventListener('click', () => placeOrder('buy'));
btnSell.addEventListener('click', () => placeOrder('sell'));

// Simple local storage watchlist
function loadWatchlist() {
    const list = JSON.parse(localStorage.getItem('sharesim_watchlist') || '["000001.SZ", "600000.SH"]');
    listWatch.innerHTML = '';
    list.forEach(c => {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'd-flex justify-content-between align-items-center apple-link';
        a.style.padding = '8px 12px';
        a.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
        a.innerHTML = `<span>${c}</span> <button class="btn-apple-pill del-watch" style="padding: 2px 8px; font-size: 10px; color: #ff3b30; border-color: #ff3b30;" data-code="${c}">&times;</button>`;
        a.addEventListener('click', (e) => {
            if(e.target.classList.contains('del-watch')) {
                removeWatch(c);
            } else {
                e.preventDefault();
                qCode.value = c;
                fetchQuote(c);
                loadChartData(c, 200);
            }
        });
        listWatch.appendChild(a);
    });
}

function removeWatch(c) {
    let list = JSON.parse(localStorage.getItem('sharesim_watchlist') || '[]');
    list = list.filter(x => x !== c);
    localStorage.setItem('sharesim_watchlist', JSON.stringify(list));
    loadWatchlist();
}

btnAddWatch.addEventListener('click', () => {
    const c = qCode.value.trim();
    if(!c) return;
    let list = JSON.parse(localStorage.getItem('sharesim_watchlist') || '[]');
    if(!list.includes(c)) {
        list.push(c);
        localStorage.setItem('sharesim_watchlist', JSON.stringify(list));
        loadWatchlist();
    }
});

