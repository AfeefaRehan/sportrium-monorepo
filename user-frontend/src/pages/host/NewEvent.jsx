// src/pages/host/NewEvent.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "@/styles/host.css";
import "leaflet/dist/leaflet.css"; // Leaflet base styles

// Common Pakistan city centers (fallback to country center)
const CITY_CENTERS = {
  karachi: [24.8607, 67.0011],
  lahore: [31.5204, 74.3587],
  islamabad: [33.6844, 73.0479],
  rawalpindi: [33.5651, 73.0169],
  peshawar: [34.0151, 71.5805],
  quetta: [30.1798, 66.9750],
  multan: [30.1575, 71.5249],
  faisalabad: [31.4180, 73.0790],
};
const PK_CENTER = [30.3753, 69.3451];

export default function NewEvent() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    title: "", sport: "cricket", orgName: "", orgType: "Club",
    regNo: "", phone: "", email: "", city: "", venue: "",
    date: "", time: "", capacity: 16, entryType: "paid", entryFee: 500,
    format: "Knockout", rules: "", notes: "", accept: false,
    lat: null, lng: null, // ⬅️ map location
  });

  const feeSummary = useMemo(() => {
    const fee = data.entryType === "free" ? 0 : Number(data.entryFee || 0);
    const platform = Math.round(fee * 0.07); // 7% app fee
    const perSlot = fee + platform;
    return { fee, platform, perSlot };
  }, [data.entryType, data.entryFee]);

  const change = (k, v) => setData(d => ({ ...d, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!data.accept) return;
    const prev = JSON.parse(localStorage.getItem("myHostedEvents") || "[]");
    const payload = { ...data, id: `host-${Date.now()}` };
    localStorage.setItem("myHostedEvents", JSON.stringify([payload, ...prev]));
    navigate("/host", { state: { justCreated: true } });
  };

  const base = import.meta.env.BASE_URL || "/";

  return (
    <div className="host-new">
      <header className="hn-hero">
        <img className="hn-icon" src={`${base}icons/host.svg`} alt="" />
        <div className="hn-headings">
          <h1>Create your event</h1>
          <p>Fill the basics, set fees, and publish. You can edit or cancel later.</p>
        </div>
      </header>

      <form className="hn-form" onSubmit={submit}>
        {/* BASICS */}
        <section className="card">
          <h3 className="card-title">Basics</h3>
          <div className="grid">
            <div className="field">
              <label>Title</label>
              <input value={data.title} onChange={e=>change("title", e.target.value)} placeholder="e.g. Sunday Night 7-a-side" />
            </div>
            <div className="field">
              <label>Sport</label>
              <select value={data.sport} onChange={e=>change("sport", e.target.value)}>
                <option value="cricket">Cricket</option>
                <option value="football">Football</option>
                <option value="basketball">Basketball</option>
                <option value="badminton">Badminton</option>
                <option value="tennis">Tennis</option>
              </select>
            </div>
            <div className="field">
              <label>City</label>
              <input
                value={data.city}
                onChange={e=>change("city", e.target.value)}
                placeholder="Karachi"
              />
            </div>
            <div className="field">
              <label>Venue</label>
              <input value={data.venue} onChange={e=>change("venue", e.target.value)} placeholder="Aram Bagh Court" />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={data.date} onChange={e=>change("date", e.target.value)} />
            </div>
            <div className="field">
              <label>Time</label>
              <input type="time" value={data.time} onChange={e=>change("time", e.target.value)} />
            </div>
            <div className="field">
              <label>Capacity (teams/players)</label>
              <input type="number" min="2" value={data.capacity} onChange={e=>change("capacity", e.target.value)} />
            </div>
            <div className="field">
              <label>Format</label>
              <select value={data.format} onChange={e=>change("format", e.target.value)}>
                <option>Knockout</option>
                <option>League</option>
                <option>Round Robin</option>
                <option>Friendly / Pickup</option>
              </select>
            </div>
          </div>
        </section>

        {/* 📍 MAP PICKER */}
        <section className="card">
          <h3 className="card-title">Location</h3>

          <div className="grid-2">
            <div className="field">
              <label>Pin on map</label>
              <MapPicker
                city={data.city}
                lat={data.lat}
                lng={data.lng}
                onChange={(lat, lng) => setData(d => ({ ...d, lat, lng }))}
              />
            </div>

            <div className="field">
              <label>Selected coordinates</label>
              <div className="coords-row">
                <input readOnly value={data.lat ?? ""} placeholder="Latitude" />
                <input readOnly value={data.lng ?? ""} placeholder="Longitude" />
              </div>
              <div className="hint">Tip: Click on the map to place the pin. You can move it again by clicking elsewhere.</div>
           <button
  type="button"
  className="btn small danger"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    pos => {
                      const { latitude, longitude } = pos.coords;
                      setData(d => ({ ...d, lat: latitude, lng: longitude }));
                    },
                    () => alert("Couldn’t get your location. Please allow location access.")
                  );
                }}
              >
                Use my location
              </button>
            </div>
          </div>
        </section>

        {/* ORGANIZER */}
        <section className="card">
          <h3 className="card-title">Organizer verification</h3>
          <div className="grid">
            <div className="field">
              <label>Organizer / Institution</label>
              <input value={data.orgName} onChange={e=>change("orgName", e.target.value)} placeholder="e.g. Gulshan Sports Club" />
            </div>
            <div className="field">
              <label>Type</label>
              <select value={data.orgType} onChange={e=>change("orgType", e.target.value)}>
                <option>Club</option><option>Academy</option><option>School</option><option>University</option><option>Corporation</option>
              </select>
            </div>
            <div className="field">
              <label>Registration # / NTN / CNIC (last 6)</label>
              <input value={data.regNo} onChange={e=>change("regNo", e.target.value)} placeholder="e.g. NTN-12345 / CNIC-123456" />
            </div>
            <div className="field">
              <label>Contact phone</label>
              <input value={data.phone} onChange={e=>change("phone", e.target.value)} placeholder="+92-3xx-xxxxxxx" />
            </div>
            <div className="field">
              <label>Contact email</label>
              <input type="email" value={data.email} onChange={e=>change("email", e.target.value)} placeholder="name@email.com" />
            </div>
            <div className="field">
              <label>Letter / Permit (optional)</label>
              <input type="file" accept="image/*,.pdf" />
            </div>
          </div>
          <p className="muted">Your info is used for safety & dispute resolution and is not shown publicly.</p>
        </section>

        {/* FEES */}
        <section className="card">
          <h3 className="card-title">Fees & payments</h3>
          <div className="grid">
            <div className="field">
              <label>Entry type</label>
              <div className="seg">
                <button type="button" className={`seg-btn ${data.entryType==="free"?"on":""}`} onClick={()=>change("entryType","free")}>Free</button>
                <button type="button" className={`seg-btn ${data.entryType==="paid"?"on":""}`} onClick={()=>change("entryType","paid")}>Paid</button>
              </div>
            </div>
            <div className="field">
              <label>Entry fee (Rs)</label>
              <input type="number" min="0" disabled={data.entryType==="free"} value={data.entryFee} onChange={e=>change("entryFee", e.target.value)} />
            </div>
          </div>

          <div className="fee-box">
            <div><span>Entry (you set)</span><b>Rs {feeSummary.fee}</b></div>
            <div><span>Platform fee (7%)</span><b>Rs {feeSummary.platform}</b></div>
            <div className="hr" />
            <div><span>Player pays</span><b>Rs {feeSummary.perSlot}</b></div>
          </div>

          <div className="grid">
            <div className="field">
              <label>Payout method</label>
              <select defaultValue="bank">
                <option value="bank">Bank transfer</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">Easypaisa</option>
              </select>
            </div>
            <div className="field">
              <label>Account title / IBAN / Wallet ID</label>
              <input placeholder="e.g. IBAN PK00HABB.... or 03xx-xxxxxxx" />
            </div>
          </div>
        </section>

        {/* RULES */}
        <section className="card">
          <h3 className="card-title">Rules & notes</h3>
          <div className="grid">
            <div className="field">
              <label>Rules</label>
              <textarea rows="4" value={data.rules} onChange={e=>change("rules", e.target.value)} placeholder="Brief rules: timings, format, kit, fair-play, refunds…" />
            </div>
            <div className="field">
              <label>Notes for players (optional)</label>
              <textarea rows="4" value={data.notes} onChange={e=>change("notes", e.target.value)} placeholder="Parking info, what to bring, waiver, etc." />
            </div>
          </div>
          <label className="check" htmlFor="agree">
            <input
              id="agree"
              type="checkbox"
              checked={data.accept}
              onChange={e=>change("accept", e.target.checked)}
              required
            />
            <span>
              I confirm the details are accurate and I agree to Sportrium’s{" "}
              <Link to="/terms" style={{ textDecoration: "underline", fontWeight: 600 }}>
                Terms &amp; Conditions
              </Link>.
            </span>
          </label>
        </section>

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={()=>navigate("/host")}>Cancel</button>
          <button
            className="btn primary"
            disabled={!data.accept || !data.title || !data.date || !data.city || !data.venue || data.lat==null || data.lng==null}
            title={!data.accept ? "Please accept the Terms & Conditions" : "Publish event"}
          >
            Publish event
          </button>
        </div>
      </form>
    </div>
  );
}

/* -----------------------
   Leaflet Map Picker
------------------------*/
function MapPicker({ city, lat, lng, onChange }) {
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markerRef = useRef(null);
  const LRef = useRef(null);

  // Initialize map once
  useEffect(() => {
    (async () => {
      if (mapObjRef.current) return;
      const L = (await import("leaflet")).default;
      LRef.current = L;

      mapObjRef.current = L.map(mapRef.current, {
        center: lat && lng ? [lat, lng] : PK_CENTER,
        zoom: lat && lng ? 14 : 5,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapObjRef.current);

      // Click to set/update marker
      mapObjRef.current.on("click", (e) => {
        const { lat: clat, lng: clng } = e.latlng;
        addOrMoveMarker(clat, clng);
        onChange(clat, clng);
      });

      // If we already have a position, show it
      if (lat && lng) addOrMoveMarker(lat, lng);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when city changes (if no manual pin yet)
  useEffect(() => {
    const cityKey = (city || "").trim().toLowerCase();
    const target = CITY_CENTERS[cityKey];
    if (!mapObjRef.current || !target) return;
    if (lat == null && lng == null) {
      mapObjRef.current.setView(target, 11);
    }
  }, [city, lat, lng]);

  // Keep marker synced if lat/lng props change externally
  useEffect(() => {
    if (!mapObjRef.current) return;
    if (lat != null && lng != null) addOrMoveMarker(lat, lng, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  function addOrMoveMarker(mlat, mlng, pan = false) {
    const L = LRef.current;
    if (!L) return;

    if (!markerRef.current) {
      // Use a circle marker (no image asset issues)
      markerRef.current = L.circleMarker([mlat, mlng], {
        radius: 9,
        weight: 3,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
      }).addTo(mapObjRef.current);
    } else {
      markerRef.current.setLatLng([mlat, mlng]);
    }
    if (pan) mapObjRef.current.setView([mlat, mlng], 14);
  }

  return <div ref={mapRef} className="map-pick" />;
}
