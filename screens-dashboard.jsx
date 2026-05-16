// =============== Dashboard — 大盤總覽 + 三濾鏡 + 狙擊清單 ===============

function IndexCell({ idx }) {
  if (idx.liveSource === "unverified") {
    return (
      <div className="idx-cell">
        <div className="label">{idx.name} <span className="mono xs text-mute">{idx.code}</span></div>
        <div className="value text-mute" style={{ fontSize: 21 }}>未取得</div>
        <div className="change text-mute">
          <span>LIVE 模式不顯示模擬指數</span>
        </div>
        <div className="idx-spark"><span className="xs text-mute mono">等待 TWSE MIS</span></div>
      </div>
    );
  }
  const dir = upDown(idx.change);
  return (
    <div className="idx-cell">
      <div className="label">{idx.name} <span className="mono xs text-mute">{idx.code}</span></div>
      <div className={cn("value", dir)}><FlashNumber value={idx.value} format={(v)=>fmtPx(v, idx.code === "OTC" ? 2 : 2)} /></div>
      <div className={cn("change", dir)}>
        <span>{arrow(idx.change)} {fmtSigned(idx.change)}</span>
        <span>{fmtPct(idx.pct)}</span>
        <span className="text-mute">成交 {fmtMoney(idx.vol)} 億</span>
      </div>
      <div className="idx-spark">
        <Sparkline
          data={Array.from({length: 24}, (_, i) =>
            idx.value + Math.sin(i*0.6+idx.code.length) * (idx.value*0.004) - i * (idx.change/30)
          )}
          width={80} height={32} color={dir === "up" ? "var(--up)" : dir === "down" ? "var(--down)" : "var(--flat)"}
        />
      </div>
    </div>
  );
}

function FilterCard({ kind, name, pass, total, condition, hint }) {
  const labelMap = { f1: "F1 · 絕對抗跌過濾", f2: "F2 · 箱型放量突破", f3: "F3 · 反陷阱 / 開盤防線" };
  return (
    <div className={cn("filter-card", kind)}>
      <div className="fc-head">{labelMap[kind]}<span className="spacer"/><span className={cn("mono", "tag", kind)}>{pass > 0 ? "命中" : "等待"}</span></div>
      <div className="fc-name">{name}</div>
      <div className="fc-condition">{condition}</div>
      <div className="fc-stats">
        <div className="stat"><div className="v">{pass}<span className="text-mute" style={{fontSize: 11}}> / {total}</span></div><div className="k">符合檔數</div></div>
        <div className="stat"><div className={cn("v", kind)}>{hint}</div><div className="k">關鍵閾值</div></div>
      </div>
    </div>
  );
}

function SniperList({ stocks, onSelect, selected, density = "comfortable", onAddWatch, onRemove, onHealthCheck, onWaiting, draggable = true, compact = false }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [items, setItems] = useState(stocks);
  useEffect(() => { setItems(stocks); }, [stocks]);

  function handleDragStart(i) { setDragIdx(i); }
  function handleDragOver(e, i) { e.preventDefault(); setOverIdx(i); }
  function handleDrop(e, i) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const next = items.slice();
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setItems(next); setDragIdx(null); setOverIdx(null);
  }

  return (
    <table className="tbl">
      <thead>
        <tr>
          {draggable && <th style={{width: 24}}></th>}
          <th style={{width: 56}}>代號</th>
          <th style={{minWidth: 110}}>名稱</th>
          <th style={{width: 80, textAlign: "right"}}>成交</th>
          <th style={{width: 60, textAlign: "right"}}>%</th>
          {!compact && <th style={{width: 80, textAlign: "right"}}>量</th>}
          {!compact && <th style={{width: 50, textAlign: "right"}}>RS</th>}
          <th style={{width: 60, textAlign: "right"}}>乖離</th>
          <th style={{width: 80}}>濾鏡</th>
          {!compact && <th style={{width: 64}}>近2H</th>}
          <th style={{width: 56}}></th>
        </tr>
      </thead>
      <tbody>
        {items.map((s, i) => {
          const pct = ((s.price - s.prev) / s.prev) * 100;
          const dir = upDown(pct);
          return (
            <tr key={s.code}
                className={cn(selected === s.code && "selected", dragIdx === i && "dragging", overIdx === i && "drag-over", s.f4 && "f4-hit")}
                onClick={() => onSelect && onSelect(s.code)}
                draggable={draggable}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}>
              {draggable && <td><span className="drag-handle"><Icon name="drag" size={12}/></span></td>}
              <td className="code">{s.code}</td>
              <td>
                <div className="name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {s.name}
                  {s.f4 && <span className="signal-pill">🚀 上車</span>}
                  {!s.f4 && s.f1 && s.f2 && s.f3 && (
                    <span className="waiting-pill" onClick={(e) => { e.stopPropagation(); onWaiting && onWaiting(s); }}>待上車</span>
                  )}
                </div>
                <div className="xs text-mute">{s.industry}</div>
              </td>
              <td className={cn("num", dir)}><FlashNumber value={s.price} /></td>
              <td className={cn("num", dir)}>{fmtPct(pct)}</td>
              {!compact && <td className="num text-dim">{fmtMoney(s.vol)}</td>}
              {!compact && <td className={cn("num", s.otcRS >= 1.5 ? "up" : s.otcRS < 1 ? "down" : "")}>{s.otcRS.toFixed(2)}</td>}
              <td className="num" style={Math.abs(s.ma5Bias) > 3 ? {color: "var(--f3)"} : {color: s.ma5Bias > 0 ? "var(--up)" : "var(--down)"}}>{fmtSigned(s.ma5Bias, 1)}%</td>
              <td><FilterFlags f1={s.f1} f2={s.f2} f3={s.f3} f4={s.f4} /></td>
              {!compact && <td><Sparkline data={s.segments} width={56} height={18} /></td>}
              <td>
                <div style={{ display: "inline-flex", gap: 2 }}>
                  {onHealthCheck && (
                    <button className="icon-btn" title="個股健診" onClick={(e)=>{e.stopPropagation(); onHealthCheck(s.code);}} style={{width:22,height:22, color: "var(--f1)"}}>
                      <Icon name="shield" size={11}/>
                    </button>
                  )}
                  <button className="icon-btn" title="移除" onClick={(e)=>{e.stopPropagation(); onRemove && onRemove(s.code);}} style={{width:22,height:22}}>
                    <Icon name="x" size={11}/>
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ScanBar({ scope, setScope, data, watchCodes, scoped, hits }) {
  const twseAll = data.stocks.filter(s => s.real === true && s.market === "TWSE").length;
  const tpexAll = data.stocks.filter(s => s.real === true && s.market === "TPEx").length;
  return (
    <div className="scan-bar">
      <span className="label">掃描範圍</span>
      <div className="scope-group">
        <button className={cn("scope-btn", scope === "all" && "active")} onClick={() => setScope("all")}>全市場 <span className="n">{data.stocks.length}</span></button>
        <button className={cn("scope-btn", scope === "twse" && "active")} onClick={() => setScope("twse")}>上市 <span className="n">{twseAll}</span></button>
        <button className={cn("scope-btn", scope === "tpex" && "active")} onClick={() => setScope("tpex")}>上櫃 <span className="n">{tpexAll}</span></button>
        <button className={cn("scope-btn", scope === "watch" && "active")} onClick={() => setScope("watch")}>自選 <span className="n">{watchCodes.length}</span></button>
      </div>
      <div className="scan-stats">
        <div className="stat"><div className="v mono">{fmtMoney(scoped)}</div><div className="k">掃描標的</div></div>
        <div className="stat"><div className="v mono" style={{ color: hits > 0 ? "var(--signal)" : "var(--f1)" }}>{hits}</div><div className="k">命中</div></div>
        <div className="stat"><div className="v mono">{(hits / Math.max(1, scoped) * 100).toFixed(2)}<span style={{ fontSize: 11, color: "var(--text-mute)" }}>%</span></div><div className="k">命中率</div></div>
      </div>
    </div>
  );
}

function ZeroHit({ scoped, scope, winStreak }) {
  const scopeLabel = { all: "全市場 (TWSE+TPEx)", twse: "上市 TWSE", tpex: "上櫃 TPEx", watch: "自選股" }[scope];
  return (
    <div className="zero-hit">
      <div className="xs text-mute" style={{ letterSpacing: 6 }}>NO SIGNAL · DISCIPLINE WIN</div>
      <div className="big">今日無訊號<br/>空手勝利 +1</div>
      <div className="sub">
        已掃描 <span className="mono" style={{ color: "var(--text)" }}>{fmtMoney(scoped)}</span> 檔（{scopeLabel}），無任何標的同時通過四大濾鏡 + 上車訊號。<br/>
        依照狙擊手紀律：<strong style={{ color: "var(--text)" }}>不上車就是最好的上車</strong>。<br/>
        本日已自動寫入紀律日誌。
      </div>
      <div className="stats">
        <div className="item"><div className="v">{winStreak + 1}</div><div>紀律連勝</div></div>
        <div className="item"><div className="v">{fmtMoney(scoped)}</div><div>標的</div></div>
        <div className="item"><div className="v">0</div><div>F1+F2+F3+F4 命中</div></div>
      </div>
      <button className="btn-submit" style={{ background: "var(--signal)", color: "#0a0e14", padding: "8px 20px", letterSpacing: 2, fontSize: 12, marginTop: 8 }}>
        🎬 產生「為什麼今天空手」腳本
      </button>
    </div>
  );
}

function Dashboard({ data, layout, onSelect, selected, onOpenFomo, onHealthCheck, onWaiting, scope, setScope, watchCodes }) {
  const md = data;
  // 掃描範圍
  const universe = useMemo(() => {
    if (scope === "twse") return md.stocks.filter(s => s.real === true && s.market === "TWSE");
    if (scope === "tpex") return md.stocks.filter(s => s.real === true && s.market === "TPEx");
    if (scope === "watch") return md.stocks.filter(s => s.real === true && watchCodes.includes(s.code));
    return md.stocks.filter(s => s.real === true);
  }, [md.stocks, scope, watchCodes]);

  const sniperStocks = universe.filter(s => s.f1 && s.f2 && s.f3 && s.f4);
  const partialStocks = universe.filter(s => !(s.f1 && s.f2 && s.f3 && s.f4) && (s.f1 && s.f2)).slice(0, 6);
  const f1Count = universe.filter(s => s.f1).length;
  const f2Count = universe.filter(s => s.f2).length;
  const f3Count = universe.filter(s => s.f3).length;
  const f4Count = universe.filter(s => s.f4).length;
  const noHits = sniperStocks.length === 0;

  return (
    <div className={cn("dash-grid", layout)}>
      {/* 大盤 */}
      <div className="span-3 indices">
        {md.indices.map(idx => <IndexCell key={idx.code} idx={idx}/>)}
      </div>

      {/* 掃描範圍切換 */}
      <div className="span-3">
        <ScanBar scope={scope} setScope={setScope} data={md} watchCodes={watchCodes}
                 scoped={universe.length} hits={sniperStocks.length}/>

        {/* 四大濾鏡 */}
        <div className="filter-banner">
          <FilterCard
            kind="f1" name="抗跌防線"
            pass={f1Count} total={universe.length}
            condition="OTC 跌 −1.13% 時，個股仍上漲 + 站穩 5MA"
            hint="逆勢護盤 ≥ +0%"
          />
          <FilterCard
            kind="f2" name="箱型放量突破"
            pass={f2Count} total={universe.length}
            condition="突破 20D 箱型高 ＋ 量增 ≥ 30% ＋ 乖離 < 3%"
            hint="Vol vs 20D ≥ +30%"
          />
          <FilterCard
            kind="f3" name="反陷阱 / 防線"
            pass={f3Count} total={universe.length}
            condition="未跌破開盤價 ＋ 09:15 解鎖買入"
            hint="現價 ≥ Open"
          />
          <FilterCard
            kind="f4" name="上車訊號 (主力布局)"
            pass={f4Count} total={universe.length}
            condition="量爆價未噴 ｜ 籌碼集中 ｜ 反轉初訊 ｜ 突破第一天 (任 2 項)"
            hint="準備起漲第一天"
          />
        </div>
      </div>

      {/* 狙擊清單 (or 空手勝利) */}
      <div className="panel" style={{ gridRow: "3", gridColumn: "1 / 3" }}>
        <div className="sniper-head">
          <div className="crosshair"><span/></div>
          <div>
            <div className="h-title">今日狙擊清單 · 四大濾鏡 + 上車訊號</div>
            <div className="h-sub">
              {noHits
                ? `已掃描 ${fmtMoney(universe.length)} 檔 · 無任何訊號 · 紀律 ${md.winStreak + 1} 連勝`
                : `已掃描 ${fmtMoney(universe.length)} 檔 · 命中 ${sniperStocks.length} · 命中率 ${(sniperStocks.length/Math.max(1,universe.length)*100).toFixed(2)}%`}
            </div>
          </div>
          <div className="h-count">
            <div className="n" style={{ color: noHits ? "var(--signal)" : "var(--f1)" }}>{sniperStocks.length}</div>
            <div className="l">target</div>
          </div>
        </div>
        <div className="panel-body flush" style={{ overflow: "auto" }}>
          {noHits
            ? <ZeroHit scoped={universe.length} scope={scope} winStreak={md.winStreak}/>
            : <SniperList stocks={sniperStocks} onSelect={onSelect} selected={selected} draggable={false} compact={true} onHealthCheck={onHealthCheck} onWaiting={onWaiting}/>}
        </div>
      </div>

      {/* 觀察區 */}
      <div className="panel col-3" style={{ gridRow: "3" }}>
        <div className="panel-head">
          <span className="accent" style={{ background: "var(--f2)" }}></span>
          <span className="title">觀察區 · F1+F2 通過</span>
          <span className="meta">{partialStocks.length} · 等 F4</span>
        </div>
        <div className="panel-body flush" style={{ overflow: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>代號 / 名稱</th>
                <th style={{textAlign:"right"}}>%</th>
                <th>濾鏡</th>
              </tr>
            </thead>
            <tbody>
              {partialStocks.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: "center", padding: 30, color: "var(--text-mute)" }}>
                  範圍內無觀察候選
                </td></tr>
              )}
              {partialStocks.map(s => {
                const pct = ((s.price - s.prev) / s.prev) * 100;
                const dir = upDown(pct);
                return (
                  <tr key={s.code} onClick={() => onSelect(s.code)} className={selected === s.code ? "selected" : ""}>
                    <td>
                      <div className="code">{s.code} <span className="xs text-mute">{s.market}</span></div>
                      <div className="name xs" style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                    </td>
                    <td className={cn("num", dir)}>{fmtPct(pct)}</td>
                    <td><FilterFlags f1={s.f1} f2={s.f2} f3={s.f3} f4={s.f4}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
window.SniperList = SniperList;
window.ZeroHit = ZeroHit;
