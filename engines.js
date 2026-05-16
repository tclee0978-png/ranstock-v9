// ============================================================
// Ranstock V6 · 主升段獵殺引擎
// ============================================================
// 4 引擎：
//   PhaseEngine          → 階段判斷 (吸籌/洗盤/發動前夜/主升段/FOMO/出貨)
//   MainForceEngine      → 主升段起爆分數 (mainForceScore 0-100)
//   FOMOEngine           → FOMO 過熱分數 (fomoScore 0-100)
//   TrendContinuationEngine → 主升段續航分數 (trendScore 0-100)
//
// 全部以「既有 stock 物件欄位」為輸入，不打外部 API。
// 部署到 Live 模式時，只要 stock 物件的欄位由 API 填充，引擎不需修改。

(function () {
  // ---------- 小工具 ----------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmtScore(v) { return Math.round(v); }

  // 由 candles 算最近 N 天標準差 (相對價格)，用來判斷波動收斂
  function recentVolatility(candles, n = 20) {
    if (!candles || candles.length < n) return 0;
    const slice = candles.slice(-n);
    const mean = slice.reduce((a, c) => a + c.c, 0) / slice.length;
    const v = slice.reduce((a, c) => a + (c.c - mean) ** 2, 0) / slice.length;
    return Math.sqrt(v) / mean; // 相對波動度
  }

  function maConvergence(stock) {
    // 5/20/60 收斂度 — 三者相互距離越小越收斂
    const c = stock.candles && stock.candles[stock.candles.length - 1];
    if (!c) return 0;
    const m5 = c.ma5, m20 = c.ma20, m60 = c.ma60;
    if (!m5 || !m20 || !m60) return 0;
    const center = (m5 + m20 + m60) / 3;
    const spread = (Math.abs(m5 - center) + Math.abs(m20 - center) + Math.abs(m60 - center)) / 3;
    return clamp(1 - (spread / center) / 0.04, 0, 1); // <4% 散度即接近 1
  }

  function consecBigOrUpVol(candles, n = 5) {
    if (!candles || candles.length < n) return 0;
    const slice = candles.slice(-n);
    return slice.filter(c => c.spike).length;
  }

  function closePosition(candle) {
    // 收盤位置 (0..1)，1 表收最高
    if (!candle) return 0.5;
    const range = candle.h - candle.l;
    if (range <= 0) return 0.5;
    return (candle.c - candle.l) / range;
  }

  function upperShadowRatio(candle) {
    if (!candle) return 0;
    const range = candle.h - candle.l;
    if (range <= 0) return 0;
    const top = Math.max(candle.o, candle.c);
    return (candle.h - top) / range;
  }

  function consolidationDays(stock) {
    // 估算近期橫盤天數：找從尾端往回看，價格在 5% 區間內持續幾根
    const c = stock.candles;
    if (!c || c.length < 5) return 0;
    const last = c[c.length - 1].c;
    let days = 0;
    const band = last * 0.06;
    for (let i = c.length - 2; i >= 0 && days < 80; i--) {
      if (Math.abs(c[i].c - last) > band) break;
      days++;
    }
    return days;
  }

  function volShrinkRatio(stock) {
    // 近 5 日均量 vs 前 30 日均量
    const c = stock.candles;
    if (!c || c.length < 35) return 1;
    const recent5  = c.slice(-5).reduce((a, x) => a + x.v, 0) / 5;
    const prior30  = c.slice(-35, -5).reduce((a, x) => a + x.v, 0) / 30;
    if (prior30 <= 0) return 1;
    return recent5 / prior30; // <0.5 表量縮明顯
  }

  function familyResonance(stock, allStocks) {
    // 同產業有幾檔 f1 為 true (抗跌 + 站穩 5MA)
    if (!stock.industry) return 0;
    return allStocks.filter(s => s.industry === stock.industry && s !== stock && s.f1).length;
  }

  // ============================================================
  // MainForceEngine · 主升段起爆分數 (0-100)
  // ============================================================
  function mainForceScore(stock, allStocks) {
    const c = stock.candles && stock.candles[stock.candles.length - 1];
    if (!c) return { total: 0, breakdown: {}, meta: { days: 0, volShrink: 1, todayPct: 0, volRatio: 1, familyCount: 0 } };
    const todayPct = ((stock.price - stock.prev) / stock.prev) * 100;

    // 1. 整理天數 15-60 日：滿分 30 日
    const days = consolidationDays(stock);
    const s1 = days < 15 ? clamp(days / 15, 0, 1) * 60 : clamp(1 - Math.abs(days - 30) / 45, 0.4, 1) * 100;

    // 2. 量縮程度：recent/prior < 0.5 最佳
    const vsr = volShrinkRatio(stock);
    const s2 = vsr < 0.5 ? 100 : vsr < 0.8 ? 70 : vsr < 1 ? 40 : 10;

    // 3. 波動收斂：標準差越小越好
    const vol = recentVolatility(stock.candles, 20);
    const s3 = vol < 0.015 ? 100 : vol < 0.025 ? 70 : vol < 0.04 ? 40 : 10;

    // 4. 抗跌性 (f1)
    const s4 = stock.f1 ? 100 : (stock.otcRS >= 1 ? 50 : 10);

    // 5. 均線糾結 (5/20/60 收斂度)
    const s5 = maConvergence(stock) * 100;

    // 6. 突破強度：今日漲幅 2%~6% 最佳，超過 8% 扣分，<0% 0 分
    const s6 = todayPct < 0 ? 0 :
               todayPct < 2 ? todayPct / 2 * 60 :
               todayPct <= 6 ? 100 :
               todayPct <= 8 ? 80 : Math.max(20, 80 - (todayPct - 8) * 8);

    // 7. 健康放量：量比 1.8x~3.5x 最佳，>6x 扣分
    const volRatio = 1 + (stock.vol20Pct || 0) / 100;
    const s7 = volRatio < 1.2 ? volRatio / 1.2 * 30 :
               volRatio < 1.8 ? 40 + (volRatio - 1.2) / 0.6 * 50 :
               volRatio <= 3.5 ? 100 :
               volRatio <= 6 ? 80 - (volRatio - 3.5) * 12 :
               Math.max(10, 30 - (volRatio - 6) * 5);

    // 8. 收盤位置 (0~1，越接近 1 越好)
    const s8 = closePosition(c) * 100;

    // 9. 族群共振：同產業 3 檔以上 f1
    const fam = familyResonance(stock, allStocks);
    const s9 = clamp(fam / 3, 0, 1) * 100;

    // 加權平均
    const weights = [1.2, 1.1, 1.0, 1.3, 0.9, 1.6, 1.4, 1.2, 1.0];
    const scores  = [s1,  s2,  s3,  s4,  s5,  s6,  s7,  s8,  s9];
    const wSum = weights.reduce((a, b) => a + b);
    const total = scores.reduce((a, s, i) => a + s * weights[i], 0) / wSum;

    return {
      total: fmtScore(total),
      breakdown: {
        ["整理 " + days + " 日"]: fmtScore(s1),
        ["量縮 " + vsr.toFixed(2) + "x"]: fmtScore(s2),
        "波動收斂": fmtScore(s3),
        "抗跌性": fmtScore(s4),
        "均線糾結": fmtScore(s5),
        "突破強度": fmtScore(s6),
        "健康放量": fmtScore(s7),
        "收盤位置": fmtScore(s8),
        ["族群共振 " + fam]: fmtScore(s9),
      },
      meta: { days, volShrink: vsr, todayPct, volRatio, familyCount: fam }
    };
  }

  // ============================================================
  // FOMOEngine · 過熱分數 (0-100)
  // ============================================================
  function fomoScore(stock) {
    const c = stock.candles && stock.candles[stock.candles.length - 1];
    if (!c) return { total: 0, reasons: [] };
    const todayPct = ((stock.price - stock.prev) / stock.prev) * 100;
    const volRatio = 1 + (stock.vol20Pct || 0) / 100;
    const reasons = [];
    let score = 0;

    // 1. 昨日漲停 (>= +9.5%)
    const prevC = stock.candles[stock.candles.length - 2];
    const prevPct = prevC ? ((prevC.c - prevC.o) / prevC.o) * 100 : 0;
    if (prevPct >= 9) { score += 18; reasons.push("昨日漲停"); }

    // 2. 連續爆量 (3 日 spike)
    const spikes = consecBigOrUpVol(stock.candles, 3);
    if (spikes >= 2) { score += 15; reasons.push(`近 3 日 ${spikes} 次爆量`); }

    // 3. 量比 > 6x
    if (volRatio > 6)      { score += 22; reasons.push(`量比 ${volRatio.toFixed(1)}x (>6x 失控)`); }
    else if (volRatio > 4) { score += 12; reasons.push(`量比 ${volRatio.toFixed(1)}x 偏高`); }

    // 4. 跳空 > +5%
    if (c.o > c.c && c.o > stock.prev * 1.05) { score += 10; reasons.push("開盤跳空 >+5%"); }

    // 5. 離 5MA 太遠
    if (Math.abs(stock.ma5Bias) > 4)       { score += 15; reasons.push(`乖離 ${stock.ma5Bias}% >4%`); }
    else if (Math.abs(stock.ma5Bias) > 3)  { score += 8;  reasons.push(`乖離 ${stock.ma5Bias}%`); }

    // 6. 長上影 (>40%)
    if (upperShadowRatio(c) > 0.4) { score += 12; reasons.push("長上影線"); }

    // 7. 短期漲幅過大 (5 日累計 >15%)
    if (stock.candles.length >= 5) {
      const fiveDayPct = ((c.c - stock.candles[stock.candles.length - 5].c) / stock.candles[stock.candles.length - 5].c) * 100;
      if (fiveDayPct > 15) { score += 15; reasons.push(`5 日漲 ${fiveDayPct.toFixed(0)}%`); }
      else if (fiveDayPct > 10) { score += 8; reasons.push(`5 日漲 ${fiveDayPct.toFixed(0)}%`); }
    }

    // 8. 今日漲幅過大
    if (todayPct > 7) { score += 10; reasons.push(`今漲 ${todayPct.toFixed(1)}%`); }

    return { total: clamp(score, 0, 100), reasons };
  }

  // ============================================================
  // TrendContinuationEngine · 主升段續航分數 (0-100)
  // ============================================================
  function trendContinuationScore(stock, allStocks) {
    const c = stock.candles;
    if (!c || c.length < 10) return 0;
    let score = 0;

    // 1. 沿 5MA 上漲：近 10 日有幾天 close > ma5
    const recent10 = c.slice(-10);
    const aboveMa5 = recent10.filter(x => x.c >= x.ma5).length;
    score += (aboveMa5 / 10) * 25;

    // 2. 回踩不破：低點未跌破 ma20
    const recentLow = Math.min(...recent10.map(x => x.l));
    const lastMa20 = recent10[recent10.length - 1].ma20;
    if (recentLow >= lastMa20 * 0.97) score += 15;

    // 3. 量縮整理後再攻：近 5 日有量縮 + 末日放量
    const vsr = volShrinkRatio(stock);
    const lastC = c[c.length - 1];
    const lastVolRatio = 1 + (stock.vol20Pct || 0) / 100;
    if (vsr < 0.8 && lastVolRatio > 1.5) score += 15;

    // 4. 高檔量未失控：5 日量比平均 < 3.5
    const recent5Vol = c.slice(-5);
    const avg5Vol = recent5Vol.reduce((a, x) => a + x.v, 0) / 5;
    const baseVol = c.slice(-30, -5).reduce((a, x) => a + x.v, 0) / 25;
    const ratio = baseVol > 0 ? avg5Vol / baseVol : 1;
    if (ratio < 3.5 && ratio > 1.2) score += 15;

    // 5. 大盤跌它不跌 (抗跌性 f1)
    if (stock.f1) score += 15;

    // 6. 族群輪動仍續強：同產業 >= 2 檔 f1
    const fam = familyResonance(stock, allStocks);
    score += clamp(fam / 2, 0, 1) * 15;

    return clamp(fmtScore(score), 0, 100);
  }

  // ============================================================
  // PhaseEngine · 階段判斷
  // ============================================================
  // 階段：absorption(吸籌) / wash(洗盤) / preIgnite(發動前夜) / mainWave(主升段) / fomo / distribution(出貨)
  function detectPhase(stock, scores) {
    const todayPct = ((stock.price - stock.prev) / stock.prev) * 100;
    const c = stock.candles && stock.candles[stock.candles.length - 1];
    const prevC = stock.candles && stock.candles[stock.candles.length - 2];

    // M頭 / 跌破 5MA / 連續長黑 → 出貨
    if (stock.pattern && stock.pattern.type === "m_top") return "distribution";
    if (!stock.f3 && todayPct < -2) return "distribution";
    if (c && prevC && c.c < c.ma5 && prevC.c < prevC.ma5 && todayPct < -1) return "distribution";

    // FOMO 排除
    if (scores.fomo.total >= 70) return "fomo";

    // 主升段
    if (scores.mainForce.total >= 75 && stock.f2) return "mainWave";

    // 發動前夜：分數 60-75，箱型內準備突破
    if (scores.mainForce.total >= 60 && scores.fomo.total < 50 && stock.f1) return "preIgnite";

    // 洗盤：整理天數 >= 10 + 量縮
    if (consolidationDays(stock) >= 10 && volShrinkRatio(stock) < 0.9) return "wash";

    // 吸籌：抗跌但分數低
    if (stock.f1 && scores.mainForce.total < 60) return "absorption";

    // 預設
    return "wash";
  }

  const PHASE_META = {
    absorption: { ko: "吸籌期",   icon: "🟤", color: "#a87344", glow: "#a87344" },
    wash:       { ko: "洗盤期",   icon: "🟡", color: "#ffb020", glow: "#ffb020" },
    preIgnite:  { ko: "發動前夜", icon: "🟠", color: "#ff8c1a", glow: "#ff8c1a" },
    mainWave:   { ko: "主升段",   icon: "🟢", color: "#c6ff5a", glow: "#c6ff5a" },
    fomo:       { ko: "全民 FOMO", icon: "🔴", color: "#ff2d3d", glow: "#ff2d3d" },
    distribution: { ko: "出貨期", icon: "⚫", color: "#525d6e", glow: "#525d6e" }
  };

  // ============================================================
  // 撤退訊號偵測 (主力撤退 / 出貨警示)
  // ============================================================
  function retreatSignals(stock) {
    const c = stock.candles;
    if (!c || c.length < 3) return [];
    const last = c[c.length - 1];
    const prev = c[c.length - 2];
    const out = [];
    // 1. 爆量長黑
    if (last.spike && last.c < last.o && (last.o - last.c) / last.o > 0.04) out.push("爆量長黑");
    // 2. 跌破 5MA
    if (last.c < last.ma5 && prev.c >= prev.ma5) out.push("跌破 5MA");
    // 3. 突破失敗：今日穿過 boxHi 但收回
    if (last.h > stock.boxHi && last.c < stock.boxHi) out.push("突破失敗");
    // 4. 高檔爆量
    if (last.spike && last.c > last.ma20 * 1.1) out.push("高檔爆量");
    // 5. 量增價跌
    if (last.v > prev.v * 1.4 && last.c < prev.c) out.push("量增價跌");
    return out;
  }

  // ============================================================
  // 綠燈條件評估 (10 條件)
  // ============================================================
  function greenLightChecklist(stock, scores) {
    const c = stock.candles && stock.candles[stock.candles.length - 1];
    const todayPct = ((stock.price - stock.prev) / stock.prev) * 100;
    const volRatio = 1 + (stock.vol20Pct || 0) / 100;
    const days = consolidationDays(stock);
    const items = [
      { ok: days >= 15, label: `整理 ${days} 日 (≥15)`, weight: 1 },
      { ok: stock.f2, label: "突破箱型", weight: 1 },
      { ok: volRatio >= 1.8 && volRatio <= 3.5, label: `量比 ${volRatio.toFixed(1)}x (1.8–3.5x)`, weight: 1 },
      { ok: todayPct >= 2 && todayPct <= 6, label: `漲 ${todayPct.toFixed(1)}% (2–6%)`, weight: 1 },
      { ok: c ? closePosition(c) >= 0.7 : false, label: "收盤近最高", weight: 1 },
      { ok: c ? upperShadowRatio(c) < 0.25 : false, label: "上影 <25%", weight: 1 },
      { ok: maConvergence(stock) > 0.6, label: "均線收斂後上彎", weight: 1 },
      { ok: recentVolatility(stock.candles, 20) < 0.025, label: "波動收斂", weight: 1 },
      { ok: scores.fomo.total < 50, label: "非昨日漲停 / 非 FOMO", weight: 1 },
      { ok: scores.mainForce.meta.familyCount >= 3, label: `族群共振 (${scores.mainForce.meta.familyCount})`, weight: 1 },
    ];
    const passCount = items.filter(i => i.ok).length;
    return { items, passCount, greenLight: passCount >= 8 };
  }

  // ============================================================
  // AI 操盤手評語產生器
  // ============================================================
  function aiCommentary(stock, scores, phase) {
    const days = scores.mainForce.meta.days;
    const todayPct = scores.mainForce.meta.todayPct;
    const volRatio = scores.mainForce.meta.volRatio;
    const fam = scores.mainForce.meta.familyCount;

    if (phase === "mainWave") {
      return `整理 ${days} 天後首次<strong>溫和放量</strong> ${volRatio.toFixed(1)}x，` +
        `突破箱型上緣 +${todayPct.toFixed(1)}%，` +
        `未出現失控爆量，較像<strong>主力正式發動第一天</strong>。` +
        (fam >= 3 ? `同族群 ${fam} 檔同步轉強，族群共振訊號明確。` : "");
    }
    if (phase === "preIgnite") {
      return `整理已達 ${days} 日，量縮乾淨、波動收斂，主力吸籌完畢的徵兆出現。` +
        `今日溫和上漲 ${todayPct.toFixed(1)}%，<strong>發動前夜</strong>，` +
        `等明日放量突破即可預掛買單。`;
    }
    if (phase === "fomo") {
      return `<strong style="color: var(--up)">⚠ FOMO 過熱警示</strong>：` +
        scores.fomo.reasons.slice(0, 3).join("、") + "。" +
        `即使技術面分數高，<strong>追進去等於替主力抬轎</strong>，建議空手等回測 5MA。`;
    }
    if (phase === "distribution") {
      return `<strong style="color: var(--down)">主力撤退訊號</strong>：${retreatSignals(stock).join("、") || "M 頭跌破頸線"}。` +
        `今日廢股，<strong>關掉不再追蹤</strong>，連續空手 +1。`;
    }
    if (phase === "wash") {
      return `近 ${days} 日量縮整理，主力洗盤動作明顯。` +
        `分數 ${scores.mainForce.total}/100，等待波動收斂 + 量縮乾淨後突破，再評估。`;
    }
    if (phase === "absorption") {
      return `OTC 下跌時仍站穩 5MA，<strong>主力悄然吸籌</strong>中，` +
        `但整理尚未夠久、波動仍大，現階段觀察為主，不出手。`;
    }
    return `分數 ${scores.mainForce.total}/100。`;
  }

  // ============================================================
  // 明日策略產生器
  // ============================================================
  function tomorrowStrategy(stock, scores, phase) {
    const price = stock.price;
    const c = stock.candles && stock.candles[stock.candles.length - 1];
    if (!c) return null;

    if (phase === "mainWave") {
      return {
        action: "可上車",
        preBuy:    +(price * 0.99).toFixed(2),
        breakBuy:  +(c.h * 1.005).toFixed(2),
        pullbackBuy: +(c.ma5 * 1.005).toFixed(2),
        stopLoss:  +(c.ma5 * 0.96).toFixed(2),
        target1:   +(stock.boxHi + (stock.boxHi - stock.boxLo) * 0.5).toFixed(2),
        target2:   +(stock.boxHi + (stock.boxHi - stock.boxLo) * 1.0).toFixed(2),
      };
    }
    if (phase === "preIgnite") {
      return {
        action: "等突破",
        preBuy:    +(stock.boxHi * 1.002).toFixed(2),
        breakBuy:  +(stock.boxHi * 1.01).toFixed(2),
        pullbackBuy: +(c.ma20 * 1.01).toFixed(2),
        stopLoss:  +(c.ma20 * 0.96).toFixed(2),
        target1:   +(stock.boxHi + (stock.boxHi - stock.boxLo) * 0.5).toFixed(2),
        target2:   +(stock.boxHi + (stock.boxHi - stock.boxLo) * 1.0).toFixed(2),
      };
    }
    if (phase === "wash" || phase === "absorption") {
      return {
        action: "等突破",
        preBuy: null,
        breakBuy: +(stock.boxHi * 1.005).toFixed(2),
        pullbackBuy: +(c.ma20 * 1.005).toFixed(2),
        stopLoss: +(c.ma20 * 0.95).toFixed(2),
        target1: +(stock.boxHi + (stock.boxHi - stock.boxLo) * 0.5).toFixed(2),
        target2: null,
      };
    }
    // fomo / distribution
    return { action: "不碰", preBuy: null, breakBuy: null, pullbackBuy: null, stopLoss: null, target1: null, target2: null };
  }

  // ============================================================
  // 主入口 — 對全市場計算 V6 分數
  // ============================================================
  function computeV6(allStocks) {
    return allStocks.map(s => {
      const mf = mainForceScore(s, allStocks);
      const fomo = fomoScore(s);
      const trend = trendContinuationScore(s, allStocks);
      const scores = { mainForce: mf, fomo, trend };
      const phase = detectPhase(s, scores);
      const checklist = greenLightChecklist(s, scores);
      const commentary = aiCommentary(s, scores, phase);
      const strategy = tomorrowStrategy(s, scores, phase);
      const retreat = retreatSignals(s);
      return { stock: s, scores, phase, checklist, commentary, strategy, retreat };
    });
  }

  window.V6 = {
    computeV6,
    PHASE_META,
    mainForceScore,
    fomoScore,
    trendContinuationScore,
    detectPhase,
    aiCommentary,
    tomorrowStrategy,
    greenLightChecklist,
    retreatSignals
  };
})();
