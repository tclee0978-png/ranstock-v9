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
    if (!pairs || pairs.length === 0) return [];
    const targets = pairs.map(p =>
      (p.market === "TPEx" ? "otc_" : "tse_") + p.code + ".tw"
    ).join("|");
    const url = `${PROXY_URL}/?ex_ch=${encodeURIComponent(targets)}&_=${Date.now()}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`Proxy HTTP ${r.status}`);
    const data = await r.json();
    const items = (data.msgArray || []).map(item => ({
      code: item.c,
      name: item.n,
      price: Number(item.z) || (Number(item.pz) || null),  // z=成交價, pz=最後成交
      open: Number(item.o) || null,
      high: Number(item.h) || null,
      low:  Number(item.l) || null,
      prev: Number(item.y) || null,
      vol:  Number(item.v) || null,
      time: item.t || "",
      askPrices: (item.a || "").split("_").filter(Boolean).map(Number),
      bidPrices: (item.b || "").split("_").filter(Boolean).map(Number),
      askSizes:  (item.f || "").split("_").filter(Boolean).map(Number),
      bidSizes:  (item.g || "").split("_").filter(Boolean).map(Number),
      source: "twse-mis",
    }));
    return items;
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
