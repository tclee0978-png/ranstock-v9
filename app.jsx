// =============== Ranstock — Main App Shell ===============

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "wall",
  "density": "comfortable",
  "showTickerTape": true,
  "showMobileCompanion": false,
  "animateNumbers": true,
  "accent": "amber",
  "tradeLockBefore915": true,
  "theme": "dark"
}/*EDITMODE-END*/;

// 大盤即時時鐘
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// 即時跳動數字 (只更新前 40 檔避免過重)
function useLivePrices(data, enabled = true) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const active = data.stocks.slice(0, 40);
      active.forEach(s => {
        if (Math.random() < 0.35) {
          const step = (Math.random() - 0.5) * 0.6;
          const np = +(s.price + step).toFixed(2);
          if (np > s.low && np < s.high * 1.005) s.price = np;
        }
      });
      data.indices.forEach(idx => {
        if (Math.random() < 0.4) {
          const step = (Math.random() - 0.5) * (idx.value * 0.0002);
          idx.value = +(idx.value + step).toFixed(2);
        }
      });
      setTick(t => t + 1);
    }, 1600);
    return () => clearInterval(id);
  }, [enabled]);
  return tick;
}

// Ticker tape — cap to ~40 stocks
function TickerTape({ data, dataMode }) {
  const source = dataMode === "live" ? data.stocks.filter(s => s.liveSource === "LIVE") : data.stocks;
  const sample = source.slice(0, 40);
  const items = [...sample, ...sample, ...sample];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((s, i) => {
          const pct = ((s.price - s.prev) / s.prev) * 100;
          const dir = upDown(pct);
          return (
            <span key={i} className="ticker-item">
              <span className="text-mute">{s.code}</span>
              <span className="name">{s.name}</span>
              <span className={dir}>{fmtPx(s.price)}</span>
              <span className={dir + " arrow"}>{arrow(pct)}</span>
              <span className={dir}>{fmtPct(pct)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// 「待上車」彈窗 — F1+F2+F3 通過但 F4 未觸發
function WaitingModal({ stock, onClose }) {
  if (!stock) return null;
  const missing = [];
  const tr = stock.f4Triggers || {};
  if (!tr.A) missing.push("量爆但價未噴 (量增 50–150% + 漲幅 <3%)");
  if (!tr.B) missing.push("法人連買但股價未飆");
  if (!tr.C) missing.push("底部反轉訊號 (RSI 勾頭 / 早晨之星 / 長下影紅 K)");
  if (!tr.D) missing.push("突破第一天 (放量站上箱頂 + 乖離 <3%)");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wait-modal" onClick={e => e.stopPropagation()} style={{ borderColor: "var(--f1)", borderTopColor: "var(--f1)" }}>
        <div className="stop" style={{ color: "var(--f1)" }}>WAIT · 主力還在布局</div>
        <div className="title-x">主力還在布局，<br/>還沒看到明確起漲訊號，<strong style={{ color: "var(--f1)" }}>忍住！</strong></div>
        <div className="body-x">
          <strong style={{ color: "var(--text)" }}>{stock.code} {stock.name}</strong> 雖然通過 F1 抗跌、F2 箱型、F3 防線，但「上車訊號」尚未亮起。<br/>
          這代表主力可能還在<strong style={{ color: "var(--text)" }}>悄悄吃貨</strong>，<strong>追進去等於替主力抬轎</strong>。空手等真正的「起漲第一天」。
        </div>
        <div className="reasons">
          <div className="xs text-mute mb-8" style={{ letterSpacing: 2 }}>尚未觸發的「上車訊號」條件 ({4 - (tr.count||0)} 項)</div>
          {missing.map((m, i) => (
            <div className="item" key={i}><span className="x" style={{ color: "var(--f1)" }}>○</span><span>{m}</span></div>
          ))}
          <div className="xs text-mute" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
            目前觸發 <span style={{ color: "var(--f1)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{tr.count || 0}/4</span> 項 — 需任 <strong>2 項以上</strong> 才亮金色上車訊號
          </div>
        </div>
        <div className="actions">
          <button className="btn-ghost" onClick={onClose}>OK，我空手等真訊號</button>
          <button className="btn-ghost" onClick={onClose} style={{ color: "var(--f1)", borderColor: "var(--f1)" }}>加入觀察區追蹤</button>
        </div>
      </div>
    </div>
  );
}

// FOMO modal
function FomoModal({ data, onClose, onIgnore }) {
  if (!data) return null;
  const { stock, failed } = data;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="stop">STOP · 紀律保護</div>
        <div className="title-x">停！你想追的 {stock.name} 不符合<br/>三濾鏡判定。</div>
        <div className="body-x">
          39 歲、宜蘭爸爸、過去因為追高陷阱讓家裡虧過一台車。<br/>
          <strong style={{ color: "var(--text)" }}>空手也是一種翻身。</strong> 你今天的紀律已連續 26 天。
        </div>
        <div className="reasons">
          <div className="xs text-mute mb-8" style={{ letterSpacing: 2 }}>不符合的濾鏡 / 條件</div>
          {failed.map((f, i) => (
            <div className="item" key={i}><span className="x">✗</span><span>{f}</span></div>
          ))}
        </div>
        <div className="actions">
          <button className="btn-ghost" onClick={onClose}>關掉。我空手等訊號</button>
          <button className="btn-primary" onClick={onIgnore}>仍要違反紀律下單</button>
        </div>
        <div className="xs text-mute" style={{ marginTop: 10, textAlign: "center" }}>違反紀律的操作會自動寫入「紀律日誌 · LOSS 教材」</div>
      </div>
    </div>
  );
}

// Mobile companion (iOS-style mini)
function MobileCompanion({ data, selectedCode, onClose }) {
  const stock = data.stocks.find(s => s.code === selectedCode) || data.stocks[0];
  const sniperStocks = data.stocks.filter(s => s.f1 && s.f2 && s.f3);
  const pct = ((stock.price - stock.prev) / stock.prev) * 100;
  const dir = upDown(pct);
  return (
    <div className="mobile-companion">
      <div style={{
        width: 280, height: 580, background: "#000",
        border: "8px solid #1a1f2a", borderRadius: 32,
        position: "relative", overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
          width: 80, height: 18, background: "#000", borderRadius: 12, zIndex: 5
        }}></div>
        <div style={{ height: 28, display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between", fontSize: 10, color: "#fff", fontFamily: "var(--font-mono)" }}>
          <span>13:42</span>
          <span style={{ width: 60 }}></span>
          <span>5G ▮▮▮</span>
        </div>
        <div style={{ background: "var(--bg)", height: "calc(100% - 28px)", overflow: "auto" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-mute)", display: "flex", justifyContent: "space-between" }}>
              <span>Ranstock</span>
              <button onClick={onClose} style={{ background: "transparent", color: "var(--text-mute)", border: 0, cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>狙擊清單 · {sniperStocks.length}</div>
          </div>
          {sniperStocks.map(s => {
            const p = ((s.price - s.prev) / s.prev) * 100;
            const d = upDown(p);
            return (
              <div key={s.code} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{s.code} · {s.industry}</div>
                  <div style={{ marginTop: 4 }}><FilterFlags f1={s.f1} f2={s.f2} f3={s.f3}/></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className={cn("mono", d)} style={{ fontSize: 14, fontWeight: 500 }}>{fmtPx(s.price)}</div>
                  <div className={cn("mono", d)} style={{ fontSize: 10 }}>{fmtPct(p)}</div>
                </div>
              </div>
            );
          })}
          <div style={{ padding: 14, color: "var(--text-mute)", fontSize: 10, textAlign: "center" }}>
            ⌃ 上滑開啟完整看盤
          </div>
        </div>
      </div>
    </div>
  );
}

// =============== Search ===============
function GlobalSearch({ data, onSelect, onHealthCheck }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const results = useMemo(() => {
    if (!q.trim()) return data.stocks.filter(s => s.f1 && s.f2 && s.f3 && s.f4).slice(0, 6);
    const qq = q.trim();
    const lower = qq.toLowerCase();
    function score(s) {
      const code = s.code, name = s.name, ind = s.industry || "";
      if (code === qq) return 100;
      if (code.startsWith(qq)) return 90 - (code.length - qq.length);
      if (code.includes(qq)) return 70;
      if (name === qq) return 85;
      if (name.startsWith(qq)) return 80 - (name.length - qq.length);
      if (name.includes(qq)) return 65;
      if (ind.includes(qq)) return 40;
      // case-insensitive code/name fallback
      if (code.toLowerCase().includes(lower)) return 30;
      if (name.toLowerCase().includes(lower)) return 25;
      return 0;
    }
    const scored = data.stocks.map(s => ({ s, sc: score(s) })).filter(x => x.sc > 0);
    scored.sort((a, b) => b.sc - a.sc);
    return scored.slice(0, 12).map(x => x.s);
  }, [q, data.stocks]);

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ⌘K / Ctrl+K to focus
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const inp = ref.current && ref.current.querySelector("input");
        inp && inp.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onKeyDown(e) {
    if (e.key === "Enter" && results[0]) {
      onHealthCheck && onHealthCheck(results[0].code);
      setOpen(false); setQ("");
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="search" ref={ref} onClick={() => setOpen(true)}>
      <Icon name="search" size={15} color="var(--text-mute)"/>
      <input
        placeholder="搜尋代號 / 名稱 / 產業 — 例: 2330, 台積, 半導體"
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <span className="kbd">⌘K</span>
      {open && (
        <div className="search-pop">
          <div className="xs text-mute" style={{ padding: "5px 10px", letterSpacing: 2, display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <span>{q ? `搜尋結果 ${results.length} 筆` : "今日 🚀 上車訊號"} · 共 {fmtMoney(data.stocks.length)} 檔可搜尋</span>
            <span>Enter 健診 · 點擊詳細頁 · ESC 關閉</span>
          </div>
          {results.length === 0 && (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-mute)", fontSize: 12 }}>
              <Icon name="search" size={28} color="var(--text-mute)"/>
              <div style={{ marginTop: 10 }}>找不到「{q}」對應的個股</div>
              <div className="xs" style={{ marginTop: 4 }}>試試 4 碼代號或中文簡稱</div>
            </div>
          )}
          {results.map((s, i) => {
            const pct = ((s.price - s.prev) / s.prev) * 100;
            const dir = upDown(pct);
            return (
              <div className="search-row" key={s.code}
                   style={{
                     padding: "8px 10px",
                     ...(i === 0 && q ? { background: "var(--panel-3)", boxShadow: "inset 3px 0 0 var(--rocket-gold)" } : {}),
                     gridTemplateColumns: "70px 1fr 90px 80px auto"
                   }}
                   onClick={() => { onSelect(s.code); setOpen(false); setQ(""); }}>
                <span>
                  <span className="mono" style={{ color: "var(--text)", fontWeight: 600 }}>{s.code}</span>
                  <div style={{ fontSize: 9, color: s.market === "TPEx" ? "var(--f2)" : "var(--up)", letterSpacing: 1, fontFamily: "var(--font-mono)" }}>{s.market}</div>
                </span>
                <span>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                  <div className="xs text-mute">{s.industry}</div>
                </span>
                <span className={cn("mono", dir)} style={{ textAlign: "right", fontSize: 14, fontWeight: 500 }}>
                  {fmtPx(s.price)}
                  <div className="xs">{fmtPct(pct)}</div>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <FilterFlags f1={s.f1} f2={s.f2} f3={s.f3} f4={s.f4}/>
                  {s.f4 && <span className="signal-pill" style={{ fontSize: 9, padding: "1px 5px" }}>🚀 上車</span>}
                </span>
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                  <button className="icon-btn" title="健診"
                          onClick={(e)=>{e.stopPropagation(); onHealthCheck && onHealthCheck(s.code); setOpen(false); setQ("");}}
                          style={{ width: 28, height: 28, color: "var(--f1)", background: "var(--f1-bg)", border: "1px solid rgba(255,176,32,0.3)" }}>
                    <Icon name="shield" size={13}/>
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============== Sidebar ===============
function Sidebar({ tab, setTab, collapsed, setCollapsed, data, onHealthCheck }) {
  const sniperCount = data.stocks.filter(s => s.f1 && s.f2 && s.f3 && s.f4).length;
  const navs = [
    { id: "warroom",  icon: "scope",     label: "🌙 明日作戰室", badge: "V6", group: "V6 主升段獵殺" },
    { id: "leaderboard", icon: "target", label: "🚀 主升段排行榜", badge: null },
    { id: "dashboard", icon: "dashboard", label: "大盤總覽", badge: null, group: "看盤主控台" },
    { id: "sniper",   icon: "target",    label: "狙擊清單", badge: sniperCount },
    { id: "watch",    icon: "list",      label: "自選股", badge: null },
    { id: "detail",   icon: "chart",     label: "個股 K 線", badge: null, group: "個股工具" },
    { id: "health",   icon: "shield",    label: "個股健診", badge: "🩺", action: "health" },
    { id: "tech",     icon: "tech",      label: "技術指標", badge: null },
    { id: "chips",    icon: "chips",     label: "盤後籌碼", badge: null },
    { id: "portfolio",icon: "wallet",    label: "持股 / 損益", badge: null, group: "我的紀律" },
    { id: "news",     icon: "news",      label: "新聞 / 公告", badge: 10 },
  ];
  let lastGroup = null;
  return (
    <aside className="sidebar">
      {navs.map(n => {
        const showGroup = n.group && n.group !== lastGroup;
        if (n.group) lastGroup = n.group;
        return (
          <React.Fragment key={n.id}>
            {showGroup && <div className="nav-group">{n.group}</div>}
            <div className={cn("nav-item", tab === n.id && "active")}
                 onClick={() => { if (n.action === "health") { onHealthCheck && onHealthCheck(); } else { setTab(n.id); } }}>
              <span className="nav-ico"><Icon name={n.icon} size={15}/></span>
              <span className="nav-label">{n.label}</span>
              {n.badge != null && <span className="nav-badge">{n.badge}</span>}
            </div>
          </React.Fragment>
        );
      })}
      <div className="side-foot">
        <div className="avatar">RT</div>
        <div>
          <div className="who">煥然</div>
          <div className="where">宜蘭 · 紀律 26 日</div>
        </div>
      </div>
    </aside>
  );
}

// =============== Status Bar ===============
function StatusBar({ data, now }) {
  return (
    <div className="statusbar">
      <div className="item"><span className="dot"></span>WebSocket · 連線中</div>
      <div className="item">L1 延遲 23ms</div>
      <div className="item">TWSE · 13:30 收盤模擬</div>
      <div className="item">資料源 · 模擬</div>
      <div className="right">
        <div className="item">CPU 12% · MEM 240MB</div>
        <div className="item">9 模組已載入</div>
        <div className="item">v 2026.05.16</div>
      </div>
    </div>
  );
}

// =============== App ===============
// =============== App ===============

// 資料源指示器 + 切換真實 API 說明
function DataSourceBadge({ onClick, mode, status, error }) {
  const isLive = mode === "live";
  const isAfter = mode === "after";
  const isError = isLive && !!error;
  const color = isError ? "var(--f3)" : isLive ? "var(--down)" : isAfter ? "var(--ma120)" : "var(--f1)";
  const label = isError ? "API 失敗" : isLive ? `LIVE 真實 ${status.count}/${status.total || "?"}` : isAfter ? "盤後分析模式" : "DEMO 模擬資料";
  return (
    <button
      onClick={onClick}
      title={isError ? error : isLive ? `已連 TWSE MIS · ${status.count}/${status.total || "?"} 檔 · ${status.lastFetch ? status.lastFetch.toLocaleTimeString("zh-TW") : ""}` : "目前是模擬資料"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 3,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
        border: `1px solid ${color}`,
        color, cursor: "pointer", fontSize: 11, letterSpacing: 1.5,
        fontFamily: "var(--font-mono)", fontWeight: 600
      }}>
      <span style={{ width: 6, height: 6, borderRadius: 50, background: "currentColor",
        boxShadow: "0 0 6px currentColor",
        animation: status.fetching ? "pulse 0.8s infinite" : "none"
      }}></span>
      {label}
    </button>
  );
}

function DataSourceModal({ onClose }) {
  const workerCode = `export default {
  async fetch(req) {
    const url = new URL(req.url);
    const target = url.searchParams.get("ex_ch");
    if (!target) return new Response("missing ex_ch", { status: 400 });
    const upstream =
      \`https://mis.twse.com.tw/stock/api/getStockInfo.jsp\`
      + \`?ex_ch=\${encodeURIComponent(target)}&json=1&delay=0&_=\${Date.now()}\`;
    const r = await fetch(upstream, { headers: { "User-Agent": "Mozilla/5.0" }});
    const body = await r.text();
    return new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*"
      }
    });
  }
}`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}
           style={{ borderTopColor: "var(--f1)", borderColor: "var(--f1)", width: 640, maxHeight: "90vh", overflow: "auto", padding: 0 }}>
        <div style={{ padding: "20px 24px 0" }}>
          <div className="stop" style={{ color: "var(--f1)" }}>DATA SOURCE · TWSE / TPEx</div>
          <div className="title-x">這個預覽是模擬資料 ─<br/>部署 3 步驟接上真實行情</div>
          <div className="body-x">
            設計環境的 iframe sandbox 不能直接打 TWSE MIS API（CORS 阻擋）。
            把這個 App 部署到 GitHub Pages 後，依下列三步驟即可全面切換成 <strong style={{ color: "var(--text)" }}>真實即時行情</strong>。
          </div>
        </div>

        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderLeft: "3px solid var(--f1)", borderRadius: 4, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--f1)", color: "#0a0e14", width: 22, height: 22, borderRadius: 50, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }}>1</span>
              建立 Cloudflare Worker 代理
            </div>
            <div className="xs text-dim" style={{ marginBottom: 8, lineHeight: 1.6 }}>
              至 workers.cloudflare.com 建立免費 Worker，貼上以下程式碼後 Deploy，會拿到 <span className="mono">YOUR-WORKER.workers.dev</span>：
            </div>
            <pre style={{ background: "var(--bg)", border: "1px solid var(--border-strong)", borderRadius: 3, padding: 10, fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-dim)", overflow: "auto", maxHeight: 200, margin: 0, lineHeight: 1.5 }}>{workerCode}</pre>
          </div>

          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderLeft: "3px solid var(--f2)", borderRadius: 4, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--f2)", color: "#0a0e14", width: 22, height: 22, borderRadius: 50, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }}>2</span>
              編輯 <span className="mono">quote-source.js</span> 開頭兩行
            </div>
            <pre style={{ background: "var(--bg)", border: "1px solid var(--border-strong)", borderRadius: 3, padding: 10, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text)", overflow: "auto", margin: 0, lineHeight: 1.6 }}>{`const USE_LIVE = true;
const PROXY_URL = "https://YOUR-WORKER.workers.dev";`}</pre>
          </div>

          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderLeft: "3px solid var(--signal)", borderRadius: 4, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--signal)", color: "#0a0e14", width: 22, height: 22, borderRadius: 50, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 700 }}>3</span>
              Push 到 GitHub Pages 即生效
            </div>
            <div className="xs text-dim" style={{ lineHeight: 1.6 }}>
              整個 App 不需改其他檔案。<span className="mono">QuoteSource.fetchSnapshot()</span> 內建 fallback — API 失敗自動退回模擬，<strong style={{ color: "var(--text)" }}>不會白屏</strong>。標題列右上 badge 會從 <span style={{ color: "var(--f1)", fontFamily: "var(--font-mono)" }}>DEMO</span> 變 <span style={{ color: "var(--down)", fontFamily: "var(--font-mono)" }}>LIVE</span>。
            </div>
          </div>

          <div style={{ background: "rgba(255, 45, 61, 0.06)", border: "1px solid rgba(255, 45, 61, 0.3)", borderRadius: 4, padding: 12, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--up)" }}>⚠ 注意</strong> TWSE MIS 為非官方公開端點，僅供個人；商用請改接 <span className="mono">openapi.twse.com.tw</span> 或付費資料商。歷史 K 棒可加開 Worker endpoint 中繼 <span className="mono">STOCK_DAY_ALL</span>。
          </div>
        </div>

        <div style={{ padding: "12px 24px", background: "var(--bg-2)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "8px 18px", fontSize: 12 }}>了解，先用模擬資料繼續設計</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const data = window.MARKET_DATA;
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [tab, setTab] = useState("warroom");
  const [selected, setSelected] = useState("2401");
  const [tf, setTf] = useState("1D");
  const [collapsed, setCollapsed] = useState(false);
  const [fomo, setFomo] = useState(null);
  const [tradeLog, setTradeLog] = useState([]);
  const [watch, setWatch] = useState(data.stocks.slice(0, 12));
  const [chartOpts, setChartOpts] = useState({
    showMA5: true, showMA20: true, showMA60: true, showMA120: true,
    showBox: true, showOTC: false, showPattern: true, beastMode: true
  });
  const [healthCheckCode, setHealthCheckCode] = useState(null);
  const [scope, setScope] = useState("all");
  const [waiting, setWaiting] = useState(null);
  const [showDataSrc, setShowDataSrc] = useState(false);
  const [dataMode, setDataMode] = useState("live");
  const [liveError, setLiveError] = useState(null);
  const [liveVersion, setLiveVersion] = useState(0);
  const [liveStatus, setLiveStatus] = useState({ count: 0, total: 0, lastFetch: null, fetching: false });

  function isLiveEligibleStock(s) {
    return !!s && s.real === true && /^\d{4}$/.test(String(s.code));
  }

  function applyLiveQuoteToStock(s, it) {
    if (!s || !it) return false;
    const prev = s.price;
    if (it.price != null) s.price = it.price;
    if (it.open  != null) s.open  = it.open;
    if (it.high  != null) s.high  = it.high;
    if (it.low   != null) s.low   = it.low;
    if (it.prev  != null) s.prev  = it.prev;
    if (it.vol   != null) s.vol   = it.vol;
    if (it.name)          s.name  = it.name;
    if (it.askPrices?.length && it.bidPrices?.length && data.orderBook) {
      data.orderBook[s.code] = {
        asks: it.askPrices.slice(0,5).map((px, i) => ({ px, sz: it.askSizes?.[i] || 0 })).reverse(),
        bids: it.bidPrices.slice(0,5).map((px, i) => ({ px, sz: it.bidSizes?.[i] || 0 })),
      };
    }
    // LIVE 可信標記：之後健診、表格、排行榜都可辨識是否真的來自 API。
    s.liveSource = "LIVE";
    s.source = "twse-mis";
    s.liveTime = it.time || "";
    s.liveUpdatedAt = new Date().toISOString();
    // 用真實價格重新計算幾個會影響畫面的即時衍生欄位。
    if (s.prev) {
      const todayPct = ((s.price - s.prev) / s.prev) * 100;
      s.f3 = s.price >= s.open;
      s.ma5Bias = s.ma5 ? +(((s.price - s.ma5) / s.ma5) * 100).toFixed(2) : s.ma5Bias;
      s.priceVolRatio = +(Math.max(0.1, Math.abs(todayPct) / 2 + 1)).toFixed(2);
      s.dist20High = s.boxHi ? +(((s.boxHi - s.price) / s.price) * 100).toFixed(2) : s.dist20High;
    }
    return prev !== s.price;
  }

  function applyLiveIndex(idx, it) {
    if (!idx || !it || it.price == null) return false;
    idx.value = it.price;
    if (it.prev != null) {
      idx.change = +(it.price - it.prev).toFixed(2);
      idx.pct = it.prev ? +(((it.price - it.prev) / it.prev) * 100).toFixed(2) : 0;
    }
    if (it.vol != null) idx.vol = it.vol;
    idx.liveSource = "LIVE";
    idx.liveTime = it.time || "";
    return true;
  }

  async function fetchAndApplyLiveIndices() {
    // MIS 指數常用代碼：加權 tse_t00.tw、櫃買 otc_o00.tw。若盤後或 API 無資料，UI 會顯示未取得，不顯示假點位。
    data.indices.forEach(idx => { idx.liveSource = "unverified"; });
    const items = await window.QuoteSource.fetchLiveBatch([
      { code: "t00", market: "TWSE" },
      { code: "o00", market: "TPEx" },
    ]);
    items.forEach(it => {
      const c = String(it.code || "").toLowerCase();
      if (c.includes("t00")) applyLiveIndex(data.indices.find(x => x.code === "TWSE"), it);
      if (c.includes("o00")) applyLiveIndex(data.indices.find(x => x.code === "OTC"), it);
    });
  }

  async function fetchAndApplyLiveQuotes(stockList, { single = false } = {}) {
    const eligible = stockList.filter(isLiveEligibleStock);
    if (!eligible.length) return { updated: 0, total: 0 };
    const chunkSize = single ? 1 : 45;
    let updated = 0;
    for (let i = 0; i < eligible.length; i += chunkSize) {
      const chunk = eligible.slice(i, i + chunkSize);
      const pairs = chunk.map(s => ({ code: s.code, market: s.market }));
      const items = await window.QuoteSource.fetchLiveBatch(pairs);
      items.forEach(it => {
        const s = data.stocks.find(x => x.code === it.code);
        if (applyLiveQuoteToStock(s, it)) updated++;
      });
    }
    return { updated, total: eligible.length };
  }

  // 即時資料拉取 (LIVE 模式) — V6 修正版：不只前 20 檔，所有真實股票都會批次更新。
  useEffect(() => {
    if (dataMode !== "live") {
      setLiveError(null);
      return;
    }
    let cancelled = false;
    async function refresh() {
      const pool = data.stocks.filter(isLiveEligibleStock);
      pool.forEach(s => { if (s.liveSource !== "LIVE") s.liveSource = "unverified"; });
      setLiveStatus(st => ({ ...st, total: pool.length, fetching: true }));
      try {
        const result = await fetchAndApplyLiveQuotes(pool);
        try { await fetchAndApplyLiveIndices(); } catch (idxErr) { console.warn("LIVE index fetch failed:", idxErr); }
        if (cancelled) return;
        setLiveError(null);
        setLiveStatus({ count: pool.filter(s => s.liveSource === "LIVE").length, total: result.total, lastFetch: new Date(), fetching: false });
        setLiveVersion(v => v + 1);
      } catch (e) {
        if (cancelled) return;
        setLiveError(e.message || String(e));
        setLiveStatus(st => ({ ...st, fetching: false }));
        console.warn("LIVE fetch failed:", e);
      }
    }
    refresh();
    const id = setInterval(refresh, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, [dataMode, data.stocks]);

  // 點個股 / 開健診時，若尚未抓到 LIVE，立即單檔補抓，避免 3030 德律這類彈窗還顯示 Demo 價。
  useEffect(() => {
    if (dataMode !== "live") return;
    const code = healthCheckCode || selected;
    const s = data.stocks.find(x => x.code === code);
    if (!isLiveEligibleStock(s) || s.liveSource === "LIVE") return;
    let cancelled = false;
    (async () => {
      try {
        await fetchAndApplyLiveQuotes([s], { single: true });
        if (!cancelled) {
          setLiveStatus(st => ({ ...st, count: data.stocks.filter(x => x.liveSource === "LIVE").length, lastFetch: new Date() }));
          setLiveVersion(v => v + 1);
        }
      } catch (e) {
        if (!cancelled) setLiveError(e.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [selected, healthCheckCode, dataMode]);

  function retryLive() {
    setDataMode("demo");
    setTimeout(() => setDataMode("live"), 50);
  }

  // V6 · 主升段獵殺分析
  // LIVE 模式只分析「TWSE MIS 已驗證」的股票。
  // 未抓到 LIVE 的股票不得進排行榜，避免假股票名稱/假價格污染決策。
  const v6Analyses = useMemo(() => {
    if (!window.V6) return [];
    const pool = dataMode === "live"
      ? data.stocks.filter(s => s.real === true && s.liveSource === "LIVE")
      : data.stocks.filter(s => s.real === true);
    return window.V6.computeV6(pool);
  }, [data.stocks, liveVersion, dataMode]);

  const now = useClock();
  useLivePrices(data, tw.animateNumbers !== false && dataMode === "demo");

  // F3 lock: trade lock before 09:15
  const tradeLocked = tw.tradeLockBefore915 && (now.getHours() === 9 && now.getMinutes() < 15);
  // For demo: simulate locked state via toggle from tweaks
  const fakeLocked = tw.tradeLockBefore915 === "demo-lock";

  const stock = data.stocks.find(s => s.code === selected) || data.stocks[0];
  const isTrap = stock && stock.price < stock.open - 0.01; // 跌破開盤 → 廢股 overlay
  // But we want F3 fail stocks (which already includes that flag), so:
  const showTrap = stock && !stock.f3;

  function handleSelect(code) {
    setSelected(code);
    // auto-jump to detail view when clicking from dashboard, but keep tab if already detail-ish
    if (tab === "dashboard" || tab === "sniper" || tab === "watch") setTab("detail");
  }

  function handleSubmit(o) {
    setTradeLog([{ ...o, t: now.toLocaleTimeString("zh-TW"), id: Date.now() }, ...tradeLog].slice(0, 30));
    alert(`✓ 模擬下單：${o.side === "buy" ? "買進" : "賣出"} ${o.code} × ${o.qty} 張 @ ${o.px.toFixed(2)}`);
  }

  const watchCodes = watch.map(s => s.code);
  function getScoped() {
    if (scope === "twse") return data.stocks.filter(s => s.market === "TWSE");
    if (scope === "tpex") return data.stocks.filter(s => s.market === "TPEx");
    if (scope === "watch") return data.stocks.filter(s => watchCodes.includes(s.code));
    return data.stocks;
  }

  let content = null;
  if (tab === "warroom") {
    content = <WarRoom analyses={v6Analyses} onSelect={handleSelect} onHealthCheck={setHealthCheckCode}/>;
  } else if (tab === "leaderboard") {
    content = <Leaderboard analyses={v6Analyses} onSelect={handleSelect} onHealthCheck={setHealthCheckCode}/>;
  } else if (tab === "dashboard") {
    content = <Dashboard data={data} layout={tw.layout} onSelect={handleSelect} selected={selected} onHealthCheck={setHealthCheckCode} scope={scope} setScope={setScope} watchCodes={watchCodes} onWaiting={setWaiting}/>;
  } else if (tab === "sniper") {
    const universe = getScoped();
    const sniperStocks = universe.filter(s => s.f1 && s.f2 && s.f3 && s.f4);
    content = (
      <div className="panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div className="sniper-head">
          <div className="crosshair"><span/></div>
          <div>
            <div className="h-title">今日狙擊清單 · 四大濾鏡全通過</div>
            <div className="h-sub">已掃描 {fmtMoney(universe.length)} 檔 ({{all:"全市場",twse:"上市",tpex:"上櫃",watch:"自選"}[scope]}) · 點擊 🛡 健診開啟完整報告</div>
          </div>
          <div className="h-count"><div className="n" style={{ color: sniperStocks.length === 0 ? "var(--signal)" : "var(--f1)" }}>{sniperStocks.length}</div><div className="l">target</div></div>
        </div>
        <div style={{ padding: 10, borderBottom: "1px solid var(--border)" }}>
          <div className="scope-group">
            <button className={cn("scope-btn", scope === "all" && "active")} onClick={() => setScope("all")}>全市場 <span className="n">{data.stocks.length}</span></button>
            <button className={cn("scope-btn", scope === "twse" && "active")} onClick={() => setScope("twse")}>上市 <span className="n">{data.stocks.filter(s=>s.market==="TWSE").length}</span></button>
            <button className={cn("scope-btn", scope === "tpex" && "active")} onClick={() => setScope("tpex")}>上櫃 <span className="n">{data.stocks.filter(s=>s.market==="TPEx").length}</span></button>
            <button className={cn("scope-btn", scope === "watch" && "active")} onClick={() => setScope("watch")}>自選 <span className="n">{watchCodes.length}</span></button>
          </div>
        </div>
        <div className="panel-body flush" style={{ overflow: "auto", flex: 1 }}>
          {sniperStocks.length === 0
            ? <ZeroHit scoped={universe.length} scope={scope} winStreak={data.winStreak}/>
            : <SniperList stocks={sniperStocks} onSelect={handleSelect} selected={selected} draggable={false} onHealthCheck={setHealthCheckCode} onWaiting={setWaiting}/>}
        </div>
      </div>
    );
  } else if (tab === "watch") {
    content = <Watchlist stocks={watch} onSelect={handleSelect} selected={selected}
                         onAddWatch={() => alert("新增自選 — 在搜尋框輸入代號或名稱即可加入")}
                         onRemove={(code) => setWatch(watch.filter(s => s.code !== code))}
                         onHealthCheck={setHealthCheckCode}
                         onWaiting={setWaiting}/>;
  } else if (tab === "detail") {
    content = <StockDetail stock={stock} tf={tf} setTf={setTf}
                           tradeLocked={tradeLocked || fakeLocked}
                           onSubmit={handleSubmit}
                           onTrigFomo={setFomo}
                           chartOpts={chartOpts} setChartOpts={setChartOpts}
                           isTrap={showTrap}/>;
  } else if (tab === "tech") {
    content = <TechScreen stock={stock}/>;
  } else if (tab === "chips") {
    content = <ChipsScreen stock={stock}/>;
  } else if (tab === "portfolio") {
    content = <Portfolio data={data} onSelect={handleSelect}/>;
  } else if (tab === "news") {
    content = <NewsScreen data={data} onSelect={(code) => { if (data.stocks.find(s => s.code === code)) handleSelect(code); }}/>;
  }

  return (
    <div className={cn("app", collapsed && "collapsed", "density-" + tw.density, "layout-" + tw.layout)}>
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <div>RANSTOCK</div>
          </div>
          <div className="brand-sub">狙擊手紀律系統 · 台股 TWSE</div>
        </div>
        <GlobalSearch data={data} onSelect={handleSelect} onHealthCheck={setHealthCheckCode}/>
        <span className="spacer" style={{ flex: 1 }}/>
        <div className="market-state">
          <span className="dot"></span>
          LIVE · 個股即時更新
        </div>
        <DataSourceBadge onClick={() => setShowDataSrc(true)} mode={dataMode} status={liveStatus} error={liveError}/>
        <div className="dp-mode-bar" title="資料源模式">
          <button className={cn(dataMode === "demo" && "active demo")} onClick={() => setDataMode("demo")}>🎮 Demo</button>
          <button className={cn(dataMode === "live" && "active live")} onClick={() => setDataMode("live")}>📡 Free API</button>
          <button className={cn(dataMode === "after" && "active after")} onClick={() => setDataMode("after")}>🌙 盤後</button>
        </div>
        <div className="clock">
          <span className="time mono">{now.toLocaleTimeString("zh-TW", { hour12: false })}</span>
          <span>{now.toLocaleDateString("zh-TW")} · LIVE / DEMO 分離</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" title="個股健診" onClick={() => setHealthCheckCode(selected)} style={{ background: "var(--f1-bg)", color: "var(--f1)", border: "1px solid rgba(255,176,32,0.3)", width: "auto", padding: "0 10px", gap: 6, display: "inline-flex", alignItems: "center", fontSize: 12 }}>
            <Icon name="shield" size={14}/> 健診
          </button>
          <button className="icon-btn" title="提醒" onClick={() => setFomo({ stock, failed: ["乖離過大 (示範)", "尚未箱型突破 (示範)"] })}>
            <Icon name="warning" size={15} color="var(--f3)"/>
          </button>
          <button className="icon-btn" title="通知"><Icon name="bell" size={15}/></button>
          <button className="icon-btn" title="手機伴隨視窗" onClick={() => setTweak("showMobileCompanion", !tw.showMobileCompanion)}>
            <Icon name="phone" size={15} color={tw.showMobileCompanion ? "var(--f1)" : "currentColor"}/>
          </button>
          <button className="icon-btn" title="設定"><Icon name="settings" size={15}/></button>
        </div>
      </header>

      {/* Ticker tape */}
      {tw.showTickerTape && <TickerTape data={data} dataMode={dataMode}/>}
      {!tw.showTickerTape && <div className="ticker" style={{ display: "none" }}></div>}

      {/* Sidebar + Main */}
      <Sidebar tab={tab} setTab={setTab} collapsed={collapsed} setCollapsed={setCollapsed} data={data} onHealthCheck={() => setHealthCheckCode(selected)}/>
      <main className="main">
        {dataMode === "live" && liveError && (
          <div style={{
            background: "linear-gradient(90deg, rgba(255,82,82,0.18), rgba(255,82,82,0.06))",
            border: "1px solid var(--f3)", borderLeft: "4px solid var(--f3)",
            color: "var(--f3)", padding: "12px 16px", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 14, fontSize: 13, borderRadius: 4
          }}>
            <Icon name="warning" size={18}/>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14 }}>免費資料源暫時無法取得</strong>
              <div className="xs" style={{ color: "var(--text-dim)", marginTop: 2 }}>
                {liveError} · 代理：<span className="mono">{window.QuoteSource.PROXY_URL}</span>
              </div>
            </div>
            <button onClick={retryLive} style={{ padding: "6px 14px", background: "var(--f3)", color: "#0a0e14", border: 0, borderRadius: 3, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>重試</button>
            <button onClick={() => setDataMode("demo")} style={{ padding: "6px 14px", background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border-strong)", borderRadius: 3, cursor: "pointer", fontSize: 12 }}>切回 Demo</button>
          </div>
        )}
        {content}
      </main>

      {/* Status bar */}
      <StatusBar data={data} now={now}/>

      {/* FOMO modal */}
      {fomo && <FomoModal data={fomo}
                          onClose={() => setFomo(null)}
                          onIgnore={() => { setFomo(null); alert("✗ 違反紀律 — 已自動寫入紀律日誌作為教材"); }}/>}

      {/* Health check modal */}
      {healthCheckCode && (
        <HealthCheckModal
          stock={data.stocks.find(s => s.code === healthCheckCode)}
          onClose={() => setHealthCheckCode(null)}
          onTrigFomo={(d) => setFomo(d)}
          winStreak={data.winStreak}
        />
      )}

      {/* 待上車 modal */}
      {waiting && <WaitingModal stock={waiting} onClose={() => setWaiting(null)}/>}

      {/* 資料源切換說明 */}
      {showDataSrc && <DataSourceModal onClose={() => setShowDataSrc(false)}/>}

      {/* Mobile companion */}
      {tw.showMobileCompanion && <MobileCompanion data={data} selectedCode={selected} onClose={() => setTweak("showMobileCompanion", false)}/>}

      {/* Tweaks panel */}
      <TweaksPanel title="版面 Tweaks">
        <TweakSection label="版面變體">
          <TweakRadio label="主控台" value={tw.layout}
                      options={[{ value: "wall", label: "資料牆" }, { value: "sniper", label: "狙擊版" }]}
                      onChange={(v) => setTweak("layout", v)}/>
          <TweakRadio label="密度" value={tw.density}
                      options={[{ value: "comfortable", label: "舒適" }, { value: "compact", label: "密集" }]}
                      onChange={(v) => setTweak("density", v)}/>
        </TweakSection>
        <TweakSection label="即時行為">
          <TweakToggle label="跑馬燈 Ticker" value={tw.showTickerTape} onChange={(v) => setTweak("showTickerTape", v)}/>
          <TweakToggle label="即時跳動數字" value={tw.animateNumbers} onChange={(v) => setTweak("animateNumbers", v)}/>
          <TweakToggle label="手機伴隨視窗" value={tw.showMobileCompanion} onChange={(v) => setTweak("showMobileCompanion", v)}/>
          <TweakToggle label="模擬 09:15 鎖單" value={tw.tradeLockBefore915} onChange={(v) => setTweak("tradeLockBefore915", v)}/>
        </TweakSection>
        <TweakSection label="主題色">
          <TweakColor label="強調色" value={tw.accent}
                      options={["#ffb020", "#5ad7ff", "#c6ff5a", "#ff5a82"]}
                      onChange={(v) => setTweak("accent", v)}/>
        </TweakSection>
        <div className="tweak-info">
          <strong style={{ color: "var(--f1)" }}>三大濾鏡</strong> 已內建 ─ F1 抗跌、F2 箱型放量、F3 反陷阱。<br/>點頂部「⚠」按鈕可手動觸發 FOMO 心理保護彈窗。
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
