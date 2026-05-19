"""
Nifty 50 — Top 5 Strategies Backtest (last 5 years, daily data)

S1. Short cash-secured puts (weekly, 5% OTM)  — SIMULATED w/ BS + India VIX
S2. VIX premium harvest (short straddle on VIX spike) — SIMULATED w/ BS
S3. RSI(2) mean reversion on NIFTY                    — clean
S4. Pairs trading NIFTY vs BANKNIFTY                  — clean
S5. Carry trade                                       — N/A on equity index

Bias notes for the SIMULATED strategies:
  - Using India VIX as IV for all strikes ignores volatility skew. Real OTM
    puts trade at higher IV than ATM, so S1's premium income (and edge) is
    UNDERSTATED here. Real-world numbers should be modestly better.
  - No bid/ask, no early assignment, no margin calls modeled.
  - These are first-cut estimates, NOT a substitute for options-data backtest.
"""

import math
import sys
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

INITIAL_CAPITAL = 1_000_000.0
YEARS = 5
COST_BPS = 5            # 0.05% per side
RISK_FREE = 0.065       # India 10y proxy


# ---------- Black-Scholes (no scipy) ----------
def norm_cdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def bs_put(S, K, T, r, sigma):
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return max(0.0, K - S)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1)


def bs_call(S, K, T, r, sigma):
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return max(0.0, S - K)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)


# ---------- Data ----------
def download(ticker):
    import yfinance as yf
    end = datetime.today()
    start = end - timedelta(days=YEARS * 365 + 400)
    df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=False)
    if df is None or df.empty:
        return None
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    cols = [c for c in ["Open", "High", "Low", "Close"] if c in df.columns]
    return df[cols].dropna()


def wilder_rsi(close, period):
    delta = close.diff()
    g = delta.clip(lower=0)
    l = -delta.clip(upper=0)
    ag = g.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    al = l.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = ag / al.replace(0, np.nan)
    return 100 - 100 / (1 + rs)


# ---------- Metrics ----------
def report(label, trades, eq, final_cap, notes=""):
    print("=" * 78)
    print(label)
    if notes:
        print("  " + notes)
    print("=" * 78)
    n = len(trades)
    if n == 0:
        print("  No trades.\n")
        return
    pnl = trades["pnl"]
    wins = trades[pnl > 0]
    losses = trades[pnl <= 0]
    wr = len(wins) / n * 100
    avgw = wins["pnl"].mean() if len(wins) else 0.0
    avgl = losses["pnl"].mean() if len(losses) else 0.0
    gp = wins["pnl"].sum()
    gl = -losses["pnl"].sum()
    pf = (gp / gl) if gl > 0 else float("inf")
    if eq is not None and len(eq) > 1:
        peak = eq.cummax()
        dd = ((eq - peak) / peak).min() * 100
    else:
        dd = 0.0
    tot = (final_cap / INITIAL_CAPITAL - 1) * 100

    print(f"  Trades        : {n}")
    print(f"  Win rate      : {wr:.2f}%")
    print(f"  Avg win       : INR {avgw:+,.2f}")
    print(f"  Avg loss      : INR {avgl:+,.2f}")
    print(f"  Profit factor : {pf:.2f}")
    print(f"  Max drawdown  : {dd:.2f}%")
    print(f"  Final capital : INR {final_cap:,.2f}")
    print(f"  Total return  : {tot:+.2f}%")
    print()


# ---------- S1: Short cash-secured puts (weekly, 5% OTM) ----------
def s1_short_puts(nifty, vix):
    df = nifty.join(vix["Close"].rename("VIX"), how="inner").dropna()
    cap = INITIAL_CAPITAL
    trades, eq = [], []
    weekly = df[df.index.weekday == 3]  # Thursdays = NIFTY weekly expiry day
    for ent_date, row in weekly.iterrows():
        future = df[df.index > ent_date]
        if future.empty:
            break
        # exit ~7 calendar days later
        target = ent_date + pd.Timedelta(days=7)
        post = future[future.index >= target]
        if post.empty:
            break
        exit_date = post.index[0]
        S = float(row["Close"])
        K = S * 0.95
        iv = float(row["VIX"]) / 100.0
        T = (exit_date - ent_date).days / 365.0
        premium = bs_put(S, K, T, RISK_FREE, iv)
        S_T = float(df.loc[exit_date, "Close"])
        loss = max(0.0, K - S_T)
        per_unit = premium - loss
        units = cap / K                          # cash-secured sizing
        gross = per_unit * units
        cost = (premium + loss) * units * (COST_BPS / 10000)
        net = gross - cost
        cap += net
        trades.append({"date": ent_date.date(), "exit": exit_date.date(),
                       "S": round(S, 2), "K": round(K, 2), "S_T": round(S_T, 2),
                       "iv": round(iv, 3), "prem": round(premium, 2),
                       "pnl": round(net, 2), "cap": round(cap, 2)})
        eq.append((exit_date, cap))
    eq_s = pd.Series({d: c for d, c in eq}).sort_index()
    return pd.DataFrame(trades), eq_s, cap


# ---------- S2: VIX premium harvest (short straddle on VIX spike) ----------
def s2_vix_harvest(nifty, vix):
    df = nifty.join(vix["Close"].rename("VIX"), how="inner").dropna()
    df["VIX_MA"] = df["VIX"].rolling(20).mean()
    df["VIX_SD"] = df["VIX"].rolling(20).std()
    df["sig"] = df["VIX"] > (df["VIX_MA"] + 0.5 * df["VIX_SD"])
    cap = INITIAL_CAPITAL
    trades, eq = [], []
    i, n = 0, len(df)
    while i < n:
        row = df.iloc[i]
        if pd.isna(row["VIX_MA"]) or not bool(row["sig"]):
            i += 1
            continue
        j = min(i + 7, n - 1)
        ent_date, exit_date = df.index[i], df.index[j]
        S = float(row["Close"])
        K = S
        iv = float(row["VIX"]) / 100.0
        T = (exit_date - ent_date).days / 365.0
        prem = bs_call(S, K, T, RISK_FREE, iv) + bs_put(S, K, T, RISK_FREE, iv)
        S_T = float(df.iloc[j]["Close"])
        intrinsic = abs(S_T - K)
        per_unit = prem - intrinsic
        units = cap / S                          # rough sizing
        gross = per_unit * units
        cost = (prem + intrinsic) * units * (COST_BPS / 10000)
        net = gross - cost
        cap += net
        trades.append({"date": ent_date.date(), "exit": exit_date.date(),
                       "S": round(S, 2), "S_T": round(S_T, 2),
                       "iv": round(iv, 3), "prem": round(prem, 2),
                       "pnl": round(net, 2), "cap": round(cap, 2)})
        eq.append((exit_date, cap))
        i = j + 1
    eq_s = pd.Series({d: c for d, c in eq}).sort_index() if eq else pd.Series(dtype=float)
    return pd.DataFrame(trades), eq_s, cap


# ---------- S3: RSI(2) mean reversion on NIFTY ----------
def s3_rsi2(nifty):
    df = nifty.copy()
    df["SMA200"] = df["Close"].rolling(200).mean()
    df["RSI2"] = wilder_rsi(df["Close"], 2)
    cap = INITIAL_CAPITAL
    trades, eq = [], []
    i, n = 0, len(df)
    while i < n:
        row = df.iloc[i]
        if pd.isna(row["SMA200"]) or pd.isna(row["RSI2"]):
            i += 1
            continue
        if not (row["Close"] > row["SMA200"] and row["RSI2"] < 10):
            i += 1
            continue
        entry = float(row["Close"])
        ent_date = df.index[i]
        exit_price, exit_date, bars = None, None, 0
        for k in range(1, 6):
            if i + k >= n:
                break
            bars = k
            ck = df.iloc[i + k]
            if (not pd.isna(ck["RSI2"]) and ck["RSI2"] > 70) or k == 5:
                exit_price = float(ck["Close"])
                exit_date = df.index[i + k]
                break
        if exit_price is None:
            i += 1
            continue
        units = cap / entry
        gross = (exit_price - entry) * units
        cost = (entry + exit_price) * units * (COST_BPS / 10000)
        net = gross - cost
        cap += net
        trades.append({"date": ent_date.date(), "exit": exit_date.date(),
                       "entry": round(entry, 2), "exit_p": round(exit_price, 2),
                       "bars": bars, "pnl": round(net, 2), "cap": round(cap, 2)})
        eq.append((exit_date, cap))
        i = i + bars + 1
    eq_s = pd.Series({d: c for d, c in eq}).sort_index() if eq else pd.Series(dtype=float)
    return pd.DataFrame(trades), eq_s, cap


# ---------- S4: Pairs trading NIFTY vs BANKNIFTY ----------
def s4_pairs(nifty, banknifty):
    df = pd.DataFrame({"NIFTY": nifty["Close"], "BANK": banknifty["Close"]}).dropna()
    df["ratio"] = df["BANK"] / df["NIFTY"]
    df["MA"] = df["ratio"].rolling(60).mean()
    df["SD"] = df["ratio"].rolling(60).std()
    df["Z"] = (df["ratio"] - df["MA"]) / df["SD"]
    cap = INITIAL_CAPITAL
    trades, eq = [], []
    in_pos, ent_idx = None, None
    for i in range(len(df)):
        row = df.iloc[i]
        if pd.isna(row["Z"]):
            continue
        if in_pos is None:
            if row["Z"] > 2:
                in_pos, ent_idx = "short_bank", i  # short BANK, long NIFTY
            elif row["Z"] < -2:
                in_pos, ent_idx = "long_bank", i   # long BANK, short NIFTY
        else:
            # exit on mean reversion OR after 30 trading days (stop-out)
            stale = (i - ent_idx) >= 30
            if abs(row["Z"]) < 0.5 or stale:
                ent = df.iloc[ent_idx]
                ent_b, ent_n = float(ent["BANK"]), float(ent["NIFTY"])
                ex_b, ex_n = float(row["BANK"]), float(row["NIFTY"])
                leg = cap / 2
                b_units = leg / ent_b
                n_units = leg / ent_n
                if in_pos == "long_bank":
                    pnl = (ex_b - ent_b) * b_units - (ex_n - ent_n) * n_units
                else:
                    pnl = -(ex_b - ent_b) * b_units + (ex_n - ent_n) * n_units
                notional = (ent_b * b_units + ent_n * n_units +
                            ex_b * b_units + ex_n * n_units)
                cost = notional * (COST_BPS / 10000)
                net = pnl - cost
                cap += net
                trades.append({"date": df.index[ent_idx].date(),
                               "exit": df.index[i].date(),
                               "side": in_pos,
                               "z_entry": round(float(ent["Z"]), 2),
                               "z_exit": round(float(row["Z"]), 2),
                               "stale": stale,
                               "pnl": round(net, 2),
                               "cap": round(cap, 2)})
                eq.append((df.index[i], cap))
                in_pos, ent_idx = None, None
    eq_s = pd.Series({d: c for d, c in eq}).sort_index() if eq else pd.Series(dtype=float)
    return pd.DataFrame(trades), eq_s, cap


def main():
    print("=" * 78)
    print("NIFTY 50 — TOP 5 STRATEGIES BACKTEST (last 5 years)")
    print(f"Initial capital: INR {INITIAL_CAPITAL:,.0f} | Costs: {COST_BPS} bps/side")
    print("=" * 78)

    print("\nDownloading data...")
    nifty = download("^NSEI")
    bank = download("^NSEBANK")
    vix = download("^INDIAVIX")
    if nifty is None or nifty.empty:
        print("ERROR: NIFTY data unavailable. Aborting.")
        sys.exit(1)
    print(f"  NIFTY   : {len(nifty)} rows  ({nifty.index[0].date()} → {nifty.index[-1].date()})")
    if bank is not None: print(f"  BANK    : {len(bank)} rows  ({bank.index[0].date()} → {bank.index[-1].date()})")
    if vix is not None:  print(f"  IND VIX : {len(vix)} rows  ({vix.index[0].date()} → {vix.index[-1].date()})")

    # 5y window
    cutoff = nifty.index[-1] - pd.DateOffset(years=YEARS)
    nifty5 = nifty[nifty.index >= cutoff]
    bank5  = bank[bank.index >= cutoff] if bank is not None else None
    vix5   = vix[vix.index >= cutoff] if vix is not None else None
    print(f"\nBacktest window: {nifty5.index[0].date()} → {nifty5.index[-1].date()} ({len(nifty5)} bars)\n")

    # --- S1 ---
    if vix5 is not None and not vix5.empty:
        t1, e1, c1 = s1_short_puts(nifty5, vix5)
        report("S1 — Short cash-secured puts (weekly, 5% OTM)  [SIMULATED]",
               t1, e1, c1,
               notes="IV proxy = India VIX. Assumes weekly Thursday expiry, 1-week hold.")
        t1.to_csv("s1_short_puts.csv", index=False)
    else:
        print("S1 SKIPPED — India VIX unavailable.\n")

    # --- S2 ---
    if vix5 is not None and not vix5.empty:
        t2, e2, c2 = s2_vix_harvest(nifty5, vix5)
        report("S2 — VIX premium harvest (short ATM straddle on VIX spike)  [SIMULATED]",
               t2, e2, c2,
               notes="Trigger: VIX > 20d MA + 0.5 SD. 7-day hold. IV = current VIX.")
        t2.to_csv("s2_vix_harvest.csv", index=False)
    else:
        print("S2 SKIPPED — India VIX unavailable.\n")

    # --- S3 ---
    t3, e3, c3 = s3_rsi2(nifty5)
    report("S3 — RSI(2) mean reversion on NIFTY (Connors-style)",
           t3, e3, c3,
           notes="Long if Close > 200-SMA AND RSI(2) < 10. Exit RSI(2) > 70 or 5 bars.")
    t3.to_csv("s3_rsi2.csv", index=False)

    # --- S4 ---
    if bank5 is not None and not bank5.empty:
        t4, e4, c4 = s4_pairs(nifty5, bank5)
        report("S4 — Pairs trading: NIFTY vs BANKNIFTY (ratio z-score)",
               t4, e4, c4,
               notes="Z = (ratio - 60d MA) / 60d SD. Entry |Z|>2, exit |Z|<0.5 or 30d.")
        t4.to_csv("s4_pairs.csv", index=False)
    else:
        print("S4 SKIPPED — BANKNIFTY unavailable.\n")

    # --- S5 ---
    print("=" * 78)
    print("S5 — Carry trade")
    print("=" * 78)
    print("  N/A. Carry strategies apply to FX (rate differentials) or commodity")
    print("  futures (contango/backwardation roll yield). Nifty 50 has no carry leg.")
    print("  The closest equivalent — index futures basis — needs intraday futures")
    print("  data not available via yfinance.\n")

    print("CSVs saved: s1_short_puts.csv  s2_vix_harvest.csv  s3_rsi2.csv  s4_pairs.csv")


if __name__ == "__main__":
    main()
