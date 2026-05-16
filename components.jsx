// =============== Shared small components & helpers ===============
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---- formatting helpers
const fmtPx = (v, d = 2) => Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (v) => (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
const fmtSigned = (v, d = 2) => (v >= 0 ? "+" : "") + Number(v).toFixed(d);
const fmtVol = (v) => {
  if (v >= 10000) return (v / 10000).toFixed(1) + "萬";
  return v.toLocaleString();
};
const fmtMoney = (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const cn = (...xs) => xs.filter(Boolean).join(" ");
const upDown = (v) => (v > 0 ? "up" : v < 0 ? "down" : "flat");
const arrow = (v) => (v > 0 ? "▲" : v < 0 ? "▼" : "—");

// ---- Sparkline SVG
function Sparkline({ data, width = 80, height = 22, color, strokeWidth = 1.5 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * (height - 2) - 1).toFixed(1)}`).join(" ");
  const isUp = data[data.length - 1] >= data[0];
  const c = color || (isUp ? "var(--up)" : "var(--down)");
  return (
    <svg className="spark" width={width} height={height}>
      <polyline fill="none" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" points={pts} />
    </svg>
  );
}

// ---- Filter flag badges (4 checkmarks)
function FilterFlags({ f1, f2, f3, f4, size = 16 }) {
  return (
    <span className="filter-flags" title={`抗跌 ${f1?"✓":"✗"} / 箱型 ${f2?"✓":"✗"} / 防線 ${f3?"✓":"✗"}${f4 !== undefined ? " / 訊號 " + (f4?"✓":"✗") : ""}`}>
      <span className={cn("filter-flag", f1 && "pass f1")}>{f1 ? "✓" : "·"}</span>
      <span className={cn("filter-flag", f2 && "pass f2")}>{f2 ? "✓" : "·"}</span>
      <span className={cn("filter-flag", f3 && "pass f3")}>{f3 ? "✓" : "·"}</span>
      {f4 !== undefined && <span className={cn("filter-flag", f4 && "pass")} style={f4 ? { background: "var(--signal)", borderColor: "var(--signal)" } : {}}>{f4 ? "✓" : "·"}</span>}
    </span>
  );
}

// ---- Animated number that flashes when it changes
function FlashNumber({ value, format = (v) => fmtPx(v), animate = true, className }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!animate) return;
    if (prev.current !== value) {
      const dir = value > prev.current ? "flash-up" : "flash-down";
      setFlash(dir);
      const t = setTimeout(() => setFlash(""), 600);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value, animate]);
  return <span className={cn("mono", flash, className)} style={{ borderRadius: 2, padding: "0 2px" }}>{format(value)}</span>;
}

// ---- Tiny icon shim — minimal monoline icons (SVG)
function Icon({ name, size = 14, color = "currentColor" }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "dashboard": return <svg {...props}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
    case "target":    return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>;
    case "list":      return <svg {...props}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>;
    case "chart":     return <svg {...props}><polyline points="3 18 9 12 13 16 21 6"/><polyline points="15 6 21 6 21 12"/></svg>;
    case "wallet":    return <svg {...props}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1"/></svg>;
    case "news":      return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="13" y2="17"/></svg>;
    case "chips":     return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/></svg>;
    case "tech":      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "order":     return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "search":    return <svg {...props}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>;
    case "bell":      return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "settings":  return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2.1 1.2l-2.4-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-.9c.6.5 1.4.9 2.1 1.2L10 21h4l.4-2.6c.7-.3 1.5-.7 2.1-1.2l2.4.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>;
    case "menu":      return <svg {...props}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
    case "drag":      return <svg {...props}><circle cx="9" cy="6" r="0.8"/><circle cx="9" cy="12" r="0.8"/><circle cx="9" cy="18" r="0.8"/><circle cx="15" cy="6" r="0.8"/><circle cx="15" cy="12" r="0.8"/><circle cx="15" cy="18" r="0.8"/></svg>;
    case "plus":      return <svg {...props}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "trash":     return <svg {...props}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
    case "star":      return <svg {...props}><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg>;
    case "scope":     return <svg {...props}><circle cx="12" cy="12" r="9"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>;
    case "shield":    return <svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>;
    case "lock":      return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case "discipline": return <svg {...props}><path d="M12 2v8M5 6l7 4 7-4"/><path d="M5 14l7 4 7-4"/><path d="M5 18l7 4 7-4"/></svg>;
    case "clock":     return <svg {...props}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>;
    case "x":         return <svg {...props}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>;
    case "expand":    return <svg {...props}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
    case "info":      return <svg {...props}><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="12" y1="7" x2="12" y2="8"/></svg>;
    case "warning":   return <svg {...props}><path d="M12 2L2 21h20L12 2z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.5"/></svg>;
    case "phone":     return <svg {...props}><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>;
    default: return null;
  }
}

Object.assign(window, { fmtPx, fmtPct, fmtSigned, fmtVol, fmtMoney, cn, upDown, arrow, Sparkline, FilterFlags, FlashNumber, Icon });
