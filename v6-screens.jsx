// ============================================================
// V6 · 明日作戰室 + 主升段排行榜
// ============================================================

function PhaseChip({ phase, size = "md" }) {
  const meta = window.V6.PHASE_META[phase];
  if (!meta) return null;
  return (
    <span className={cn("v6-phase-chip", phase)} style={size === "lg" ? { padding: "6px 14px", fontSize: 13 } : {}}>
      <span className="dot"></span>
      {meta.icon} {meta.ko}
    </span>
  );
}

function ScoreGauge({ value, color, max = 100, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="v6-gauge">
      {label && <span className="xs text-mute" style={{ minWidth: 56 }}>{label}</span>}
      <div className="bar"><div className="fill" style={{ width: `${pct}%`, background: color || "var(--signal)" }}></div></div>
      <span className="v" style={{ color: color || "var(--text)" }}>{Math.round(value)}</span>
    </div>
  );
}

// ============================================================
// 明日作戰室
// ============================================================
function WarRoom({ analyses, onSelect, onHealthCheck }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(new Set());

  // 過濾邏輯
  const filtered = useMemo(() => {
    let xs = analyses.filter(a => a.stock?.real === true && a.stock?.liveSource === "LIVE");
    if (filter === "mainWave")   xs = xs.filter(a => a.phase === "mainWave");
    else if (filter === "preIgnite") xs = xs.filter(a => a.phase === "preIgnite");
    else if (filter === "fomo")  xs = xs.filter(a => a.phase === "fomo");
    else if (filter === "dist")  xs = xs.filter(a => a.phase === "distribution");
    else if (filter === "all")   xs = xs.filter(a => a.phase !== "distribution");
    return xs.sort((a, b) => b.scores.mainForce.total - a.scores.mainForce.total).slice(0, 25);
  }, [analyses, filter]);

  // 階段統計
  const counts = analyses.reduce((acc, a) => { acc[a.phase] = (acc[a.phase]||0) + 1; return acc; }, {});

  function toggle(code) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      {/* 大盤摘要 */}
      <div className="warroom-grid">
        <div className="warroom-summary" style={{ borderLeft: "3px solid var(--signal)" }}>
          <div className="k">🟢 主升段</div>
          <div className="v" style={{ color: "var(--signal)" }}>{counts.mainWave || 0}</div>
          <div className="s">今日首日發動</div>
        </div>
        <div className="warroom-summary" style={{ borderLeft: "3px solid #ff8c1a" }}>
          <div className="k">🟠 發動前夜</div>
          <div className="v" style={{ color: "#ff8c1a" }}>{counts.preIgnite || 0}</div>
          <div className="s">明日預掛買單</div>
        </div>
        <div className="warroom-summary" style={{ borderLeft: "3px solid var(--up)" }}>
          <div className="k">🔴 FOMO 過熱</div>
          <div className="v" style={{ color: "var(--up)" }}>{counts.fomo || 0}</div>
          <div className="s">禁止追進</div>
        </div>
        <div className="warroom-summary" style={{ borderLeft: "3px solid var(--text-mute)" }}>
          <div className="k">⚫ 出貨</div>
          <div className="v" style={{ color: "var(--text-mute)" }}>{counts.distribution || 0}</div>
          <div className="s">關掉不追蹤</div>
        </div>
      </div>

      {/* 篩選列 */}
      <div className="panel" style={{ padding: 0 }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--text-mute)", letterSpacing: 2 }}>戰局篩選</span>
          <div className="scope-group">
            {[
              { id: "all",       label: "全部候選" },
              { id: "mainWave",  label: "🟢 主升段" },
              { id: "preIgnite", label: "🟠 前夜" },
              { id: "fomo",      label: "🔴 FOMO" },
              { id: "dist",      label: "⚫ 出貨" },
            ].map(b => (
              <button key={b.id} className={cn("scope-btn", filter === b.id && "active")} onClick={() => setFilter(b.id)}>{b.label}</button>
            ))}
          </div>
          <span className="spacer" style={{ flex: 1 }}/>
          <span className="xs text-mute mono">{filtered.length} 檔候選 · 依主升段分數排序</span>
        </div>
        <div style={{ padding: 14, overflow: "auto", flex: 1 }}>
          {filtered.map(a => {
            const open = expanded.has(a.stock.code);
            const mf = a.scores.mainForce.total;
            const fomo = a.scores.fomo.total;
            const trend = a.scores.trend;
            return (
              <div key={a.stock.code} className={cn("warroom-card", "is-" + a.phase)}>
                <div className="wr-head" onClick={() => toggle(a.stock.code)}>
                  <div className="wr-stock">
                    <span className="code">{a.stock.code} · {a.stock.market}</span>
                    <span className="name">{a.stock.name}</span>
                    <span className="ind">{a.stock.industry}</span>
                  </div>
                  <div className="wr-comment" dangerouslySetInnerHTML={{ __html: a.commentary }}></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
                    <ScoreGauge label="主升段" value={mf}    color="var(--signal)"/>
                    <ScoreGauge label="續航"   value={trend} color="var(--ma120)"/>
                    <ScoreGauge label="FOMO"   value={fomo}  color={fomo >= 70 ? "var(--up)" : "var(--text-dim)"}/>
                  </div>
                  <PhaseChip phase={a.phase} size="lg"/>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="icon-btn" title="K 線" onClick={(e)=>{e.stopPropagation(); onSelect(a.stock.code);}}><Icon name="chart" size={14}/></button>
                    <button className="icon-btn" title="健診" onClick={(e)=>{e.stopPropagation(); onHealthCheck(a.stock.code);}} style={{ color: "var(--f1)" }}><Icon name="shield" size={14}/></button>
                  </div>
                </div>

                {open && (
                  <div className="wr-body">
                    {/* 明日策略 */}
                    <div className="wr-strategy">
                      <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 6 }}>明日策略</div>
                      <div className={cn("action",
                        a.strategy.action === "可上車" ? "go" :
                        a.strategy.action === "等突破" || a.strategy.action === "等回踩" ? "wait" : "skip")}>
                        {a.strategy.action}
                      </div>
                      {a.strategy.preBuy && <div className="row"><span className="k">預掛買點</span><span className="v">{a.strategy.preBuy}</span></div>}
                      {a.strategy.breakBuy && <div className="row"><span className="k">突破買點</span><span className="v">{a.strategy.breakBuy}</span></div>}
                      {a.strategy.pullbackBuy && <div className="row"><span className="k">回踩買點</span><span className="v">{a.strategy.pullbackBuy}</span></div>}
                      {a.strategy.stopLoss && <div className="row"><span className="k">停損</span><span className="v" style={{ color: "var(--down)" }}>{a.strategy.stopLoss}</span></div>}
                      {a.strategy.target1 && <div className="row"><span className="k">第一目標</span><span className="v" style={{ color: "var(--up)" }}>{a.strategy.target1}</span></div>}
                      {a.strategy.target2 && <div className="row"><span className="k">第二目標</span><span className="v" style={{ color: "var(--up)" }}>{a.strategy.target2}</span></div>}
                    </div>

                    {/* 綠燈條件 */}
                    <div className="wr-checklist">
                      <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 6 }}>綠燈 10 條件</div>
                      <div className="pass-stat">
                        <span className="big" style={{ color: a.checklist.greenLight ? "var(--signal)" : "var(--f1)" }}>{a.checklist.passCount}</span>
                        <span className="text-mute" style={{ fontSize: 12 }}>/ 10 通過{a.checklist.greenLight ? " · 達標亮綠燈 ✓" : ""}</span>
                      </div>
                      {a.checklist.items.map((it, i) => (
                        <div key={i} className={cn("item", it.ok && "ok")}>
                          <span className="x">{it.ok ? "✓" : "·"}</span>
                          <span>{it.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* 分數拆解 + 撤退訊號 */}
                    <div className="wr-breakdown">
                      <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 6 }}>分數拆解</div>
                      {Object.entries(a.scores.mainForce.breakdown).map(([k, v]) => (
                        <div key={k} className="grow-row">
                          <span className="k">{k}</span>
                          <div className="b"><div className="fill" style={{ width: `${v}%`, background: v >= 70 ? "var(--signal)" : v >= 50 ? "var(--f1)" : "var(--text-mute)" }}></div></div>
                          <span className="n">{v}</span>
                        </div>
                      ))}
                      {a.retreat.length > 0 && (
                        <div style={{ marginTop: 10, padding: 8, background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.3)", borderRadius: 3 }}>
                          <div className="xs" style={{ color: "var(--f3)", fontWeight: 600, marginBottom: 4 }}>🚨 主力撤退訊號</div>
                          {a.retreat.map((r, i) => <div key={i} className="xs text-dim">· {r}</div>)}
                        </div>
                      )}
                      {a.scores.fomo.reasons.length > 0 && (
                        <div style={{ marginTop: 8, padding: 8, background: "rgba(255,45,61,0.06)", border: "1px solid rgba(255,45,61,0.25)", borderRadius: 3 }}>
                          <div className="xs" style={{ color: "var(--up)", fontWeight: 600, marginBottom: 4 }}>⚠ FOMO 觸發</div>
                          {a.scores.fomo.reasons.map((r, i) => <div key={i} className="xs text-dim">· {r}</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-mute)" }}>此戰局類別目前沒有候選</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 主升段排行榜
// ============================================================
function Leaderboard({ analyses, onSelect, onHealthCheck }) {
  const [sortKey, setSortKey] = useState("mainForce");

  const rows = useMemo(() => {
    const sorters = {
      mainForce: (a, b) => b.scores.mainForce.total - a.scores.mainForce.total,
      trend:     (a, b) => b.scores.trend - a.scores.trend,
      fomo:      (a, b) => b.scores.fomo.total - a.scores.fomo.total,
      family:    (a, b) => b.scores.mainForce.meta.familyCount - a.scores.mainForce.meta.familyCount,
    };
    return analyses
      .filter(a => a.stock?.real === true && a.stock?.liveSource === "LIVE")
      .filter(a => a.phase !== "distribution")
      .slice()
      .sort(sorters[sortKey] || sorters.mainForce)
      .slice(0, 50);
  }, [analyses, sortKey]);

  return (
    <div className="panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="sniper-head" style={{ background: "linear-gradient(90deg, rgba(198,255,90,0.10), transparent 70%)" }}>
        <div className="crosshair" style={{ borderColor: "var(--signal)" }}><span style={{ background: "var(--signal)", boxShadow: "0 0 8px var(--signal)" }}/></div>
        <div>
          <div className="h-title">🚀 主升段排行榜</div>
          <div className="h-sub">LIVE 真實股票 · 排除 FOMO + 出貨 · 依分數即時排名</div>
        </div>
        <div className="h-count">
          <div className="n" style={{ color: "var(--signal)" }}>{rows.length}</div>
          <div className="l">candidates</div>
        </div>
      </div>
      <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)" }}>
        <span className="xs text-mute" style={{ letterSpacing: 2, marginRight: 8 }}>排序</span>
        <div className="scope-group">
          <button className={cn("scope-btn", sortKey === "mainForce" && "active")} onClick={() => setSortKey("mainForce")}>主升段分數</button>
          <button className={cn("scope-btn", sortKey === "trend" && "active")} onClick={() => setSortKey("trend")}>續航分數</button>
          <button className={cn("scope-btn", sortKey === "fomo" && "active")} onClick={() => setSortKey("fomo")}>FOMO 排序</button>
          <button className={cn("scope-btn", sortKey === "family" && "active")} onClick={() => setSortKey("family")}>族群強度</button>
        </div>
      </div>
      <div style={{ overflow: "auto", flex: 1 }}>
        <div className="lb-row head">
          <span>#</span><span>股票</span><span>主升段分數</span><span>FOMO</span><span>階段</span><span>突破</span><span>續航</span><span>AI 評語</span><span></span>
        </div>
        {rows.map((a, i) => {
          const todayPct = ((a.stock.price - a.stock.prev) / a.stock.prev) * 100;
          return (
            <div key={a.stock.code} className="lb-row" onClick={() => onSelect(a.stock.code)}>
              <span className={cn("lb-rank", i < 3 && "top")}>{i + 1}</span>
              <span className="lb-stock">
                <div className="name">{a.stock.name}</div>
                <div className="code">{a.stock.code} · {a.stock.market}</div>
              </span>
              <ScoreGauge value={a.scores.mainForce.total} color="var(--signal)"/>
              <span className={cn("mono", a.scores.fomo.total >= 70 ? "up" : "")} style={{ fontSize: 13 }}>{a.scores.fomo.total}</span>
              <PhaseChip phase={a.phase}/>
              <span className={cn("mono", todayPct > 0 ? "up" : "down")} style={{ fontSize: 13 }}>{fmtPct(todayPct)}</span>
              <ScoreGauge value={a.scores.trend} color="var(--ma120)"/>
              <span className="xs text-dim" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.commentary.replace(/<[^>]+>/g, '')}>
                {a.commentary.replace(/<[^>]+>/g, '').slice(0, 60)}…
              </span>
              <span>
                <button className="icon-btn" title="健診" onClick={(e)=>{e.stopPropagation(); onHealthCheck(a.stock.code);}} style={{ color: "var(--f1)" }}><Icon name="shield" size={12}/></button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.WarRoom = WarRoom;
window.Leaderboard = Leaderboard;
window.PhaseChip = PhaseChip;
