# 資產簿 Asset Book

A free, private tracker for **stocks, funds, gold, silver, property and cash**: net worth, allocation, unrealised gain / loss and a daily net-worth line. English, 繁體中文 and 简体中文.

免費、私隱的資產記帳工具：股票、基金、黃金、白銀、物業和現金，一頁看清淨資產、資產分佈和盈虧。

## Privacy · 私隱

Holdings are saved only in the visitor's own browser (`localStorage`). Nothing is uploaded, and the site owner cannot see anyone's data. Visitors move data between devices with **Export / Import** (a JSON file).

資料只儲存在使用者自己的瀏覽器內，不會上載；網站擁有人亦看不到任何人的資料。

## Files

- `index.html`, `style.css`, `app.js` – the page (plain HTML/CSS/JS, no build step). All text is in the `S` table at the top of `app.js`, as `[English, 繁體, 简体]`.
- `data/prices.json` – delayed quotes and FX rates, written by `tools/fetch_prices.py`.
- `tools/fetch_prices.py` – fetches quotes (Yahoo Finance, then CNBC) for the symbols in `SYMBOLS`. Add a ticker there to price it automatically; it then also appears as a suggestion in the page's Ticker box. `--selftest` checks the parsers without network.
- `.github/workflows/prices.yml` – runs the fetcher every hour on weekdays and commits `data/prices.json` when it changes. Run it by hand from **Actions → Update prices → Run workflow**.

## Publishing

**Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. The page is then at `https://tylercheng00.github.io/asset-tracker/`.

Prices are delayed public quotes for general information only. Not investment advice.
