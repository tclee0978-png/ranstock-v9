// =============== Stock Detail Screen — K + 五檔 + 成交明細 + 下單 ===============

function OrderBook({ ob, last }) {
  const maxSz = Math.max(...ob.asks.map(a => a.sz), ...ob.bids.map(b => b.sz));
  return (
    <div className="orderbook">
      {/* asks descending top */}
      <div></div>
      <div className="ob-cell ob-mid" style={{ gridColumn: "1 / -1", padding: 4 }}>
        <span className="mono xs text-mute">委賣 SZ × PX × 委買</span>
      </div>
      {ob.asks.map((a, i) => (
        <React.Fragment key={"ask" + i}>
          <div></div>
          <div className="ob-cell">
            <div className="ob-bar-fill ask" style={{ width: `${(a.sz / maxSz) * 100}%` }}></div>
            <div className="ob-text"><span className="down ob-price">{a.px.toFixed(2)}</span></div>
          </div>
          <div className="ob-cell"><span className="down mono">{a.sz}</span></div>
        </React.Fragment>
      ))}
      <div className="ob-cell ob-mid" style={{ gridColumn: "1 / -1" }}>
        <span className="mono">成交 <FlashNumber value={last} className={last >= 142 ? "up" : "down"}/> · 內外比 53/47</span>
      </div>
      {ob.bids.map((b, i) => (
        <React.Fragment key={"bid" + i}>
          <div className="ob-cell"><span className="up mono">{b.sz}</span></div>
          <div className="ob-cell">
            <div className="ob-bar-fill bid" style={{ width: `${(b.sz / maxSz) * 100}%` }}></div>
            <div className="ob-text"><span className="up ob-price">{b.px.toFixed(2)}</span></div>
          </div>
          <div></div>
        </React.Fragment>
      ))}
    </div>
  );
}

function TradeTape({ rows }) {
  return (
    <div className="tape">
      <div className="tape-head">時間</div>
      <div className="tape-head" style={{ textAlign: "right" }}>成交</div>
      <div className="tape-head" style={{ textAlign: "right" }}>單量</div>
      <div className="tape-head" style={{ textAlign: "right" }}>內外</div>
      {rows.map((r, i) => (
        <div key={i} className={cn("tape-row", r.dir > 0 ? "up" : "down")}>
          <div className="t text-dim">{r.t}</div>
          <div className="px num" style={{ textAlign: "right" }}>{r.px.toFixed(2)}</div>
          <div className="num text-dim" style={{ textAlign: "right" }}>{r.sz}</div>
          <div className={cn("num", r.dir > 0 ? "up" : "down")} style={{ textAlign: "right" }}>{r.dir > 0 ? "外" : "內"}</div>
        </div>
      ))}
    </div>
  );
}

function OrderPanel({ stock, tradeLocked, onSubmit, onTrigFomo }) {
  const [side, setSide] = useState("buy");
  const [px, setPx] = useState(stock.price);
  const [qty, setQty] = useState(1);
  const [orderType, setOrderType] = useState("ROD 限價");
  const submitDisabled = tradeLocked && side === "buy";

  useEffect(() => { setPx(stock.price); }, [stock.code, stock.price]);

  const failedFilters = [
    !stock.f2 && "未達箱型放量突破",
    Math.abs(stock.ma5Bias) > 3 && `乖離 ${fmtSigned(stock.ma5Bias, 1)}% 過大`,
    !stock.f3 && "已跌破開盤價",
    !stock.f1 && "未通過抗跌過濾"
  ].filter(Boolean);

  function attemptBuy() {
    if (side === "buy" && failedFilters.length > 0) { onTrigFomo({ stock, failed: failedFilters }); return; }
    onSubmit({ side, px, qty, code: stock.code });
  }

  const cost = px * qty * 1000;
  const fee = Math.max(20, cost * 0.001425);
  const tax = side === "sell" ? cost * 0.003 : 0;

  return (
    <div className="panel">
      <div className="order-tabs">
        <button className={cn("order-tab", "buy", side === "buy" && "active")} onClick={() => setSide("buy")}>買進 BUY</button>
        <button className={cn("order-tab", "sell", side === "sell" && "active")} onClick={() => setSide("sell")}>賣出 SELL</button>
      </div>
      <div className="order-form">
        <div className="field">
          <label>商品</label>
          <input value={`${stock.code} ${stock.name}`} readOnly style={{ color: "var(--text)" }}/>
        </div>
        <div className="field-row">
          <div className="field">
            <label>委託類型</label>
            <select value={orderType} onChange={e => setOrderType(e.target.value)}>
              <option>ROD 限價</option>
              <option>ROD 市價</option>
              <option>IOC 限價</option>
              <option>FOK 限價</option>
            </select>
          </div>
          <div className="field">
            <label>價格 TWD</label>
            <input className="mono" type="number" step="0.5" value={px} onChange={e => setPx(+e.target.value)}/>
          </div>
        </div>
        <div className="field">
          <label>數量 (張)</label>
          <div className="qty-stepper">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <input className="mono" value={qty} onChange={e => setQty(+e.target.value || 1)}/>
            <button onClick={() => setQty(qty + 1)}>+</button>
          </div>
          <div className="preset-pcts" style={{ marginTop: 4 }}>
            {[1, 2, 5, 10].map(n => <button key={n} onClick={() => setQty(n)}>{n} 張</button>)}
          </div>
        </div>
        <div className="order-summary">
          <div className="row"><span className="k">委託金額</span><span className="mono">{fmtMoney(cost)}</span></div>
          <div className="row"><span className="k">手續費</span><span className="mono text-dim">{fmtMoney(fee.toFixed(0))}</span></div>
          {side === "sell" && <div className="row"><span className="k">證交稅</span><span className="mono text-dim">{fmtMoney(tax.toFixed(0))}</span></div>}
          <div className="row"><span className="k">應付/收</span><span className={cn("mono", side === "buy" ? "up" : "down")}>{fmtMoney((cost + fee + tax).toFixed(0))}</span></div>
        </div>

        {submitDisabled ? (
          <button className="btn-submit locked"><Icon name="lock" size={12}/> &nbsp; 09:15 前鎖定 · 反陷阱</button>
        ) : (
          <button className={cn("btn-submit", side)} onClick={attemptBuy}>
            {side === "buy" ? "送出 買進" : "送出 賣出"}
          </button>
        )}
        {side === "buy" && failedFilters.length > 0 && (
          <div className="xs" style={{ color: "var(--f3)", display: "flex", gap: 6, alignItems: "flex-start" }}>
            <Icon name="warning" size={12}/>
            <span>本檔不符合 {failedFilters.length} 項濾鏡，下單將觸發紀律保護彈窗</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TechSummary({ stock }) {
  const p = stock.pattern;
  // fallback for synthetic stocks
  if (!p) {
    const todayPct = ((stock.price - stock.prev) / stock.prev) * 100;
    const kind = todayPct > 0 ? "up" : "down";
    return (
      <div className={cn("tech-summary", kind === "down" && "is-down")}>
        <div className="ts-icon">{kind === "up" ? "📊" : "📉"}</div>
        <div className="ts-body">
          <div className="ts-title">技術面：盤整待方向</div>
          <div className="ts-text">
            目前無明確型態訊號。今日 <span className={kind}>{fmtPct(todayPct)}</span>，建議等放量突破或破底後再判斷。
          </div>
        </div>
      </div>
    );
  }
  const cls = p.kind === "down" ? "is-down" : p.kind === "warn" ? "is-warn" : "";
  const icon = p.type === "rocket" ? "🚀" : p.type === "w_break" ? "✅" : p.type === "box_break" ? "📈" :
               p.type === "m_top" ? "⚠️" : p.type === "overbought" ? "🔥" : p.type === "box" ? "⏸" :
               p.type === "weak" ? "📉" : "📊";
  return (
    <div className={cn("tech-summary", cls)}>
      <div className="ts-icon">{icon}</div>
      <div className="ts-body">
        <div className="ts-title">{p.label} · {p.title}</div>
        <div className="ts-text" dangerouslySetInnerHTML={{ __html: p.text }}></div>
      </div>
      {p.target && (
        <div className="ts-target">
          <div>
            <div className="lbl">目標價</div>
            <div className="v">{p.target.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// 進階指標條 (RSI/MACD/KD) — 完整模式顯示
function ProIndicators({ stock }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
      {[
        { name: "RSI(14)",  v: 62.4, dir: "up",   note: "未超買" },
        { name: "KD K/D",   v: "78/70", dir: "up", note: "高檔黃金交叉" },
        { name: "MACD",     v: "+1.84", dir: "up", note: "0軸上方紅柱遞增" },
      ].map(ind => (
        <div key={ind.name} style={{ background: "var(--panel)", padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: 1 }}>{ind.name}</div>
            <div className="mono" style={{ fontSize: 14, color: ind.dir === "up" ? "var(--up)" : "var(--down)", fontWeight: 500 }}>{ind.v}</div>
          </div>
          <div className="xs text-dim" style={{ textAlign: "right" }}>{ind.note}</div>
        </div>
      ))}
    </div>
  );
}

function StockDetail({ stock, tf, setTf, tradeLocked, onSubmit, onTrigFomo, otcSegments, chartOpts, setChartOpts, isTrap }) {
  const pct = ((stock.price - stock.prev) / stock.prev) * 100;
  const dir = upDown(pct);
  const ob = window.MARKET_DATA.orderBook[stock.code];
  const beast = chartOpts.beastMode !== false;

  function toggle(key) { setChartOpts({ ...chartOpts, [key]: !chartOpts[key] }); }
  const maColors = window.CHART_COLORS;

  return (
    <div className="stock-grid">
      {/* Header */}
      <div className="stock-header" style={{ gridColumn: "1 / -1" }}>
        <div>
          <div className="code-big">{stock.code} · {stock.industry} · <span style={{ color: stock.market === "TPEx" ? "var(--f2)" : "var(--up)" }}>{stock.market}</span></div>
          <div className="name-big">{stock.name}</div>
        </div>
        <div>
          <div className={cn("price-big", dir)}><FlashNumber value={stock.price}/></div>
          <div className={cn("ch-big", dir)}>
            <span>{arrow(pct)} {fmtSigned(stock.price - stock.prev)}</span>
            <span>{fmtPct(pct)}</span>
            <span className="text-dim mono xs">{tf}</span>
          </div>
        </div>
        <div className="chip-row">
          <span className="chip"><span className="lbl">OPEN</span>{stock.open.toFixed(2)}</span>
          <span className="chip"><span className="lbl">HIGH</span><span className="up">{stock.high.toFixed(2)}</span></span>
          <span className="chip"><span className="lbl">LOW</span><span className="down">{stock.low.toFixed(2)}</span></span>
          <span className="chip"><span className="lbl">PREV</span>{stock.prev.toFixed(2)}</span>
          <span className="chip"><span className="lbl">VOL</span>{fmtMoney(stock.vol)}</span>
          <span className="chip"><span className="lbl">RS</span><span className={stock.otcRS >= 1.5 ? "up" : ""}>{stock.otcRS.toFixed(2)}</span></span>
          <span className="chip"><span className="lbl">乖離</span><span style={Math.abs(stock.ma5Bias) > 3 ? { color: "var(--f3)" } : {}}>{fmtSigned(stock.ma5Bias, 1)}%</span></span>
        </div>
        <div className="actions">
          <span className={cn("tag", stock.f1 && "f1")}>F1 抗跌 {stock.f1 ? "✓" : "✗"}</span>
          <span className={cn("tag", stock.f2 && "f2")}>F2 箱型 {stock.f2 ? "✓" : "✗"}</span>
          <span className={cn("tag", stock.f3 && "f3")}>F3 防線 {stock.f3 ? "✓" : "✗"}</span>
          <span className={cn("tag", stock.f4 && "signal")} style={stock.f4 ? { background: "var(--rocket)", color: "#fff", border: "1px solid var(--rocket-gold)", boxShadow: "0 0 10px rgba(255,210,74,0.5)" } : {}}>F4 訊號 {stock.f4 ? "🚀" : "·"}</span>
        </div>
      </div>

      {/* Chart panel — contains tech summary + toolbar + chart */}
      <div className="panel chart-panel" style={{ gridColumn: 1, gridRow: "2 / 4", position: "relative" }}>
        {/* 我爸最愛技術總結 */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <TechSummary stock={stock}/>
        </div>

        <div className="chart-toolbar">
          <div className="tf-group">
            {["1D", "5D", "1M", "3M", "6M"].map(t => (
              <button key={t} className={cn("tf-btn", tf === t && "active")} onClick={() => setTf(t)}>{t}</button>
            ))}
          </div>
          <span className="sep"/>
          {/* MA legend toggles */}
          <div className="ma-legend">
            {[
              { k: "showMA5",   v: stock.ma5 ? stock.ma5.toFixed(2) : "—", color: maColors.ma5,   tag: "5" },
              { k: "showMA20",  v: stock.ma20 ? stock.ma20.toFixed(2) : "—", color: maColors.ma20,  tag: "20" },
              { k: "showMA60",  v: stock.candles?.[stock.candles.length-1]?.ma60?.toFixed(2) || "—",  color: maColors.ma60,  tag: "60" },
              { k: "showMA120", v: stock.candles?.[stock.candles.length-1]?.ma120?.toFixed(2) || "—", color: maColors.ma120, tag: "120" },
            ].map(m => (
              <span key={m.k} className={cn("ma", !chartOpts[m.k] && "off")} onClick={() => toggle(m.k)}>
                <span className="swatch" style={{ background: m.color }}></span>
                <strong style={{ color: m.color, fontSize: 11 }}>{m.tag}</strong>
                <span className="v">{m.v}</span>
              </span>
            ))}
          </div>
          <span className="sep"/>
          <button className={cn("toggle-btn", chartOpts.showBox && "on")} onClick={() => toggle("showBox")}>20D 箱型</button>
          <button className={cn("toggle-btn", chartOpts.showPattern !== false && "on")} onClick={() => toggle("showPattern")}>型態標注</button>
          {!beast && <button className={cn("toggle-btn", chartOpts.showOTC && "on")} onClick={() => toggle("showOTC")}>OTC 疊加</button>}

          <span className="spacer"/>
          {/* 飆股/完整模式 */}
          <div className="mode-toggle">
            <button className={cn(beast && "active beast")} onClick={() => setChartOpts({ ...chartOpts, beastMode: true })}>🚀 飆股模式</button>
            <button className={cn(!beast && "active pro")} onClick={() => setChartOpts({ ...chartOpts, beastMode: false })}>📊 完整模式</button>
          </div>
        </div>

        <KChart stock={stock} tf={tf} otcSegments={otcSegments} {...chartOpts} beastMode={beast}/>

        {!beast && (
          <div style={{ padding: 8, borderTop: "1px solid var(--border)" }}>
            <ProIndicators stock={stock}/>
          </div>
        )}

        {isTrap && (
          <div className="trap-overlay">
            <div className="trap-msg">
              <div className="skull">⚠ TRAP DETECTED ⚠</div>
              <div className="big">今日廢股</div>
              <div className="sub">{stock.name} 已跌破開盤價 {stock.open.toFixed(2)}。<br/>第三濾鏡判定為陷阱，建議關閉此檔不再追蹤。</div>
              <button>仍要查看 K 線</button>
            </div>
          </div>
        )}
      </div>

      {/* Order book + Tape + Order */}
      <div className="col-side" style={{ gridColumn: 2, gridRow: "2 / 4" }}>
        <div className="panel" style={{ flex: "0 0 auto" }}>
          <div className="panel-head"><span className="accent"/><span className="title">五檔報價</span><span className="meta">L1</span></div>
          <OrderBook ob={ob} last={stock.price}/>
        </div>
        <OrderPanel stock={stock} tradeLocked={tradeLocked} onSubmit={onSubmit} onTrigFomo={onTrigFomo}/>
        <div className="panel" style={{ flex: "1 1 auto", minHeight: 0 }}>
          <div className="panel-head"><span className="accent" style={{ background: "var(--f2)" }}/><span className="title">成交明細</span><span className="meta">{stock.tape.length} 筆</span></div>
          <div className="panel-body flush" style={{ overflow: "auto" }}>
            <TradeTape rows={stock.tape}/>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StockDetail = StockDetail;
window.OrderBook = OrderBook;
window.TradeTape = TradeTape;
window.TechSummary = TechSummary;
