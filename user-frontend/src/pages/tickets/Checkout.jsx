import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MATCHES } from "@/data/matches.sample";
import { useReminders } from "@/context/RemindersContext.jsx";
import "@/styles/tickets.css";

/* very small sanitizer for query values */
const clean = (s) => String(s || "").replace(/[<>`"'\\]/g, "").slice(0, 120);

function findMatchById(id) {
  if (!id) return null;
  return MATCHES.find((m) => String(m.id) === String(id)) || null;
}

/** Generate or read a CSRF token (session-scoped; for future POSTs) */
function useCsrf() {
  const [token, setToken] = useState("");
  useEffect(() => {
    let t = sessionStorage.getItem("csrf");
    if (!t) {
      t = crypto.getRandomValues(new Uint32Array(4)).join("-");
      sessionStorage.setItem("csrf", t);
    }
    setToken(t);
  }, []);
  return token;
}

export default function TicketCheckout() {
  const nav = useNavigate();
  const loc = useLocation();
  const csrf = useCsrf();
  const { addReminder } = useReminders();

  // Prefer the item passed via navigate state; fallback to id query -> sample data
  const params = new URLSearchParams(loc.search);
  const idFromQuery = clean(params.get("matchId"));
  const fromState = loc.state?.item || null;

  const match = useMemo(() => {
    if (fromState) return fromState;
    const m = findMatchById(idFromQuery);
    return m
      ? {
          id: m.id,
          title: m.title,
          city: m.city,
          venue: m.venue,
          startISO: m.startISO || `${m.date}T${m.time}:00+05:00`,
          sport: m.sport,
        }
      : null;
  }, [fromState, idFromQuery]);

  // If nothing to sell, send back to Live
  useEffect(() => {
    if (!match) nav("/live", { replace: true });
  }, [match, nav]);

  // Form state
  const [type, setType] = useState("general"); // general | vip
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const priceTable = { general: 500, vip: 1500 };
  const subtotal = priceTable[type] * qty;
  const fees = Math.round(subtotal * 0.05); // 5% fee (example)
  const total = subtotal + fees;

  const validEmail = /\S+@\S+\.\S+/.test(email);
  const formOk = name.trim().length >= 2 && validEmail && qty > 0 && qty <= 10;

  /* ---------- tiny toast (same style as other pages) ---------- */
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1600);
  };

  const handleAddReminder = async () => {
    if (!match) return;
    const payload = {
      id: `ticket-${match.id}`,
      title: match.title,
      startISO: match.startISO || new Date().toISOString(),
      venue: match.venue,
      city: match.city,
      href: `/live`,
    };
    await addReminder(payload);
    showToast("Added to the reminders");
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!formOk) return;

    // SECURITY NOTES (frontend only right now):
    // - Do NOT collect/store real card numbers here.
    // - In production, POST to your backend -> Stripe/PayPal/etc.
    // - Always validate price/qty on the server; ignore client totals.
    // - Include CSRF token + user session; verify on backend.

    // Simulated success
    sessionStorage.setItem(
      "last_order",
      JSON.stringify({
        csrf,
        name: clean(name),
        email: clean(email),
        type,
        qty,
        total,
        matchId: match.id,
      })
    );

    alert(
      "Payment flow is not connected yet — this is a demo checkout.\nWe'll take you to your Schedule and hold the selection."
    );
    nav("/schedule");
  };

  if (!match) return null;

  return (
    <div className="tickets-page">
      <header className="t-head">
        <h1>Checkout</h1>
        <div className="secure">
          <span className="lock">🔒</span> Secure checkout
        </div>
      </header>

      <div className="t-grid">
        {/* left: details / form */}
        <section className="t-left card">
          <h2 className="t-title" title={match.title}>{match.title}</h2>
          <p className="t-sub">
            {match.city}
            {match.venue ? ` · ${match.venue}` : ""} ·{" "}
            {match.startISO
              ? new Date(match.startISO).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "TBD"}
          </p>

          <form className="t-form" onSubmit={handlePay} autoComplete="off" noValidate>
            <input type="hidden" name="csrf" value={csrf} />

            <div className="field">
              <label>Ticket type</label>
              <div className="radio-row">
                <label className={`chip ${type === "general" ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="type"
                    value="general"
                    checked={type === "general"}
                    onChange={() => setType("general")}
                  />
                  General <span className="muted">PKR {priceTable.general}</span>
                </label>
                <label className={`chip ${type === "vip" ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="type"
                    value="vip"
                    checked={type === "vip"}
                    onChange={() => setType("vip")}
                  />
                  VIP <span className="muted">PKR {priceTable.vip}</span>
                </label>
              </div>
            </div>

            <div className="field">
              <label>Quantity</label>
              <input
                type="number"
                min={1}
                max={10}
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                }
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Full name</label>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Email for e-ticket</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Payment (mock) */}
            <div className="field">
              <label>Card details (demo)</label>
              <div className="card-row">
                <input
                  className="card-num"
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  pattern="[0-9 ]{15,23}"
                  title="Card number (demo only)"
                />
                <input
                  className="card-mm"
                  placeholder="MM/YY"
                  inputMode="numeric"
                  pattern="[0-9/]{5}"
                />
                <input
                  className="card-cvc"
                  placeholder="CVC"
                  inputMode="numeric"
                  pattern="[0-9]{3,4}"
                />
              </div>
              <p className="pci-note">
                We don’t store card data in the browser. In production this form is
                replaced by Stripe/PayPal elements.
              </p>
            </div>

            <div className="actions">
              <button
                type="button"
                className="btn ghost"
                onClick={handleAddReminder}
              >
                Add to Reminders
              </button>
              <button type="submit" className="btn pay" disabled={!formOk}>
                Pay PKR {total.toLocaleString()}
              </button>
            </div>
          </form>
        </section>

        {/* right: summary */}
        <aside className="t-right card">
          <h3>Order summary</h3>
          <div className="summary">
            <div className="row">
              <span>{type === "vip" ? "VIP" : "General"} × {qty}</span>
              <strong>PKR {(priceTable[type] * qty).toLocaleString()}</strong>
            </div>
            <div className="row">
              <span>Service fees (5%)</span>
              <strong>PKR {fees.toLocaleString()}</strong>
            </div>
            <div className="sep" />
            <div className="row total">
              <span>Total</span>
              <strong>PKR {total.toLocaleString()}</strong>
            </div>
          </div>

          <ul className="secure-points">
            <li>🔒 Encrypted connection</li>
            <li>🧾 Email e-ticket</li>
            <li>↩️ Free cancellation (24h)</li>
          </ul>
        </aside>
      </div>

      {/* tiny toast */}
      {toast && (
        <div className="live-toast show" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
