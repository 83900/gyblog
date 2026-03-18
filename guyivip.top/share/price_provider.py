import os
import tushare as ts
import pandas as pd

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


def get_latest_price(ts_code: str):
    pro = _ensure_client()
    if pro is None:
        return None
    try:
        df = pro.daily(ts_code=ts_code, limit=1, fields="close")
        if isinstance(df, pd.DataFrame) and not df.empty:
            v = df.iloc[0]["close"]
            return float(v)
        return None
    except Exception:
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
