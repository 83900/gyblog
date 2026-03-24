import os
import tushare as ts
import pandas as pd
import json

TOKEN_ENV = "TUSHARE_TOKEN"
PROXY_ENV = "TUSHARE_PROXY"
DEFAULT_PROXY = "http://121.40.135.59:8010/"

_pro = None

def _ensure_client():
    global _pro
    if _pro is not None:
        return _pro
    proxy = os.environ.get(PROXY_ENV) or DEFAULT_PROXY
    os.environ["HTTP_PROXY"] = proxy
    os.environ["HTTPS_PROXY"] = proxy
    token = os.environ.get(TOKEN_ENV)
    if not token:
        _pro = None
        return None
    _pro = ts.pro_api(token)
    return _pro

def get_realtime_quote(symbol: str):
    """
    Get real-time quote using tushare free api.
    symbol: can be 6-digit code like '000001' or with suffix like '000001.SZ'
    """
    try:
        # Convert 000001.SZ to 000001 for realtime_quotes
        clean_symbol = symbol.split('.')[0]
        df = ts.get_realtime_quotes(clean_symbol)
        if df is not None and not df.empty:
            r = df.iloc[0]
            return {
                "name": r["name"],
                "open": float(r["open"]),
                "pre_close": float(r["pre_close"]),
                "price": float(r["price"]),
                "high": float(r["high"]),
                "low": float(r["low"]),
                "bid": float(r["bid"]),
                "ask": float(r["ask"]),
                "volume": int(r["volume"]),
                "amount": float(r["amount"]),
                "time": r["time"],
                "date": r["date"]
            }
    except Exception as e:
        print(f"Realtime quote error: {e}")
    return None

def get_latest_price(ts_code: str):
    """Fallback to daily if realtime fails, or just use realtime."""
    rt = get_realtime_quote(ts_code)
    if rt and rt['price'] > 0:
        return rt['price']
    
    # Fallback to pro.daily
    pro = _ensure_client()
    if pro is None:
        return None
    try:
        df = pro.daily(ts_code=ts_code, limit=1, fields="close")
        if isinstance(df, pd.DataFrame) and not df.empty:
            v = df.iloc[0]["close"]
            return float(v)
    except Exception:
        pass
    return None

def get_history(ts_code: str, limit: int = 200):
    pro = _ensure_client()
    if pro is None:
        return []
    try:
        df = pro.daily(
            ts_code=ts_code,
            limit=limit,
            fields="trade_date,open,high,low,close",
        )
        if not isinstance(df, pd.DataFrame) or df.empty:
            return []
        df = df.copy()
        df["time"] = pd.to_datetime(df["trade_date"]).dt.strftime("%Y-%m-%d")
        df = df.sort_values("time")
        out = []
        for _, r in df.iterrows():
            try:
                out.append(
                    {
                        "time": r["time"],
                        "open": float(r["open"]),
                        "high": float(r["high"]),
                        "low": float(r["low"]),
                        "close": float(r["close"]),
                    }
                )
            except Exception:
                continue
        return out
    except Exception:
        return []
