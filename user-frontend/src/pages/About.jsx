// src/pages/About.jsx
import { useState } from "react";
import "./about.css";

export default function About() {
  // demo reviews (client-side only)
  const [reviews, setReviews] = useState([
    { name: "Ayesha F.", rating: 5, text: "Seamless for organizing weekend football!" },
    { name: "Hassan R.", rating: 4, text: "Love the fixtures and reminders." },
  ]);
  const [form, setForm] = useState({ name: "", email: "", rating: 5, text: "" });

  function submitReview(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.text) return;
    setReviews([{ name: form.name, rating: Number(form.rating), text: form.text }, ...reviews]);
    setForm({ name: "", email: "", rating: 5, text: "" });
  }

  return (
    <div className="about-page" role="main">
      {/* ===== HERO ===== */}
      <header className="about-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Sportrium • Pakistan</span>
            <h1>We connect players, venues, and fans to make community sports effortless.</h1>
            <p className="lead">
              Discover matches, host fixtures, go live, and follow teams across Pakistan —
              all in one place, on any phone.
            </p>

            <div className="cta-row">
              <a className="btn blue" href="/live">Watch Live</a>
              {/* now red with WHITE text by default */}
              <a className="btn host-red" href="/host">Host a Match</a>
            </div>

            <div className="stats-row" aria-label="Key metrics">
              <div className="stat"><div className="num">300+</div><div className="lbl">Matches hosted</div></div>
              <div className="stat"><div className="num">1,800+</div><div className="lbl">Registered players</div></div>
              <div className="stat"><div className="num">40+</div><div className="lbl">Partner venues</div></div>
            </div>
          </div>

          {/* Lottie animation in hero (already added earlier) */}
          <figure className="hero-media">
            <lottie-player
              src="/lottie/sports-hero.json"
              background="transparent"
              speed="1"
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
              aria-label="Sports animation"
            ></lottie-player>
          </figure>
        </div>
      </header>

      {/* ===== PARTNERS / COLLABS ===== */}
      <section className="partners" aria-labelledby="partners-title">
        <div className="partners-head">
          <h2 id="partners-title" className="section-title">University & Academy Collaborations</h2>
          <p className="muted small">Sample names for layout — replace with your confirmed partners.</p>
        </div>

        {/* enhanced partner box */}
        <div className="partners-card hoverable">
          <div className="chips chips--logos">
            <span className="chip chip--tag" title="Lahore University of Management Sciences">
              🎓 LUMS Sports Society
            </span>
            <span className="chip chip--tag">🏗️ UET Lahore Sports Council</span>
            <span className="chip chip--tag">🛡️ UCP Knights</span>
            <span className="chip chip--tag">🏅 NUST Olympians</span>
            <span className="chip chip--tag">📈 IBA Karachi Sports</span>
            <span className="chip chip--tag">🔬 GIKI Sports Club</span>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE PROVIDE ===== */}
      <section className="features" aria-labelledby="features-title">
        <h2 id="features-title" className="section-title">What we provide</h2>
        <div className="grid">
          <article className="f-card hoverable">
            <div className="icn">🔎</div>
            <h3>Match Discovery</h3>
            <p>City & sport filters, team/player pages, reminders, and notifications.</p>
          </article>
          <article className="f-card hoverable">
            <div className="icn">📅</div>
            <h3>Host Tools</h3>
            <p>Create fixtures, manage RSVPs, share rules, and export attendance.</p>
          </article>
          <article className="f-card hoverable">
            <div className="icn">🎥</div>
            <h3>Live & Highlights</h3>
            <p>Phone-first streaming hooks, auto clips, and shareable reels.</p>
          </article>
          <article className="f-card hoverable">
            <div className="icn">🏟️</div>
            <h3>Venue Listings</h3>
            <p>Turfs & courts with pricing, time slots, and booking contacts.</p>
          </article>
          <article className="f-card hoverable">
            <div className="icn">📊</div>
            <h3>Scores & Stats</h3>
            <p>Scorecards, standings, player stats, and team form in one feed.</p>
          </article>
          <article className="f-card hoverable">
            <div className="icn">🛡️</div>
            <h3>Safety & Fair Play</h3>
            <p>Captain checklist, first-aid references, and easy reporting.</p>
          </article>
        </div>
      </section>

      {/* ===== FOUNDER MESSAGE + LOTTIE ===== */}
    {/* ===== FOUNDER MESSAGE + LOTTIE ===== */}
<section className="founder" aria-labelledby="founder-title">
  <h2 id="founder-title" className="section-title">Founder’s message</h2>

  <div className="founder-grid">
    <div className="founder-card hoverable">
      <div className="avatar">MK</div>
      <div className="copy">
        <h3>Maira Khan</h3>
        <p>
          Our mission is to bring community sports to every neighborhood and campus —
          where players find games, hosts get helpful tools, and families can watch live.
          We’re building a platform that works great on any phone and scales from
          weekend friendlies to inter-university fixtures.
        </p>
        <p>
          If you run a venue, academy, or society and want to streamline fixtures,
          attendance, streaming, and communication, let’s collaborate and make it easier
          for everyone to play.
        </p>
        <a className="btn partner-blue" href="/contact">Partner with us</a>
      </div>
    </div>

    {/* handshake Lottie stays on the right */}
    <aside className="founder-anim hoverable" aria-label="Partnership animation">
      <lottie-player
        src="/lottie/handshake.json"
        background="transparent"
        speed="1"
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      ></lottie-player>
    </aside>
  </div>
</section>


      {/* ===== REVIEWS ===== */}
    {/* ===== REVIEWS ===== */}
<section className="reviews" aria-labelledby="reviews-title">
  <h2 id="reviews-title" className="section-title">Reviews</h2>

  {/* one row: left = lottie, right = form */}
  <div className="reviews-grid">
    <aside className="reviews-anim hoverable" aria-label="Reviews animation">
      <lottie-player
        src="/lottie/reviews.json"
        background="transparent"
        speed="1"
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      ></lottie-player>
    </aside>

    {/* Add review form */}
    <form className="review-card hoverable" onSubmit={submitReview}>
      <h3>Add your review</h3>
      <div className="rev-grid">
        <div>
          <label htmlFor="rname">Name</label>
          <input id="rname" value={form.name}
            onChange={e=>setForm({...form, name:e.target.value})}
            placeholder="Your name" required />
        </div>
        <div>
          <label htmlFor="remail">Email</label>
          <input id="remail" type="email" value={form.email}
            onChange={e=>setForm({...form, email:e.target.value})}
            placeholder="you@example.com" required />
        </div>
        <div className="full">
          <label>Rating</label>
          <div className="stars">
            {[1,2,3,4,5].map(n=>(
              <button
                key={n}
                type="button"
                className={n <= form.rating ? "star on" : "star"}
                onClick={()=>setForm({...form, rating:n})}
                aria-label={`Rate ${n} star${n>1?"s":""}`}
              >★</button>
            ))}
          </div>
        </div>
        <div className="full">
          <label htmlFor="rtext">Review</label>
          <textarea id="rtext" value={form.text}
            onChange={e=>setForm({...form, text:e.target.value})}
            placeholder="Tell us about your experience…" required />
        </div>
        <div className="full">
          <button className="btn blue" type="submit">Submit review</button>
        </div>
      </div>
    </form>
  </div>

  {/* existing reviews list stays under the row */}
  <div className="review-list">
    {reviews.map((r, i)=>(
      <div className="review-item hoverable" key={i}>
        <div className="review-head">
          <strong>{r.name}</strong>
          <span className="stars-inline">
            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
          </span>
        </div>
        <p>{r.text}</p>
      </div>
    ))}
  </div>
</section>


      {/* ===== CTA / NEWSLETTER ===== */}
      <section className="cta-band" aria-label="Stay updated">
        <div className="cta-content">
          <h2>Want updates?</h2>
          <p>Weekly fixtures, trials, and host features in your inbox.</p>
          <form className="subscribe" onSubmit={(e)=>{e.preventDefault(); window.location.href='/signup';}}>
            <input type="email" placeholder="you@example.com" required />
         <button className="btn light-blue" type="submit">Subscribe</button>

          </form>
        </div>
      </section>
    </div>
  );
}
