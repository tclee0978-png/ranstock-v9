// =============== Mock Taiwan Stock Data (fictional codes/names) ===============
// 三大濾鏡狀態: F1 抗跌 / F2 箱型放量突破 / F3 反陷阱 (未跌破開盤)
// 設計為「狙擊清單」呈現組合通過情形。

window.MARKET_DATA = (function () {

  // OTC 櫃買指數參考 (大盤跌)
  const indices = [
    { code: "TWSE", name: "加權指數", value: 21684.32, change: -185.44, pct: -0.85, vol: 3284 },
    { code: "OTC", name: "櫃買指數", value: 248.71, change: -2.84, pct: -1.13, vol: 1042 },
    { code: "SEMI", name: "半導體", value: 712.40, change: -8.21, pct: -1.14, vol: 1820 },
    { code: "FIN", name: "金融指數", value: 1942.50, change: 3.10, pct: 0.16, vol: 312 },
  ];

  // 個股母清單
  // V6 LIVE CLEAN：不再內建任何假股票名稱。
  // 股票代號與名稱先由 REAL_STOCKS 提供「待抓取清單」，LIVE 模式成功後一律用 TWSE MIS 回傳 c/n 覆蓋。
  const stocks = [];

  // 五檔報價 (selected stock)
  const orderBook = {
    "2401": {
      asks: [
        { px: 143.0, sz: 124 },
        { px: 142.5, sz: 88  },
        { px: 142.0, sz: 56  },
        { px: 141.5, sz: 42  },
        { px: 141.0, sz: 31  },
      ],
      bids: [
        { px: 140.5, sz: 102 },
        { px: 140.0, sz: 156 },
        { px: 139.5, sz: 78  },
        { px: 139.0, sz: 64  },
        { px: 138.5, sz: 91  },
      ],
    },
  };
  // generic builder
  function buildOB(p) {
    const asks = [], bids = [];
    for (let i=0;i<5;i++){
      asks.push({ px: +(p+ (i+1)*0.5).toFixed(2), sz: Math.floor(40+Math.random()*180) });
      bids.push({ px: +(p- (i+1)*0.5).toFixed(2), sz: Math.floor(40+Math.random()*180) });
    }
    return { asks: asks.reverse(), bids };
  }
  stocks.forEach(s => { if (!orderBook[s.code]) orderBook[s.code] = buildOB(s.price); });

  // 成交明細 (tape)
  function buildTape(s) {
    const out = [];
    let t = 13*3600 + 30*60; // start at 13:30
    let p = s.price;
    for (let i=0;i<40;i++){
      const dir = Math.random() > 0.5 ? 1 : -1;
      const tick = (Math.random()<0.3 ? 0.5 : 0.0);
      p = Math.max(s.low, Math.min(s.high, p + dir*tick));
      const sz = Math.floor(1 + Math.random()*40);
      const hh = Math.floor(t/3600), mm = Math.floor((t%3600)/60), ss = t%60;
      out.push({
        t: `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`,
        px: p, sz, dir
      });
      t -= 3 + Math.floor(Math.random()*8);
    }
    return out;
  }

  // K線資料 — 5/20/60/120 MA + OTC overlay + 箱型
  function genCandles(s, n=140) {
    const arr = [];
    let last = s.ma20 * 0.92;
    const targetEnd = s.price;
    // Generate with a slight trend matching pattern
    for (let i=0;i<n;i++){
      const drift = (targetEnd - last) / (n - i);
      const vol = Math.max(0.5, last * 0.018);
      let pattern = 0;
      // Demo-only candle shaping for selected official stocks
      if ((s.code === "2401" || s.code === "2330" || s.code === "3030") && i >= n - 40) {
        const t = (i - (n - 40)) / 40; // 0..1
        // W shape: dip → recovery → dip again → breakout
        pattern = -Math.sin(t * Math.PI * 1.6) * (last * 0.04) - (t > 0.7 ? -last * 0.06 * (t - 0.7) / 0.3 : 0);
      }
      // Demo-only M-top shaping for one official biotech sample
      if (s.code === "6446" && i >= n - 40) {
        const t = (i - (n - 40)) / 40;
        pattern = Math.sin(t * Math.PI * 1.6) * (last * 0.05) + (t > 0.7 ? -last * 0.07 * (t - 0.7) / 0.3 : 0);
      }
      const o = last;
      const c = last + drift + pattern * 0.06 + (Math.random()-0.5)*vol;
      const h = Math.max(o,c) + Math.random()*vol*0.8;
      const l = Math.min(o,c) - Math.random()*vol*0.8;
      const volSpike = (s.code === "2401" && i >= n - 3) || (s.code === "2330" && i >= n - 2) || (s.code === "3030" && i >= n - 3);
      const v = Math.floor((Math.random()*0.6+0.7) * s.vol * (1 + (i===n-1?s.vol20Pct/100:0) + (volSpike ? 1.4 : 0)));
      arr.push({ o, h, l, c, v, spike: volSpike });
      last = c;
    }
    // ensure last close = current price
    arr[arr.length-1].c = s.price;
    arr[arr.length-1].h = Math.max(arr[arr.length-1].h, s.high);
    arr[arr.length-1].l = Math.min(arr[arr.length-1].l, s.low);
    arr[arr.length-1].o = s.open;
    // compute MAs (5/20/60/120)
    function ma(period, idx) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, idx - period + 1); j <= idx; j++) { sum += arr[j].c; count++; }
      return sum / count;
    }
    for (let i = 0; i < arr.length; i++) {
      arr[i].ma5   = ma(5, i);
      arr[i].ma20  = ma(20, i);
      arr[i].ma60  = ma(60, i);
      arr[i].ma120 = ma(120, i);
    }
    return arr;
  }

  stocks.forEach(s => { s.candles = genCandles(s); s.tape = buildTape(s); });

  // ---- 型態偵測 + 白話技術總結 (主角 12 檔手動標註) ----
  function pctTo(price, target) { return +(((target - price) / price) * 100).toFixed(1); }
  function detectExtremaIdx(candles, last=40) {
    const start = Math.max(0, candles.length - last);
    let lo1 = { i: start, v: Infinity }, lo2 = { i: start, v: Infinity }, peak = { i: start, v: -Infinity };
    for (let i = start; i < candles.length; i++) {
      const v = candles[i].l;
      if (v < lo1.v) { lo2 = lo1; lo1 = { i, v }; }
      else if (v < lo2.v && Math.abs(i - lo1.i) > 5) { lo2 = { i, v }; }
    }
    const [a, b] = lo1.i < lo2.i ? [lo1, lo2] : [lo2, lo1];
    for (let i = a.i; i <= b.i; i++) {
      if (candles[i].h > peak.v) peak = { i, v: candles[i].h };
    }
    return { w1: a, w2: b, neck: peak };
  }

  const patternMap = {
    "2401": (s) => {
      const ex = detectExtremaIdx(s.candles, 40);
      const target = +(s.price + (ex.neck.v - ex.w1.v) * 0.95).toFixed(2);
      return {
        type: "rocket",
        kind: "up",
        label: "🚀 起漲段確認",
        title: "W 底突破 + 量增 + 站上四均線",
        text: `近 30 天形成標準 <strong>W 底</strong>，今日 <strong class="up">放量突破頸線 ${ex.neck.v.toFixed(2)} 元</strong>。股價同時站上 5/20/60/120 四條均線，盤中量已超日均 +${s.vol20Pct}%。<strong>起漲段確認</strong>，依 W 底高度測算目標價 <strong class="up">${target} 元</strong>，距現價 <strong class="up">+${pctTo(s.price, target)}%</strong>。`,
        target, ex,
        showRocket: true
      };
    },
    "2330": (s) => ({ type: "base", kind: "up", label: "趨勢續航",
      title: "權值股趨勢觀察",
      text: `以 LIVE 價格計算目前位置，若回踩 5MA 不破，續航分數才有效；若爆量長黑則退出觀察。` }),
    "3030": (s) => ({ type: "box_break", kind: "up", label: "箱型觀察",
      title: "箱型突破觀察",
      target: +(s.price * 1.08).toFixed(2),
      text: `以 LIVE 價格為準，若放量突破箱型上緣且收盤站穩，可列入明日作戰室；若長上影或跌回箱內，不追。` }),
    "2603": (s) => ({ type: "box_break", kind: "up", label: "族群共振",
      title: "航運族群觀察",
      target: +(s.price * 1.08).toFixed(2),
      text: `需搭配族群同步轉強與量能健康放大，單日暴量不直接亮綠燈。` })
  };

  stocks.forEach(s => {
    if (patternMap[s.code]) s.pattern = patternMap[s.code](s);
    else s.pattern = null;
  });

  // ---- Healthcheck augmentation (per-stock 短/中/長 期診斷資料) ----
  function rand(seed, n=1) { const x = Math.sin(seed) * 10000; return (x - Math.floor(x)) * n; }
  stocks.forEach((s, i) => {
    const seed = parseInt(s.code) || (i+1) * 13;
    // 短期 (1-5天)
    s.bigOrderRatio    = Math.round(45 + rand(seed) * 50);        // 大單敲進比 %
    s.bigOrderDelta    = +(rand(seed*2) * 12 - 4).toFixed(1);     // 較前日 +/-
    s.volPriceSync     = s.f2 || (rand(seed*3) > 0.5);             // 量價同向
    s.priceVolRatio    = +(1 + Math.abs(s.vol20Pct)/40 + rand(seed*4) * 0.5).toFixed(2);
    s.twoHourTrend     = s.segments[s.segments.length-1] >= s.segments[0] ? "up" : "down";
    // 中期 (1-4週)
    s.boxBreakDays     = s.f2 ? Math.floor(1 + rand(seed*5)*3) : 0;
    s.foundationPct    = Math.round(40 + rand(seed*6) * 55);       // 主力築底完成度 %
    s.catalysts        = (() => {
      const pool = ["AI 伺服器", "車用電子", "高頻寬記憶體", "綠能轉型", "BDI 反彈", "庫存回補", "庫藏股", "法說會將至", "降息預期", "新台幣升值", "供應鏈在地化", "庫存去化完成"];
      const n = 1 + Math.floor(rand(seed*7) * 3);
      const out = [];
      for (let j = 0; j < n; j++) out.push(pool[Math.floor(rand(seed*7+j*0.13)*pool.length)]);
      return [...new Set(out)];
    })();
    s.catalystHeat     = Math.round(35 + rand(seed*8)*60);
    s.dist20High       = +((stock => (s.boxHi - s.price) / s.price * 100)(s)).toFixed(2);
    // 長期 (1-3個月)
    s.epsGrowth        = +((rand(seed*9) * 60 - 8)).toFixed(1);
    s.epsYoY           = +((rand(seed*10) * 40 - 5)).toFixed(1);
    s.roe              = +(8 + rand(seed*11) * 18).toFixed(1);
    s.pe               = +(8 + rand(seed*12) * 24).toFixed(1);
    s.peLow            = +(s.pe * 0.78).toFixed(1);
    s.peHigh           = +(s.pe * 1.32).toFixed(1);
    s.chipConcentration= Math.round(35 + rand(seed*13) * 55);     // 籌碼集中度 %
    s.foreignDays      = Math.floor(rand(seed*14) * 9);            // 外資連 N 日買超
    s.trustDays        = Math.floor(rand(seed*15) * 6);
    s.industryRank     = Math.floor(1 + rand(seed*16) * 8);
    s.industryTotal    = Math.floor(15 + rand(seed*17) * 25);
    // F4 · 上車訊號 (新定義：主力悄然布局 + 反轉啟動第一天，需任 2 項以上)
    const todayPct = ((s.price - s.prev) / s.prev) * 100;
    const A_quietVol  = s.vol20Pct >= 50 && s.vol20Pct <= 150 && todayPct < 3;  // 量爆但價未噴
    const B_chipConc  = ((s.foreignDays >= 3) || (s.trustDays >= 2)) && todayPct < 2;
    const C_reversal  = s.f1 && s.vol20Pct >= 30 && Math.abs(s.ma5Bias) <= 2;    // 底部反轉訊號
    const D_day1      = s.f2 && s.vol20Pct >= 30 && Math.abs(s.ma5Bias) <= 3 && todayPct < 5; // 突破第一天
    const triggers    = (A_quietVol?1:0) + (B_chipConc?1:0) + (C_reversal?1:0) + (D_day1?1:0);
    s.f4 = s.f3 && triggers >= 2;
    s.f4Triggers = { A: A_quietVol, B: B_chipConc, C: C_reversal, D: D_day1, count: triggers };
    // Discipline aware overrides
    if (!s.f3) { s.f4 = false; }
  });

  // ---- 全市場標的擴展 (TWSE + TPEx 約 1,950 檔) ----
  const handMarket = {};
  stocks.forEach(s => { s.market = handMarket[s.code] || "TWSE"; });

  const namePool = {
    "半導體": ["晶圓","封測","光罩","矽智","訊號","邏輯","記憶","快閃","類比","異質","晶創"],
    "電子零組件": ["零組","元件","連接","端子","線材","被動","印刷"],
    "工業機械": ["機械","精機","工機","重工","自動","驅動","減速"],
    "金融": ["銀行","證券","金控","產險","壽險"],
    "營建": ["建設","營造","建築","開發","豐建"],
    "化工": ["化工","化學","樹脂","聚合","碳纖"],
    "電信": ["通訊","網通","電信","網路"],
    "塑膠": ["塑膠","塑料","包材","容器"],
    "航運": ["航運","海運","物流","船務","空運"],
    "綠能": ["能源","太陽","風電","儲能","氫能","綠電"],
    "AI": ["智算","視覺","語意","推論","算力","邊緣"],
    "生技": ["生醫","生技","製藥","蛋白","細胞","檢驗"],
    "食品": ["食品","飲品","乳品","農畜","食材"],
    "百貨": ["百貨","通路","量販","電商","流通"],
    "汽車": ["車材","車電","車燈","車用","汽配"],
  };
  const prefixPool = ["旭","昇","華","盛","元","台","鴻","瑞","泰","新","大","強","廣","明","群","正","昌","佳","祥","欣","聯","東","南","北","川","海","虹","凱","捷","璿","駿","品","展","越","澄","威","紘","巨","信","頂","榮","茂","錸","碩","興","禾","昕","勤","均","廷","益"];
  function pick(seed, arr) { return arr[Math.floor(rand(seed) * arr.length)]; }

  function genUniverseStock(seed, code, market) {
    const industries = Object.keys(namePool);
    const ind = pick(seed * 1.1, industries);
    const name = pick(seed * 1.3, prefixPool) + pick(seed * 1.7, namePool[ind]);
    const prev = +(8 + rand(seed * 2.1) * 480).toFixed(1);
    const drift = (rand(seed * 2.3) - 0.5) * 0.05;
    const price = +(prev * (1 + drift)).toFixed(2);
    const open = +(prev * (1 + (rand(seed*2.5) - 0.5) * 0.02)).toFixed(2);
    const high = Math.max(price, open) * (1 + rand(seed*2.7) * 0.015);
    const low  = Math.min(price, open) * (1 - rand(seed*2.9) * 0.015);
    const vol = Math.floor(50 + rand(seed*3.1) * 18000);
    const ma5 = +(prev * (1 + (rand(seed*3.3)-0.5)*0.03)).toFixed(2);
    const ma5Bias = +(((price - ma5) / ma5) * 100).toFixed(2);
    const otcRS = +(0.6 + rand(seed*3.7) * 1.8).toFixed(2);
    const boxHi = +(price * (1 + rand(seed*4.1) * 0.06)).toFixed(2);
    const boxLo = +(price * (1 - rand(seed*4.3) * 0.18)).toFixed(2);
    const vol20Pct = Math.floor(rand(seed*4.5) * 100 - 30);
    const bigOrderRatio = Math.floor(35 + rand(seed*4.7) * 55);
    const chipConcentration = Math.floor(30 + rand(seed*5.1) * 60);

    const f1 = otcRS >= 1.4 && drift >= 0 && rand(seed*5.3) > 0.55;
    const f2 = price > boxHi * 0.99 && vol20Pct >= 30 && Math.abs(ma5Bias) < 4 && rand(seed*5.5) > 0.6;
    const f3 = price >= open && rand(seed*5.7) > 0.25;
    // F4 · 上車訊號 — 同主算法 (合成股)
    const todayPctSyn = ((price - prev) / prev) * 100;
    const A2 = vol20Pct >= 50 && vol20Pct <= 150 && todayPctSyn < 3;
    const C2 = f1 && vol20Pct >= 30 && Math.abs(ma5Bias) <= 2;
    const D2 = f2 && vol20Pct >= 30 && Math.abs(ma5Bias) <= 3 && todayPctSyn < 5;
    const triggers = (A2?1:0) + (C2?1:0) + (D2?1:0);
    const f4 = f3 && triggers >= 2 && rand(seed*5.9) > 0.55;

    const segments = Array.from({length: 8}, (_, j) =>
      +(prev * (1 + (rand(seed + j * 0.31) - 0.5) * 0.02)).toFixed(2)
    );

    return {
      code: String(code), name, industry: ind, market,
      price, open, prev, high, low, vol, ma5, ma20: ma5,
      boxHi, boxLo, vol20Pct, ma5Bias, otcRS,
      bigOrderRatio, chipConcentration,
      f1, f2, f3, f4: f3 && f4,
      f4Triggers: { A: A2, B: false, C: C2, D: D2, count: triggers },
      segments,
      bigOrderDelta: +(rand(seed*6.0)*8-3).toFixed(1),
      volPriceSync: f2, priceVolRatio: +(1 + rand(seed*6.05)).toFixed(2),
      twoHourTrend: f1 ? "up" : "down",
      boxBreakDays: f2 ? 1 : 0,
      foundationPct: Math.floor(30 + rand(seed*6.1)*60),
      catalysts: [pick(seed*6.3, ["庫存回補","降息預期","新台幣升值","法說會將至","AI 伺服器","產業在地化"])],
      catalystHeat: Math.floor(rand(seed*6.5)*100),
      dist20High: +(((boxHi - price) / price) * 100).toFixed(2),
      epsGrowth: +(rand(seed*6.7) * 40 - 5).toFixed(1),
      epsYoY: +(rand(seed*6.9) * 30 - 5).toFixed(1),
      roe: +(8 + rand(seed*7.1) * 14).toFixed(1),
      pe: +(8 + rand(seed*7.3) * 22).toFixed(1),
      peLow: 0, peHigh: 0,
      foreignDays: Math.floor(rand(seed*7.5) * 6),
      trustDays: Math.floor(rand(seed*7.7) * 4),
      industryRank: Math.floor(1 + rand(seed*7.9)*15),
      industryTotal: Math.floor(15 + rand(seed*8.1)*25),
      synthetic: true
    };
  }

  // ---- 真實台股代碼名稱資料庫 (常見熱門股，所有資料皆為公開上市資訊) ----
  const REAL_STOCKS = [
    // === TWSE 上市 ===
    ["1101","台泥","水泥","TWSE"],["1102","亞泥","水泥","TWSE"],["1216","統一","食品","TWSE"],
    ["1227","佳格","食品","TWSE"],["1301","台塑","塑化","TWSE"],["1303","南亞","塑化","TWSE"],
    ["1326","台化","塑化","TWSE"],["1402","遠東新","紡織","TWSE"],["1434","福懋","紡織","TWSE"],
    ["1455","集盛","紡織","TWSE"],["1504","東元","重電","TWSE"],["1605","華新","電線電纜","TWSE"],
    ["1611","中電","電線電纜","TWSE"],["1717","長興","化工","TWSE"],["1722","台肥","化工","TWSE"],
    ["2002","中鋼","鋼鐵","TWSE"],["2105","正新","橡膠","TWSE"],["2201","裕隆","汽車","TWSE"],
    ["2207","和泰車","汽車","TWSE"],["2227","裕日車","汽車","TWSE"],["2301","光寶科","電子","TWSE"],
    ["2303","聯電","半導體","TWSE"],["2308","台達電","電子","TWSE"],["2317","鴻海","電子","TWSE"],
    ["2324","仁寶","電腦","TWSE"],["2327","國巨","被動元件","TWSE"],["2330","台積電","半導體","TWSE"],
    ["2337","旺宏","半導體","TWSE"],["2344","華邦電","半導體","TWSE"],["2345","智邦","網通","TWSE"],
    ["2347","聯強","通路","TWSE"],["2353","宏碁","電腦","TWSE"],["2354","鴻準","電子","TWSE"],
    ["2356","英業達","電腦","TWSE"],["2357","華碩","電腦","TWSE"],["2360","致茂","儀器","TWSE"],
    ["2376","技嘉","電腦","TWSE"],["2377","微星","電腦","TWSE"],["2379","瑞昱","IC設計","TWSE"],
    ["2382","廣達","電腦","TWSE"],["2383","台光電","電子","TWSE"],["2385","群光","電子","TWSE"],
    ["2395","研華","工業電腦","TWSE"],["2401","凌陽","IC設計","TWSE"],["2408","南亞科","半導體","TWSE"],["2409","友達","面板","TWSE"],
    ["2412","中華電","電信","TWSE"],["2421","建準","電子","TWSE"],["2439","美律","電子","TWSE"],
    ["2454","聯發科","IC設計","TWSE"],["2458","義隆","IC設計","TWSE"],["2474","可成","機殼","TWSE"],
    ["2480","敦陽科","資訊服務","TWSE"],["2492","華新科","被動元件","TWSE"],
    ["2498","宏達電","手機","TWSE"],["2603","長榮","航運","TWSE"],["2606","裕民","航運","TWSE"],
    ["2609","陽明","航運","TWSE"],["2615","萬海","航運","TWSE"],["2618","長榮航","航空","TWSE"],
    ["2633","台灣高鐵","運輸","TWSE"],
    ["2801","彰銀","金融","TWSE"],["2823","中壽","保險","TWSE"],["2867","三商壽","保險","TWSE"],
    ["2880","華南金","金融","TWSE"],["2881","富邦金","金融","TWSE"],["2882","國泰金","金融","TWSE"],
    ["2883","開發金","金融","TWSE"],["2884","玉山金","金融","TWSE"],["2885","元大金","金融","TWSE"],
    ["2886","兆豐金","金融","TWSE"],["2887","台新金","金融","TWSE"],["2888","新光金","金融","TWSE"],
    ["2890","永豐金","金融","TWSE"],["2891","中信金","金融","TWSE"],["2892","第一金","金融","TWSE"],
    ["5880","合庫金","金融","TWSE"],
    ["2912","統一超","流通","TWSE"],["3008","大立光","光學","TWSE"],["3017","奇鋐","散熱","TWSE"],
    ["3034","聯詠","IC設計","TWSE"],["3037","欣興","PCB","TWSE"],["3045","台灣大","電信","TWSE"],
    ["3058","立德","PCB","TWSE"],["3231","緯創","電腦","TWSE"],["3260","威剛","記憶體","TWSE"],
    ["3293","鈊象","遊戲","TWSE"],["3406","玉晶光","光學","TWSE"],["3443","創意","IC設計","TWSE"],
    ["3481","群創","面板","TWSE"],["3563","牧德","儀器","TWSE"],["3661","世芯-KY","IC設計","TWSE"],
    ["3702","大聯大","通路","TWSE"],["4904","遠傳","電信","TWSE"],["4938","和碩","電腦","TWSE"],
    ["4958","臻鼎-KY","PCB","TWSE"],["5388","中磊","網通","TWSE"],
    ["5483","中美晶","半導體","TWSE"],["5871","中租-KY","租賃","TWSE"],["5876","上海商銀","金融","TWSE"],
    ["6121","新普","電池","TWSE"],["6239","力成","封測","TWSE"],
    ["6271","同欣電","電子","TWSE"],["6285","啟碁","網通","TWSE"],["6409","旭隼","電子","TWSE"],
    ["6415","矽力-KY","IC設計","TWSE"],["6505","台塑化","塑化","TWSE"],["6669","緯穎","伺服器","TWSE"],
    ["8046","南電","PCB","TWSE"],["9904","寶成","製鞋","TWSE"],
    ["9910","豐泰","製鞋","TWSE"],["9921","巨大","自行車","TWSE"],["9939","宏全","包裝","TWSE"],
    ["9945","潤泰新","營建","TWSE"],
    // === TPEx 上櫃 ===
    ["3030","德律","儀器","TPEx"],["3105","穩懋","半導體","TPEx"],["3130","一零四","網路","TPEx"],
    ["3211","順達","電池","TPEx"],["3338","泰碩","散熱","TPEx"],["3450","聯鈞","光通訊","TPEx"],
    ["3454","晶睿","網通","TPEx"],["3645","達邁","電子","TPEx"],
    ["3675","德微","半導體","TPEx"],["3680","家登","半導體","TPEx"],["4126","太醫","醫材","TPEx"],
    ["4128","中天-KY","生技","TPEx"],["4147","中裕","生技","TPEx"],["4153","鈺緯","醫材","TPEx"],
    ["4426","利勤","紡織","TPEx"],["4934","太極","光電","TPEx"],["5234","達興材料","半導體","TPEx"],
    ["5258","虹堡","電子","TPEx"],["5269","祥碩","IC設計","TPEx"],["5274","信驊","IC設計","TPEx"],
    ["5285","界霖","半導體","TPEx"],["5289","宜鼎","記憶體","TPEx"],["5314","世紀","電子","TPEx"],
    ["5347","世界先進","半導體","TPEx"],["5351","鈺創","半導體","TPEx"],["5371","中光電","面板","TPEx"],
    ["5392","應華","電子","TPEx"],["5536","聖暉","系統整合","TPEx"],["5904","寶雅","百貨","TPEx"],
    ["6104","創惟","IC設計","TPEx"],["6182","合晶","半導體","TPEx"],["6202","盛群","IC設計","TPEx"],
    ["6206","飛捷","電子","TPEx"],["6230","超眾","散熱","TPEx"],["6488","環球晶","半導體","TPEx"],
    ["6446","藥華藥","生技","TPEx"],["6533","晶心科","IC設計","TPEx"],
    ["6547","高端疫苗","生技","TPEx"],["6770","力積電","半導體","TPEx"],
    ["8044","網家","電商","TPEx"],["8086","宏捷科","半導體","TPEx"],["8101","華冠","電子","TPEx"],
    ["8358","金居","電子","TPEx"],["8478","東哥遊艇","遊艇","TPEx"],
  ];
  REAL_STOCKS.forEach((r, i) => {
    const [code, name, industry, market] = r;
    const existed = stocks.find(s => s.code === code);
    if (existed) {
      // V6 LIVE 修正：若手繪示範股剛好撞到真實代號，改成真實名稱/市場並標記可抓 API。
      // 例如 2401、3030 等，健診與表格不可再停留在 Demo 價。
      existed.name = name;
      existed.industry = industry;
      existed.market = market;
      existed.real = true;
      existed.synthetic = false;
      existed.liveSource = "unverified";
      return;
    }
    const stk = genUniverseStock((parseInt(code) || (i+1)*7) * 0.31, code, market);
    stk.code = code; stk.name = name; stk.industry = industry; stk.market = market;
    stk.real = true;
    stk.synthetic = false;
    stk.liveSource = "unverified";
    stk.peLow = +(stk.pe * 0.78).toFixed(1); stk.peHigh = +(stk.pe * 1.32).toFixed(1);
    stocks.push(stk);
  });

  const handCodes = new Set(stocks.map(s => s.code));
  let twseCount = 0, tpexCount = 0;
  for (let c = 1100; c < 10000 && twseCount < 1020; c++) {
    if (handCodes.has(String(c))) continue;
    if (rand(c * 0.013) > 0.58) continue;
    const stk = genUniverseStock(c * 0.21, c, "TWSE");
    stk.peLow = +(stk.pe * 0.78).toFixed(1); stk.peHigh = +(stk.pe * 1.32).toFixed(1);
    stocks.push(stk);
    twseCount++;
  }
  for (let c = 3000; c < 9000 && tpexCount < 920; c++) {
    const code = "T" + c; // synthetic key to avoid TWSE collision
    if (handCodes.has(code) || handCodes.has(String(c))) continue;
    if (rand(c * 0.017 + 0.5) > 0.39) continue;
    const stk = genUniverseStock(c * 0.27 + 7, code, "TPEx");
    stk.peLow = +(stk.pe * 0.78).toFixed(1); stk.peHigh = +(stk.pe * 1.32).toFixed(1);
    stocks.push(stk);
    tpexCount++;
  }



  // ---- LIVE 可信資料修正：移除所有非官方清單的示範/合成股票 ----
  // 避免任何代號被顯示成錯誤的假股票名稱。
  // 正式版只保留 REAL_STOCKS 清單內的真實股票；所有行情再由 TWSE MIS 覆蓋。
  for (let i = stocks.length - 1; i >= 0; i--) {
    if (stocks[i].real !== true) stocks.splice(i, 1);
  }
  stocks.forEach(s => {
    s.real = true;
    s.synthetic = false;
    if (!s.liveSource) s.liveSource = "unverified";
    if (!s.candles) s.candles = genCandles(s);
    if (!s.tape) s.tape = buildTape(s);
    if (!orderBook[s.code]) orderBook[s.code] = buildOB(s.price);
    if (!s.pattern && patternMap[s.code]) s.pattern = patternMap[s.code](s);
  });

  // 新聞
  const news = [
    { t: "13:42", src: "MoneyDJ", title: "外資連三日買超半導體類股，AI 伺服器需求點火新一波估值重估", tags: ["2330", "2401", "3030"] },
    { t: "13:25", src: "Reuters", title: "美元指數續弱，亞幣同步走升，台幣盤中升破 32 元關卡", tags: ["FX"] },
    { t: "12:58", src: "鉅亨網", title: "傳產股下午盤翻紅，航運族群受惠 BDI 指數彈升", tags: ["2603", "2609"] },
    { t: "12:30", src: "公開資訊觀測站", title: "凌陽 (2401) 公告 11 月營收年增 28.4%，創歷史新高", tags: ["2401"] },
    { t: "11:55", src: "MoneyDJ", title: "OTC 指數一度跌逾 1.2%，中小型題材股遭遇技術性回檔", tags: ["OTC"] },
    { t: "11:02", src: "經濟日報", title: "熱門電子股短線乖離率升高，技術面進入超買區", tags: ["2330", "2401"] },
    { t: "10:33", src: "工商時報", title: "綠能類股盤中走弱，部分個股跌破月線支撐", tags: ["6446"] },
    { t: "10:18", src: "MoneyDJ", title: "金融類股逆勢撐盤，金融權值股買盤回溫", tags: ["2881", "2882"] },
    { t: "09:48", src: "中央社", title: "央行：12 月理監事會議將討論通膨與信用管制議題", tags: ["FIN"] },
    { t: "09:31", src: "鉅亨網", title: "開盤即跌：開盤前 15 分鐘成交量縮，買盤觀望情緒濃厚", tags: ["TWSE"] },
  ];

  // Discipline log (空手紀律)
  const discipline = [
    { d: "12/05", verdict: "win",  text: "今日空手，等到 2401 突破箱型才掛單，+2.7%", code: "2401" },
    { d: "12/04", verdict: "skip", text: "全天無訊號，遵守紀律收工，省下手續費 NT$420", code: "—" },
    { d: "12/03", verdict: "win",  text: "2603 五分線放量突破，小波段 +1.9%", code: "2603" },
    { d: "12/02", verdict: "skip", text: "熱門股乖離 4.6% 超標，放棄追高，事後續跌", code: "2330" },
    { d: "12/01", verdict: "loss", text: "違規追高反彈，跌破開盤 -2.1%，紀錄為訓練教材", code: "6446" },
    { d: "11/30", verdict: "win",  text: "2401 三濾鏡全通過，半倉部位 +3.2%", code: "2401" },
    { d: "11/29", verdict: "skip", text: "週日無交易，整理觀察清單", code: "—" },
  ];

  // Portfolio
  const portfolio = [
    { code: "2401", name: "凌陽",       qty: 3,  cost: 132.5, mkt: 142.5 },
              ];

  return { indices, stocks, orderBook, news, discipline, portfolio, winStreak: 26 };
})();
