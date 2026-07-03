import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import {
  ShieldCheck, Upload, FileText, CheckCircle2, AlertTriangle, XCircle,
  ChevronUp, ChevronDown, Fingerprint, CreditCard, Globe, Car, Vote,
  HelpCircle, LayoutDashboard, Files, TrendingUp, Settings, Bell, User,
  Lock, FileSearch, Search, Filter, Download, ZoomIn, ZoomOut, Maximize2, X,
  FolderOpen, Image as ImageIcon,
} from "lucide-react";

/* ── types ── */
type Prediction = "aadhaar" | "pan" | "passport" | "driving_license" | "voterId" | "unknown";
interface ClassifiedResult { filename: string; prediction: Prediction; confidence: number; ocr_verified: boolean; }
type SortKey = "filename" | "prediction" | "confidence";
type SortDir = "asc" | "desc";

/* ── constants ── */
const DOC_META: Record<Prediction, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  aadhaar:         { label: "Aadhaar",          color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd", icon: <Fingerprint size={11} /> },
  pan:             { label: "PAN Card",          color: "#15803d", bg: "#dcfce7", border: "#bbf7d0", icon: <CreditCard  size={11} /> },
  passport:        { label: "Passport",          color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe", icon: <Globe       size={11} /> },
  driving_license: { label: "Driving License",   color: "#b45309", bg: "#fef3c7", border: "#fde68a", icon: <Car         size={11} /> },
  voterId:         { label: "Voter ID",           color: "#b91c1c", bg: "#fee2e2", border: "#fecaca", icon: <Vote        size={11} /> },
  unknown:         { label: "Unknown",            color: "#475569", bg: "#f1f5f9", border: "#e2e8f0", icon: <HelpCircle  size={11} /> },
};

const STAT_DEFS = [
  { key: "total"           as const, label: "Total",            emoji: "📄", accent: "#2563eb", accentBg: "#eff6ff", accentBorder: "#bfdbfe" },
  { key: "aadhaar"         as const, label: "Aadhaar",          emoji: "🪪", accent: "#0284c7", accentBg: "#e0f2fe", accentBorder: "#bae6fd" },
  { key: "pan"             as const, label: "PAN Card",          emoji: "💳", accent: "#15803d", accentBg: "#dcfce7", accentBorder: "#bbf7d0" },
  { key: "passport"        as const, label: "Passport",          emoji: "📘", accent: "#7c3aed", accentBg: "#ede9fe", accentBorder: "#ddd6fe" },
  { key: "driving_license" as const, label: "Driving License",   emoji: "🚗", accent: "#b45309", accentBg: "#fef3c7", accentBorder: "#fde68a" },
  { key: "voterId"         as const, label: "Voter ID",           emoji: "🗳️", accent: "#b91c1c", accentBg: "#fee2e2", accentBorder: "#fecaca" },
];

const PRED_FILTERS = [
  { value: "all",             label: "All Types" },
  { value: "aadhaar",         label: "Aadhaar" },
  { value: "pan",             label: "PAN Card" },
  { value: "passport",        label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voterId",         label: "Voter ID" },
  { value: "unknown",         label: "Unknown" },
];

/* ── helpers ── */
function getStatus(conf: number, ocr: boolean) {

  if (conf >= 95 && ocr)
    return {
      label: "Verified",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0"
    };

  if (conf >= 80)
    return {
      label: "Review",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a"
    };

  return {
    label: "Low Score",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca"
  };
}

function exportCSV(rows: ClassifiedResult[]) {
  const header = "Filename,Document Type,Confidence,OCR Verified,Status";
  const lines = rows.map(r => `"${r.filename}","${DOC_META[r.prediction].label}",${r.confidence}%,"${r.ocr_verified ? "✅" : "❌"}","${getStatus(r.confidence, r.ocr_verified).label}"`);
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "kyc_results.csv";
  a.click();
}

/* ── Thumbnail cache hook ── */
function useThumbnails(files: File[], results: ClassifiedResult[]) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    const revoke: string[] = [];
    files.forEach(f => {
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        map[f.name] = url;
        revoke.push(url);
      }
    });
    setThumbs(map);
    return () => revoke.forEach(URL.revokeObjectURL);
  }, [files, results]);
  return thumbs;
}

/* ── component ── */
export default function App() {
  const [files,       setFiles]       = useState<File[]>([]);
  const [results,     setResults]     = useState<ClassifiedResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [message,     setMessage]     = useState("");
  const [msgType,     setMsgType]     = useState<"success" | "error" | "">("");
  const [dragOver,    setDragOver]    = useState(false);
  const [showReview,  setShowReview]  = useState(false);
  const [sortKey,     setSortKey]     = useState<SortKey>("filename");
  const [sortDir,     setSortDir]     = useState<SortDir>("asc");
  const [search,      setSearch]      = useState("");
  const [filterType,  setFilterType]  = useState("all");

  /* image inspection modal */
  const [inspectResult, setInspectResult] = useState<ClassifiedResult | null>(null);
  const [inspectUrl,    setInspectUrl]    = useState<string | null>(null);
  const [zoom,          setZoom]          = useState(1);
  const [isFullscreen,  setIsFullscreen]  = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const thumbs = useThumbnails(files, results);

  const folderName = files.length
    ? (files[0] as any).webkitRelativePath?.split("/")?.[0] || "Selected Files"
    : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setFiles(selected); setResults([]); setMessage(""); setMsgType("");
    setInspectResult(null); setInspectUrl(null); setShowReview(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) { setFiles(dropped); setResults([]); setMessage(""); setShowReview(true); }
  };

  const classify = async () => {
    setShowReview(false); setLoading(true); setMessage("");
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      const res = await axios.post<ClassifiedResult[]>("http://127.0.0.1:8000/classify", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(res.data);
      setMessage(`Successfully classified ${res.data.length} file${res.data.length !== 1 ? "s" : ""}`);
      setMsgType("success");
    } catch {
      setMessage("Classification failed. Ensure the backend is running.");
      setMsgType("error");
    } finally { setLoading(false); }
  };

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const openInspect = useCallback((row: ClassifiedResult) => {
    setInspectResult(row);
    setInspectUrl(thumbs[row.filename] ?? null);
    setZoom(1);
  }, [thumbs]);

  const closeInspect = () => { setInspectResult(null); setInspectUrl(null); setIsFullscreen(false); setZoom(1); };

  const downloadInspected = () => {
    if (!inspectUrl) return;
    const a = document.createElement("a");
    a.href = inspectUrl; a.download = inspectResult?.filename ?? "document";
    a.click();
  };

  /* counts */
  const counts = { total: results.length, aadhaar: 0, pan: 0, passport: 0, driving_license: 0, voterId: 0, unknown: 0 };
  results.forEach(r => { if ((counts as any)[r.prediction] !== undefined) (counts as any)[r.prediction]++; });

  /* filtered + sorted */
  const visible = results
    .filter(r => {
      const ms = r.filename.toLowerCase().includes(search.toLowerCase()) ||
                 DOC_META[r.prediction].label.toLowerCase().includes(search.toLowerCase());
      const mf = filterType === "all" || r.prediction === filterType;
      return ms && mf;
    })
    .sort((a, b) => {
      let c = 0;
      if (sortKey === "filename")   c = a.filename.localeCompare(b.filename);
      if (sortKey === "prediction") c = a.prediction.localeCompare(b.prediction);
      if (sortKey === "confidence") c = a.confidence - b.confidence;
      return sortDir === "asc" ? c : -c;
    });

  /* ── render ── */
  return (
    <div style={{ height: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', Inter, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* NAV */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
            <ShieldCheck size={15} color="#fff" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", letterSpacing: "-0.2px" }}>
            KYC<span style={{ color: "#2563eb" }}>Verify</span>
          </span>
        </div>
        <nav style={{ display: "flex", gap: 2 }}>
          {[
            { icon: <LayoutDashboard size={13} />, label: "Dashboard", active: true },
            { icon: <Files size={13} />,           label: "Documents" },
            { icon: <TrendingUp size={13} />,      label: "Analytics" },
            { icon: <Settings size={13} />,        label: "Settings" },
          ].map(({ icon, label, active }) => (
            <button key={label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7, border: "none", background: active ? "#eff6ff" : "transparent", color: active ? "#2563eb" : "#94a3b8", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              {icon}{label}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ width: 30, height: 30, borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Bell size={13} color="#94a3b8" />
          </button>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#2563eb,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <User size={13} color="#fff" />
          </div>
        </div>
      </header>

      {/* PAGE TITLE BAR */}
      <div
  style={{
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "14px 24px",
    flexShrink: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  }}
>
  <div>
    <h1
      style={{
        color: "#1e293b",
        fontSize: 20,
        fontWeight: 800,
        margin: 0,
        letterSpacing: "-0.5px",
      }}
    >
      AI Document Classification System
    </h1>

    <p
      style={{
        color: "#64748b",
        fontSize: 13,
        margin: "4px 0 0",
      }}
    >
      Upload and classify KYC documents using AI
    </p>
  </div>
</div>

      {/* BODY — sidebar + main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{ width: 236, flexShrink: 0, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflowY: "auto", padding: "16px 14px", gap: 14 }}>
          <p style={{ color: "#1e293b", fontSize: 13, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <FolderOpen size={14} color="#2563eb" /> Upload Documents
          </p>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{ border: `2px dashed ${dragOver ? "#2563eb" : "#cbd5e1"}`, borderRadius: 10, padding: "16px 10px", textAlign: "center", cursor: "pointer", background: dragOver ? "#eff6ff" : "#f8fafc", transition: "all 0.15s" }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <Upload size={17} color="#2563eb" />
            </div>
            <p style={{ color: "#1e293b", fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>Drop folder or click</p>
            <p style={{ color: "#94a3b8", fontSize: 11, margin: 0 }}>to browse files</p>
            <input ref={inputRef} type="file"
              // @ts-expect-error non-standard
              webkitdirectory="" directory="" multiple
              onChange={handleChange} style={{ display: "none" }} />
          </div>

          {/* Folder info */}
          {files.length > 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <FolderOpen size={11} color="#2563eb" />
                  <span style={{ color: "#1e293b", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{folderName || "Selected"}</span>
                </div>
                <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "1px 7px", color: "#2563eb", fontSize: 10, fontWeight: 700 }}>{files.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {files.slice(0, 5).map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <FileText size={9} color="#94a3b8" />
                    <span style={{ color: "#64748b", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{f.name}</span>
                  </div>
                ))}
                {files.length > 5 && <span style={{ color: "#94a3b8", fontSize: 10, paddingLeft: 14 }}>+{files.length - 5} more files</span>}
              </div>
            </div>
          )}

          {/* Supported types */}
          <div>
            <p style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>Supported Types</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: "Aadhaar",          color: "#0284c7", bg: "#e0f2fe" },
                { label: "PAN Card",          color: "#15803d", bg: "#dcfce7" },
                { label: "Passport",          color: "#7c3aed", bg: "#ede9fe" },
                { label: "Driving License",   color: "#b45309", bg: "#fef3c7" },
                { label: "Voter ID",           color: "#b91c1c", bg: "#fee2e2" },
              ].map(({ label, color, bg }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 7, background: bg }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ color, fontSize: 11, fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* spacer */}
          <div style={{ flex: 1 }} />

          {/* Classify button */}
          <div>
            <button
              onClick={() => files.length ? setShowReview(true) : inputRef.current?.click()}
              disabled={loading}
              style={{ width: "100%", background: files.length && !loading ? "linear-gradient(135deg,#2563eb,#6366f1)" : "#e2e8f0", color: files.length && !loading ? "#fff" : "#94a3b8", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: files.length && !loading ? "0 3px 12px rgba(37,99,235,0.3)" : "none", transition: "all 0.18s" }}
            >
              {loading
                ? <><svg style={{ animation: "kspin 0.9s linear infinite", width: 14, height: 14 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>Classifying…</>
                : <><ShieldCheck size={14} />Classify Documents</>}
            </button>

            {message && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "flex-start", gap: 5, padding: "7px 9px", borderRadius: 8, background: msgType === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msgType === "success" ? "#bbf7d0" : "#fecaca"}` }}>
                {msgType === "success"
                  ? <CheckCircle2 size={12} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <XCircle size={12} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />}
                <span style={{ color: msgType === "success" ? "#16a34a" : "#ef4444", fontSize: 10, fontWeight: 500, lineHeight: 1.4 }}>{message}</span>
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "14px 16px", gap: 14 }}>

          {/* STAT CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, flexShrink: 0 }}>
            {STAT_DEFS.map(({ key, label, emoji, accent, accentBg, accentBorder }) => {
              const count = key === "total" ? counts.total : (counts as any)[key] as number;
              return (
                <div key={key} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", padding: "14px 14px 12px", position: "relative" }}>
                  {/* KPI bubble — count only here */}
                  <div style={{ position: "absolute", top: 10, right: 10, minWidth: 32, height: 24, borderRadius: 12, background: accentBg, border: `1.5px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 7px", boxShadow: `0 1px 4px ${accentBorder}` }}>
                    <span style={{ color: accent, fontSize: 12, fontWeight: 800, lineHeight: 1 }}>{count}</span>
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: accentBg, border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, fontSize: 15 }}>
                    {emoji}
                  </div>
                  <p style={{ color: "#64748b", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>{label}</p>
                </div>
              );
            })}
          </div>

          {/* RESULTS TABLE */}
          <div style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Toolbar */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ flex: 1, position: "relative", minWidth: 160 }}>
                <Search size={12} color="#94a3b8" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search filename or type…"
                  style={{ width: "100%", paddingLeft: 28, paddingRight: 10, height: 30, borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#334155", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Filter size={12} color="#64748b" />
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  style={{ height: 30, padding: "0 8px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#334155", outline: "none", cursor: "pointer" }}>
                  {PRED_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <button onClick={() => exportCSV(visible)} disabled={!results.length}
                style={{ display: "flex", alignItems: "center", gap: 5, height: 30, padding: "0 11px", borderRadius: 7, border: "1px solid #e2e8f0", background: results.length ? "#fff" : "#f8fafc", color: results.length ? "#334155" : "#94a3b8", fontSize: 12, fontWeight: 500, cursor: results.length ? "pointer" : "not-allowed" }}>
                <Download size={12} />Export CSV
              </button>
              {results.length > 0 && (
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{visible.length} of {results.length} records</span>
              )}
            </div>

            {/* Table body */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
              {results.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 260, gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileSearch size={24} color="#cbd5e1" />
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500, margin: 0 }}>No classification results yet</p>
                  <p style={{ color: "#cbd5e1", fontSize: 12, margin: 0 }}>Upload a folder and run classification to see results here</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                    <tr style={{ background: "#2563eb" }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600, width: 36 }}>#</th>
                      <th onClick={() => handleSort("filename")} style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", userSelect: "none" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          File Name
                          {sortKey === "filename" ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <span style={{ opacity: 0.4 }}>↕</span>}
                        </span>
                      </th>
                      <th onClick={() => handleSort("prediction")} style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", userSelect: "none" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          Type
                          {sortKey === "prediction" ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <span style={{ opacity: 0.4 }}>↕</span>}
                        </span>
                      </th>
                      <th style={{ padding: "10px 14px", textAlign: "center", color: "#fff", fontSize: 11, fontWeight: 600 }}>Thumbnail</th>
                      <th onClick={() => handleSort("confidence")} style={{ padding: "10px 14px", textAlign: "right", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", userSelect: "none" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                          Confidence
                          {sortKey === "confidence" ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <span style={{ opacity: 0.4 }}>↕</span>}
                        </span>
                      </th>
                      <th style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row, i) => {
                      const meta     = DOC_META[row.prediction];
                      const status   = getStatus(row.confidence, row.ocr_verified);
                      const thumbUrl = thumbs[row.filename];
                      return (
                        <tr key={i}
                          style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 11 }}>{i + 1}</td>

                          {/* Filename */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 6, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <FileText size={12} color="#64748b" />
                              </div>
                              <span style={{ color: "#334155", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{row.filename}</span>
                            </div>
                          </td>

                          {/* Type badge */}
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color, borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
                              {meta.icon}{meta.label}
                            </span>
                          </td>

                          {/* Thumbnail */}
                          <td style={{ padding: "8px 14px", textAlign: "center" }}>
                            {thumbUrl ? (
                              <button
                                onClick={() => openInspect(row)}
                                style={{ width: 48, height: 36, borderRadius: 6, overflow: "hidden", border: "1.5px solid #e2e8f0", cursor: "pointer", padding: 0, background: "#f1f5f9", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.15s, box-shadow 0.15s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2563eb"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px #bfdbfe"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                                title="Click to inspect"
                              >
                                <img src={thumbUrl} alt={row.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </button>
                            ) : (
                              <button
                                onClick={() => openInspect(row)}
                                style={{ width: 48, height: 36, borderRadius: 6, border: "1.5px dashed #cbd5e1", cursor: "pointer", background: "#f8fafc", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                title="No image preview"
                              >
                                <ImageIcon size={14} color="#94a3b8" />
                              </button>
                            )}
                          </td>

                          {/* Confidence */}
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                              <span style={{ color: status.color, fontSize: 12, fontWeight: 700 }}>{row.confidence}%</span>
                              <div style={{ width: 68, height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${row.confidence}%`, height: "100%", background: status.color, borderRadius: 2 }} />
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: status.bg, border: `1px solid ${status.border}`, color: status.color, borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
                              {row.confidence >= 95 ? <CheckCircle2 size={11} /> : row.confidence >= 80 ? <AlertTriangle size={11} /> : <XCircle size={11} />}
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── REVIEW MODAL ── */}
      {showReview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, animation: "kfadeIn 0.18s ease" }}>
          <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "90%", maxWidth: 460, overflow: "hidden", animation: "kslideUp 0.2s ease" }}>
            <div style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={18} color="#fff" />
                </div>
                <div>
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>Review Documents Before Classification</p>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, margin: 0 }}>AI-powered KYC document verification</p>
                </div>
              </div>
              <button onClick={() => setShowReview(false)} style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={13} color="#fff" />
              </button>
            </div>
            <div style={{ padding: "18px 22px" }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 12px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FolderOpen size={13} color="#2563eb" />
                  <span style={{ color: "#334155", fontSize: 12, fontWeight: 500 }}>{folderName || "Selected Files"}</span>
                </div>
                <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7, padding: "2px 8px", color: "#2563eb", fontSize: 12, fontWeight: 700 }}>{files.length} files</span>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 9, padding: "10px 12px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={13} color="#16a34a" />
                  <span style={{ color: "#15803d", fontSize: 12, fontWeight: 600 }}>{files.length} files detected · Ready for AI classification</span>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 7px" }}>Supported Types</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {[
                    { label: "Aadhaar",        color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
                    { label: "PAN Card",        color: "#15803d", bg: "#dcfce7", border: "#bbf7d0" },
                    { label: "Passport",        color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe" },
                    { label: "Driving License", color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
                    { label: "Voter ID",         color: "#b91c1c", bg: "#fee2e2", border: "#fecaca" },
                  ].map(({ label, color, bg, border }) => (
                    <span key={label} style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{label}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <p style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 7px" }}>File Preview</p>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 11px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {files.slice(0, 5).map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={11} color="#64748b" />
                      <span style={{ color: "#475569", fontSize: 11 }}>{f.name}</span>
                    </div>
                  ))}
                  {files.length > 5 && <span style={{ color: "#94a3b8", fontSize: 11, paddingLeft: 17 }}>+{files.length - 5} more files</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={classify} style={{ flex: 1, background: "linear-gradient(135deg,#2563eb,#6366f1)", color: "#fff", border: "none", borderRadius: 9, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 3px 12px rgba(37,99,235,0.3)" }}>
                  <ShieldCheck size={13} />Start Classification
                </button>
                <button onClick={() => setShowReview(false)} style={{ flex: 1, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 9, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE INSPECT MODAL ── */}
      {inspectResult && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, animation: "kfadeIn 0.18s ease", padding: 24 }}
          onClick={closeInspect}
        >
          <div
            style={{ background: "#fff", borderRadius: isFullscreen ? 0 : 18, boxShadow: "0 24px 80px rgba(0,0,0,0.3)", width: isFullscreen ? "100vw" : "min(680px,95vw)", maxHeight: isFullscreen ? "100vh" : "90vh", display: "flex", flexDirection: "column", overflow: "hidden", animation: "kslideUp 0.2s ease" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileSearch size={14} color="#2563eb" />
                </div>
                <div>
                  <p style={{ color: "#1e293b", fontSize: 13, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{inspectResult.filename}</p>
                  <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>Document Inspection</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  style={{ width: 30, height: 30, borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Zoom out">
                  <ZoomOut size={13} color="#64748b" />
                </button>
                <span style={{ width: 36, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#64748b", fontWeight: 600 }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                  style={{ width: 30, height: 30, borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Zoom in">
                  <ZoomIn size={13} color="#64748b" />
                </button>
                <button onClick={() => setIsFullscreen(f => !f)}
                  style={{ width: 30, height: 30, borderRadius: 7, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Toggle fullscreen">
                  <Maximize2 size={13} color="#64748b" />
                </button>
                <button onClick={downloadInspected} disabled={!inspectUrl}
                  style={{ width: 30, height: 30, borderRadius: 7, background: inspectUrl ? "#eff6ff" : "#f8fafc", border: `1px solid ${inspectUrl ? "#bfdbfe" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: inspectUrl ? "pointer" : "not-allowed" }} title="Download">
                  <Download size={13} color={inspectUrl ? "#2563eb" : "#94a3b8"} />
                </button>
                <button onClick={closeInspect}
                  style={{ width: 30, height: 30, borderRadius: 7, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Close">
                  <X size={13} color="#ef4444" />
                </button>
              </div>
            </div>

            {/* Image area */}
            <div style={{ flex: 1, overflowY: "auto", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, minHeight: 300 }}>
              {inspectUrl ? (
                <img
                  src={inspectUrl}
                  alt={inspectResult.filename}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s ease", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}
                />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <ImageIcon size={28} color="#94a3b8" />
                  </div>
                  <p style={{ color: "#64748b", fontSize: 13, fontWeight: 500, margin: 0 }}>No image preview available</p>
                  <p style={{ color: "#94a3b8", fontSize: 11, margin: "4px 0 0" }}>File is not an image format</p>
                </div>
              )}
            </div>

            {/* Metadata footer */}
            <div style={{ padding: "14px 18px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 20, flexShrink: 0, flexWrap: "wrap" }}>
              <div>
                <p style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>Document Type</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: DOC_META[inspectResult.prediction].bg, border: `1px solid ${DOC_META[inspectResult.prediction].border}`, color: DOC_META[inspectResult.prediction].color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                  {DOC_META[inspectResult.prediction].icon}{DOC_META[inspectResult.prediction].label}
                </span>
              </div>
              <div>
                <p style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>Confidence</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: getStatus(inspectResult.confidence, inspectResult.ocr_verified).color, fontSize: 18, fontWeight: 800 }}>{inspectResult.confidence}%</span>
                  <div style={{ width: 80, height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${inspectResult.confidence}%`, height: "100%", background: getStatus(inspectResult.confidence, inspectResult.ocr_verified).color, borderRadius: 3 }} />
                  </div>
                </div>
              </div>
              <div>
              <p
        style={{
            color:"#94a3b8",
            fontSize:10,
            fontWeight:600,
            textTransform:"uppercase",
            letterSpacing:"0.5px",
            margin:"0 0 4px"
        }}
    >
        OCR Verification
              </p>

    <span
        style={{
            display:"inline-flex",
            alignItems:"center",
            gap:4,
            background: inspectResult.ocr_verified ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${inspectResult.ocr_verified ? "#bbf7d0" : "#fecaca"}`,
            color: inspectResult.ocr_verified ? "#16a34a" : "#dc2626",
            borderRadius:20,
            padding:"3px 10px",
            fontSize:11,
            fontWeight:600
        }}
    >
        {inspectResult.ocr_verified
            ? "✅ OCR Verified"
            : "❌ OCR Failed"}
    </span>
</div>
              <div>
                <p style={{ color: "#94a3b8", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>Verification Status</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: getStatus(inspectResult.confidence, inspectResult.ocr_verified).bg, border: `1px solid ${getStatus(inspectResult.confidence, inspectResult.ocr_verified).border}`, color: getStatus(inspectResult.confidence, inspectResult.ocr_verified).color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                  {inspectResult.confidence >= 95 && inspectResult.ocr_verified ? <CheckCircle2 size={11} /> : inspectResult.confidence >= 80 ? <AlertTriangle size={11} /> : <XCircle size={11} />}
                  {getStatus(inspectResult.confidence, inspectResult.ocr_verified).label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* LOADING OVERLAY */}
      {loading && (
      <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(255,255,255,0.75)",
      backdropFilter: "blur(4px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}
  >
    <div
      style={{
        width: 70,
        height: 70,
        border: "6px solid #dbeafe",
        borderTop: "6px solid #2563eb",
        borderRadius: "50%",
        animation: "kspin 1s linear infinite",
      }}
    />

    <h3
      style={{
        marginTop: 20,
        color: "#2563eb",
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      Classifying Documents...
    </h3>

    <p
      style={{
        color: "#64748b",
        fontSize: 14,
      }}
    >
      AI model is analyzing your files
    </p>
      </div>
     )}
      <style>{`
        @keyframes kspin    { to { transform: rotate(360deg); } }
        @keyframes kfadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kslideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
