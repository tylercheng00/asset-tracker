#!/usr/bin/env python3
"""Fetch delayed quotes into data/prices.json for the Asset Book page.

Standard library only; run by .github/workflows/prices.yml every hour on
weekdays. Yahoo Finance is tried first (it covers US and Hong Kong shares,
gold, silver and FX), then CNBC for anything Yahoo missed. A symbol that
cannot be fetched keeps its last price, marked "stale".

To price another share or fund automatically, add it to SYMBOLS below. The
page lists these symbols as suggestions in the "Ticker" box.

    python3 tools/fetch_prices.py            # writes data/prices.json
    python3 tools/fetch_prices.py --selftest # parser checks, no network
"""
import datetime as dt
import http.cookiejar
import json
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "prices.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

# symbol shown on the page, name, currency, Yahoo symbol, CNBC symbol (None = Yahoo only)
SYMBOLS = [
    # Hong Kong
    ("0700.HK", "Tencent 騰訊控股", "HKD", "0700.HK", None),
    ("9988.HK", "Alibaba 阿里巴巴", "HKD", "9988.HK", None),
    ("3690.HK", "Meituan 美團", "HKD", "3690.HK", None),
    ("1810.HK", "Xiaomi 小米集團", "HKD", "1810.HK", None),
    ("9618.HK", "JD.com 京東集團", "HKD", "9618.HK", None),
    ("1211.HK", "BYD 比亞迪股份", "HKD", "1211.HK", None),
    ("0005.HK", "HSBC 滙豐控股", "HKD", "0005.HK", None),
    ("0388.HK", "HKEX 香港交易所", "HKD", "0388.HK", None),
    ("1299.HK", "AIA 友邦保險", "HKD", "1299.HK", None),
    ("0939.HK", "CCB 建設銀行", "HKD", "0939.HK", None),
    ("1398.HK", "ICBC 工商銀行", "HKD", "1398.HK", None),
    ("0941.HK", "China Mobile 中國移動", "HKD", "0941.HK", None),
    ("0883.HK", "CNOOC 中國海洋石油", "HKD", "0883.HK", None),
    ("0016.HK", "SHK Properties 新鴻基地產", "HKD", "0016.HK", None),
    ("0001.HK", "CK Hutchison 長和", "HKD", "0001.HK", None),
    ("0002.HK", "CLP 中電控股", "HKD", "0002.HK", None),
    ("0003.HK", "HK & China Gas 香港中華煤氣", "HKD", "0003.HK", None),
    ("0011.HK", "Hang Seng Bank 恒生銀行", "HKD", "0011.HK", None),
    ("0823.HK", "Link REIT 領展房產基金", "HKD", "0823.HK", None),
    ("2800.HK", "Tracker Fund 盈富基金", "HKD", "2800.HK", None),
    ("2828.HK", "Hang Seng China Ent. ETF 恒生中國企業", "HKD", "2828.HK", None),
    ("3033.HK", "CSOP Hang Seng TECH ETF 南方恒生科技", "HKD", "3033.HK", None),
    # United States
    ("AAPL", "Apple", "USD", "AAPL", "AAPL"),
    ("MSFT", "Microsoft", "USD", "MSFT", "MSFT"),
    ("NVDA", "NVIDIA", "USD", "NVDA", "NVDA"),
    ("AMZN", "Amazon", "USD", "AMZN", "AMZN"),
    ("GOOGL", "Alphabet", "USD", "GOOGL", "GOOGL"),
    ("META", "Meta Platforms", "USD", "META", "META"),
    ("TSLA", "Tesla", "USD", "TSLA", "TSLA"),
    ("AVGO", "Broadcom", "USD", "AVGO", "AVGO"),
    ("BRK-B", "Berkshire Hathaway B", "USD", "BRK-B", "BRK.B"),
    ("JPM", "JPMorgan Chase", "USD", "JPM", "JPM"),
    ("LLY", "Eli Lilly", "USD", "LLY", "LLY"),
    ("TSM", "TSMC ADR 台積電", "USD", "TSM", "TSM"),
    ("BABA", "Alibaba ADR", "USD", "BABA", "BABA"),
    ("PDD", "PDD Holdings", "USD", "PDD", "PDD"),
    ("SPY", "SPDR S&P 500 ETF", "USD", "SPY", "SPY"),
    ("VOO", "Vanguard S&P 500 ETF", "USD", "VOO", "VOO"),
    ("QQQ", "Invesco QQQ (Nasdaq-100)", "USD", "QQQ", "QQQ"),
    ("VT", "Vanguard Total World ETF", "USD", "VT", "VT"),
    ("TLT", "iShares 20+ Year Treasury ETF", "USD", "TLT", "TLT"),
    ("GLD", "SPDR Gold Shares", "USD", "GLD", "GLD"),
    ("SLV", "iShares Silver Trust", "USD", "SLV", "SLV"),
    # metals, US$ per troy ounce (the page converts to grams, taels, ...)
    ("GOLD", "Gold 黃金 (US$/oz)", "USD", "GC=F", "@GC.1"),
    ("SILVER", "Silver 白銀 (US$/oz)", "USD", "SI=F", "@SI.1"),
]

# currencies per US dollar; (Yahoo, CNBC). Yahoo "XXX=X" is units of XXX per US$.
FX = {
    "HKD": ("HKD=X", "HKD="),
    "CNY": ("CNY=X", "CNY="),
    "GBP": ("GBP=X", None),
    "EUR": ("EUR=X", None),
    "SGD": ("SGD=X", None),
    "JPY": ("JPY=X", None),
}
# loose sanity bounds (per US$) so an inverted or broken quote is never used
FX_RANGE = {"HKD": (7.0, 8.5), "CNY": (5.5, 9.0), "GBP": (0.5, 1.1), "EUR": (0.6, 1.3),
            "SGD": (1.0, 1.8), "JPY": (80, 250)}


def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    v = str(v).replace(",", "").replace("%", "").replace("+", "").strip()
    try:
        return float(v)
    except ValueError:
        return None


class Http:
    def __init__(self):
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def get(self, url, referer=None):
        h = {"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9"}
        if referer:
            h["Referer"] = referer
        try:
            with self.op.open(urllib.request.Request(url, headers=h), timeout=20) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404 and "fc.yahoo.com" in url:   # only needed for its cookie
                return b""
            raise


def parse_yahoo(data):
    out = {}
    for q in json.loads(data)["quoteResponse"]["result"]:
        price, prev = num(q.get("regularMarketPrice")), num(q.get("regularMarketPreviousClose"))
        if price:
            out[q["symbol"]] = (price, prev or price)
    return out


def yahoo(http, syms):
    http.get("https://fc.yahoo.com/")
    crumb = http.get("https://query2.finance.yahoo.com/v1/test/getcrumb").decode().strip()
    if not crumb or "<" in crumb:
        raise ValueError("no crumb")
    out = {}
    for i in range(0, len(syms), 40):
        url = ("https://query2.finance.yahoo.com/v7/finance/quote?symbols="
               + urllib.parse.quote(",".join(syms[i:i + 40]), safe=",") + "&crumb=" + urllib.parse.quote(crumb))
        out.update(parse_yahoo(http.get(url)))
    return out


def parse_cnbc(data):
    out = {}
    quotes = json.loads(data)["FormattedQuoteResult"]["FormattedQuote"]
    if isinstance(quotes, dict):
        quotes = [quotes]
    for q in quotes:
        price, change = num(q.get("last")), num(q.get("change"))
        prev = price - change if price is not None and change is not None else num(q.get("previous_day_closing"))
        if price:
            out[q["symbol"]] = (price, prev or price)
    return out


def cnbc(http, syms):
    url = ("https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols="
           + urllib.parse.quote("|".join(syms), safe="")
           + "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=0&output=json&events=0")
    return parse_cnbc(http.get(url, "https://www.cnbc.com/"))


PROVIDERS = [("Yahoo Finance", 0, yahoo), ("CNBC", 1, cnbc)]


def fetch(rows):
    """rows: [(key, (yahoo, cnbc))] -> {key: (price, prev, source)}"""
    got = {}
    http = Http()
    for label, idx, fn in PROVIDERS:
        need = [(k, ids[idx]) for k, ids in rows if k not in got and ids[idx]]
        if not need:
            continue
        try:
            res = fn(http, [s for _, s in need])
        except Exception as e:  # noqa: BLE001 - try the next source
            print(f"{label}: failed ({e})", file=sys.stderr)
            continue
        n = 0
        for k, s in need:
            if s in res:
                got[k] = (*res[s], label)
                n += 1
        print(f"{label}: {n}/{len(need)}", file=sys.stderr)
    return got


def selftest():
    y = parse_yahoo(b'{"quoteResponse":{"result":[{"symbol":"0700.HK","regularMarketPrice":520.5,"regularMarketPreviousClose":515}]}}')
    assert y == {"0700.HK": (520.5, 515.0)}, y
    c = parse_cnbc(b'{"FormattedQuoteResult":{"FormattedQuote":[{"symbol":"@GC.1","last":"3,980.10","change":"+12.40"}]}}')
    assert abs(c["@GC.1"][1] - 3967.7) < 1e-9, c
    assert all(len(r) == 5 for r in SYMBOLS) and len({r[0] for r in SYMBOLS}) == len(SYMBOLS)
    print("selftest ok")


def main():
    if "--selftest" in sys.argv:
        selftest()
        return
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8"))
        except ValueError:
            old = {}
    old_q, old_fx = old.get("quotes") or {}, old.get("fx") or {}

    got = fetch([(r[0], (r[3], r[4])) for r in SYMBOLS])
    fx_got = fetch([("FX:" + c, ids) for c, ids in FX.items()])
    print(f"{len(got)}/{len(SYMBOLS)} quotes, {len(fx_got)}/{len(FX)} FX rates", file=sys.stderr)
    if not got and not fx_got:
        print("nothing fetched; keeping the existing file", file=sys.stderr)
        return

    quotes = {}
    for sym, name, ccy, _, _ in SYMBOLS:
        if sym in got:
            price, prev, src = got[sym]
            quotes[sym] = {"name": name, "ccy": ccy, "price": round(price, 4), "prev": round(prev, 4), "src": src}
        elif sym in old_q:
            quotes[sym] = dict(old_q[sym], name=name, ccy=ccy, stale=True)
    fx = {"USD": 1}
    for c in FX:
        v = fx_got.get("FX:" + c)
        lo, hi = FX_RANGE[c]
        if v and lo <= v[0] <= hi:
            fx[c] = round(v[0], 6)
        elif c in old_fx:
            fx[c] = old_fx[c]

    out = {"updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "fx": fx, "quotes": quotes}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
