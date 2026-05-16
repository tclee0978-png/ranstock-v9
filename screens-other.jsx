// =============== Other screens: Watchlist / Portfolio / News / Tech / Chips / Discipline ===============

function Watchlist({ stocks, onSelect, selected, onAddWatch, onRemove, onHealthCheck, onWaiting }) {
  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-head">
        <span className="accent"/>
        <span className="title">自選股清單 · 拖曳排序</span>
        <span className="meta">{stocks.length} 檔 · 拖動列重排</span>
        <span className="spacer" style={{ flex: 1 }}/>
        <button className="toggle-btn on" style={{ display: "inline-flex", alignItems: "center", gap: 4 }} onClick={onAddWatch}><Icon name="plus" size={11}/> 加入自選</button>
        <button className="toggle-btn on" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--f1)", borderColor: "rgba(255,176,32,0.4)", background: "var(--f1-bg)" }}>
          <Icon name="scope" size={11}/> 執行我的策略掃描
        </button>
      </div>
      <div className="panel-body flush" style={{ overflow: "auto" }}>
        <SniperList stocks={stocks} onSelect={onSelect} selected={selected} draggable={true} onRemove={onRemove} onHealthCheck={onHealthCheck} onWaiting={onWaiting}/>
      </div>
    </div>
  );
}

function Portfolio({ data, onSelect }) {
  const positions = data.portfolio.map(p => {
    const stock = data.stocks.find(s => s.code === p.code) || {};
    const mkt = stock.price || p.mkt;
    const cost = p.cost;
    const pnl = (mkt - cost) * p.qty * 1000;
    const pnlPct = ((mkt - cost) / cost) * 100;
    return { ...p, mkt, pnl, pnlPct, stock };
  });
  const totalCost = positions.reduce((a, p) => a + p.cost * p.qty * 1000, 0);
  const totalMkt = positions.reduce((a, p) => a + p.mkt * p.qty * 1000, 0);
  const totalPnl = totalMkt - totalCost;
  const totalPct = (totalPnl / totalCost) * 100;
  const today = positions.reduce((a, p) => a + (p.stock.price - p.stock.prev) * p.qty * 1000, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div className="portfolio-summary">
        <div className="psum-card">
          <div className="k">總市值</div>
          <div className="v">{fmtMoney(totalMkt)}</div>
          <div className="s text-dim">TWD</div>
        </div>
        <div className="psum-card">
          <div className="k">總損益</div>
          <div className={cn("v", upDown(totalPnl))}>{fmtSigned(totalPnl, 0)}</div>
          <div className={cn("s", upDown(totalPct))}>{fmtPct(totalPct)}</div>
        </div>
        <div className="psum-card">
          <div className="k">今日浮動損益</div>
          <div className={cn("v", upDown(today))}>{fmtSigned(today, 0)}</div>
          <div className="s text-dim">未實現</div>
        </div>
        <div className="psum-card">
          <div className="k">紀律連勝</div>
          <div className="v" style={{ color: "var(--signal)" }}>26<span className="text-mute" style={{fontSize: 12}}> 日</span></div>
          <div className="s text-dim">符合 SOP 操作</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-head"><span className="accent"/><span className="title">持股庫存</span><span className="meta">{positions.length} 檔</span></div>
          <div className="panel-body flush" style={{ overflow: "auto" }}>
            <table className="tbl">
              <thead><tr><th>代號</th><th>名稱</th><th style={{textAlign:"right"}}>張數</th><th style={{textAlign:"right"}}>成本</th><th style={{textAlign:"right"}}>現價</th><th style={{textAlign:"right"}}>未實現</th><th style={{textAlign:"right"}}>%</th><th>濾鏡</th></tr></thead>
              <tbody>
                {positions.map(p => (
                  <tr key={p.code} onClick={() => onSelect(p.code)}>
                    <td className="code">{p.code}</td>
                    <td className="name">{p.name}</td>
                    <td className="num text-dim">{p.qty}</td>
                    <td className="num text-dim">{p.cost.toFixed(2)}</td>
                    <td className={cn("num", upDown(p.mkt - p.cost))}>{p.mkt.toFixed(2)}</td>
                    <td className={cn("num", upDown(p.pnl))}>{fmtSigned(p.pnl, 0)}</td>
                    <td className={cn("num", upDown(p.pnlPct))}>{fmtPct(p.pnlPct)}</td>
                    <td><FilterFlags f1={p.stock.f1} f2={p.stock.f2} f3={p.stock.f3}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><span className="accent" style={{ background: "var(--signal)" }}/><span className="title">紀律日誌 · 空手訓練</span><span className="meta">最近 7 日</span></div>
          <div className="panel-body flush" style={{ overflow: "auto" }}>
            <div className="discipline-log">
              {data.discipline.map((d, i) => (
                <div className="entry" key={i}>
                  <div>
                    <div className="date">{d.d}</div>
                    <div className="xs mono text-mute">{d.code}</div>
                  </div>
                  <div>
                    <div className="reason">{d.text}</div>
                  </div>
                  <div className={cn("verdict", d.verdict)} style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
                    {d.verdict === "win" ? "WIN" : d.verdict === "skip" ? "HOLD" : "LOSS"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsScreen({ data, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, height: "100%" }}>
      <div className="panel">
        <div className="panel-head"><span className="accent" style={{ background: "var(--f2)" }}/><span className="title">即時新聞 / 公告</span><span className="meta">{data.news.length} 則</span></div>
        <div className="panel-body flush" style={{ overflow: "auto" }}>
          {data.news.map((n, i) => (
            <div key={i} className="news-item">
              <div className="news-meta">
                <span className="src">{n.src}</span>
                <span className="t">{n.t}</span>
              </div>
              <div>
                <div className="news-title">{n.title}</div>
                <div className="news-tags">
                  {n.tags.map(t => <span key={t} className="tag mono" onClick={() => onSelect && onSelect(t)}>{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><span className="accent" style={{ background: "var(--signal)" }}/><span className="title">今日空手腳本 · 收盤產出</span><span className="meta">12/05 17:30</span></div>
        <div className="panel-body" style={{ fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ color: "var(--text-mute)", fontSize: 10, letterSpacing: 2 }}>SHORT VIDEO SCRIPT · 60s</div>
          <div style={{ marginTop: 8, color: "var(--text-dim)" }}>
            <p style={{ marginBottom: 8 }}><span style={{ color: "var(--f1)", fontWeight: 600 }}>標題：</span>「為什麼今天我空手？因為這 3 條紀律。」</p>
            <p style={{ marginBottom: 8 }}><span style={{ color: "var(--f1)", fontWeight: 600 }}>開場 5s：</span>畫面切到我的看盤桌 → 旁白：「OTC 跌 1.13%，全市場流血。」</p>
            <p style={{ marginBottom: 8 }}><span style={{ color: "var(--f1)", fontWeight: 600 }}>主體 40s：</span>切換到 Ranstock 介面，依序帶到三個濾鏡卡。今天只有 4 檔通過 F1 + F2 + F3，但乖離都 &gt; 3%，所以我選擇空手。</p>
            <p style={{ marginBottom: 8 }}><span style={{ color: "var(--f1)", fontWeight: 600 }}>結尾 15s：</span>「39 歲，宜蘭爸爸，過去因為追高陷阱讓家裡虧了一台車。今天能空手就是翻身。第 26 天紀律完成。」</p>
            <div style={{ marginTop: 10, padding: 8, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 3 }}>
              <div className="xs text-mute" style={{ letterSpacing: 1 }}>EXPORT TARGETS</div>
              <div className="row gap-8" style={{ marginTop: 4 }}>
                <span className="tag">Reels</span>
                <span className="tag">TikTok</span>
                <span className="tag">YT Shorts</span>
                <span className="tag">Threads</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TechScreen({ stock }) {
  const indicators = [
    { name: "RSI(14)",      v: 62.4, dir: "up",   note: "未進入超買 (>70)" },
    { name: "KD(9,3,3) K",  v: 78.2, dir: "up",   note: "高檔黃金交叉" },
    { name: "KD(9,3,3) D",  v: 70.1, dir: "up",   note: "" },
    { name: "MACD DIF",     v: 1.84, dir: "up",   note: "0 軸上方續攻" },
    { name: "MACD MACD",    v: 1.42, dir: "up",   note: "" },
    { name: "MACD OSC",     v: 0.42, dir: "up",   note: "紅柱遞增" },
    { name: "BB Upper",     v: stock.price * 1.07, dir: "flat", note: "" },
    { name: "BB Lower",     v: stock.price * 0.92, dir: "flat", note: "" },
    { name: "ATR(14)",      v: 2.18, dir: "flat", note: "波動正常" },
    { name: "OBV 量能",     v: 4218, dir: "up",   note: "OBV 創 20D 新高" },
    { name: "Williams %R",  v: -18.6, dir: "up",  note: "短線強勢" },
    { name: "CCI(20)",      v: 142, dir: "up",    note: "+100 強勢區" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, height: "100%" }}>
      <div className="panel">
        <div className="panel-head"><span className="accent"/><span className="title">{stock.name} · 技術指標</span><span className="meta">{stock.code}</span></div>
        <div className="panel-body flush" style={{ overflow: "auto" }}>
          <table className="tbl">
            <thead><tr><th>指標</th><th style={{ textAlign: "right" }}>數值</th><th>判讀</th></tr></thead>
            <tbody>
              {indicators.map((ind, i) => (
                <tr key={i}>
                  <td>{ind.name}</td>
                  <td className={cn("num", ind.dir)}>{typeof ind.v === "number" ? ind.v.toFixed(2) : ind.v}</td>
                  <td className="xs text-dim">{ind.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><span className="accent" style={{ background: "var(--f1)" }}/><span className="title">三濾鏡計算過程</span></div>
        <div className="panel-body" style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px dashed var(--border)" }}>
            <div style={{ color: "var(--f1)", fontWeight: 600, marginBottom: 6 }}>F1 · 絕對抗跌過濾</div>
            <table style={{ width: "100%", fontSize: 11 }}>
              <tbody>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>OTC 漲跌</td><td className="num down" style={{ textAlign: "right" }}>−1.13%</td></tr>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>本檔漲跌</td><td className={cn("num", upDown(((stock.price - stock.prev) / stock.prev) * 100))} style={{ textAlign: "right" }}>{fmtPct(((stock.price - stock.prev) / stock.prev) * 100)}</td></tr>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>vs 5MA</td><td className="num up" style={{ textAlign: "right" }}>{fmtSigned(stock.ma5Bias, 1)}%</td></tr>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>相對強度 RS</td><td className="num up" style={{ textAlign: "right" }}>{stock.otcRS.toFixed(2)}</td></tr>
                <tr><td colSpan="2" style={{ paddingTop: 6 }}><span className={cn("tag", stock.f1 && "f1")}>{stock.f1 ? "F1 PASS · 逆勢護盤股" : "F1 FAIL"}</span></td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px dashed var(--border)" }}>
            <div style={{ color: "var(--f2)", fontWeight: 600, marginBottom: 6 }}>F2 · 箱型放量突破</div>
            <table style={{ width: "100%", fontSize: 11 }}>
              <tbody>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>20 日箱型高 / 低</td><td className="num" style={{ textAlign: "right" }}>{stock.boxHi.toFixed(2)} / {stock.boxLo.toFixed(2)}</td></tr>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>突破狀態</td><td className={cn("num", stock.price > stock.boxHi ? "up" : "")} style={{ textAlign: "right" }}>{stock.price > stock.boxHi ? "已突破" : "未突破"}</td></tr>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>20 分量 vs 日均</td><td className={cn("num", stock.vol20Pct >= 30 ? "up" : "")} style={{ textAlign: "right" }}>{fmtSigned(stock.vol20Pct, 0)}%</td></tr>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>與 5MA 乖離</td><td className={cn("num", Math.abs(stock.ma5Bias) > 3 ? "f3" : "")} style={Math.abs(stock.ma5Bias) > 3 ? { textAlign: "right", color: "var(--f3)" } : { textAlign: "right" }}>{fmtSigned(stock.ma5Bias, 1)}%</td></tr>
                <tr><td colSpan="2" style={{ paddingTop: 6 }}><span className={cn("tag", stock.f2 && "f2")}>{stock.f2 ? "F2 PASS · 強烈突破訊號" : "F2 FAIL · 未達門檻"}</span></td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ color: "var(--f3)", fontWeight: 600, marginBottom: 6 }}>F3 · 反陷阱 / 開盤防線</div>
            <table style={{ width: "100%", fontSize: 11 }}>
              <tbody>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>開盤價</td><td className="num" style={{ textAlign: "right" }}>{stock.open.toFixed(2)}</td></tr>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>目前價</td><td className={cn("num", stock.price > stock.open ? "up" : "down")} style={{ textAlign: "right" }}>{stock.price.toFixed(2)}</td></tr>
                <tr><td className="text-mute" style={{ padding: "2px 0" }}>09:15 鎖單時段</td><td className="num text-mute" style={{ textAlign: "right" }}>已解鎖</td></tr>
                <tr><td colSpan="2" style={{ paddingTop: 6 }}><span className={cn("tag", stock.f3 && "f3")}>{stock.f3 ? "F3 PASS · 仍可進場" : "F3 FAIL · 跌破開盤 → 廢股"}</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChipsScreen({ stock }) {
  const rows = [
    { name: "外資", buy: 4820, sell: 2310, net: 2510, color: "var(--up)" },
    { name: "投信", buy: 1240, sell: 850,  net: 390,  color: "var(--up)" },
    { name: "自營商", buy: 320, sell: 410, net: -90,  color: "var(--down)" },
    { name: "三大法人合計", buy: 6380, sell: 3570, net: 2810, color: "var(--up)", bold: true },
  ];
  const brokers = [
    { name: "外資 A 券",  buy: 2120, sell: 410,  net: 1710 },
    { name: "外資 B 券",  buy: 1280, sell: 612,  net: 668 },
    { name: "本土 X 券",  buy: 480,  sell: 1340, net: -860 },
    { name: "外資 C 券",  buy: 890,  sell: 230,  net: 660 },
    { name: "本土 Y 券",  buy: 230,  sell: 680,  net: -450 },
    { name: "外資 D 券",  buy: 540,  sell: 180,  net: 360 },
  ];
  const maxNet = Math.max(...brokers.map(b => Math.abs(b.net)));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, height: "100%" }}>
      <div className="panel">
        <div className="panel-head"><span className="accent"/><span className="title">{stock.name} · 三大法人</span><span className="meta">當日</span></div>
        <div className="panel-body flush"><table className="chip-table">
          <thead><tr><th></th><th className="n">買進</th><th className="n">賣出</th><th className="n">買賣超</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={r.bold ? { background: "var(--bg-2)", fontWeight: 600 } : {}}>
                <td>{r.name}</td>
                <td className="n">{fmtMoney(r.buy)}</td>
                <td className="n">{fmtMoney(r.sell)}</td>
                <td className="n" style={{ color: r.color }}>{fmtSigned(r.net, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      <div className="panel">
        <div className="panel-head"><span className="accent" style={{ background: "var(--f2)" }}/><span className="title">主力券商進出</span></div>
        <div className="panel-body flush"><table className="chip-table">
          <tbody>
            {brokers.map((b, i) => (
              <tr key={i}>
                <td>{b.name}</td>
                <td className="n">{fmtMoney(b.buy)}</td>
                <td className="bar-cell">
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${Math.abs(b.net) / maxNet * 100}%`, background: b.net > 0 ? "var(--up)" : "var(--down)" }}></div>
                  </div>
                  <span className="n" style={{ minWidth: 50, color: b.net > 0 ? "var(--up)" : "var(--down)" }}>{fmtSigned(b.net, 0)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      <div className="panel">
        <div className="panel-head"><span className="accent" style={{ background: "var(--f1)" }}/><span className="title">融資融券 / 借券</span></div>
        <div className="panel-body" style={{ fontSize: 12 }}>
          <table style={{ width: "100%", fontSize: 11 }}>
            <tbody>
              <tr><td className="text-mute">融資餘額</td><td className="num" style={{ textAlign: "right" }}>{fmtMoney(8420)}</td><td className="num up" style={{ textAlign: "right" }}>{fmtSigned(+312, 0)}</td></tr>
              <tr><td className="text-mute">融資使用率</td><td className="num" style={{ textAlign: "right" }}>21.4%</td><td className="num up" style={{ textAlign: "right" }}>+0.8%</td></tr>
              <tr><td className="text-mute">融券餘額</td><td className="num" style={{ textAlign: "right" }}>{fmtMoney(620)}</td><td className="num down" style={{ textAlign: "right" }}>{fmtSigned(-48, 0)}</td></tr>
              <tr><td className="text-mute">券資比</td><td className="num" style={{ textAlign: "right" }}>7.4%</td><td className="num down" style={{ textAlign: "right" }}>−0.6%</td></tr>
              <tr><td className="text-mute">借券賣出餘額</td><td className="num" style={{ textAlign: "right" }}>{fmtMoney(1240)}</td><td className="num up" style={{ textAlign: "right" }}>+62</td></tr>
              <tr><td className="text-mute">當沖比</td><td className="num" style={{ textAlign: "right" }}>32.1%</td><td className="num" style={{ textAlign: "right" }}>—</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div className="xs text-mute" style={{ letterSpacing: 2, marginBottom: 4 }}>盤後籌碼解讀</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-dim)" }}>
              外資連 3 日買超 {fmtMoney(2510)} 張，主力券商集中度 +4.2%；融資雖增但券資比下降，籌碼面偏正向。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Watchlist, Portfolio, NewsScreen, TechScreen, ChipsScreen });
