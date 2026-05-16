// ============================================================
// Ranstock V6 · QuoteSource — Live via Cloudflare Worker Proxy
// ============================================================
// Worker:  https://ranwinner-api.tclee0978.workers.dev
//   /?ex_ch=tse_2330.tw|tse_2317.tw|otc_6547.tw
//
// 策略：
//   - dataMode === "demo" → 全部用 window.MARKET_DATA (合成資料、明確標示)
//   - dataMode === "live" → 全部走 Worker 拿真實 MIS 報價
//   - dataMode === "after" → 盤後分析模式：TWSE OpenAPI + FinMind (預留)
//   - LIVE 失敗：UI 顯示「免費資料源暫時無法取得」，不可偷偷回退 mock。
// ============================================================

(function () {
  const PROXY_URL = "https://ranwinner-api.tclee0978.workers.dev";
  const FINMIND_TOKEN = "";  // ← 用戶可填入 FinMind token 啟用法人籌碼

  // ----- Live snapshot via Worker (TWSE MIS) -----
  // pairs: [{ code: "2330", market: "TWSE" }, { code: "6547", market: "TPEx" }]
  async function fetchLiveBatch(pairs) {
  const results = [];
  for (const p of pairs) {
    const symbol = p.market === "TPEx" ? `${p.code}.TWO` : `${p.code}.TW`;
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`);
      const json = await res.json();
      const meta = json.chart.result[0].meta;
      const price = meta.regularMarketPrice || meta.previousClose || 0;

      results.push({
        code: p.code,
        name: p.code,           // 之後可再補中文
        price: parseFloat(price),
        open: parseFloat(meta.chartPreviousClose || price),
        high: parseFloat(meta.high || price),
        low: parseFloat(meta.low || price),
        prev: parseFloat(meta.previousClose || price),
        vol: 0,
        time: new Date().toISOString(),
        liveSource: "LIVE"
      });
    } catch (e) {
      console.warn("Yahoo fetch failed:", p.code);
    }
  }
  return results;
}

  // ----- Live daily K-bars (TWSE OpenAPI STOCK_DAY) -----
  // 透過 Worker 中繼: /?openapi=STOCK_DAY&stockNo=2330
  // 需要 Worker 也支援 OpenAPI 路徑 (見下方延伸註解)
  async function fetchLiveDailyK(code) {
    const url = `${PROXY_URL}/?openapi=STOCK_DAY&stockNo=${code}&_=${Date.now()}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`STOCK_DAY HTTP ${r.status}`);
    return await r.json();
  }

  // ----- FinMind 籌碼 (盤後) -----
  async function fetchFinMindChip(code) {
    if (!FINMIND_TOKEN) throw new Error("尚未設定 FinMind Token");
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=${code}&token=${FINMIND_TOKEN}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`FinMind HTTP ${r.status}`);
    return await r.json();
  }

  // ----- Worker 擴充建議 (請使用者更新 Worker) -----
  //
  // export default {
  //   async fetch(req) {
  //     const url = new URL(req.url);
  //
  //     // 1. MIS Snapshot 通道 (已有)
  //     const exCh = url.searchParams.get("ex_ch");
  //     if (exCh) {
  //       const upstream = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0&_=${Date.now()}`;
  //       const r = await fetch(upstream, { headers: { "User-Agent": "Mozilla/5.0" }});
  //       return new Response(await r.text(), { headers: {"content-type":"application/json;charset=utf-8","access-control-allow-origin":"*"} });
  //     }
  //
  //     // 2. TWSE OpenAPI 通道 (新增)
  //     const openapi = url.searchParams.get("openapi");
  //     if (openapi) {
  //       const qs = new URLSearchParams(url.search);
  //       qs.delete("openapi");
  //       const upstream = `https://openapi.twse.com.tw/v1/exchangeReport/${openapi}?${qs.toString()}`;
  //       const r = await fetch(upstream);
  //       return new Response(await r.text(), { headers: {"content-type":"application/json;charset=utf-8","access-control-allow-origin":"*"} });
  //     }
  //
  //     return new Response("Usage: ?ex_ch=tse_2330.tw  or  ?openapi=STOCK_DAY&stockNo=2330", { status: 400 });
  //   }
  // }

  // ============================================================
  // Public API
  // ============================================================
  window.QuoteSource = {
    PROXY_URL,
    fetchLiveBatch,
    fetchLiveDailyK,
    fetchFinMindChip,
  };
})();
