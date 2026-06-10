import { useState, useRef } from "react";
import axios from "axios";
import {
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronUp,
  ChevronDown,
  Fingerprint,
  CreditCard,
  Globe,
  Car,
  Vote,
  HelpCircle,
  LayoutDashboard,
  Files,
  TrendingUp,
  Settings,
  Bell,
  User,
  Sparkles,
  Lock,
  FileSearch,
} from "lucide-react";

type Prediction =
  | "aadhaar"
  | "pan"
  | "passport"
  | "driving_license"
  | "voterId"
  | "unknown";

interface ClassifiedResult {
  filename: string;
  prediction: Prediction;
  confidence: number;
}

type SortKey = "index" | "filename" | "prediction" | "confidence";
type SortDir = "asc" | "desc";

const DOC_META: Record<
  Prediction,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  aadhaar:         { label: "Aadhaar",        color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd", icon: <Fingerprint size={12} /> },
  pan:             { label: "PAN Card",        color: "#15803d", bg: "#dcfce7", border: "#bbf7d0", icon: <CreditCard  size={12} /> },
  passport:        { label: "Passport",        color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe", icon: <Globe       size={12} /> },
  driving_license: { label: "Driving License", color: "#b45309", bg: "#fef3c7", border: "#fde68a", icon: <Car         size={12} /> },
  voterId:         { label: "Voter ID",         color: "#b91c1c", bg: "#fee2e2", border: "#fecaca", icon: <Vote        size={12} /> },
  unknown:         { label: "Unknown",          color: "#475569", bg: "#f1f5f9", border: "#e2e8f0", icon: <HelpCircle  size={12} /> },
};

const STAT_CARDS = [
  { key: "aadhaar"         as Prediction, label: "Aadhaar",          emoji: "🪪", accent: "#0284c7", accentBg: "#e0f2fe", accentBorder: "#bae6fd" },
  { key: "pan"             as Prediction, label: "PAN Card",          emoji: "💳", accent: "#15803d", accentBg: "#dcfce7", accentBorder: "#bbf7d0" },
  { key: "passport"        as Prediction, label: "Passport",          emoji: "📘", accent: "#7c3aed", accentBg: "#ede9fe", accentBorder: "#ddd6fe" },
  { key: "driving_license" as Prediction, label: "Driving License",   emoji: "🚗", accent: "#b45309", accentBg: "#fef3c7", accentBorder: "#fde68a" },
  { key: "voterId"         as Prediction, label: "Voter ID",           emoji: "🗳️", accent: "#b91c1c", accentBg: "#fee2e2", accentBorder: "#fecaca" },
];

export default function App() {
  const [files,    setFiles]    = useState<File[]>([]);
  const [message,  setMessage]  = useState("");
  const [msgType,  setMsgType]  = useState<"success" | "error" | "">("");
  const [results,  setResults]  = useState<ClassifiedResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sortKey,  setSortKey]  = useState<SortKey>("index");
  const [sortDir,  setSortDir]  = useState<SortDir>("asc");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []));
    setMessage(""); setMsgType(""); setResults([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) { setFiles(dropped); setMessage(""); setResults([]); }
  };

  const classify = async () => {
    if (!files.length) { setMessage("Please select files first."); setMsgType("error"); return; }
    setLoading(true); setMessage("");
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

  const stats = { aadhaar: 0, pan: 0, passport: 0, driving_license: 0, voterId: 0, unknown: 0 };
  results.forEach(r => { if (stats[r.prediction] !== undefined) stats[r.prediction]++; });

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const sorted = [...results].sort((a, b) => {
    let c = 0;
    if (sortKey === "filename")   c = a.filename.localeCompare(b.filename);
    if (sortKey === "prediction") c = a.prediction.localeCompare(b.prediction);
    if (sortKey === "confidence") c = a.confidence - b.confidence;
    return sortDir === "asc" ? c : -c;
  });

  const avgConf = results.length
    ? Math.round(results.reduce((s, r) => s + r.confidence, 0) / results.length * 10) / 10
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', Inter, sans-serif" }}>

      {/* ── Top Nav ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 36px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 50 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#2563eb,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(99,102,241,0.35)" }}>
            <ShieldCheck size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", letterSpacing: "-0.3px" }}>
            KYC<span style={{ color: "#2563eb" }}>Verify</span>
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {[
            { icon: <LayoutDashboard size={14} />, label: "Dashboard", active: true },
            { icon: <Files size={14} />, label: "Documents" },
            { icon: <TrendingUp size={14} />, label: "Analytics" },
            { icon: <Settings size={14} />, label: "Settings" },
          ].map(({ icon, label, active }) => (
            <button key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 8, border: "none", background: active ? "#eff6ff" : "transparent", color: active ? "#2563eb" : "#94a3b8", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              {icon}{label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ width: 34, height: 34, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Bell size={15} color="#94a3b8" />
          </button>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <User size={15} color="#fff" />
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>

        {/* Page title */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          
          <h1 style={{ color: "#1e293b", fontSize: 36, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.6px" }}>
            AI Document Classification System
          </h1>
          <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>
            Upload and classify KYC documents using AI
          </p>
        </div>

        {/* Upload card */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 2px 14px rgba(0,0,0,0.06)", padding: "32px 36px", marginBottom: 28 }}>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{ border: `2px dashed ${dragOver ? "#2563eb" : "#cbd5e1"}`, borderRadius: 14, padding: "30px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "#eff6ff" : "#f8fafc", transition: "all 0.18s" }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Upload size={24} color="#2563eb" />
            </div>
            <p style={{ color: "#1e293b", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>
              {files.length > 0
                ? `${files.length} file${files.length > 1 ? "s" : ""} selected and ready`
                : "Drop documents here or click to browse"}
            </p>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
              Supports Aadhaar · PAN · Passport · Driving License · Voter ID
            </p>

            {files.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 14 }}>
                {files.slice(0, 5).map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "3px 9px" }}>
                    <FileSearch size={11} color="#2563eb" />
                    <span style={{ color: "#2563eb", fontSize: 11, fontWeight: 500, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  </div>
                ))}
                {files.length > 5 && (
                  <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "3px 9px" }}>
                    <span style={{ color: "#64748b", fontSize: 11 }}>+{files.length - 5} more</span>
                  </div>
                )}
              </div>
            )}

            <input ref={inputRef} type="file"
              // @ts-expect-error non-standard
              webkitdirectory="" directory="" multiple
              onChange={handleChange} style={{ display: "none" }} />
          </div>

          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={classify}
              disabled={loading || !files.length}
              style={{ background: files.length && !loading ? "linear-gradient(135deg,#2563eb,#6366f1)" : "#e2e8f0", color: files.length && !loading ? "#fff" : "#94a3b8", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: files.length && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8, boxShadow: files.length && !loading ? "0 4px 16px rgba(37,99,235,0.35)" : "none", transition: "all 0.18s" }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: "spin 0.9s linear infinite", width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Classifying…
                </>
              ) : (
                <><ShieldCheck size={15} />Classify Documents</>
              )}
            </button>

            {message && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, background: msgType === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msgType === "success" ? "#bbf7d0" : "#fecaca"}` }}>
                {msgType === "success"
                  ? <CheckCircle2 size={15} color="#16a34a" />
                  : <XCircle size={15} color="#ef4444" />}
                <span style={{ color: msgType === "success" ? "#16a34a" : "#ef4444", fontSize: 13, fontWeight: 500 }}>{message}</span>
              </div>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px,1fr))", gap: 14, marginBottom: 28 }}>
              {/* Total */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: "20px 22px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -16, right: -16, width: 70, height: 70, borderRadius: "50%", background: "#eff6ff" }} />
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <FileText size={18} color="#2563eb" />
                </div>
                <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>Total</p>
                <p style={{ color: "#2563eb", fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1 }}>{results.length}</p>
                {avgConf !== null && (
                  <p style={{ color: "#94a3b8", fontSize: 11, margin: "6px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                    <TrendingUp size={11} color="#22c55e" />
                    {avgConf}% avg
                  </p>
                )}
              </div>

              {STAT_CARDS.map(({ key, label, emoji, accent, accentBg, accentBorder }) => (
                <div key={key} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: "20px 22px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -16, right: -16, width: 70, height: 70, borderRadius: "50%", background: accentBg }} />
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: accentBg, border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 18 }}>
                    {emoji}
                  </div>
                  <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>{label}</p>
                  <p style={{ color: accent, fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1 }}>{stats[key]}</p>
                </div>
              ))}
            </div>

            {/* Results table */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 2px 14px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "20px 26px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ color: "#1e293b", fontSize: 17, fontWeight: 700, margin: 0 }}>Classification Results</h2>
                  <p style={{ color: "#94a3b8", fontSize: 12, margin: "3px 0 0" }}>{results.length} document{results.length !== 1 ? "s" : ""} processed</p>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#2563eb" }}>
                      {(["index","filename","prediction","confidence"] as SortKey[]).map(col => (
                        <th key={col} onClick={() => handleSort(col)}
                          style={{ padding: "13px 22px", textAlign: col === "confidence" ? "right" : "left", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {col === "index" ? "#" : col.charAt(0).toUpperCase() + col.slice(1)}
                            {sortKey === col
                              ? sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                              : <span style={{ opacity: 0.4 }}>↕</span>}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((file, i) => {
                      const meta = DOC_META[file.prediction];
                      const confColor  = file.confidence >= 95 ? "#16a34a" : file.confidence >= 80 ? "#d97706" : "#dc2626";
                      const confBg     = file.confidence >= 95 ? "#f0fdf4" : file.confidence >= 80 ? "#fffbeb" : "#fef2f2";
                      const confBorder = file.confidence >= 95 ? "#bbf7d0" : file.confidence >= 80 ? "#fde68a" : "#fecaca";
                      return (
                        <tr key={i}
                          style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.12s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "14px 22px", color: "#94a3b8", fontSize: 13, width: 52 }}>{i + 1}</td>
                          <td style={{ padding: "14px 22px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <FileText size={15} color="#64748b" />
                              </div>
                              <span style={{ color: "#334155", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{file.filename}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 22px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color, borderRadius: 20, padding: "5px 11px", fontSize: 12, fontWeight: 600 }}>
                              {meta.icon}{meta.label}
                            </span>
                          </td>
                          <td style={{ padding: "14px 22px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, background: confBg, border: `1px solid ${confBorder}`, borderRadius: 8, padding: "4px 10px" }}>
                                {file.confidence >= 95
                                  ? <CheckCircle2 size={13} color={confColor} />
                                  : file.confidence >= 80
                                  ? <AlertTriangle size={13} color={confColor} />
                                  : <XCircle size={13} color={confColor} />}
                                <span style={{ color: confColor, fontSize: 13, fontWeight: 700 }}>{file.confidence}%</span>
                              </div>
                              <div style={{ width: 88, height: 4, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                                <div style={{ width: `${file.confidence}%`, height: "100%", background: confColor, borderRadius: 4 }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e2e8f0", background: "#fff", padding: "14px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <ShieldCheck size={13} color="#94a3b8" />
          <span style={{ color: "#94a3b8", fontSize: 12 }}>KYCVerify — AI Document Intelligence Platform</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Lock size={11} color="#94a3b8" />
          <span style={{ color: "#94a3b8", fontSize: 11 }}>All data processed locally · SOC 2 Compliant</span>
        </div>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
