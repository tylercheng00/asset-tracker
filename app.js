/* Asset Book — a private, browser-only tracker of holdings.
   Holdings are kept in localStorage (key STORE) and never leave the browser.
   data/prices.json (tools/fetch_prices.py) supplies delayed quotes and FX. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var STORE = 'ab.v1';
  var STALE_DAYS = 30;
  var OZ_G = 31.1034768;
  var UNIT_OZ = { oz: 1, tael: 37.429 / OZ_G, g: 1 / OZ_G, kg: 1000 / OZ_G };
  var ORDER = ['stock', 'fund', 'gold', 'silver', 'property', 'cash', 'other'];
  var CCYS = ['HKD', 'USD', 'CNY', 'GBP', 'EUR', 'SGD', 'JPY'];
  var SYM = { HKD: 'HK$', USD: 'US$', CNY: 'CN¥', GBP: '£', EUR: '€', SGD: 'S$', JPY: '¥' };
  var FX_DEFAULT = { USD: 1, HKD: 7.8, CNY: 7.2, GBP: 0.78, EUR: 0.92, SGD: 1.33, JPY: 150 };

  /* ---------- text: [English, 繁體, 简体] ---------- */
  var S = {
    title: ['Asset Book', '資產簿', '资产簿'],
    tagline: ['Stocks, funds, gold, silver, property and cash: your net worth on one page.', '股票、基金、黃金、白銀、物業和現金，一頁看清淨資產。', '股票、基金、黄金、白银、房产和现金，一页看清净资产。'],
    showIn: ['Show totals in', '顯示貨幣', '显示货币'],
    exampleBanner: ['<b>These are made-up example figures, not anyone\'s real holdings.</b> They disappear as soon as you add your first own holding.', '<b>以下是虛構的示例數字，並非任何人的真實資產。</b>新增第一項你自己的資產後，示例會自動消失。', '<b>以下是虚构的示例数字，并非任何人的真实资产。</b>新增第一项你自己的资产后，示例会自动消失。'],
    clearExample: ['Clear the example and start', '清空示例，從零開始', '清空示例，从零开始'],
    allocation: ['Allocation', '資產分佈', '资产分布'],
    trend: ['Net worth over time', '淨資產走勢', '净资产走势'],
    holdings: ['Holdings', '持倉明細', '持仓明细'],
    add: ['+ Add holding', '＋ 新增資產', '＋ 新增资产'],
    export: ['Export backup', '匯出備份', '导出备份'],
    import: ['Import backup', '匯入備份', '导入备份'],
    wipe: ['Delete all', '全部刪除', '全部删除'],
    privacyH: ['Your data stays with you', '資料只在你手上', '数据只在你手上'],
    privacyP: ['Everything you enter is saved only in this browser on this device. Nothing is uploaded, and nobody else, including the person who made this page, can see it. To use another device, or to keep a backup, press Export and Import.', '你輸入的一切只儲存在這部裝置的瀏覽器內，不會上載。其他人（包括製作本頁的人）都看不到。想在另一部裝置使用或保留備份，請用「匯出」和「匯入」。', '你输入的一切只保存在这台设备的浏览器内，不会上传。其他人（包括制作本页的人）都看不到。想在另一台设备使用或保留备份，请用“导出”和“导入”。'],
    pricesH: ['Where prices come from', '價格從哪裏來', '价格从哪里来'],
    pricesP: ['Listed Hong Kong and US shares, major ETFs, gold, silver and exchange rates are updated automatically about once an hour on weekdays, from delayed public quotes. For anything else (other shares, funds, property), enter the price yourself.', '常見港股、美股、主要 ETF、金價、銀價及匯率，會在平日約每小時按延遲的公開報價自動更新。其他資產（其他股票、基金、物業）請自行輸入價格。', '常见港股、美股、主要 ETF、金价、银价及汇率，会在工作日约每小时按延迟的公开报价自动更新。其他资产（其他股票、基金、房产）请自行输入价格。'],
    disclaimerH: ['Not advice', '並非投資建議', '并非投资建议'],
    disclaimerP: ['A record-keeping tool only. Prices may be delayed or wrong, and property values are only as good as your own estimate. Nothing here is investment advice or an offer to buy or sell anything, and the page cannot see or trade any brokerage account.', '本頁只是記帳工具。價格或有延遲或錯誤，物業價值取決於你自己的估算。本頁內容不構成投資建議，亦非任何買賣要約，且無法查看或操作任何證券帳戶。', '本页只是记账工具。价格可能有延迟或错误，房产价值取决于你自己的估算。本页内容不构成投资建议，也不是任何买卖要约，且无法查看或操作任何证券账户。'],
    madeBy: ['Made by', '製作：', '制作：'],
    madeByLink: ['Tyler Tik Man Cheng', '鄭迪珉 Tyler Cheng', '郑迪珉 Tyler Cheng'],
    fType: ['Type', '類別', '类别'],
    fName: ['Name', '名稱', '名称'],
    fSymbol: ['Ticker (optional)', '代號（可選）', '代码（可选）'],
    fUnit: ['Unit', '單位', '单位'],
    fCcy: ['Currency', '貨幣', '货币'],
    fLoan: ['Mortgage outstanding', '按揭餘額', '房贷余额'],
    save: ['Save', '儲存', '保存'],
    cancel: ['Cancel', '取消', '取消'],
    t_stock: ['Stocks', '股票', '股票'], t_fund: ['Funds & ETFs', '基金及 ETF', '基金及 ETF'], t_gold: ['Gold', '黃金', '黄金'],
    t_silver: ['Silver', '白銀', '白银'], t_property: ['Property', '物業', '房产'], t_cash: ['Cash & deposits', '現金及存款', '现金及存款'], t_other: ['Other', '其他', '其他'],
    u_oz: ['troy oz', '安士', '盎司'], u_tael: ['tael (HK)', '兩（港制）', '两（港制）'], u_g: ['gram', '克', '克'], u_kg: ['kg', '公斤', '公斤'],
    c_HKD: ['HK dollar', '港元', '港元'], c_USD: ['US dollar', '美元', '美元'], c_CNY: ['Chinese yuan', '人民幣', '人民币'], c_GBP: ['British pound', '英鎊', '英镑'],
    c_EUR: ['Euro', '歐元', '欧元'], c_SGD: ['Singapore dollar', '新加坡元', '新加坡元'], c_JPY: ['Japanese yen', '日圓', '日元'],
    netWorth: ['Net worth', '淨資產', '净资产'], assets: ['Total assets', '總資產', '总资产'], loans: ['Mortgages', '按揭負債', '房贷负债'], pl: ['Unrealised gain / loss', '未實現盈虧', '未实现盈亏'],
    netSub: ['Assets minus mortgages', '總資產減按揭', '总资产减房贷'], missing: ['{n} without a price', '{n} 項未有價格', '{n} 项没有价格'],
    kinds: ['{n} asset types', '{n} 類資產', '{n} 类资产'], ratio: ['Debt ratio {p}', '負債比率 {p}', '负债比率 {p}'],
    onCost: ['{p} on cost', '按成本 {p}', '按成本 {p}'], addCost: ['Add a cost to see this', '輸入成本即可計算', '输入成本即可计算'],
    allocEmpty: ['Add holdings to see how they are split.', '新增資產後，這裏會顯示每類資產佔多少。', '新增资产后，这里会显示每类资产占多少。'],
    histExample: ['Once you track your own holdings, your net worth is noted once a day and drawn here from the second day.', '開始記錄你自己的資產後，每天會自動記下一次淨資產，第二天起在這裏畫出走勢。', '开始记录你自己的资产后，每天会自动记下一次净资产，第二天起在这里画出走势。'],
    histWait: ['Your net worth is noted once a day when you open or update this page. The line appears from the second day.', '每天打開或更新時會記下一次淨資產，由第二天起在這裏顯示走勢。', '每天打开或更新时会记下一次净资产，从第二天起在这里显示走势。'],
    since: ['since {d}', '自 {d}', '自 {d}'],
    chartLabel: ['Net worth by day', '每日淨資產', '每日净资产'],
    tableEmpty: ['No holdings yet. Press “+ Add holding” to add your first one, such as a share or a bank account.', '尚未有資產。按「＋ 新增資產」加入第一項，例如一隻股票或一個銀行戶口。', '还没有资产。按“＋ 新增资产”加入第一项，例如一只股票或一个银行账户。'],
    thHolding: ['Holding', '資產', '资产'], thQty: ['Quantity', '數量', '数量'], thPrice: ['Price', '現價', '现价'], thValue: ['Value ({c})', '市值（{c}）', '市值（{c}）'], thPl: ['Gain / loss', '盈虧', '盈亏'], thAct: ['Actions', '操作', '操作'],
    noPrice: ['No price', '未有價格', '没有价格'], live: ['Live', '自動', '自动'], liveStale: ['Last known quote', '最後報價', '最后报价'],
    updatedOn: ['Updated {d}', '更新於 {d}', '更新于 {d}'], daysAgo: ['{n} days ago', '{n} 天前更新', '{n} 天前更新'],
    mortgage: ['Mortgage', '按揭', '房贷'], units: ['unit(s)', '個', '个'],
    edit: ['Edit', '編輯', '编辑'], del: ['Delete', '刪除', '删除'],
    addTitle: ['Add a holding', '新增資產', '新增资产'], editTitle: ['Edit holding', '編輯資產', '编辑资产'],
    lQty: ['Quantity', '數量', '数量'], lAmount: ['Amount', '金額', '金额'], lUnits: ['Number of units', '單位數目', '套数'],
    lPrice: ['Current price per unit', '現價（每單位）', '现价（每单位）'], lValuation: ['Current valuation (each)', '現時估值（每個單位）', '当前估值（每套）'],
    lCost: ['Total cost (optional)', '總成本（可選）', '总成本（可选）'], lPurchase: ['Purchase price', '購入價', '买入价'],
    blankLive: ['Blank = automatic price', '留空 = 自動報價', '留空 = 自动报价'],
    h_stock: ['Shares in the suggestion list are priced automatically: leave the price blank. For other shares, enter the latest price. Cost is the total you paid, used for gain / loss.', '建議清單內的股票會自動計價，價格可以留空；其他股票請輸入最新價格。成本填買入總金額，用來計算盈虧。', '建议列表内的股票会自动计价，价格可以留空；其他股票请输入最新价格。成本填买入总金额，用来计算盈亏。'],
    h_fund: ['ETFs in the suggestion list are priced automatically. For unit trusts and MPF funds, enter the latest NAV per unit.', '建議清單內的 ETF 會自動計價；單位信託及強積金基金請輸入最新每單位資產淨值。', '建议列表内的 ETF 会自动计价；其他基金请输入最新每单位净值。'],
    h_gold: ['Leave the price blank to use the delayed spot price, converted to the unit you choose. Bars and coins usually sell a little above or below spot.', '價格留空即按延遲現貨價自動計算，並換算成所選單位。實金買賣價通常與現貨價有些差距。', '价格留空即按延迟现货价自动计算，并换算成所选单位。实物金的买卖价通常与现货价有些差距。'],
    h_silver: ['Leave the price blank to use the delayed spot price, converted to the unit you choose.', '價格留空即按延遲現貨價自動計算，並換算成所選單位。', '价格留空即按延迟现货价自动计算，并换算成所选单位。'],
    h_property: ['Use a recent bank or surveyor valuation. The mortgage is subtracted from your net worth.', '可參考銀行或測量師的最新估價。按揭餘額會從淨資產中扣除。', '可参考银行或评估机构的最新估价。房贷余额会从净资产中扣除。'],
    h_cash: ['Bank balances and time deposits: enter the amount.', '銀行結餘、定期存款等，直接輸入金額。', '银行余额、定期存款等，直接输入金额。'],
    h_other: ['Enter the quantity and the current price per unit.', '輸入數量及現時每單位價格。', '输入数量及当前每单位价格。'],
    eName: ['Enter a name.', '請輸入名稱。', '请输入名称。'], eQty: ['Enter the quantity.', '請輸入數量。', '请输入数量。'], eAmount: ['Enter the amount.', '請輸入金額。', '请输入金额。'],
    ePrice: ['Enter the current price; it is needed to work out the value.', '請輸入現價，市值要用它來計算。', '请输入现价，市值要用它来计算。'],
    added: ['Added “{x}”.', '已新增「{x}」。', '已新增“{x}”。'], updated: ['Updated “{x}”.', '已更新「{x}」。', '已更新“{x}”。'], deleted: ['Deleted “{x}”.', '已刪除「{x}」。', '已删除“{x}”。'],
    askDel: ['Delete “{x}”?', '刪除「{x}」？', '删除“{x}”？'], askDelP: ['It will be removed from your Asset Book.', '這項資產會從你的資產簿移除。', '这项资产会从你的资产簿移除。'],
    askWipe: ['Delete all holdings and history?', '刪除全部資產及走勢紀錄？', '删除全部资产及走势记录？'], askWipeP: ['This cannot be undone. Export a backup first if you want to keep a copy.', '刪除後無法復原。如需保留，請先按「匯出備份」。', '删除后无法恢复。如需保留，请先按“导出备份”。'],
    wiped: ['All data deleted.', '已刪除全部資料。', '已删除全部数据。'],
    askImport: ['Replace your data with this backup?', '以備份取代現有資料？', '用备份替换现有数据？'], askImportP: ['The backup has {a} holding(s) and will replace your current {b}, including the history.', '備份內有 {a} 項資產，會取代現有的 {b} 項及走勢紀錄。', '备份内有 {a} 项资产，会替换现有的 {b} 项及走势记录。'],
    replace: ['Replace', '取代', '替换'],
    imported: ['Imported {n} holding(s).', '已匯入 {n} 項資產。', '已导入 {n} 项资产。'], badFile: ['That file is not an Asset Book backup.', '這個檔案不是資產簿的備份檔。', '这个文件不是资产簿的备份文件。'], emptyFile: ['The backup has no holdings.', '備份檔內沒有資產。', '备份文件内没有资产。'],
    exported: ['Backup saved. It lists everything you own, so keep it somewhere safe.', '已匯出備份。檔案列出你的全部資產，請妥善保管。', '已导出备份。文件列出你的全部资产，请妥善保管。'],
    noStore: ['This browser is not saving data (private mode or storage blocked). Export a backup before you close the page.', '此瀏覽器未能儲存資料（私密模式或儲存被封鎖）。關閉頁面前請先匯出備份。', '此浏览器无法保存数据（无痕模式或存储被禁用）。关闭页面前请先导出备份。'],
    pricesAt: ['Prices as of {d} · delayed', '報價時間：{d} · 延遲報價', '报价时间：{d} · 延迟报价'],
    pricesNone: ['Automatic prices are not available right now, so the prices you entered are used. Exchange rates are assumed: US$1 = HK$7.80.', '暫時未能取得自動報價，會使用你輸入的價格；匯率假設為 1 美元兌 7.80 港元。', '暂时无法取得自动报价，会使用你输入的价格；汇率假设为 1 美元兑 7.80 港元。'],
    goldOz: ['Gold {p}/oz', '金價 {p}/安士', '金价 {p}/盎司'], silverOz: ['Silver {p}/oz', '銀價 {p}/安士', '银价 {p}/盎司'],
    exampleName1: ['Tencent', '騰訊控股', '腾讯控股'], exampleName3: ['Tracker Fund', '盈富基金', '盈富基金'], exampleName4: ['Gold bar', '金條', '金条'],
    exampleName5: ['Silver coins', '銀幣', '银币'], exampleName6: ['Home', '自住單位', '自住房'], exampleName7: ['Savings and time deposits', '儲蓄及定期存款', '储蓄及定期存款']
  };
  var LI = { en: 0, hant: 1, hans: 2 };
  var lang = root.getAttribute('data-lang') || 'hant';
  function t(k, vars) {
    var s = (S[k] || [k])[LI[lang]] || S[k][0];
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  }

  /* ---------- helpers ---------- */
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { var x = parseFloat(v); return isFinite(x) && x >= 0 ? x : null; }
  function money(v, ccy, dec) {
    if (v == null || !isFinite(v)) return '—';
    var d = dec != null ? dec : (Math.abs(v) >= 1000 || ccy === 'JPY' ? 0 : 2);
    return (v < 0 ? '−' : '') + SYM[ccy] + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function signed(v, ccy) { return (v > 0 ? '+' : '') + money(v, ccy); }
  function pct(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%'; }

  /* ---------- state ---------- */
  function blank() { return { v: 1, base: 'HKD', items: [], hist: {}, dismissed: false }; }
  function clean(s) {
    var b = blank();
    if (!s || typeof s !== 'object') return b;
    if (SYM[s.base]) b.base = s.base;
    if (Array.isArray(s.items)) b.items = s.items.filter(function (it) { return it && ORDER.indexOf(it.type) >= 0 && SYM[it.ccy] && typeof it.name === 'string'; })
      .map(function (it) { it.id = String(it.id || uid()); return it; });
    if (s.hist && typeof s.hist === 'object') Object.keys(s.hist).forEach(function (d) { if (/^\d{4}-\d\d-\d\d$/.test(d) && isFinite(s.hist[d])) b.hist[d] = +s.hist[d]; });
    b.dismissed = !!s.dismissed;
    return b;
  }
  var state = blank(), canStore = true;
  try { state = clean(JSON.parse(localStorage.getItem(STORE))); } catch (e) { canStore = false; }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); canStore = true; }
    catch (e) { if (canStore) msg(t('noStore')); canStore = false; }
  }

  /* ---------- prices ---------- */
  var prices = { updated: null, fx: {}, quotes: {} };
  function fxOf(c) { return prices.fx[c] || FX_DEFAULT[c] || 1; }
  function conv(v, from, to) { return from === to ? v : v / fxOf(from) * fxOf(to); }
  function quoteFor(it) {
    if (it.type === 'gold' || it.type === 'silver') {
      var q = prices.quotes[it.type === 'gold' ? 'GOLD' : 'SILVER'];
      return q ? { price: conv(q.price * (UNIT_OZ[it.unit] || 1), q.ccy || 'USD', it.ccy), stale: q.stale } : null;
    }
    if ((it.type === 'stock' || it.type === 'fund') && it.symbol) {
      var s = prices.quotes[it.symbol];
      return s ? { price: conv(s.price, s.ccy || 'USD', it.ccy), stale: s.stale } : null;
    }
    return null;
  }

  /* ---------- valuation ---------- */
  var EXAMPLE = [
    { type: 'stock', nameKey: 'exampleName1', symbol: '0700.HK', ccy: 'HKD', qty: 200, price: 520, cost: 76000 },
    { type: 'stock', name: 'Apple', symbol: 'AAPL', ccy: 'USD', qty: 25, price: 268, cost: 4500 },
    { type: 'fund', nameKey: 'exampleName3', symbol: '2800.HK', ccy: 'HKD', qty: 2000, price: 25.4, cost: 40000 },
    { type: 'gold', nameKey: 'exampleName4', ccy: 'HKD', qty: 5, unit: 'tael', cost: 120000 },
    { type: 'silver', nameKey: 'exampleName5', ccy: 'USD', qty: 50, unit: 'oz', cost: 1300 },
    { type: 'property', nameKey: 'exampleName6', ccy: 'HKD', qty: 1, price: 7200000, cost: 6800000, loan: 3900000 },
    { type: 'cash', nameKey: 'exampleName7', ccy: 'HKD', qty: 180000 }
  ];
  function exampleItems() {
    return EXAMPLE.map(function (x, i) {
      var it = Object.assign({ id: 'ex' + i, asOf: today() }, x);
      if (x.nameKey) it.name = t(x.nameKey);
      // examples use live prices where they exist, so the numbers look current
      if ((it.type === 'stock' || it.type === 'fund') && prices.quotes[it.symbol]) delete it.price;
      if ((it.type === 'gold' || it.type === 'silver') && !prices.quotes[it.type.toUpperCase()]) it.price = it.type === 'gold' ? 37000 : 47;
      return it;
    });
  }
  function showingExample() { return !state.items.length && !state.dismissed; }
  function items() { return showingExample() ? exampleItems() : state.items; }
  function valueOf(it) {
    var qty = n(it.qty) || 0, manual = n(it.price), q = null, price;
    if (it.type === 'cash') price = 1;
    else if (manual != null) price = manual;
    else { q = quoteFor(it); price = q ? q.price : null; }
    return { qty: qty, price: price, live: !!q, stale: q && q.stale, value: price == null ? null : price * qty,
      cost: it.type === 'cash' ? null : n(it.cost), loan: it.type === 'property' ? (n(it.loan) || 0) : 0 };
  }
  function totals(list, base) {
    var r = { assets: 0, loans: 0, cost: 0, costValue: 0, missing: 0, byType: {} };
    list.forEach(function (it) {
      var v = valueOf(it);
      if (v.value == null) r.missing++;
      else {
        var vb = conv(v.value, it.ccy, base);
        r.assets += vb; r.byType[it.type] = (r.byType[it.type] || 0) + vb;
        if (v.cost != null) { r.cost += conv(v.cost, it.ccy, base); r.costValue += vb; }
      }
      r.loans += conv(v.loan, it.ccy, base);
    });
    r.net = r.assets - r.loans; r.pl = r.costValue - r.cost;
    return r;
  }
  function recordToday() {
    if (!state.items.length) return;
    var r = totals(state.items, 'USD');
    if (r.missing) return;
    var v = Math.round(r.net * 100) / 100, d = today();
    if (state.hist[d] === v) return;
    state.hist[d] = v;
    var days = Object.keys(state.hist).sort();
    days.slice(0, Math.max(0, days.length - 1100)).forEach(function (x) { delete state.hist[x]; });
    persist();
  }
  function commit() { persist(); recordToday(); render(); }

  /* ---------- static text ---------- */
  function options(sel, keys, labelOf, value) {
    sel.innerHTML = keys.map(function (k) { return '<option value="' + k + '"' + (k === value ? ' selected' : '') + '>' + esc(labelOf(k)) + '</option>'; }).join('');
  }
  function ccyLabel(c) { return c + ' · ' + t('c_' + c); }
  function applyText() {
    document.querySelectorAll('[data-t]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-t')); });
    document.title = lang === 'en' ? 'Asset Book' : t('title') + ' Asset Book';
    document.querySelectorAll('[data-lang]').forEach(function (b) { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    options($('base'), CCYS, ccyLabel, state.base);
    var keep = { t: $('fType').value || 'stock', c: $('fCcy').value || state.base, u: $('fUnit').value || 'oz' };
    options($('fType'), ORDER, function (k) { return t('t_' + k); }, keep.t);
    options($('fCcy'), CCYS, ccyLabel, keep.c);
    options($('fUnit'), Object.keys(UNIT_OZ), function (k) { return t('u_' + k); }, keep.u);
    $('fName').placeholder = lang === 'en' ? 'e.g. Tencent' : lang === 'hans' ? '例如：腾讯控股' : '例如：騰訊控股';
    if ($('dlg').open) syncForm();
  }
  function setLang(l) {
    lang = l;
    root.setAttribute('data-lang', l);
    root.lang = l === 'en' ? 'en' : l === 'hans' ? 'zh-Hans' : 'zh-Hant';
    try { localStorage.setItem('ab.lang', l); } catch (e) {}
    applyText(); render();
  }
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });

  /* ---------- render ---------- */
  function render() {
    var base = state.base, list = items();
    $('base').value = base;
    $('banner').hidden = !showingExample();
    $('export').disabled = $('wipe').disabled = !state.items.length;
    var r = totals(list, base);
    renderStats(r, base); renderAlloc(r, base); renderHist(base); renderTable(list, base); renderPrices();
  }
  function stat(label, val, sub, cls, valCls) {
    return '<div class="stat' + (cls ? ' ' + cls : '') + '"><p class="stat-label">' + label + '</p><p class="stat-val num' + (valCls ? ' ' + valCls : '') + '">' + val + '</p><p class="stat-sub">' + (sub || '&nbsp;') + '</p></div>';
  }
  function renderStats(r, base) {
    $('stats').innerHTML =
      stat(t('netWorth'), money(r.net, base), r.missing ? t('missing', { n: r.missing }) : t('netSub'), 'lead') +
      stat(t('assets'), money(r.assets, base), t('kinds', { n: Object.keys(r.byType).length })) +
      stat(t('loans'), money(r.loans ? -r.loans : 0, base), r.assets ? t('ratio', { p: (r.loans / r.assets * 100).toFixed(1) + '%' }) : '') +
      stat(t('pl'), signed(r.pl, base), r.cost ? t('onCost', { p: pct(r.pl / r.cost * 100) }) : t('addCost'), '', r.pl > 0 ? 'up' : r.pl < 0 ? 'down' : '');
  }
  function renderAlloc(r, base) {
    var keys = ORDER.filter(function (k) { return r.byType[k] > 0; }).sort(function (a, b) { return r.byType[b] - r.byType[a]; });
    if (!keys.length) { $('alloc').innerHTML = '<p class="empty">' + t('allocEmpty') + '</p>'; return; }
    $('alloc').innerHTML = '<ul class="alloc">' + keys.map(function (k) {
      var s = r.byType[k] / r.assets * 100;
      return '<li title="' + esc(t('t_' + k) + ': ' + money(r.byType[k], base) + ' (' + s.toFixed(1) + '%)') + '"><span>' + t('t_' + k) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + Math.max(s, .8).toFixed(2) + '%"></span></span>' +
        '<span class="v num"><b>' + s.toFixed(1) + '%</b><small>' + money(r.byType[k], base) + '</small></span></li>';
    }).join('') + '</ul>';
  }
  function renderHist(base) {
    var host = $('hist');
    if (showingExample()) { host.innerHTML = '<p class="empty">' + t('histExample') + '</p>'; return; }
    var days = Object.keys(state.hist).sort();
    if (days.length < 2) { host.innerHTML = '<p class="empty">' + t('histWait') + '</p>'; return; }
    var vals = days.map(function (d) { return conv(state.hist[d], 'USD', base); });
    var W = 520, H = 190, L = 4, R = 4, T = 14, B = 24, last = vals.length - 1;
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * .12 || Math.abs(hi) * .05 || 1;
    lo -= pad; hi += pad;
    var x = function (i) { return L + i / last * (W - L - R); };
    var y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
    var ch = vals[last] - vals[0];
    var grid = [0, .5, 1].map(function (f) { var gy = T + f * (H - T - B); return '<line class="c-grid" x1="0" x2="' + W + '" y1="' + gy + '" y2="' + gy + '"/>'; }).join('');
    host.innerHTML = '<p class="hist-head"><span class="num">' + money(vals[last], base) + '</span> <span class="num ' + (ch >= 0 ? 'up' : 'down') + '">' + signed(ch, base) + '</span>　' + t('since', { d: days[0] }) + '</p>' +
      '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('chartLabel')) + '">' + grid +
      '<polygon class="c-area" points="' + x(0) + ',' + (H - B) + ' ' + pts + ' ' + x(last) + ',' + (H - B) + '"/>' +
      '<polyline class="c-line" points="' + pts + '"/>' +
      '<circle class="c-dot" r="4" cx="' + x(last) + '" cy="' + y(vals[last]) + '"/>' +
      '<line class="c-cross" y1="' + T + '" y2="' + (H - B) + '"/><circle class="c-dot c-hover" r="4"/>' +
      '<text class="c-tick" x="' + L + '" y="' + (H - 6) + '">' + days[0] + '</text>' +
      '<text class="c-tick" x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + days[last] + '</text>' +
      '<rect class="c-hit" width="' + W + '" height="' + H + '"/></svg><div class="tip" hidden></div></div>';
    var box = host.querySelector('.chart'), svg = box.querySelector('svg'), tip = box.querySelector('.tip');
    var cross = svg.querySelector('.c-cross'), dot = svg.querySelector('.c-hover');
    function move(e) {
      var rc = svg.getBoundingClientRect(), px = (e.clientX - rc.left) / rc.width * W;
      var i = Math.max(0, Math.min(last, Math.round((px - L) / (W - L - R) * last)));
      box.classList.add('on');
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(vals[i]));
      tip.hidden = false; tip.innerHTML = '<small>' + days[i] + '</small>' + money(vals[i], base);
      tip.style.left = Math.min(Math.max(x(i) / W * rc.width, 56), rc.width - 56) + 'px';
    }
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', function () { box.classList.remove('on'); tip.hidden = true; });
  }
  function age(d) { var ms = new Date(today()) - new Date(d); return d && isFinite(ms) ? Math.round(ms / 864e5) : null; }
  function renderTable(list, base) {
    var tbl = $('tbl');
    if (!list.length) { tbl.innerHTML = '<tbody><tr><td class="empty" style="text-align:center;padding:32px 14px">' + esc(t('tableEmpty')) + '</td></tr></tbody>'; return; }
    var ex = showingExample();
    var rows = list.map(function (it) { var v = valueOf(it); return { it: it, v: v, vb: v.value == null ? null : conv(v.value, it.ccy, base) }; })
      .sort(function (a, b) { return ORDER.indexOf(a.it.type) - ORDER.indexOf(b.it.type) || (b.vb || 0) - (a.vb || 0); });
    var html = '<thead><tr><th>' + t('thHolding') + '</th><th class="r">' + t('thQty') + '</th><th class="r">' + t('thPrice') + '</th><th class="r">' + t('thValue', { c: base }) +
      '</th><th class="r">' + t('thPl') + '</th><th><span class="sr">' + t('thAct') + '</span></th></tr></thead><tbody>';
    var cur = null;
    rows.forEach(function (row) {
      var it = row.it, v = row.v;
      if (it.type !== cur) { cur = it.type; html += '<tr class="group"><th colspan="6">' + t('t_' + cur) + '</th></tr>'; }
      var a = age(it.asOf), oldManual = !v.live && it.type !== 'cash' && a != null && a > STALE_DAYS;
      var pl = '—';
      if (v.cost != null && v.value != null) {
        var d = v.value - v.cost;
        pl = '<span class="num ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + signed(conv(d, it.ccy, base), base) + '</span>' + (v.cost ? '<small class="num">' + pct(d / v.cost * 100) + '</small>' : '');
      }
      var unit = (it.type === 'gold' || it.type === 'silver') ? t('u_' + (it.unit || 'oz')) : it.type === 'property' ? t('units') : '';
      var note = v.live ? (v.stale ? '<small class="stale">' + t('liveStale') + '</small>' : '<small><span class="live">' + t('live') + '</span></small>')
        : it.asOf ? '<small class="' + (oldManual ? 'stale' : '') + '">' + (oldManual ? t('daysAgo', { n: a }) : t('updatedOn', { d: it.asOf })) + '</small>' : '';
      html += '<tr><th scope="row" class="nm"><b>' + esc(it.name) + '</b><small>' + (it.symbol ? esc(it.symbol) + ' · ' : '') + it.ccy + '</small></th>' +
        '<td class="r num">' + (it.type === 'cash' ? '—' : v.qty.toLocaleString('en-US', { maximumFractionDigits: 4 }) + '<small>' + esc(unit) + '</small>') + '</td>' +
        '<td class="r">' + (it.type === 'cash' ? '—' : v.price == null ? '<span class="stale">' + t('noPrice') + '</span>' : '<span class="num">' + money(v.price, it.ccy) + '</span>' + note) + '</td>' +
        '<td class="r"><span class="num">' + money(row.vb, base) + '</span>' + (v.loan ? '<small class="num">' + t('mortgage') + ' ' + money(-conv(v.loan, it.ccy, base), base) + '</small>' : '') + '</td>' +
        '<td class="r">' + pl + '</td>' +
        '<td class="row-act"><button type="button" class="btn sm" data-edit="' + esc(it.id) + '"' + (ex ? ' disabled' : '') + '>' + t('edit') + '</button><button type="button" class="btn sm danger" data-del="' + esc(it.id) + '"' + (ex ? ' disabled' : '') + '>' + t('del') + '</button></td></tr>';
    });
    tbl.innerHTML = html + '</tbody>';
  }
  function renderPrices() {
    var el = $('prices');
    if (!prices.updated) { el.textContent = t('pricesNone'); return; }
    var when;
    try { when = new Date(prices.updated).toLocaleString(lang === 'en' ? 'en-GB' : lang === 'hans' ? 'zh-CN' : 'zh-HK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }) + ' HKT'; } catch (e) { when = prices.updated; }
    var parts = [t('pricesAt', { d: when })];
    if (prices.quotes.GOLD) parts.push(t('goldOz', { p: money(prices.quotes.GOLD.price, 'USD', 0) }));
    if (prices.quotes.SILVER) parts.push(t('silverOz', { p: money(prices.quotes.SILVER.price, 'USD', 2) }));
    if (prices.fx.HKD) parts.push('USD/HKD ' + prices.fx.HKD.toFixed(4));
    el.textContent = parts.join(' · ');
  }

  /* ---------- messages + confirm ---------- */
  var msgTimer;
  function msg(s) { $('msg').textContent = s || ''; clearTimeout(msgTimer); if (s) msgTimer = setTimeout(function () { $('msg').textContent = ''; }, 8000); }
  function ask(title, text, yes) {
    return new Promise(function (resolve) {
      var d = $('ask');
      $('askTitle').textContent = title; $('askText').textContent = text; $('askYes').textContent = yes;
      function done(v) { $('askYes').onclick = $('askNo').onclick = d.onclose = null; if (d.open) d.close(); resolve(v); }
      $('askYes').onclick = function () { done(true); };
      $('askNo').onclick = function () { done(false); };
      d.onclose = function () { resolve(false); };
      d.showModal();
    });
  }

  /* ---------- form ---------- */
  var editing = null;
  function syncForm() {
    var type = $('fType').value;
    document.querySelectorAll('#form [data-show]').forEach(function (el) { el.hidden = el.getAttribute('data-show').split(' ').indexOf(type) < 0; });
    document.querySelectorAll('#form [data-hide]').forEach(function (el) { el.hidden = el.getAttribute('data-hide').split(' ').indexOf(type) >= 0; });
    $('lQty').textContent = t(type === 'cash' ? 'lAmount' : type === 'property' ? 'lUnits' : 'lQty');
    $('lPrice').textContent = t(type === 'property' ? 'lValuation' : 'lPrice');
    $('lCost').textContent = t(type === 'property' ? 'lPurchase' : 'lCost');
    $('hint').textContent = t('h_' + type);
    $('fPrice').placeholder = ['stock', 'fund', 'gold', 'silver'].indexOf(type) >= 0 ? t('blankLive') : '';
  }
  function canAuto() {
    var type = $('fType').value;
    if (type === 'gold') return !!prices.quotes.GOLD;
    if (type === 'silver') return !!prices.quotes.SILVER;
    return (type === 'stock' || type === 'fund') && !!prices.quotes[$('fSymbol').value.trim().toUpperCase()];
  }
  function openForm(it) {
    editing = it ? it.id : null;
    var d = it || { type: 'stock', ccy: state.base, unit: 'oz' };
    $('formTitle').textContent = t(it ? 'editTitle' : 'addTitle');
    $('fType').value = d.type; $('fCcy').value = d.ccy; $('fUnit').value = d.unit || 'oz';
    $('fName').value = d.name || ''; $('fSymbol').value = d.symbol || '';
    $('fQty').value = d.qty != null ? d.qty : ''; $('fPrice').value = d.price != null ? d.price : '';
    $('fCost').value = d.cost != null ? d.cost : ''; $('fLoan').value = d.loan != null ? d.loan : '';
    $('formErr').textContent = '';
    syncForm();
    $('dlg').showModal();
    $(it ? 'fQty' : 'fName').focus();
  }
  $('fType').addEventListener('change', function () { if ($('fType').value === 'property' && !$('fQty').value) $('fQty').value = 1; syncForm(); });
  $('fSymbol').addEventListener('change', function () {
    var q = prices.quotes[$('fSymbol').value.trim().toUpperCase()];
    if (!q) return;
    $('fSymbol').value = $('fSymbol').value.trim().toUpperCase();
    if (q.ccy && SYM[q.ccy]) $('fCcy').value = q.ccy;
    if (!$('fName').value.trim()) $('fName').value = q.name;
  });
  $('cancel').addEventListener('click', function () { $('dlg').close(); });
  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var type = $('fType').value, name = $('fName').value.trim(), qty = n($('fQty').value), price = n($('fPrice').value);
    if (!name) { $('formErr').textContent = t('eName'); $('fName').focus(); return; }
    if (qty == null) { $('formErr').textContent = t(type === 'cash' ? 'eAmount' : 'eQty'); $('fQty').focus(); return; }
    if (type !== 'cash' && price == null && !canAuto()) { $('formErr').textContent = t('ePrice'); $('fPrice').focus(); return; }
    var old = state.items.find(function (x) { return x.id === editing; });
    var it = { id: editing || uid(), type: type, name: name.slice(0, 80), ccy: $('fCcy').value, qty: qty };
    if (type === 'stock' || type === 'fund') { var s = $('fSymbol').value.trim().toUpperCase().slice(0, 20); if (s) it.symbol = s; }
    if (type === 'gold' || type === 'silver') it.unit = $('fUnit').value;
    if (type !== 'cash') { if (price != null) it.price = price; var c = n($('fCost').value); if (c != null) it.cost = c; }
    if (type === 'property') { var l = n($('fLoan').value); if (l) it.loan = l; }
    it.asOf = old && old.price === it.price && old.asOf ? old.asOf : today();
    if (old) state.items[state.items.indexOf(old)] = it; else state.items.push(it);
    state.dismissed = true;
    $('dlg').close();
    commit();
    msg(t(old ? 'updated' : 'added', { x: it.name }));
  });

  /* ---------- toolbar ---------- */
  $('add').addEventListener('click', function () { openForm(null); });
  $('clearExample').addEventListener('click', function () { state.dismissed = true; persist(); render(); });
  $('tbl').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var id = b.getAttribute('data-edit') || b.getAttribute('data-del');
    var it = state.items.find(function (x) { return x.id === id; }); if (!it) return;
    if (b.hasAttribute('data-edit')) { openForm(it); return; }
    ask(t('askDel', { x: it.name }), t('askDelP'), t('del')).then(function (ok) {
      if (!ok) return;
      state.items = state.items.filter(function (x) { return x !== it; });
      commit(); msg(t('deleted', { x: it.name }));
    });
  });
  $('base').addEventListener('change', function () { state.base = $('base').value; persist(); render(); });
  $('export').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = 'asset-book-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    msg(t('exported'));
  });
  $('importFile').addEventListener('change', function () {
    var f = this.files[0]; this.value = ''; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var s; try { s = clean(JSON.parse(rd.result)); } catch (e) { msg(t('badFile')); return; }
      if (!s.items.length) { msg(t('emptyFile')); return; }
      var go = state.items.length ? ask(t('askImport'), t('askImportP', { a: s.items.length, b: state.items.length }), t('replace')) : Promise.resolve(true);
      go.then(function (ok) { if (!ok) return; s.dismissed = true; state = s; commit(); msg(t('imported', { n: s.items.length })); });
    };
    rd.readAsText(f);
  });
  $('wipe').addEventListener('click', function () {
    ask(t('askWipe'), t('askWipeP'), t('wipe')).then(function (ok) {
      if (!ok) return;
      var base = state.base;
      state = blank(); state.base = base; state.dismissed = true;
      persist(); render(); msg(t('wiped'));
    });
  });

  applyText();
  render();
  if (!canStore) msg(t('noStore'));

  fetch('data/prices.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      prices = { updated: j.updated || null, fx: j.fx || {}, quotes: j.quotes || {} };
      $('symbols').innerHTML = Object.keys(prices.quotes).filter(function (k) { return k !== 'GOLD' && k !== 'SILVER'; })
        .map(function (k) { return '<option value="' + esc(k) + '">' + esc(prices.quotes[k].name) + '</option>'; }).join('');
      recordToday();
      render();
    })
    .catch(function () { recordToday(); renderPrices(); });
})();
