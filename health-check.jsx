// =============== 個股健診 Health Check Modal ===============
// 可拖拉、可關閉、4 燈號總結 + 短/中/長期 Tabs + 風險區 + 短影音腳本

function HealthLight({ pass, label, sub }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      padding: "8px 6px",
      background: pass ? "rgba(0, 217, 132, 0.10)" : "rgba(255, 82, 82, 0.10)",
      border: `1px solid ${pass ? "rgba(0,217,132,0.4)" : "rgba(255,82,82,0.4)"}`,
      borderRadius: 4, minWidth: 0
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: 50,
        background: pass ? "var(--down)" : "var(--f3)",
        boxShadow: pass ? "0 0 14px var(--down)" : "0 0 14px var(--f3)"
      }}></div>
      <div style={{ fontSize: 11, fontWeight: 600, color: pass ? "var(--down)" : "var(--f3)" }}>{label}</div>
      <div style={{ fontSize: 10, color: "var(--text-mute)", textAlign: "center" }}>{sub}</div>
    </div>
  );
}

function MetricRow({ k, v, dir, hint, big = false }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "120px 1fr auto",
      padding: "7px 0", borderBottom: "1px dashed var(--border)",
      alignItems: "center", gap: 12
    }}>
      <span style={{ color: "var(--text-mute)", fontSize: 11 }}>{k}</span>
      <span style={{ fontSize: big ? 14 : 12, color: "var(--text)" }}>{hint}</span>
      <span className={cn("mono", dir)} style={{ fontSize: big ? 16 : 13, fontWeight: 500, minWidth: 80, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function ProgressBar({ pct, color, label }) {
  return (
    <div style={{ marginBottom: 4 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-mute)", marginBottom: 3, letterSpacing: 1 }}>
          <span>{label}</span><span className="mono" style={{ color: color || "var(--text-dim)" }}>{pct}%</span>
        </div>
      )}
      <div style={{ height: 5, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: color || "var(--f2)", transition: "width 0.3s" }}></div>
      </div>
    </div>
  );
}

// ----- Per-period tabs ------
function ShortTermTab({ s }) {
  const dir = s.twoHourTrend === "up" ? "up" : "down";
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 8 }}>大單敲進 · 真假突破關鍵</div>
          <ProgressBar pct={s.bigOrderRatio} color={s.bigOrderRatio >= 60 ? "var(--down)" : "var(--f1)"} label={`外盤主動買進佔比`}/>
          <div className="xs" style={{ color: "var(--text-dim)", marginTop: 4 }}>
            較前日 <span className={cn("mono", upDown(s.bigOrderDelta))}>{fmtSigned(s.bigOrderDelta, 1)}%</span> · 大單 (>50張) {s.bigOrderRatio >= 60 ? "持續敲進" : "未見明顯主動買盤"}
          </div>
        </div>
        <div>
          <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 8 }}>近 2 小時趨勢</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkline data={s.segments} width={120} height={36} strokeWidth={1.8}/>
            <div>
              <div className={cn("mono", dir)} style={{ fontSize: 16, fontWeight: 600 }}>
                {arrow(s.segments[s.segments.length-1] - s.segments[0])} {fmtSigned(s.segments[s.segments.length-1] - s.segments[0], 2)}
              </div>
              <div className="xs text-mute">2H · 站穩 5MA {s.ma5.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 6 }}>關鍵指標</div>
      <MetricRow k="價漲量增倍數" v={`${s.priceVolRatio}×`} dir={s.priceVolRatio >= 1.3 ? "up" : ""}
                 hint={s.priceVolRatio >= 1.3 ? "量價同步放大，動能成形" : "量能尚未跟上，仍待確認"}/>
      <MetricRow k="20 分量 vs 日均" v={fmtSigned(s.vol20Pct, 0) + "%"} dir={s.vol20Pct >= 30 ? "up" : "down"}
                 hint={s.vol20Pct >= 30 ? "符合放量門檻 (≥+30%)" : "尚未達放量條件"}/>
      <MetricRow k="即時 RS (vs OTC)" v={s.otcRS.toFixed(2)} dir={s.otcRS >= 1.5 ? "up" : s.otcRS < 1 ? "down" : ""}
                 hint={s.otcRS >= 1.5 ? "強勢領漲族群" : s.otcRS >= 1 ? "與大盤同步" : "弱於大盤"}/>
      <MetricRow k="5MA 乖離" v={fmtSigned(s.ma5Bias, 1) + "%"} dir={Math.abs(s.ma5Bias) > 3 ? "" : s.ma5Bias > 0 ? "up" : "down"}
                 hint={Math.abs(s.ma5Bias) > 3 ? "⚠ 短線乖離過大，追高風險" : "短線安全區"}/>
      <MetricRow k="開盤防線" v={s.f3 ? "守住" : "已跌破"} dir={s.f3 ? "up" : "down"}
                 hint={s.f3 ? `現價 > Open (${s.open})` : "今日廢股 · 反陷阱觸發"}/>
    </div>
  );
}

function MidTermTab({ s }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ padding: 12, background: "var(--bg-2)", borderRadius: 4, border: "1px solid var(--border)" }}>
          <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 6 }}>箱型放量突破</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            <span className={s.f2 ? "up" : "text-mute"}>{s.f2 ? "✓ 已突破" : "尚未突破"}</span>
          </div>
          <div className="xs text-dim" style={{ lineHeight: 1.6 }}>
            20D 箱型 <span className="mono">{s.boxLo.toFixed(2)} – {s.boxHi.toFixed(2)}</span><br/>
            {s.f2
              ? `突破第 ${s.boxBreakDays} 日，量增 ${fmtSigned(s.vol20Pct, 0)}%`
              : `距 20D 高點 ${s.dist20High.toFixed(2)}%，量未跟上`}
          </div>
        </div>
        <div style={{ padding: 12, background: "var(--bg-2)", borderRadius: 4, border: "1px solid var(--border)" }}>
          <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 6 }}>主力築底完成度</div>
          <ProgressBar pct={s.foundationPct} color={s.foundationPct >= 70 ? "var(--down)" : "var(--f1)"}/>
          <div className="xs text-dim" style={{ marginTop: 6 }}>
            {s.foundationPct >= 70 ? "底部結構完成，主力進場明確" :
             s.foundationPct >= 50 ? "底部成形中，主力分批承接" : "築底初期，等待量縮乾"}
          </div>
        </div>
      </div>

      <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 8 }}>題材熱度</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {s.catalysts.map((c, i) => (
          <span key={i} className="tag" style={{
            background: "var(--f2-bg)", color: "var(--f2)", borderColor: "rgba(90,215,255,0.3)", fontSize: 11
          }}>#{c}</span>
        ))}
        <span className="tag" style={{ marginLeft: "auto" }}>熱度 <span className={cn("mono", s.catalystHeat >= 60 ? "up" : "")}>{s.catalystHeat}%</span></span>
      </div>

      <MetricRow k="20 日高點" v={s.boxHi.toFixed(2)} dir={s.price >= s.boxHi ? "up" : ""}
                 hint={s.price >= s.boxHi ? "已站上 20D 高點" : `距 20D 高點 ${s.dist20High.toFixed(2)}%`}/>
      <MetricRow k="法人連續買超" v={`${s.foreignDays} 日`} dir={s.foreignDays >= 3 ? "up" : ""}
                 hint={`外資 ${s.foreignDays} 日 · 投信 ${s.trustDays} 日`}/>
      <MetricRow k="量價同向" v={s.volPriceSync ? "是" : "否"} dir={s.volPriceSync ? "up" : "down"}
                 hint={s.volPriceSync ? "量價配合，趨勢健康" : "價量背離，注意拉回"}/>
    </div>
  );
}

function LongTermTab({ s }) {
  const peLevel = s.pe <= s.peLow ? "low" : s.pe >= s.peHigh ? "high" : "mid";
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ padding: 10, background: "var(--bg-2)", borderRadius: 4, border: "1px solid var(--border)" }}>
          <div className="xs text-mute" style={{ letterSpacing: 1 }}>EPS 預估成長</div>
          <div className={cn("mono", upDown(s.epsGrowth))} style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{fmtSigned(s.epsGrowth, 1)}%</div>
          <div className="xs text-dim">FY+1 預估 · YoY {fmtSigned(s.epsYoY, 1)}%</div>
        </div>
        <div style={{ padding: 10, background: "var(--bg-2)", borderRadius: 4, border: "1px solid var(--border)" }}>
          <div className="xs text-mute" style={{ letterSpacing: 1 }}>ROE</div>
          <div className={cn("mono", s.roe >= 15 ? "up" : "")} style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{s.roe}%</div>
          <div className="xs text-dim">{s.roe >= 15 ? "高 ROE 績優" : s.roe >= 10 ? "穩定獲利" : "獲利偏弱"}</div>
        </div>
        <div style={{ padding: 10, background: "var(--bg-2)", borderRadius: 4, border: "1px solid var(--border)" }}>
          <div className="xs text-mute" style={{ letterSpacing: 1 }}>本益比 PE</div>
          <div className={cn("mono", peLevel === "low" ? "down" : peLevel === "high" ? "up" : "")} style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{s.pe}</div>
          <div className="xs text-dim">區間 {s.peLow}–{s.peHigh} · {peLevel === "low" ? "估值便宜" : peLevel === "high" ? "估值偏高" : "區間中段"}</div>
        </div>
      </div>

      <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 8 }}>籌碼集中度</div>
      <ProgressBar pct={s.chipConcentration} color={s.chipConcentration >= 55 ? "var(--down)" : "var(--f1)"}/>
      <div className="xs text-dim" style={{ marginTop: 4, marginBottom: 14 }}>
        前 15 大券商持股佔比 {s.chipConcentration}% · {s.chipConcentration >= 55 ? "籌碼集中於主力，浮額少" : "籌碼分散，主力尚未鎖單"}
      </div>

      <MetricRow k="基本面優勢" v={s.industryRank <= 3 ? "領頭羊" : s.industryRank <= 6 ? "中段班" : "落後群"}
                 dir={s.industryRank <= 3 ? "up" : ""}
                 hint={`同業 ${s.industryTotal} 家中排名第 ${s.industryRank}`}/>
      <MetricRow k="外資持股趨勢" v={`連 ${s.foreignDays} 日`} dir={s.foreignDays >= 3 ? "up" : ""}
                 hint={s.foreignDays >= 3 ? "外資連續加碼，方向明確" : "外資觀望"}/>
      <MetricRow k="投信偏好" v={`連 ${s.trustDays} 日`} dir={s.trustDays >= 3 ? "up" : ""}
                 hint={s.trustDays >= 3 ? "作帳行情啟動" : "尚無投信動作"}/>
    </div>
  );
}

// ----- Script (短影音) generator -----
function ScriptOutput({ s, verdict, failed, onClose }) {
  const variants = [
    {
      tag: "AI 30s · Hook",
      title: verdict.canEnter ? `為什麼 ${s.name} 是今天唯一上車訊號` : `為什麼今天我不買 ${s.name}`,
      body: verdict.canEnter
        ? `「OTC 跌 1.13%、市場流血，但 ${s.code} ${s.name} 三濾鏡全通過、大單敲進 ${s.bigOrderRatio}%、量增 ${fmtSigned(s.vol20Pct, 0)}%。這就是我等的訊號。」`
        : `「${s.name} 看起來會漲，但缺 ${failed.length} 個條件。空手是一種翻身。第 ${window.MARKET_DATA.winStreak} 天紀律完成。」`
    },
    {
      tag: "FB 60s · Story",
      title: verdict.canEnter ? `39 歲爸爸的狙擊手紀律 (上車版)` : `39 歲爸爸的狙擊手紀律 (空手版)`,
      body: `開場 5s：宜蘭家裡窗外 → 旁白：「兩年前我創業失敗、虧掉一台車。」\n主體 40s：切到 Ranstock 介面，逐一帶四濾鏡 → ${verdict.canEnter ? "今天 4 條全通過，這就是低頻高勝率" : `今天缺 ${failed.join("、")}，違反紀律就會輸第二次`}。\n結尾 15s：${verdict.canEnter ? "「設好停損 5%，剩下交給市場。」" : "「空手不丟臉。第 " + window.MARKET_DATA.winStreak + " 天紀律。」"}`
    },
    {
      tag: "IG 30s · Reels",
      title: verdict.canEnter ? `三濾鏡 + 上車訊號 = ${s.code}` : `為什麼這檔被我關掉`,
      body: `Hook：手寫四個框「抗跌 ✓ / 箱型 ${s.f2?"✓":"✗"} / 防線 ${s.f3?"✓":"✗"} / 訊號 ${s.f4?"✓":"✗"}」\nBody：旁白：「狙擊手只開一槍，不亂掃射。」\nCTA：「追蹤我，每日空手腳本自動上線。」`
    }
  ];

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "var(--panel)",
      display: "flex", flexDirection: "column", zIndex: 5
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div className="brand-mark" style={{ width: 22, height: 22, background: "var(--signal)" }}>S</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>今日短影音腳本 · {s.name}</div>
          <div className="xs text-mute">三平台同步產出 · 對接 ai/fb/ig 模板</div>
        </div>
        <span className="spacer" style={{ flex: 1 }}/>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
      </div>
      <div style={{ overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {variants.map((v, i) => (
          <div key={i} style={{ padding: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="tag" style={{ background: "var(--signal-bg)", color: "var(--signal)", borderColor: "rgba(198,255,90,0.3)" }}>{v.tag}</span>
              <span className="xs text-mute">複製腳本 · 匯出 SRT</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{v.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{v.body}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn-submit" style={{ background: "var(--panel-3)", color: "var(--text-dim)", padding: "8px 16px", letterSpacing: 1, fontSize: 12 }} onClick={onClose}>返回健診</button>
          <button className="btn-submit" style={{ background: "var(--signal)", color: "#0a0e14", padding: "8px 18px", letterSpacing: 1, fontSize: 12 }}>匯出 3 平台腳本</button>
        </div>
      </div>
    </div>
  );
}

// ----- Main Modal -----
function HealthCheckModal({ stock, onClose, onTrigFomo, winStreak }) {
  const [tab, setTab] = useState("short");
  const [scriptOpen, setScriptOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(null);

  // Drag handler
  function onTitleMouseDown(e) {
    if (e.target.closest("button")) return;
    draggingRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
    function onMove(ev) {
      if (!draggingRef.current) return;
      const d = draggingRef.current;
      setPos({ x: d.ox + ev.clientX - d.x, y: d.oy + ev.clientY - d.y });
    }
    function onUp() {
      draggingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ESC to close
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!stock) return null;
  const pct = ((stock.price - stock.prev) / stock.prev) * 100;

  // ---- Verdict logic ----
  const failedConditions = [];
  if (!stock.f1) failedConditions.push("F1 · 未通過抗跌過濾");
  if (!stock.f2) failedConditions.push("F2 · 未達箱型放量突破");
  if (!stock.f3) failedConditions.push("F3 · 已跌破開盤防線");
  if (!stock.f4) failedConditions.push("F4 · 主力布局未滿 2 項 (上車訊號未亮)");
  if (Math.abs(stock.ma5Bias) > 3) failedConditions.push("乖離率 > 3% · 追高風險");

  const allPass = stock.f1 && stock.f2 && stock.f3 && stock.f4;
  const partialPass = !allPass && (stock.f1 && stock.f2);
  const trap = !stock.f3;
  let verdict;
  if (trap) verdict = { kind: "trap", title: "空手勝利", sub: "今日廢股 · 紀律 +1", color: "var(--f3)", canEnter: false };
  else if (allPass) verdict = { kind: "go", title: "可進場", sub: "四濾鏡全通過 · 上車訊號明確", color: "var(--signal)", canEnter: true };
  else if (partialPass) verdict = { kind: "wait", title: "待上車", sub: `仍缺 ${failedConditions.length} 項條件 · 等待訊號完成`, color: "var(--f1)", canEnter: false };
  else verdict = { kind: "hold", title: "空手勝利", sub: "本檔不符合紀律 · 空手訓練 +1", color: "var(--f1)", canEnter: false };

  return (
    <div className="modal-backdrop" style={{ background: "rgba(5,8,12,0.6)" }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 780, maxWidth: "94vw", maxHeight: "92vh",
          background: "var(--panel)",
          border: "1px solid " + verdict.color,
          borderTop: `4px solid ${verdict.color}`,
          borderRadius: 4,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          position: "relative",
          overflow: "hidden"
        }}>
        {/* Title bar (draggable) */}
        <div onMouseDown={onTitleMouseDown}
             style={{
               display: "flex", alignItems: "center", gap: 12,
               padding: "10px 16px",
               background: "linear-gradient(180deg, var(--panel-2), var(--panel))",
               borderBottom: "1px solid var(--border)",
               cursor: draggingRef.current ? "grabbing" : "grab",
               userSelect: "none"
             }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: `2px solid ${verdict.color}`,
            display: "grid", placeItems: "center", position: "relative"
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: verdict.color, boxShadow: `0 0 8px ${verdict.color}` }}></span>
          </div>
          <div>
            <div className="xs text-mute" style={{ letterSpacing: 3 }}>HEALTHCHECK REPORT</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>煥然 · 個股健診報告 — <span className="mono text-dim">{stock.code}</span> {stock.name}</div>
            <div className="xs" style={{ marginTop: 3, color: stock.liveSource === "LIVE" ? "var(--signal)" : "var(--f3)", fontFamily: "var(--font-mono)" }}>
              資料來源：{stock.liveSource === "LIVE" ? `LIVE TWSE MIS ${stock.liveTime || ""}` : "未取得真實資料 / 不可交易判斷"}
            </div>
          </div>
          <span style={{ flex: 1 }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--signal-bg)", border: "1px solid rgba(198,255,90,0.3)", borderRadius: 3 }}>
            <Icon name="discipline" size={12} color="var(--signal)"/>
            <span className="xs" style={{ color: "var(--text-dim)" }}>我的紀律指數</span>
            <span className="mono" style={{ color: "var(--signal)", fontSize: 16, fontWeight: 700 }}>{winStreak}</span>
            <span className="xs" style={{ color: "var(--text-dim)" }}>連勝</span>
          </div>
          <button className="icon-btn" onClick={onClose} title="關閉 (Esc)"><Icon name="x" size={14}/></button>
        </div>

        {/* Body */}
        <div style={{ overflow: "auto", flex: 1 }}>
          {/* SUMMARY */}
          <div style={{ padding: "16px 18px", background: "linear-gradient(90deg, " + (verdict.kind === "go" ? "rgba(198,255,90,0.10)" : verdict.kind === "trap" ? "rgba(255,82,82,0.10)" : "rgba(255,176,32,0.10)") + ", transparent 70%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div>
                <div className="xs text-mute" style={{ letterSpacing: 4, marginBottom: 4 }}>今日紀律建議</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: verdict.color, lineHeight: 1.1, letterSpacing: 2 }}>{verdict.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>{verdict.sub}</div>
              </div>
              <span style={{ flex: 1 }}/>
              <div style={{ textAlign: "right" }}>
                <div className="xs text-mute">現價</div>
                <div className={cn("mono", upDown(pct))} style={{ fontSize: 28, fontWeight: 600 }}>{fmtPx(stock.price)}</div>
                <div className={cn("mono", upDown(pct))} style={{ fontSize: 13 }}>
                  {arrow(pct)} {fmtSigned(stock.price - stock.prev)} ({fmtPct(pct)})
                </div>
              </div>
            </div>

            {/* 4 traffic lights */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 14 }}>
              <HealthLight pass={stock.f1} label="F1 · 抗跌" sub={stock.f1 ? "逆勢護盤 ✓" : `RS ${stock.otcRS.toFixed(2)}`}/>
              <HealthLight pass={stock.f2} label="F2 · 箱型放量" sub={stock.f2 ? `量+${fmtSigned(stock.vol20Pct,0)}%` : "尚未突破"}/>
              <HealthLight pass={stock.f3} label="F3 · 開盤防線" sub={stock.f3 ? "守住開盤" : "已跌破"}/>
              <HealthLight pass={stock.f4} label="F4 · 上車訊號"
                sub={stock.f4
                  ? `主力布局 ${stock.f4Triggers?.count || 0}/4 條件命中`
                  : `布局中 ${stock.f4Triggers?.count || 0}/4 · 待真訊號`}/>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {[
              { id: "short", label: "短期", sub: "1–5 天 · 動能" },
              { id: "mid",   label: "中期", sub: "1–4 週 · 主力" },
              { id: "long",  label: "長期", sub: "1–3 月 · 基本面" },
            ].map(t => (
              <button key={t.id}
                      onClick={() => setTab(t.id)}
                      className={cn("order-tab", tab === t.id && "active")}
                      style={{
                        flexDirection: "column", padding: 10, alignItems: "center",
                        color: tab === t.id ? "var(--text)" : "var(--text-mute)",
                        borderBottom: tab === t.id ? "2px solid var(--f1)" : "2px solid transparent",
                        background: tab === t.id ? "var(--panel-2)" : "transparent"
                      }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
                <span className="xs text-mute">{t.sub}</span>
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div style={{ padding: 18 }}>
            {tab === "short" && <ShortTermTab s={stock}/>}
            {tab === "mid"   && <MidTermTab s={stock}/>}
            {tab === "long"  && <LongTermTab s={stock}/>}
          </div>

          {/* RISK / PSYCH */}
          {!allPass && (
            <div style={{
              margin: "0 18px 18px",
              padding: "12px 14px",
              background: trap ? "rgba(255,82,82,0.08)" : "rgba(255,176,32,0.08)",
              border: `1px solid ${trap ? "rgba(255,82,82,0.3)" : "rgba(255,176,32,0.3)"}`,
              borderRadius: 4
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Icon name="warning" size={14} color={trap ? "var(--f3)" : "var(--f1)"}/>
                <span style={{ fontWeight: 600, color: trap ? "var(--f3)" : "var(--f1)" }}>
                  {trap ? "⚠ 反陷阱 · 跌破開盤，今日不再追蹤" : "停！還沒看到完整上車訊號，忍住！"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10, lineHeight: 1.7 }}>
                {trap
                  ? "本檔已觸發 F3 防線，依照狙擊手紀律應立即關閉視窗，不再花腦力研究。空手訓練 +1。"
                  : "未通過完整四濾鏡的個股，過去 2 年的回測勝率僅 31%。空手等訊號完成，回測勝率 78%。"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-mute)", letterSpacing: 2, marginBottom: 4 }}>未通過條件</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {failedConditions.map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", gap: 6 }}>
                    <span style={{ color: "var(--f3)", fontFamily: "var(--font-mono)" }}>✗</span><span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ padding: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", background: "var(--bg-2)" }}>
          <div style={{ fontSize: 11, color: "var(--text-mute)" }}>
            報告生成 {new Date().toLocaleTimeString("zh-TW", {hour12: false})} · 資料源 模擬 · Ranstock v2026.05
          </div>
          <span style={{ flex: 1 }}/>
          {!allPass && (
            <button
              onClick={() => onTrigFomo && onTrigFomo({ stock, failed: failedConditions })}
              style={{
                padding: "8px 14px", background: "transparent",
                color: "var(--f3)", border: "1px dashed var(--f3)",
                borderRadius: 3, cursor: "pointer", fontSize: 12
              }}>
              觸發 FOMO 保護彈窗
            </button>
          )}
          <button
            onClick={() => setScriptOpen(true)}
            style={{
              padding: "8px 18px",
              background: "var(--signal)",
              color: "#0a0e14",
              fontWeight: 600,
              border: 0,
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 13,
              letterSpacing: 2,
              display: "inline-flex", gap: 8, alignItems: "center"
            }}>
            🎬 產生今日短影音腳本
          </button>
        </div>

        {/* Script overlay */}
        {scriptOpen && <ScriptOutput s={stock} verdict={verdict} failed={failedConditions} onClose={() => setScriptOpen(false)}/>}
      </div>
    </div>
  );
}

window.HealthCheckModal = HealthCheckModal;
