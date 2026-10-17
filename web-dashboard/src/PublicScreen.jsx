import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

/* ---------- Default data (replace via props or wire to your API) ---------- */
const DISPLAY_DEFAULTS = {
  hospital: "Government General Hospital",
  location: "2nd Floor Waiting Hall",
  department: "General OPD",
  helpDesk: "Help Desk Counter 01",
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin;

function getQueueView(response) {
  const payload = response?.data?.data;
  const tokens = Array.isArray(payload?.queue) ? payload.queue.filter((token) => typeof token?.tokenNo === "string" && token.tokenNo.trim()) : [];
  const current = tokens.find((token) => token.status === "called" || token.status === "in-consultation");
  const recent = tokens.filter((token) => ["completed", "skipped"].includes(token.status))
    .sort((a, b) => (b.tokenSequence || 0) - (a.tokenSequence || 0)).slice(0, 3)
    .map((token) => ({ token: token.tokenNo, status: token.status === "completed" ? "Done" : "Skipped" }));
  return { opdId: payload?.opdId, opdName: payload?.opdName, current, nextToken: payload?.nextToken, room: payload?.room, recent };
}

/* ---------- Icons ---------- */
const Icon = ({ children, size = 16, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

const MegaphoneIcon = (p) => (
  <Icon {...p}>
    <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 6a9 9 0 0 1 0 12" />
  </Icon>
);
const ArrowRight = (p) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);
const ClockIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
const CheckBadge = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </Icon>
);
const DoorIcon = (p) => (
  <Icon {...p}>
    <path d="M14 3H6a1 1 0 0 0-1 1v17h9" />
    <path d="M14 3l5 2v16h-5" />
    <path d="M10 12h.01" />
  </Icon>
);
const HistoryIcon = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
const BriefcaseIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M3 13h18" />
  </Icon>
);
const HelpIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" />
    <path d="M12 17h.01" />
  </Icon>
);

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40">
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#38bdf8" />
        <stop offset="1" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#22d3ee" />
        <stop offset="1" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <rect x="15" y="3" width="10" height="34" rx="5" fill="url(#lg1)" />
    <rect x="3" y="15" width="34" height="10" rx="5" fill="url(#lg2)" opacity="0.85" />
  </svg>
);

/* ---------- Clock ---------- */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n) => String(n).padStart(2, "0");

/* ---------- Component ---------- */
export default function PublicScreen({ data = {} }) {
  const now = useClock();
  const [opds, setOpds] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [opdId, setOpdId] = useState(null);
  const [opdsLoading, setOpdsLoading] = useState(true);
  const [opdsError, setOpdsError] = useState(false);
  const [opdsRequest, setOpdsRequest] = useState(0);
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const d = { ...DISPLAY_DEFAULTS, ...data, department: queue?.opdName || data.department || "" };

  useEffect(() => {
    let active = true;
    axios.get(`${API_BASE_URL}/api/opd/`).then(({ data: result }) => {
      if (!result?.success || !Array.isArray(result.data)) throw new Error("Invalid departments response");
      const availableOpds = result.data.filter((opd) => opd?.opdId && (opd.name || opd.department));
      if (active) { setOpds(availableOpds); setOpdsError(false); }
    }).catch(() => { if (active) setOpdsError(true); })
      .finally(() => { if (active) setOpdsLoading(false); });
    return () => { active = false; };
  }, [opdsRequest]);

  const reloadOpds = () => {
    setOpdsLoading(true);
    setOpdsError(false);
    setOpdsRequest((request) => request + 1);
  };

  const refreshQueue = useCallback(async (signal, isActive) => {
    if (!opdId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/queue/live/${encodeURIComponent(opdId)}`, { signal });
      if (isActive()) {
        const selectedQueue = getQueueView(response);
        if (selectedQueue.opdId !== opdId) throw new Error("Queue response did not match the selected department");
        setQueue(selectedQueue);
        setApiError(false);
      }
    } catch {
      if (isActive() && !signal.aborted) setApiError(true);
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [opdId]);

  useEffect(() => {
    if (!opdId) return undefined;
    let active = true;
    const controller = new AbortController();
    let connectedOnce = false;
    const refresh = () => { if (active) void refreshQueue(controller.signal, () => active); };
    const socket = io(SOCKET_URL, { reconnection: true, auth: { opdId } });
    socket.on("connect", () => {
      if (!active) return;
      setSocketConnected(true);
      if (connectedOnce) refresh();
      connectedOnce = true;
    });
    socket.on("disconnect", () => { if (active) setSocketConnected(false); });
    socket.on("connect_error", () => { if (active) setSocketConnected(false); });
    socket.on("queue:update", (event) => { if (event?.data?.opdId === opdId) refresh(); });
    refresh();
    return () => { active = false; controller.abort(); socket.removeAllListeners(); socket.disconnect(); };
  }, [opdId, refreshQueue]);

  const beginQueueDisplay = () => {
    if (!selectedOption) return;
    setQueue(null);
    setApiError(false);
    setLoading(true);
    setSocketConnected(false);
    setOpdId(selectedOption);
  };

  const changeOpd = () => {
    setOpdId(null);
    setSelectedOption("");
    setQueue(null);
    setApiError(false);
    setLoading(true);
    setSocketConnected(false);
  };

  const h24 = now.getHours();
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const dateStr = now
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  if (!opdId) {
    return (
      <div className="ps-root ps-setup-root">
        <style>{CSS}</style>
        <header className="ps-card ps-header ps-setup-header">
          <div className="ps-brand">
            <div className="ps-logo"><Logo /></div>
            <div>
              <div className="ps-title-row"><h1>MEDIQUEUE</h1><span className="ps-pill ps-pill-blue">PUBLIC DISPLAY</span></div>
              <p className="ps-sub">{(data.hospital || DISPLAY_DEFAULTS.hospital).toUpperCase()}</p>
            </div>
          </div>
          <div className="ps-clock">
            <span className="ps-clock-date">{dateStr}</span>
            <div className="ps-clock-time"><ClockIcon size={14} /><b>{pad(hour12)}:{pad(now.getMinutes())}</b><small>{ampm}</small></div>
          </div>
        </header>
        <main className="ps-setup-card ps-card">
          <div className="ps-setup-heading">
            <span className="ps-pill ps-pill-blue">DISPLAY SETUP</span>
            <h2>Select Department</h2>
            <p>Select the OPD where this display is located.</p>
          </div>
          {opdsLoading ? <p className="ps-setup-message" role="status">Loading available departments…</p> : null}
          {opdsError ? (
            <div className="ps-setup-message ps-setup-error" role="alert">
              <p>Departments could not be loaded. Check the connection and try again.</p>
              <button type="button" className="ps-action-button" onClick={reloadOpds}>Retry</button>
            </div>
          ) : null}
          {!opdsLoading && !opdsError && opds.length === 0 ? (
            <div className="ps-setup-message"><p>No active departments are available.</p><button type="button" className="ps-action-button" onClick={reloadOpds}>Reload departments</button></div>
          ) : null}
          {!opdsLoading && !opdsError && opds.length > 0 ? (
            <>
              <div className="ps-opd-options" role="radiogroup" aria-label="Available departments">
                {opds.map((opd) => {
                  const label = opd.department || opd.name;
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selectedOption === opd.opdId}
                      className={`ps-opd-option ${selectedOption === opd.opdId ? "ps-opd-selected" : ""}`}
                      key={opd.opdId}
                      onClick={() => setSelectedOption(opd.opdId)}
                    >
                      <span className="ps-opd-mark" aria-hidden="true">{selectedOption === opd.opdId ? "✓" : ""}</span>
                      <span><strong>{label}</strong>{opd.name && opd.name !== label ? <small>{opd.name}</small> : null}</span>
                      <ArrowRight size={20} />
                    </button>
                  );
                })}
              </div>
              <div className="ps-setup-actions">
                <span>{selectedOption ? "Confirm the department for this display." : "Choose the department for this display."}</span>
                <button type="button" className="ps-action-button" disabled={!selectedOption} onClick={beginQueueDisplay}>Continue <ArrowRight size={17} /></button>
              </div>
            </>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="ps-root">
      <style>{CSS}</style>

      {/* ---------- Header ---------- */}
      <header className="ps-card ps-header">
        <div className="ps-brand">
          <div className="ps-logo">
            <Logo />
          </div>
          <div>
            <div className="ps-title-row">
              <h1>SMART OPD SYSTEM</h1>
              <span className="ps-pill ps-pill-blue">QUEUE DISPLAY</span>
            </div>
            <p className="ps-sub">
              {(d.hospital || DISPLAY_DEFAULTS.hospital).toUpperCase()} <span className="ps-dot">•</span>{" "}
              <span className="ps-blue">{(d.location || DISPLAY_DEFAULTS.location).toUpperCase()}</span>
            </p>
          </div>
        </div>

        <div className="ps-header-right">
          <button type="button" className="ps-change-opd" onClick={changeOpd}>Change OPD</button>
          <div className="ps-dept">
            <span>DEPARTMENT</span>
            <strong>{d.department.toUpperCase()}</strong>
          </div>
          <div className="ps-clock">
            <span className="ps-clock-date">{dateStr}</span>
            <div className="ps-clock-time">
              <ClockIcon size={14} />
              <b>
                {pad(hour12)}:{pad(now.getMinutes())}
              </b>
              <small>{ampm}</small>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Main ---------- */}
      <main className="ps-main">
        {/* Now serving */}
        <section className="ps-serving">
          <div className="ps-serving-top">
            <div className="ps-chip ps-chip-solid">
              <MegaphoneIcon size={15} /> NOW SERVING
            </div>
            <div className="ps-chip ps-chip-soft">
              <i className="ps-live" /> ACTIVE CALL
            </div>
            <div className="ps-proceed">
              PLEASE PROCEED <ArrowRight size={14} />
            </div>
          </div>

          <div className="ps-token-card">
            <span className="ps-token-label">PATIENT TOKEN NUMBER</span>
            <div className="ps-token">{queue?.current?.tokenNo || (loading ? "…" : "—")}</div>
            <div className="ps-category">
              <CheckBadge size={15} />
              {apiError ? "Queue data unavailable" : queue?.current ? (queue.current.status === "called" ? "Please proceed when called" : "Currently in consultation") : loading ? "Loading queue" : "No token currently called"}
            </div>
          </div>

          <div className="ps-room-banner">
            <div className="ps-room-left">
              <div className="ps-room-icon">
                <DoorIcon size={22} />
              </div>
              <div>
                <small>CONSULTATION ROOM</small>
                <p>
                  {queue?.room || (queue?.current ? (queue.current.status === "called" ? "Please proceed" : "In consultation") : "Room details unavailable")}
                </p>
              </div>
            </div>
            <div className="ps-room-badge">
              {queue?.room ? queue.room.toUpperCase() : "ROOM NOT PROVIDED"} <ArrowRight size={26} />
            </div>
          </div>
        </section>

        {/* Right column */}
        <aside className="ps-side">
          <section className="ps-next">
            <div className="ps-next-top">
              <h3>
                <i className="ps-amber-dot" /> NEXT PATIENT
              </h3>
              <span className="ps-pill ps-pill-amber">GET READY</span>
            </div>
            <div className="ps-next-token">{queue?.nextToken || (loading ? "…" : "—")}</div>
            <div className="ps-prepare">
              <BriefcaseIcon size={14} />
              Please prepare your token slip &amp; hospital ID
            </div>
          </section>

          <section className="ps-card ps-recent">
            <div className="ps-recent-top">
              <h3>
                <HistoryIcon size={16} /> RECENTLY CALLED
              </h3>
              <span className="ps-history">HISTORY</span>
            </div>
            <div className="ps-recent-grid">
              {queue?.recent?.length ? queue.recent.map((r) => (
                <div className="ps-recent-item" key={r.token}>
                  <small>RECENT</small>
                  <strong>{r.token}</strong>
                  <span className={r.status === "Done" ? "ps-tag ps-tag-done" : "ps-tag ps-tag-live"}>
                    {r.status}
                  </span>
                </div>
              )) : <p className="ps-empty">{loading ? "Loading recent activity…" : "No recent queue activity"}</p>}
            </div>
            <div className="ps-missed">
              <HelpIcon size={13} />
              <span>
                Missed your call? Report to <a href="#help">{d.helpDesk || DISPLAY_DEFAULTS.helpDesk}</a>
              </span>
            </div>
          </section>
        </aside>
      </main>
      <div className={`ps-connection ${socketConnected && !apiError ? "ps-connected" : ""}`} role="status">
        {apiError ? "Queue connection unavailable. Retrying…" : socketConnected ? "Live queue connected" : "Connecting to live queue…"}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const CSS = `
.ps-root{
  --navy:#0f172a; --slate:#64748b; --blue:#2563eb; --green:#059669; --border:#e2e8f0;
  box-sizing:border-box; min-height:100vh; width:100%; padding:18px 22px;
  background:#fff; color:var(--navy);
  font-family: Inter, "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
  display:flex; flex-direction:column; gap:20px;
}
.ps-root *{ box-sizing:border-box; }
.ps-root h1,.ps-root h3,.ps-root p{ margin:0; }
.ps-card{ background:#fff; border:1px solid var(--border); border-radius:20px; box-shadow:0 1px 3px rgba(15,23,42,.05); }

/* header */
.ps-header{ display:flex; justify-content:space-between; align-items:center; padding:16px 24px; }
.ps-brand{ display:flex; align-items:center; gap:16px; }
.ps-logo{ width:52px; height:52px; border-radius:14px; border:1px solid var(--border); display:grid; place-items:center; background:#fff; }
.ps-title-row{ display:flex; align-items:center; gap:10px; }
.ps-title-row h1{ font-size:28px; font-weight:800; letter-spacing:-.3px; }
.ps-pill{ font-size:10px; font-weight:700; letter-spacing:.8px; padding:3px 10px; border-radius:999px; }
.ps-pill-blue{ background:#dbeafe; color:#1d4ed8; }
.ps-pill-amber{ background:#fef3c7; color:#92400e; border:1px solid #fde68a; }
.ps-sub{ margin-top:4px; font-size:13px; font-weight:700; letter-spacing:.5px; color:var(--slate); }
.ps-dot{ color:#94a3b8; margin:0 4px; }
.ps-blue{ color:var(--blue); }
.ps-header-right{ display:flex; align-items:center; gap:14px; }
.ps-dept{ background:linear-gradient(180deg,#2563eb,#1d4ed8); color:#fff; border-radius:12px; padding:8px 24px; text-align:center; box-shadow:0 6px 14px rgba(37,99,235,.3); }
.ps-dept span{ display:block; font-size:9px; letter-spacing:1.2px; opacity:.85; font-weight:600; }
.ps-dept strong{ font-size:20px; font-weight:800; letter-spacing:.5px; }
.ps-clock{ background:#0b1220; color:#fff; border-radius:12px; padding:8px 18px; text-align:center; min-width:166px; }
.ps-clock-date{ display:block; font-size:10px; color:#cbd5e1; letter-spacing:.8px; }
.ps-clock-time{ display:flex; align-items:center; justify-content:center; gap:6px; color:#34d399; }
.ps-clock-time b{ font-size:24px; font-weight:800; font-variant-numeric:tabular-nums; }
.ps-clock-time small{ font-size:11px; color:#e2e8f0; font-weight:700; align-self:flex-end; margin-bottom:5px; }

/* layout */
.ps-main{ flex:1; display:grid; grid-template-columns:1.95fr 1fr; gap:20px; min-height:0; }

/* now serving */
.ps-serving{ border:2px solid #10b981; border-radius:24px; padding:26px 26px 26px; display:flex; flex-direction:column; gap:16px; background:#fff; }
.ps-serving-top{ display:flex; align-items:center; gap:12px; padding-bottom:14px; border-bottom:1px solid #f1f5f9; }
.ps-chip{ display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:800; letter-spacing:.8px; padding:7px 16px; border-radius:10px; }
.ps-chip-solid{ background:var(--green); color:#fff; }
.ps-chip-soft{ background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; border-radius:999px; font-size:11px; padding:6px 14px; }
.ps-live{ width:9px; height:9px; border-radius:50%; background:#10b981; animation:ps-pulse 1.4s infinite; }
.ps-proceed{ margin-left:auto; display:inline-flex; align-items:center; gap:8px; font-weight:800; font-size:14px; letter-spacing:.6px; color:#047857; background:#d1fae5; border:1px solid #a7f3d0; padding:8px 18px; border-radius:10px; }
.ps-token-card{ flex:1; border:1px solid var(--border); border-radius:20px; background:linear-gradient(160deg,#fff 55%,#ecfdf5 130%); display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:30px 20px 20px; min-height:230px; }
.ps-token-label{ font-size:14px; font-weight:700; letter-spacing:1.6px; color:var(--slate); }
.ps-token{ font-size:clamp(110px, 17vw, 210px); line-height:1; font-weight:900; letter-spacing:-6px; color:var(--navy); }
.ps-category{ display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:#1e293b; background:#fff; border:1px solid var(--border); padding:8px 18px; border-radius:999px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
.ps-category svg{ color:var(--green); }
.ps-room-banner{ display:flex; justify-content:space-between; align-items:center; gap:16px; background:linear-gradient(90deg,#2563eb,#1d4ed8); border-radius:18px; padding:18px 20px; color:#fff; box-shadow:0 10px 20px rgba(37,99,235,.28); }
.ps-room-left{ display:flex; align-items:center; gap:16px; }
.ps-room-icon{ width:46px; height:46px; border-radius:12px; background:rgba(255,255,255,.18); display:grid; place-items:center; }
.ps-room-left small{ display:block; font-size:11px; font-weight:700; letter-spacing:1.2px; opacity:.85; }
.ps-room-left p{ font-size:16px; opacity:.95; margin-top:2px; }
.ps-room-left p b{ font-weight:800; }
.ps-room-badge{ display:inline-flex; align-items:center; gap:14px; background:#fff; color:#1e3a8a; font-weight:800; font-size:30px; letter-spacing:.5px; padding:12px 24px; border-radius:14px; }

/* side */
.ps-side{ display:flex; flex-direction:column; gap:0; }
.ps-next{ position:relative; overflow:hidden; border:2px solid #fbbf24; border-radius:24px; padding:20px 22px 24px; background:#fff; margin-bottom:0; }
.ps-next::after{ content:""; position:absolute; top:-40px; right:-40px; width:140px; height:140px; border-radius:50%; background:radial-gradient(circle,#fef3c7,transparent 70%); }
.ps-next-top{ display:flex; justify-content:space-between; align-items:center; position:relative; z-index:1; }
.ps-next-top h3{ display:flex; align-items:center; gap:10px; font-size:16px; font-weight:800; letter-spacing:.8px; color:#451a03; }
.ps-amber-dot{ width:11px; height:11px; border-radius:50%; background:#f59e0b; }
.ps-next-token{ text-align:center; font-size:72px; font-weight:900; letter-spacing:-3px; margin:12px 0 20px; position:relative; z-index:1; }
.ps-prepare{ display:flex; align-items:center; justify-content:center; gap:8px; font-size:12px; font-weight:700; color:#451a03; background:#fffbeb; border:1px solid #fde68a; padding:10px 12px; border-radius:12px; position:relative; z-index:1; }
.ps-recent{ margin-top:2px; padding:20px 22px; flex:1; border-radius:22px; }
.ps-recent-top{ display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
.ps-recent-top h3{ display:flex; align-items:center; gap:8px; font-size:14px; font-weight:800; letter-spacing:.8px; color:#1e293b; }
.ps-history{ font-size:9px; font-weight:700; letter-spacing:1px; color:var(--slate); background:#f1f5f9; padding:4px 10px; border-radius:6px; }
.ps-recent-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.ps-recent-item{ background:#f8fafc; border:1px solid var(--border); border-radius:14px; padding:10px 6px 12px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:6px; }
.ps-recent-item small{ font-size:10px; font-weight:600; letter-spacing:.6px; color:#94a3b8; }
.ps-recent-item strong{ font-size:19px; font-weight:800; }
.ps-tag{ font-size:9px; font-weight:700; padding:3px 10px; border-radius:999px; }
.ps-tag-live{ background:#d1fae5; color:#047857; }
.ps-tag-done{ background:#e2e8f0; color:#475569; }
.ps-missed{ margin-top:14px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:11px; font-weight:600; color:#334155; background:#f8fafc; border:1px solid var(--border); border-radius:12px; padding:10px 12px; }
.ps-missed svg{ color:var(--blue); flex-shrink:0; }
.ps-missed a{ color:var(--blue); text-decoration:underline; font-weight:700; }
.ps-empty{ grid-column:1/-1; padding:18px 8px; text-align:center; color:var(--slate); font-size:13px; }
.ps-connection{ text-align:center; font-size:12px; font-weight:700; color:#b45309; }
.ps-connected{ color:#047857; }
.ps-setup-root{ min-height:100vh; background:linear-gradient(145deg,#f8fbff,#eef5ff); }
.ps-setup-header{ width:100%; }
.ps-setup-card{ width:min(900px,100%); margin:auto; padding:clamp(24px,5vw,52px); }
.ps-setup-heading{ text-align:center; margin-bottom:30px; }
.ps-setup-heading h2{ margin:14px 0 8px; font-size:clamp(30px,4vw,42px); color:var(--navy); }
.ps-setup-heading p,.ps-setup-message{ color:var(--slate); font-size:16px; }
.ps-opd-options{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.ps-opd-option{ min-height:88px; display:flex; align-items:center; gap:14px; padding:18px; text-align:left; color:var(--navy); background:#fff; border:2px solid var(--border); border-radius:16px; cursor:pointer; font:inherit; }
.ps-opd-option:hover,.ps-opd-option:focus-visible{ border-color:#60a5fa; outline:none; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
.ps-opd-selected{ border-color:var(--blue); background:#eff6ff; }
.ps-opd-mark{ width:24px; height:24px; flex:0 0 24px; border:2px solid #94a3b8; border-radius:50%; display:grid; place-items:center; color:#fff; font-size:14px; font-weight:800; }
.ps-opd-selected .ps-opd-mark{ border-color:var(--blue); background:var(--blue); }
.ps-opd-option strong,.ps-opd-option small{ display:block; }
.ps-opd-option strong{ font-size:18px; }
.ps-opd-option small{ margin-top:4px; color:var(--slate); font-size:13px; }
.ps-opd-option svg{ margin-left:auto; color:var(--blue); flex-shrink:0; }
.ps-setup-actions{ display:flex; align-items:center; justify-content:space-between; gap:18px; margin-top:24px; color:var(--slate); font-size:14px; }
.ps-action-button,.ps-change-opd{ display:inline-flex; align-items:center; justify-content:center; gap:8px; border:0; border-radius:10px; padding:12px 20px; background:var(--blue); color:#fff; font:inherit; font-weight:800; cursor:pointer; }
.ps-action-button:disabled{ cursor:not-allowed; opacity:.45; }
.ps-setup-message{ padding:24px 12px; text-align:center; }
.ps-setup-error{ color:#b91c1c; }
.ps-setup-error .ps-action-button{ margin-top:14px; }
.ps-change-opd{ padding:9px 13px; white-space:nowrap; font-size:12px; }

@keyframes ps-pulse{ 0%,100%{ box-shadow:0 0 0 0 rgba(16,185,129,.55);} 50%{ box-shadow:0 0 0 6px rgba(16,185,129,0);} }

@media (max-width: 960px){
  .ps-main{ grid-template-columns:1fr; }
  .ps-header{ flex-direction:column; align-items:flex-start; gap:14px; }
  .ps-room-banner{ flex-direction:column; align-items:flex-start; }
  .ps-opd-options{ grid-template-columns:1fr; }
  .ps-setup-header{ flex-direction:row; align-items:center; }
  .ps-header-right{ flex-wrap:wrap; }
}
`;
