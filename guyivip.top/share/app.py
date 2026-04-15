import os
import sqlite3
from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from pathlib import Path

DB_PATH = Path(__file__).with_name("app.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            cash REAL NOT NULL DEFAULT 100000
        );
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            ts_code TEXT NOT NULL,
            shares REAL NOT NULL,
            avg_cost REAL NOT NULL,
            UNIQUE(user_id, ts_code),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            ts_code TEXT NOT NULL,
            side TEXT NOT NULL,
            price REAL NOT NULL,
            shares REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """
    )
    conn.commit()
    conn.close()


def require_login(fn):
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)

    wrapper.__name__ = fn.__name__
    return wrapper


def create_app():
    app = Flask(__name__, static_folder="static", static_url_path="")
    secret = os.environ.get("STOCKSIM_SECRET_KEY")
    if not secret:
        secret = os.urandom(32)
    app.secret_key = secret
    app.permanent_session_lifetime = timedelta(days=7)
    init_db()

    @app.route("/")
    def index():
        return send_from_directory(app.static_folder, "login.html")

    @app.route("/login")
    def page_login():
        return send_from_directory(app.static_folder, "login.html")

    @app.route("/login.html")
    def page_login_html():
        return send_from_directory(app.static_folder, "login.html")

    @app.route("/dashboard")
    def page_dashboard():
        return send_from_directory(app.static_folder, "dashboard.html")

    @app.route("/dashboard.html")
    def page_dashboard_html():
        return send_from_directory(app.static_folder, "dashboard.html")

    @app.route("/trade")
    def page_trade():
        return send_from_directory(app.static_folder, "trade.html")

    @app.route("/trade.html")
    def page_trade_html():
        return send_from_directory(app.static_folder, "trade.html")

    @app.route("/portfolio")
    def page_portfolio():
        return send_from_directory(app.static_folder, "portfolio.html")

    @app.route("/portfolio.html")
    def page_portfolio_html():
        return send_from_directory(app.static_folder, "portfolio.html")

    @app.route("/transactions")
    def page_transactions():
        return send_from_directory(app.static_folder, "transactions.html")

    @app.route("/transactions.html")
    def page_transactions_html():
        return send_from_directory(app.static_folder, "transactions.html")

    @app.post("/api/register")
    def register():
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        cash = data.get("cash")
        if not username or not password:
            return jsonify({"error": "missing username or password"}), 400
        if cash is None:
            cash = 100000.0
        try:
            cash = float(cash)
        except Exception:
            return jsonify({"error": "invalid cash"}), 400
        conn = get_db()
        c = conn.cursor()
        try:
            c.execute(
                "INSERT INTO users(username, password_hash, cash) VALUES(?,?,?)",
                (username, generate_password_hash(password), cash),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({"error": "username exists"}), 409
        user_id = c.lastrowid
        conn.close()
        session["user_id"] = user_id
        session.permanent = True
        return jsonify({"ok": True, "username": username, "cash": cash})

    @app.post("/api/login")
    def login():
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE username=?", (username,))
        row = c.fetchone()
        conn.close()
        if not row or not check_password_hash(row["password_hash"], password):
            return jsonify({"error": "invalid credentials"}), 401
        session["user_id"] = row["id"]
        session.permanent = True
        return jsonify({"ok": True, "username": username})

    @app.post("/api/logout")
    def logout():
        session.clear()
        return jsonify({"ok": True})

    @app.get("/api/me")
    @require_login
    def me():
        user_id = session["user_id"]
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT username, cash FROM users WHERE id=?", (user_id,))
        row = c.fetchone()
        conn.close()
        return jsonify({"username": row["username"], "cash": row["cash"]})

    @app.get("/api/portfolio")
    @require_login
    def portfolio():
        user_id = session["user_id"]
        conn = get_db()
        c = conn.cursor()
        c.execute(
            "SELECT ts_code, shares, avg_cost FROM holdings WHERE user_id=?", (user_id,)
        )
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify({"holdings": rows})

    @app.get("/api/transactions")
    @require_login
    def transactions():
        user_id = session["user_id"]
        conn = get_db()
        c = conn.cursor()
        c.execute(
            "SELECT ts_code, side, price, shares, created_at FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 100",
            (user_id,),
        )
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify({"transactions": rows})

    def _get_price(ts_code):
        try:
            import importlib.util as _importlib_util
            from pathlib import Path as _P
            _pp = _P(__file__).with_name("price_provider.py")
            _spec = _importlib_util.spec_from_file_location("price_provider", str(_pp))
            _mod = _importlib_util.module_from_spec(_spec)
            _spec.loader.exec_module(_mod)
            return _mod.get_latest_price(ts_code)
        except Exception:
            return None
    def _get_history(ts_code, limit):
        try:
            import importlib.util as _importlib_util
            from pathlib import Path as _P
            _pp = _P(__file__).with_name("price_provider.py")
            _spec = _importlib_util.spec_from_file_location("price_provider", str(_pp))
            _mod = _importlib_util.module_from_spec(_spec)
            _spec.loader.exec_module(_mod)
            return _mod.get_history(ts_code, limit)
        except Exception:
            return []
    def _get_realtime(ts_code):
        try:
            import importlib.util as _importlib_util
            from pathlib import Path as _P
            _pp = _P(__file__).with_name("price_provider.py")
            _spec = _importlib_util.spec_from_file_location("price_provider", str(_pp))
            _mod = _importlib_util.module_from_spec(_spec)
            _spec.loader.exec_module(_mod)
            return _mod.get_realtime_quote(ts_code)
        except Exception:
            return None

    @app.get("/api/quote")
    @require_login
    def quote():
        ts_code = request.args.get("ts_code", "").strip()
        if not ts_code:
            return jsonify({"error": "missing ts_code"}), 400
        price = _get_price(ts_code)
        if price is None:
            return jsonify({"error": "quote unavailable"}), 502
        return jsonify({"ts_code": ts_code, "price": price})

    def adjust_holding(c, user_id, ts_code, side, price, shares):
        c.execute("SELECT cash FROM users WHERE id=?", (user_id,))
        user = c.fetchone()
        if not user:
            return False, "user not found"
        cash = float(user["cash"])
        cost = price * shares
        if side == "BUY":
            if cash < cost:
                return False, "insufficient cash"
            c.execute(
                "UPDATE users SET cash=cash-? WHERE id=?", (cost, user_id)
            )
            c.execute(
                "SELECT shares, avg_cost FROM holdings WHERE user_id=? AND ts_code=?",
                (user_id, ts_code),
            )
            h = c.fetchone()
            if h:
                total_shares = float(h["shares"]) + shares
                new_cost = (
                    float(h["avg_cost"]) * float(h["shares"]) + cost
                ) / total_shares
                c.execute(
                    "UPDATE holdings SET shares=?, avg_cost=? WHERE user_id=? AND ts_code=?",
                    (total_shares, new_cost, user_id, ts_code),
                )
            else:
                c.execute(
                    "INSERT INTO holdings(user_id, ts_code, shares, avg_cost) VALUES(?,?,?,?)",
                    (user_id, ts_code, shares, price),
                )
        else:
            c.execute(
                "SELECT shares, avg_cost FROM holdings WHERE user_id=? AND ts_code=?",
                (user_id, ts_code),
            )
            h = c.fetchone()
            if not h or float(h["shares"]) < shares:
                return False, "insufficient shares"
            remaining = float(h["shares"]) - shares
            if remaining > 0:
                c.execute(
                    "UPDATE holdings SET shares=? WHERE user_id=? AND ts_code=?",
                    (remaining, user_id, ts_code),
                )
            else:
                c.execute(
                    "DELETE FROM holdings WHERE user_id=? AND ts_code=?",
                    (user_id, ts_code),
                )
            c.execute(
                "UPDATE users SET cash=cash+? WHERE id=?", (cost, user_id)
            )
        c.execute(
            "INSERT INTO transactions(user_id, ts_code, side, price, shares) VALUES(?,?,?,?,?)",
            (user_id, ts_code, side, price, shares),
        )
        return True, None

    @app.post("/api/buy")
    @require_login
    def buy():
        data = request.get_json(silent=True) or {}
        ts_code = (data.get("ts_code") or "").strip()
        shares = data.get("shares")
        req_price = data.get("price")
        if not ts_code or shares is None:
            return jsonify({"error": "missing ts_code or shares"}), 400
        try:
            shares = float(shares)
        except Exception:
            return jsonify({"error": "invalid shares"}), 400
        if shares <= 0:
            return jsonify({"error": "shares must be > 0"}), 400
        price = None
        if req_price is not None:
            try:
                price = float(req_price)
            except Exception:
                price = None
        if price is None or price <= 0:
            price = _get_price(ts_code)
        if price is None:
            return jsonify({"error": "quote unavailable"}), 502
        conn = get_db()
        c = conn.cursor()
        ok, err = adjust_holding(c, session["user_id"], ts_code, "BUY", price, shares)
        if not ok:
            conn.rollback()
            conn.close()
            return jsonify({"error": err}), 400
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "price": price})

    @app.post("/api/sell")
    @require_login
    def sell():
        data = request.get_json(silent=True) or {}
        ts_code = (data.get("ts_code") or "").strip()
        shares = data.get("shares")
        req_price = data.get("price")
        if not ts_code or shares is None:
            return jsonify({"error": "missing ts_code or shares"}), 400
        try:
            shares = float(shares)
        except Exception:
            return jsonify({"error": "invalid shares"}), 400
        if shares <= 0:
            return jsonify({"error": "shares must be > 0"}), 400
        price = None
        if req_price is not None:
            try:
                price = float(req_price)
            except Exception:
                price = None
        if price is None or price <= 0:
            price = _get_price(ts_code)
        if price is None:
            return jsonify({"error": "quote unavailable"}), 502
        conn = get_db()
        c = conn.cursor()
        ok, err = adjust_holding(c, session["user_id"], ts_code, "SELL", price, shares)
        if not ok:
            conn.rollback()
            conn.close()
            return jsonify({"error": err}), 400
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "price": price})

    @app.get("/api/realtime")
    @require_login
    def get_realtime():
        ts_code = request.args.get("ts_code", "").strip()
        if not ts_code:
            return jsonify({"error": "missing ts_code"}), 400
        data = _get_realtime(ts_code)
        if not data:
            return jsonify({"error": "quote unavailable"}), 502
        return jsonify({"ts_code": ts_code, "quote": data})

    @app.get("/api/history")
    @require_login
    def history():
        ts_code = request.args.get("ts_code", "").strip()
        try:
            limit = int(request.args.get("limit", "200"))
        except Exception:
            limit = 200
        if not ts_code:
            return jsonify({"error": "missing ts_code"}), 400
        candles = _get_history(ts_code, limit)
        return jsonify({"ts_code": ts_code, "kline": candles})

    return app


if __name__ == "__main__":
    app = create_app()
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    app.run(host=host, port=port)
