// =============== K-line Chart (canvas) — 飆股版 ===============
// Candles + 4 MAs (5/20/60/120) + 箱型 + W底/M頭/起漲 標注 + 量柱(紅綠+金邊) + hover tooltip
const CHART_COLORS = {
  upBody:   "#ff2d3d", upWick:   "#ff2d3d",
  downBody: "#00d96b", downWick: "#00d96b",
  ma5:    "#ff5577",
  ma20:   "#ff9a1f",
  ma60:   "#b46cff",
  ma120:  "#4d8bff",
  box:        "#5ad7ff",
  boxFill:    "rgba(90, 215, 255, 0.05)",
  wBottom:    "#5ad7ff",
  mTop:       "#ff5252",
  rocket:     "#ff2d3d",
  rocketGold: "#ffd24a",
  grid:       "rgba(35, 44, 58, 0.55)",
  axis:       "#525d6e",
  open:       "rgba(124, 136, 152, 0.7)",
  goldEdge:   "#ffd24a",
};

function KChart({ stock, tf = "1D", showOTC = true, showBox = true,
                  showMA5 = true, showMA20 = true, showMA60 = true, showMA120 = true,
                  showPattern = true, beastMode = true, otcSegments }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // { x, y, candleIdx }
  const layoutRef = useRef(null);

  const candles = useMemo(() => {
    const all = stock.candles || [];
    const n = { "1D": 30, "5D": 50, "1M": 80, "3M": 110, "6M": 140 }[tf] || 80;
    if (all.length <= n) return all;
    return all.slice(all.length - n);
  }, [stock, tf]);

  useEffect(() => {
    const cvs = canvasRef.current;
    const wrap = wrapRef.current;
    if (!cvs || !wrap) return;
    const dpr = window.devicePixelRatio || 1;

    function draw() {
      const W = wrap.clientWidth, H = wrap.clientHeight;
      cvs.width = W * dpr; cvs.height = H * dpr;
      cvs.style.width = W + "px"; cvs.style.height = H + "px";
      const ctx = cvs.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // layout
      const padL = 14, padR = 60, padT = 14, padB = 20;
      const volH = Math.max(70, Math.min(130, H * 0.24));
      const priceH = H - volH - padT - padB - 14;
      const priceTop = padT;
      const priceBot = priceTop + priceH;
      const volTop = priceBot + 14;
      const volBot = volTop + volH;
      const innerW = W - padL - padR;
      const cs = candles;
      if (cs.length === 0) return;

      // gather extents
      let pMin = Infinity, pMax = -Infinity, vMax = 0;
      cs.forEach(c => {
        pMin = Math.min(pMin, c.l);
        pMax = Math.max(pMax, c.h);
        if (showMA120 && c.ma120) { pMin = Math.min(pMin, c.ma120); pMax = Math.max(pMax, c.ma120); }
        vMax = Math.max(vMax, c.v);
      });
      if (showBox) { pMin = Math.min(pMin, stock.boxLo); pMax = Math.max(pMax, stock.boxHi); }
      if (stock.pattern && stock.pattern.target) {
        pMin = Math.min(pMin, stock.pattern.target);
        pMax = Math.max(pMax, stock.pattern.target);
      }
      const pad = (pMax - pMin) * 0.10;
      pMin -= pad; pMax += pad;
      const pRange = pMax - pMin || 1;
      const px2y = p => priceBot - ((p - pMin) / pRange) * (priceBot - priceTop);
      const v2y = v => volBot - (v / (vMax * 1.1)) * (volBot - volTop);
      const xAt = i => padL + (i + 0.5) * (innerW / cs.length);
      // store layout for hover
      layoutRef.current = { padL, padR, padT, padB, priceTop, priceBot, volTop, volBot, innerW, W, H, cs, px2y, v2y, xAt, pMin, pMax };

      // ---- BG GRID ----
      ctx.strokeStyle = CHART_COLORS.grid;
      ctx.lineWidth = 1;
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = CHART_COLORS.axis;
      ctx.textAlign = "left";
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = priceTop + (priceH * i / gridLines);
        ctx.beginPath();
        ctx.setLineDash([2, 4]);
        ctx.moveTo(padL, y); ctx.lineTo(padL + innerW, y);
        ctx.stroke();
        const v = pMax - (pRange * i / gridLines);
        ctx.fillText(v.toFixed(2), padL + innerW + 5, y + 4);
      }
      ctx.setLineDash([]);

      // ---- BOX (20D) ----
      if (showBox) {
        const yHi = px2y(stock.boxHi), yLo = px2y(stock.boxLo);
        ctx.fillStyle = CHART_COLORS.boxFill;
        ctx.fillRect(padL, yHi, innerW, yLo - yHi);
        ctx.strokeStyle = CHART_COLORS.box;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padL, yHi); ctx.lineTo(padL + innerW, yHi);
        ctx.moveTo(padL, yLo); ctx.lineTo(padL + innerW, yLo);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = CHART_COLORS.box;
        ctx.font = "bold 10px 'IBM Plex Mono', monospace";
        ctx.fillText(`20D BOX 上 ${stock.boxHi.toFixed(2)}`, padL + 6, yHi - 5);
        ctx.fillText(`20D BOX 下 ${stock.boxLo.toFixed(2)}`, padL + 6, yLo + 13);
      }

      // ---- OTC overlay (subtle, only if enabled and pro mode) ----
      if (showOTC && !beastMode) {
        const otc = otcSegments || cs.map((_, i) => 1 + Math.sin(i * 0.4) * 0.02 - i * 0.0004);
        const nMin = Math.min(...otc), nMax = Math.max(...otc);
        const nRange = (nMax - nMin) || 1;
        ctx.strokeStyle = "rgba(124, 136, 152, 0.6)";
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        otc.forEach((v, i) => {
          const x = xAt(i);
          const y = priceTop + (1 - (v - nMin) / nRange) * priceH;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#7c8898";
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.fillText("OTC 疊加", padL + innerW - 60, priceTop + 11);
      }

      // ---- CANDLES & VOLUME ----
      const candleW = Math.max(2.5, innerW / cs.length * 0.72);
      cs.forEach((c, i) => {
        const x = xAt(i);
        const isUp = c.c >= c.o;
        const col = isUp ? CHART_COLORS.upBody : CHART_COLORS.downBody;
        ctx.strokeStyle = col; ctx.fillStyle = col;
        // wick
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, px2y(c.h)); ctx.lineTo(x, px2y(c.l));
        ctx.stroke();
        // body
        const yO = px2y(c.o), yC = px2y(c.c);
        const top = Math.min(yO, yC), bot = Math.max(yO, yC);
        const h = Math.max(1.5, bot - top);
        ctx.fillRect(x - candleW / 2, top, candleW, h);

        // volume bar
        const vy = v2y(c.v);
        const vBarW = c.spike ? candleW * 1.15 : candleW;
        const volCol = isUp ? "rgba(255,45,61,0.75)" : "rgba(0,217,107,0.75)";
        ctx.fillStyle = volCol;
        ctx.fillRect(x - vBarW / 2, vy, vBarW, volBot - vy);
        // gold edge on spike
        if (c.spike) {
          ctx.strokeStyle = CHART_COLORS.goldEdge;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = CHART_COLORS.goldEdge;
          ctx.shadowBlur = 6;
          ctx.strokeRect(x - vBarW / 2, vy, vBarW, volBot - vy);
          ctx.shadowBlur = 0;
          // 量爆 label
          ctx.fillStyle = CHART_COLORS.goldEdge;
          ctx.font = "bold 9px 'IBM Plex Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText("量爆", x, vy - 4);
          ctx.textAlign = "left";
        }
      });

      // ---- MA lines (5/20/60/120) ----
      function drawMA(field, color, width = 1.6) {
        ctx.strokeStyle = color; ctx.lineWidth = width;
        ctx.shadowColor = color; ctx.shadowBlur = 0;
        ctx.beginPath();
        cs.forEach((c, i) => {
          const x = xAt(i);
          const y = px2y(c[field]);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      if (showMA120) drawMA("ma120", CHART_COLORS.ma120, 1.7);
      if (showMA60)  drawMA("ma60",  CHART_COLORS.ma60,  1.7);
      if (showMA20)  drawMA("ma20",  CHART_COLORS.ma20,  1.8);
      if (showMA5)   drawMA("ma5",   CHART_COLORS.ma5,   2.0);

      // MA last-value labels (right side)
      const lastIdx = cs.length - 1;
      const lastC = cs[lastIdx];
      [
        showMA5   && { v: lastC.ma5,   color: CHART_COLORS.ma5,   tag: "5"   },
        showMA20  && { v: lastC.ma20,  color: CHART_COLORS.ma20,  tag: "20"  },
        showMA60  && { v: lastC.ma60,  color: CHART_COLORS.ma60,  tag: "60"  },
        showMA120 && { v: lastC.ma120, color: CHART_COLORS.ma120, tag: "120" },
      ].filter(Boolean).forEach(({ v, color, tag }) => {
        const y = px2y(v);
        ctx.fillStyle = color;
        ctx.font = "bold 9px 'IBM Plex Mono', monospace";
        ctx.fillText(`${tag}`, padL + innerW + 4, y - 6);
      });

      // ---- PATTERN OVERLAYS ----
      if (showPattern && stock.pattern) {
        const p = stock.pattern;
        // map pattern indices (within full candle list) to local idx
        const offset = (stock.candles.length - cs.length);
        const localIdx = i => i - offset;

        if ((p.type === "rocket" || p.type === "w_break") && p.ex) {
          const i1 = localIdx(p.ex.w1.i), i2 = localIdx(p.ex.w2.i), iN = localIdx(p.ex.neck.i);
          if (i1 >= 0 && i2 < cs.length) {
            // W底 arc
            const x1 = xAt(i1), y1 = px2y(p.ex.w1.v);
            const x2 = xAt(i2), y2 = px2y(p.ex.w2.v);
            const xN = xAt(iN), yN = px2y(p.ex.neck.v);
            // arc through w1 → neck → w2
            ctx.strokeStyle = CHART_COLORS.wBottom;
            ctx.lineWidth = 2.2;
            ctx.shadowColor = CHART_COLORS.wBottom;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo((x1+xN)/2, (y1+yN)/2 - 6, xN, yN);
            ctx.quadraticCurveTo((xN+x2)/2, (yN+y2)/2 - 6, x2, y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // labels W1 W2
            ctx.fillStyle = CHART_COLORS.wBottom;
            ctx.font = "bold 11px 'IBM Plex Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("W1", x1, y1 + 18);
            ctx.fillText("W2", x2, y2 + 18);
            // dots
            ctx.fillStyle = CHART_COLORS.wBottom;
            [[x1,y1],[x2,y2],[xN,yN]].forEach(([px,py])=>{
              ctx.beginPath(); ctx.arc(px,py,3.5,0,Math.PI*2); ctx.fill();
            });
            // neckline horizontal
            ctx.strokeStyle = CHART_COLORS.wBottom;
            ctx.setLineDash([4, 3]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, yN); ctx.lineTo(padL + innerW, yN);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = CHART_COLORS.wBottom;
            ctx.font = "10px 'IBM Plex Mono', monospace";
            ctx.textAlign = "left";
            ctx.fillText(`頸線 ${p.ex.neck.v.toFixed(2)}`, x2 + 6, yN - 5);

            // target price line
            if (p.target) {
              const yT = px2y(p.target);
              ctx.strokeStyle = CHART_COLORS.rocketGold;
              ctx.lineWidth = 1.4;
              ctx.setLineDash([5, 3]);
              ctx.beginPath();
              ctx.moveTo(padL, yT); ctx.lineTo(padL + innerW, yT);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = CHART_COLORS.rocketGold;
              ctx.fillRect(padL + innerW, yT - 9, padR - 4, 18);
              ctx.fillStyle = "#0a0e14";
              ctx.font = "bold 10px 'IBM Plex Mono', monospace";
              ctx.textAlign = "center";
              ctx.fillText("🎯 " + p.target.toFixed(2), padL + innerW + (padR - 4) / 2, yT + 4);
              ctx.textAlign = "left";
            }

            // 起漲箭頭 (only on rocket type, point at last candle from below)
            if (p.type === "rocket") {
              const lastX = xAt(cs.length - 1), lastY = px2y(cs[cs.length-1].c);
              ctx.fillStyle = CHART_COLORS.rocketGold;
              ctx.strokeStyle = CHART_COLORS.rocketGold;
              ctx.shadowColor = CHART_COLORS.rocketGold;
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.moveTo(lastX - 10, lastY + 28);
              ctx.lineTo(lastX + 10, lastY + 28);
              ctx.lineTo(lastX, lastY + 12);
              ctx.closePath();
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.fillStyle = CHART_COLORS.rocketGold;
              ctx.font = "bold 11px 'Noto Sans TC', sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("起漲段", lastX, lastY + 44);
              ctx.textAlign = "left";
            }
          }
        }

        if (p.type === "m_top" && p.ex) {
          const offset = (stock.candles.length - cs.length);
          const i1 = p.ex.w1.i - offset, i2 = p.ex.w2.i - offset, iN = p.ex.neck.i - offset;
          if (i1 >= 0 && i2 < cs.length) {
            const x1 = xAt(i1), y1 = px2y(p.ex.w1.v);
            const x2 = xAt(i2), y2 = px2y(p.ex.w2.v);
            const xN = xAt(iN), yN = px2y(p.ex.neck.v);
            ctx.strokeStyle = CHART_COLORS.mTop;
            ctx.lineWidth = 2;
            ctx.shadowColor = CHART_COLORS.mTop;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo((x1+xN)/2, (y1+yN)/2 + 6, xN, yN);
            ctx.quadraticCurveTo((xN+x2)/2, (yN+y2)/2 + 6, x2, y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // labels
            ctx.fillStyle = CHART_COLORS.mTop;
            ctx.font = "bold 11px 'IBM Plex Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("M1", x1, y1 - 8);
            ctx.fillText("M2", x2, y2 - 8);
            [[x1,y1],[x2,y2],[xN,yN]].forEach(([px,py])=>{
              ctx.beginPath(); ctx.arc(px,py,3.5,0,Math.PI*2); ctx.fill();
            });
            // neckline (broken)
            ctx.strokeStyle = CHART_COLORS.mTop;
            ctx.setLineDash([4, 3]);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x1, yN); ctx.lineTo(padL + innerW, yN);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = CHART_COLORS.mTop;
            ctx.font = "bold 11px 'Noto Sans TC', sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(`頸線跌破 ${p.ex.neck.v.toFixed(2)} ↓`, x2 + 6, yN - 5);
          }
        }
      }

      // ---- Current price line + tag (Taiwan red/green) ----
      const yCur = px2y(stock.price);
      const upColor = stock.price >= stock.prev;
      ctx.strokeStyle = upColor ? CHART_COLORS.upBody : CHART_COLORS.downBody;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, yCur); ctx.lineTo(padL + innerW, yCur);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = upColor ? CHART_COLORS.upBody : CHART_COLORS.downBody;
      ctx.fillRect(padL + innerW, yCur - 9, padR - 4, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(stock.price.toFixed(2), padL + innerW + (padR - 4) / 2, yCur + 4);
      ctx.textAlign = "left";

      // open price line
      const yOpen = px2y(stock.open);
      ctx.strokeStyle = CHART_COLORS.open;
      ctx.setLineDash([1, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, yOpen); ctx.lineTo(padL + innerW, yOpen);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#7c8898";
      ctx.font = "9px 'IBM Plex Mono', monospace";
      ctx.fillText(`開盤 ${stock.open.toFixed(2)}`, padL + innerW - 78, yOpen - 3);

      // VOL header
      ctx.fillStyle = CHART_COLORS.axis;
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText("成交量", padL + 4, volTop + 11);
      ctx.fillText("最大 " + (vMax / 1000).toFixed(1) + "K", padL + innerW - 76, volTop + 11);

      // ---- HOVER CROSSHAIR ----
      if (hover && hover.candleIdx >= 0 && hover.candleIdx < cs.length) {
        const i = hover.candleIdx;
        const x = xAt(i);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, priceTop); ctx.lineTo(x, volBot);
        ctx.moveTo(padL, hover.y); ctx.lineTo(padL + innerW, hover.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [candles, stock, showOTC, showBox, showMA5, showMA20, showMA60, showMA120, showPattern, beastMode, hover]);

  // Mouse tracking
  function onMove(e) {
    const lay = layoutRef.current;
    if (!lay) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < lay.padL || x > lay.padL + lay.innerW || y < lay.padT || y > lay.volBot) {
      setHover(null); return;
    }
    const stepX = lay.innerW / lay.cs.length;
    const idx = Math.floor((x - lay.padL) / stepX);
    setHover({ x, y, candleIdx: Math.max(0, Math.min(lay.cs.length - 1, idx)) });
  }
  function onLeave() { setHover(null); }

  // Tooltip content
  const tipContent = (() => {
    if (!hover || !layoutRef.current) return null;
    const lay = layoutRef.current;
    const c = lay.cs[hover.candleIdx];
    if (!c) return null;
    const isUp = c.c >= c.o;
    const dateOffset = lay.cs.length - hover.candleIdx;
    // pattern hint if hovering near pattern indices
    let patternHint = null;
    if (stock.pattern && stock.pattern.ex) {
      const offset = (stock.candles.length - lay.cs.length);
      const w1 = stock.pattern.ex.w1.i - offset;
      const w2 = stock.pattern.ex.w2.i - offset;
      const nk = stock.pattern.ex.neck.i - offset;
      if (Math.abs(hover.candleIdx - w1) <= 1) patternHint = stock.pattern.type === "m_top" ? "第一頭 M1" : "第一底 W1";
      else if (Math.abs(hover.candleIdx - w2) <= 1) patternHint = stock.pattern.type === "m_top" ? "第二頭 M2" : "第二底 W2";
      else if (Math.abs(hover.candleIdx - nk) <= 1) patternHint = "頸線位置";
    }
    return { c, isUp, dateOffset, patternHint };
  })();

  return (
    <div className="chart-canvas" ref={wrapRef} onMouseMove={onMove} onMouseLeave={onLeave} style={{ position: "relative" }}>
      <canvas ref={canvasRef} />
      {stock.pattern && stock.pattern.showRocket && (
        <div className="rocket-banner">{stock.pattern.label}</div>
      )}
      {hover && tipContent && layoutRef.current && (
        <div className="chart-tooltip" style={{
          left: Math.min(hover.x + 14, layoutRef.current.W - 220),
          top:  Math.max(hover.y - 100, 14),
          borderLeftColor: tipContent.isUp ? CHART_COLORS.upBody : CHART_COLORS.downBody
        }}>
          <div className="t-time">T{tipContent.dateOffset > 0 ? -tipContent.dateOffset : ""} · {tipContent.dateOffset === 1 ? "今" : tipContent.dateOffset + "日前"}</div>
          <div className="t-row"><span className="k">開</span><span></span><span style={{ color: "var(--text)" }}>{tipContent.c.o.toFixed(2)}</span></div>
          <div className="t-row"><span className="k">高</span><span></span><span className="up">{tipContent.c.h.toFixed(2)}</span></div>
          <div className="t-row"><span className="k">低</span><span></span><span className="down">{tipContent.c.l.toFixed(2)}</span></div>
          <div className="t-row"><span className="k">收</span><span></span><span style={{ color: tipContent.isUp ? "var(--up)" : "var(--down)" }}>{tipContent.c.c.toFixed(2)}</span></div>
          <div className="t-row"><span className="k">量</span><span></span><span style={{ color: "var(--text)" }}>{(tipContent.c.v/1000).toFixed(1)}K {tipContent.c.spike && "🔥"}</span></div>
          <div style={{ borderTop: "1px dashed var(--border)", marginTop: 4, paddingTop: 4 }}>
            <div className="t-row"><span style={{ color: CHART_COLORS.ma5 }}>5MA</span><span></span><span>{tipContent.c.ma5.toFixed(2)}</span></div>
            <div className="t-row"><span style={{ color: CHART_COLORS.ma20 }}>20MA</span><span></span><span>{tipContent.c.ma20.toFixed(2)}</span></div>
            <div className="t-row"><span style={{ color: CHART_COLORS.ma60 }}>60MA</span><span></span><span>{tipContent.c.ma60.toFixed(2)}</span></div>
            <div className="t-row"><span style={{ color: CHART_COLORS.ma120 }}>120MA</span><span></span><span>{tipContent.c.ma120.toFixed(2)}</span></div>
          </div>
          {tipContent.patternHint && (
            <div className="t-pattern">📍 {tipContent.patternHint} · {stock.pattern.label}{stock.pattern.target ? ` · 目標 ${stock.pattern.target}` : ""}</div>
          )}
        </div>
      )}
    </div>
  );
}

window.KChart = KChart;
window.CHART_COLORS = CHART_COLORS;
