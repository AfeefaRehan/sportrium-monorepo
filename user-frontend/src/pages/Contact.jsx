// src/pages/Contact.jsx
import { useState } from "react";
import "./contact.css";

/**
 * Email connection:
 * - Quick, no-dependency option using Formspree.
 *   1) Create a free form at https://formspree.io (it gives you an ID like "abcdwxyz").
 *   2) Put that ID below in FORMSPREE_ID.
 *   3) Submissions will be emailed to you.
 * - If you don’t have an ID yet, it will fall back to a mailto link.
 */
const FORMSPREE_ID = "YOUR_FORMSPREE_ID"; // e.g., "mbjvjzze"
const EMAIL_TO = "hello@sportrium.app";

export default function Contact() {
  const [status, setStatus] = useState({ ok: false, msg: "" });

  const mapsEmbed =
    "https://www.google.com/maps?q=Johar+Town,+Lahore,+Pakistan&output=embed";
  const mapsLink =
    "https://www.google.com/maps/search/?api=1&query=Johar+Town,+Lahore,+Pakistan";

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    // If Formspree ID provided, POST; else fallback to mailto:
    if (FORMSPREE_ID && FORMSPREE_ID !== "YOUR_FORMSPREE_ID") {
      try {
        const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(e.currentTarget),
        });
        if (res.ok) {
          setStatus({ ok: true, msg: "Thanks! We’ll reply via email soon." });
          e.currentTarget.reset();
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to send");
      } catch (err) {
        setStatus({ ok: false, msg: "Could not send via form. Try again or use email below." });
      }
    } else {
      const subject = `Contact: ${payload.topic || "General"} — ${payload.name || ""}`;
      const body =
        `Name: ${payload.name || ""}\n` +
        `Email: ${payload.email || ""}\n` +
        `Phone: ${payload.phone || ""}\n` +
        `Topic: ${payload.topic || ""}\n\n` +
        `${payload.message || ""}`;
      window.location.href = `mailto:${EMAIL_TO}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
    }
  }

  return (
    <div className="contact-page" role="main">
   {/* HERO: big heading + lottie on the side */}
<section className="contact-hero">
  <div className="hero-grid">
    <div className="hero-copy">
      <h1>Contact Us</h1>
      <p className="lead">
        We’d love to hear about your matches, venues, or partnerships in Pakistan.
        Tell us what you’re planning and we’ll help you make it happen.
      </p>
      <ul className="hero-points">
        <li>🏟️ Venue & society collaborations</li>
        <li>📅 Hosting tools, schedules & RSVPs</li>
        <li>🎥 Live coverage & highlights</li>
      </ul>
    </div>

    <figure className="hero-media" aria-label="Contact animation">
      <lottie-player
        src="/lottie/contact-hero.json"
        background="transparent"
        speed="1"
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      ></lottie-player>
    </figure>
  </div>
</section>


      {/* TOP GRID: Left = form, Right = map */}
      <div className="top-grid">
        <section className="contact-card" aria-labelledby="form-title">
          <h2 id="form-title" className="visually-hidden">Send us a message</h2>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" placeholder="Your name" required />
            </div>

            <div>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" name="email" placeholder="you@example.com" required />
            </div>

            <div>
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" placeholder="+92 ..." />
            </div>

            <div>
              <label htmlFor="topic">Topic</label>
              <select id="topic" name="topic" defaultValue="General">
                <option>General</option>
                <option>Hosting a Match</option>
                <option>Sponsorship</option>
                <option>Media/Press</option>
                <option>Bug Report</option>
              </select>
            </div>

            <div className="full">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" placeholder="Type your message..." required />
            </div>

            <div className="full">
              <button className="btn blue" type="submit">Send message</button>
              {status.msg && (
                <span className={`form-status ${status.ok ? "ok" : "err"}`}>{status.msg}</span>
              )}
            </div>
          </form>

          <div className="alt-contact">
            Prefer email? <a href={`mailto:${EMAIL_TO}`}>{EMAIL_TO}</a>
          </div>
        </section>

        <aside className="map-card" aria-label="Map">
          <div className="map-head">
            <h3>Find us in Johar Town</h3>
            <a className="btn" href={mapsLink} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          </div>
          <div className="map-wrap">
            <iframe
              title="Johar Town Map"
              src={mapsEmbed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </aside>
      </div>

      {/* LOWER INFO BLOCKS (modern cards) */}
     {/* LOWER INFO BLOCKS — 4 cards in a row */}
<section className="info-grid info-grid--3" aria-label="Contact information">
{/* 1) Address */}
<div className="mini-card address">
  <div className="icn">📍</div>
  <div>
    <h4>Address</h4>
    {/* UPDATED LINES ↓ */}
    <p>Office 12, Block R2</p>
    <p>Johar Town, Lahore 54782, Pakistan</p>
    <a className="chip" href={mapsLink} target="_blank" rel="noreferrer">
      Open in Google Maps
    </a>
  </div>
</div>


  {/* 2) Contact + Social */}
  <div className="mini-card contact">
    <div className="icn">☎️</div>
    <div>
      <h4>Contact</h4>
      <p><a href="tel:+923000000000">+92 300 000 0000</a></p>
      <p><a href={`mailto:${EMAIL_TO}`}>{EMAIL_TO}</a></p>

      <div className="social-icons">
        <a href="#" className="si" aria-label="Facebook"><span>📘</span>Facebook</a>
        <a href="#" className="si" aria-label="Instagram"><span>📸</span>Instagram</a>
        <a href="#" className="si" aria-label="X / Twitter"><span>𝕏</span>X</a>
        <a href="#" className="si" aria-label="YouTube"><span>▶️</span>YouTube</a>
        <a href="#" className="si" aria-label="WhatsApp"><span>💬</span>WhatsApp</a>
      </div>
    </div>
  </div>

  {/* 3) Working Hours — full list day by day */}
  <div className="mini-card hours">
    <div className="icn">🕒</div>
    <div>
      <h4>Working Hours</h4>
      <ul className="hours-list">
        <li><span>Mon</span><span>10:00–18:00</span></li>
        <li><span>Tue</span><span>10:00–18:00</span></li>
        <li><span>Wed</span><span>10:00–18:00</span></li>
        <li><span>Thu</span><span>10:00–18:00</span></li>
        <li><span>Fri</span><span>10:00–18:00</span></li>
        <li><span>Sat</span><span>10:00–18:00</span></li>
        <li><span>Sun</span><span>Closed</span></li>
      </ul>
    </div>
  </div>

  {/* 4) Mini Map
  <div className="mini-card mini-map">
    <div className="mapthumb">
      <iframe
        title="Johar Town Map (thumbnail)"
        src={mapsEmbed}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
    <a className="chip" href={mapsLink} target="_blank" rel="noreferrer">
      View larger map
    </a>
  </div> */}
</section>

    </div>
  );
}
