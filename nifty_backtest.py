"""
Nifty 50 Long-Only Pivot Bounce Backtest
Strategy: Long entries on S1 pivot bounces with trend and RSI filters.
"""

import sys
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

TICKER = "^NSEI"
YEARS = 5
INITIAL_CAPITAL = 1_000_000.0
RISK_PER_TRADE = 0.01
COST_PER_SIDE = 0.0005
PIVOT_TOL = 0.001
SL_BUFFER = 0.001
RR_MIN = 1.5
RSI_PERIOD = 14
RSI_LO, RSI_HI = 35, 65
SMA_PERIOD = 200
HOLD_DAYS = 3


def download_data():
    end = datetime.today()
    start = end - timedelta(days=YEARS * 365 + 400)  # buffer for SMA200 warmup

    df = None
    try:
        import yfinance as yf
        print(f"Downloading {TICKER} via yfinance...")
        df = yf.download(TICKER, start=start, end=end, progress=False, auto_adjust=False)
        if df is not None and not df.empty:
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            df = df[["Open", "High", "Low", "Close"]].dropna()
            print(f"  yfinance: {len(df)} rows from {df.index[0].date()} to {df.index[-1].date()}")
            return df
        print("  yfinance returned empty.")
    except Exception as e:
        print(f"  yfinance failed: {e}")

    try:
        from pandas_datareader import data as pdr
        print("Trying Stooq via pandas-datareader...")
        df = pdr.DataReader("^NSEI", "stooq", start=start, end=end)
        if df is not None and not df.empty:
            df = df.sort_index()
            df = df[["Open", "High", "Low", "Close"]].dropna()
            print(f"  stooq: {len(df)} rows from {df.index[0].date()} to {df.index[-1].date()}")
            return df
        print("  stooq returned empty.")
    except Exception as e:
        print(f"  stooq failed: {e}")

    print("ERROR: Both data sources failed. Cannot proceed without real data.")
    sys.exit(1)


def wilder_rsi(close, period=14):
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    # Wilder's smoothing = EMA with alpha = 1/period
    avg_gain = gain.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi


def prepare(df):
    df = df.copy()
    df["SMA200"] = df["Close"].rolling(SMA_PERIOD).mean()
    df["RSI"] = wilder_rsi(df["Close"], RSI_PERIOD)

    prev_h = df["High"].shift(1)
    prev_l = df["Low"].shift(1)
    prev_c = df["Close"].shift(1)
    p = (prev_h + prev_l + prev_c) / 3.0
    df["P"] = p
    df["S1"] = 2 * p - prev_h
    df["R1"] = 2 * p - prev_l
    df["R2"] = p + (prev_h - prev_l)
    df["SL"] = df["S1"] * (1.0 - SL_BUFFER)
    return df


def run_backtest(df, use_rsi_filter, label):
    """Trades are taken at the close of the signal bar. Exit checked on
    next 1..HOLD_DAYS bars (intraday H/L) and forced to the close of day HOLD_DAYS."""
    capital = INITIAL_CAPITAL
    equity = []
    trades = []

    i = 0
    n = len(df)
    idxs = df.index

    while i < n:
        row = df.iloc[i]
        date = idxs[i]
        equity.append((date, capital))

        if pd.isna(row["SMA200"]) or pd.isna(row["RSI"]) or pd.isna(row["S1"]):
            i += 1
            continue

        close = row["Close"]
        low = row["Low"]
        s1 = row["S1"]
        r1 = row["R1"]
        r2 = row["R2"]
        sl = row["SL"]
        rsi = row["RSI"]
        sma = row["SMA200"]

        cond_trend = close > sma
        cond_rsi = (RSI_LO <= rsi <= RSI_HI) if use_rsi_filter else True
        touch_low = abs(low - s1) / s1 <= PIVOT_TOL or low <= s1
        touch_close = abs(close - s1) / s1 <= PIVOT_TOL
        cond_touch = touch_low or touch_close
        cond_above_sl = close > sl  # must be able to risk-size

        entry = close
        risk_per_share = entry - sl
        reward_to_r1 = r1 - entry
        cond_rr = risk_per_share > 0 and reward_to_r1 >= RR_MIN * risk_per_share

        if not (cond_trend and cond_rsi and cond_touch and cond_above_sl and cond_rr):
            i += 1
            continue

        qty = (capital * RISK_PER_TRADE) / risk_per_share
        if qty <= 0:
            i += 1
            continue

        exit_price = None
        exit_reason = None
        exit_date = None
        bars_held = 0
        for k in range(1, HOLD_DAYS + 1):
            j = i + k
            if j >= n:
                break
            nxt = df.iloc[j]
            bars_held = k
            # check SL first (conservative), then R2, then R1
            if nxt["Low"] <= sl:
                exit_price = sl
                exit_reason = "SL"
                exit_date = idxs[j]
                break
            if nxt["High"] >= r2:
                exit_price = r2
                exit_reason = "R2"
                exit_date = idxs[j]
                break
            if nxt["High"] >= r1:
                exit_price = r1
                exit_reason = "R1"
                exit_date = idxs[j]
                break
            if k == HOLD_DAYS:
                exit_price = nxt["Close"]
                exit_reason = "TIME"
                exit_date = idxs[j]
                break

        if exit_price is None:
            # ran off end of data, skip the trade
            i += 1
            continue

        entry_cost = entry * qty * COST_PER_SIDE
        exit_cost = exit_price * qty * COST_PER_SIDE
        gross = (exit_price - entry) * qty
        net = gross - entry_cost - exit_cost
        capital += net

        trades.append({
            "entry_date": date.date(),
            "exit_date": exit_date.date(),
            "bars_held": bars_held,
            "entry": round(entry, 2),
            "sl": round(sl, 2),
            "r1": round(r1, 2),
            "r2": round(r2, 2),
            "exit": round(exit_price, 2),
            "qty": round(qty, 4),
            "exit_reason": exit_reason,
            "gross_pnl": round(gross, 2),
            "costs": round(entry_cost + exit_cost, 2),
            "net_pnl": round(net, 2),
            "pct_return": round((exit_price / entry - 1.0) * 100, 4),
            "capital_after": round(capital, 2),
        })

        # move past the exit bar so we don't overlap trades
        i = i + bars_held + 1

    # complete equity curve with final value
    equity.append((idxs[-1], capital))
    eq_df = pd.DataFrame(equity, columns=["date", "equity"]).drop_duplicates("date", keep="last")
    eq_df = eq_df.set_index("date").sort_index()
    return pd.DataFrame(trades), eq_df, capital


def max_drawdown_pct(eq):
    if eq.empty:
        return 0.0
    peak = eq["equity"].cummax()
    dd = (eq["equity"] - peak) / peak
    return float(dd.min() * 100.0)


def metrics(trades, eq_df, final_cap, label):
    print("=" * 72)
    print(f"RESULTS: {label}")
    print("=" * 72)

    n = len(trades)
    if n == 0:
        print("No trades taken.")
        return

    wins = trades[trades["net_pnl"] > 0]
    losses = trades[trades["net_pnl"] <= 0]
    win_rate = len(wins) / n * 100
    avg_win_pts = wins["exit"].sub(wins["entry"]).mean() if len(wins) else 0.0
    avg_loss_pts = losses["exit"].sub(losses["entry"]).mean() if len(losses) else 0.0
    avg_win_pct = wins["pct_return"].mean() if len(wins) else 0.0
    avg_loss_pct = losses["pct_return"].mean() if len(losses) else 0.0
    gross_profit = wins["net_pnl"].sum()
    gross_loss = -losses["net_pnl"].sum()
    pf = (gross_profit / gross_loss) if gross_loss > 0 else float("inf")
    mdd = max_drawdown_pct(eq_df)
    total_ret = (final_cap / INITIAL_CAPITAL - 1) * 100

    print(f"Total trades       : {n}")
    print(f"Win rate           : {win_rate:.2f}%")
    print(f"Avg win            : {avg_win_pts:+.2f} pts  ({avg_win_pct:+.2f}%)")
    print(f"Avg loss           : {avg_loss_pts:+.2f} pts  ({avg_loss_pct:+.2f}%)")
    print(f"Profit factor      : {pf:.2f}")
    print(f"Max drawdown       : {mdd:.2f}%")
    print(f"Initial capital    : INR {INITIAL_CAPITAL:,.2f}")
    print(f"Final capital      : INR {final_cap:,.2f}")
    print(f"Total return       : {total_ret:+.2f}%")

    # exit reason breakdown
    er = trades["exit_reason"].value_counts().to_dict()
    print("Exit reasons       :  " +
          "  ".join(f"{k}={er.get(k, 0)}" for k in ("SL", "R1", "R2", "TIME")))

    # monthly
    t = trades.copy()
    t["month"] = pd.to_datetime(t["exit_date"]).dt.to_period("M")
    monthly = t.groupby("month")["net_pnl"].sum()
    if not monthly.empty:
        best_m = monthly.idxmax()
        worst_m = monthly.idxmin()
        print(f"Best month         : {best_m}  INR {monthly.max():,.2f}")
        print(f"Worst month        : {worst_m}  INR {monthly.min():,.2f}")

    # yearly
    t["year"] = pd.to_datetime(t["exit_date"]).dt.year
    yearly_pnl = t.groupby("year")["net_pnl"].sum()
    # year-by-year return on starting capital of that year (compounded)
    print("Year-by-year P&L (INR) and approx % on running capital:")
    running = INITIAL_CAPITAL
    for yr, pnl in yearly_pnl.items():
        pct = pnl / running * 100
        running += pnl
        print(f"  {yr}: INR {pnl:>14,.2f}   ({pct:+6.2f}%)   capital -> {running:>14,.2f}")

    print()


def main():
    print("=" * 72)
    print("NIFTY 50 PIVOT BOUNCE BACKTEST")
    print(f"Period: last {YEARS} years | Initial capital: INR {INITIAL_CAPITAL:,.0f}")
    print("NOTE: PCR filter DROPPED — option chain history not available via yfinance/stooq.")
    print("=" * 72)

    raw = download_data()
    # truncate to last 5y after preparing indicators
    df = prepare(raw)
    cutoff = df.index[-1] - pd.DateOffset(years=YEARS)
    df_bt = df[df.index >= cutoff].copy()
    print(f"Backtest window    : {df_bt.index[0].date()} -> {df_bt.index[-1].date()} ({len(df_bt)} bars)\n")

    trades_a, eq_a, cap_a = run_backtest(df_bt, use_rsi_filter=True, label="A")
    trades_b, eq_b, cap_b = run_backtest(df_bt, use_rsi_filter=False, label="B")

    metrics(trades_a, eq_a, cap_a, "RUN A — WITH RSI 35-65 filter")
    metrics(trades_b, eq_b, cap_b, "RUN B — WITHOUT RSI filter")

    trades_a.to_csv("trades_with_rsi.csv", index=False)
    trades_b.to_csv("trades_no_rsi.csv", index=False)
    print("Saved: trades_with_rsi.csv, trades_no_rsi.csv")


if __name__ == "__main__":
    main()
