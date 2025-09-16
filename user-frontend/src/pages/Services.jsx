import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./services.css";

/**
 * Auth gate:
 * We treat users without localStorage.auth === "1" as guests.
 * Your real login page can set localStorage.setItem("auth","1") after sign-in.
 */
const useAuth = () => Boolean(localStorage.getItem("auth"));

export default function Services() {
  const navigate = useNavigate();
  const isAuthed = useAuth();
  const [gateOpen, setGateOpen] = useState(false);

  const requireLogin = (e) => {
    e.preventDefault();
    if (isAuthed) {
      // take them to Host or the flow you want
      navigate("/host");
    } else {
      setGateOpen(true);
    }
  };

  return (
    <div className="services-page" role="main">
      {/* ===== HERO with video on the right ===== */}
      <section className="services-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Services that level-up community sports</h1>
            <p className="lead">
              Hosting tools, venue partnerships, and live coverage — designed for
              teams, societies, and venues across Pakistan.
            </p>

            <div className="hero-points">
              <div>📅 Create fixtures, RSVPs, reminders</div>
              <div>🏟️ List venues with pricing & slots</div>
              <div>🎥 Go live and share highlight reels</div>
            </div>

            <div className="cta-row">
              <a className="btn blue" href="/live">Watch Live</a>
              <button className="btn red" onClick={requireLogin}>Avail Services</button>
            </div>
          </div>

          {/* Right: tinted video (no layout shift) */}
          <figure className="media tinted" aria-label="Sports highlight video">
            <video
              className="fit"
              src="/media/hero.mp4"
              playsInline
              autoPlay
              muted
              loop
              // poster="/videos/hero-poster.jpg"
            />
            <span className="tint"></span>
          </figure>
        </div>
      </section>

      {/* ===== FEATURE CARDS ===== */}
      <section className="svc-section" aria-labelledby="svc-title">
        <header className="section-head">
          <p className="eyebrow">Features</p>
          <h2 id="svc-title">Our Features & Services</h2>
          <p className="muted">
            Everything you need to run matches, engage players, and grow your club.
          </p>
        </header>

        <div className="svc-grid">
          <article className="svc-card hoverable">
            <div className="icn">📅</div>
            <h3>Host Tools</h3>
            <ul>
              <li>Fixtures with RSVPs & reminders</li>
              <li>Rules & notes for participants</li>
              <li>Attendance export (CSV)</li>
            </ul>
            <button className="btn ghost" onClick={requireLogin}>Avail</button>
          </article>

          <article className="svc-card hoverable">
            <div className="icn">🏟️</div>
            <h3>Venue Partnerships</h3>
            <ul>
              <li>Listing with pricing & time slots</li>
              <li>Contact & booking actions</li>
              <li>Verified badge for partners</li>
            </ul>
            <button className="btn ghost" onClick={requireLogin}>Avail</button>
          </article>

          <article className="svc-card hoverable">
            <div className="icn">🎥</div>
            <h3>Live & Highlights</h3>
            <ul>
              <li>Phone-first streaming hooks</li>
              <li>Auto timestamps for clips</li>
              <li>Shareable reels</li>
            </ul>
            <button className="btn ghost" onClick={requireLogin}>Avail</button>
          </article>

          <article className="svc-card hoverable">
            <div className="icn">👥</div>
            <h3>Teams & Profiles</h3>
            <ul>
              <li>Team pages with roster & form</li>
              <li>Player stats and badges</li>
              <li>Follow & notifications</li>
            </ul>
            <button className="btn ghost" onClick={requireLogin}>Avail</button>
          </article>

          <article className="svc-card hoverable">
            <div className="icn">📊</div>
            <h3>Scores & Standings</h3>
            <ul>
              <li>Scorecards & match reports</li>
              <li>Leaderboards & tables</li>
              <li>Season archives</li>
            </ul>
            <button className="btn ghost" onClick={requireLogin}>Avail</button>
          </article>

          <article className="svc-card hoverable">
            <div className="icn">🛡️</div>
            <h3>Safety & Fair Play</h3>
            <ul>
              <li>Captains’ checklist</li>
              <li>First-aid quick tips</li>
              <li>Easy reporting</li>
            </ul>
            <button className="btn ghost" onClick={requireLogin}>Avail</button>
          </article>
        </div>
      </section>

      {/* ===== SECONDARY BAND with video ===== */}
      <section className="video-band">
        <div className="band-inner">
          <div className="band-copy">
            <h3>Streaming that scales from friendlies to finals</h3>
            <p className="muted">
              Start with a phone and tripod. Upgrade to multi-cam crews for bigger events —
              the same interface, just more angles.
            </p>
            <button className="btn red" onClick={requireLogin}>Get Streaming</button>
          </div>

          <figure className="band-media tinted">
            <video
              className="fit"
              src="/media/feature.mp4"
              playsInline
              autoPlay
              muted
              loop
              poster="/videos/feature-poster.jpg"
            />
            <span className="tint"></span>
          </figure>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="howto">
        <header className="section-head">
          <p className="eyebrow">How it works</p>
          <h2>Three simple steps</h2>
        </header>
        <ol className="steps">
          <li className="step hoverable">
            <span className="bubble">1</span>
            <h4>Create your fixture</h4>
            <p>Add venue, slots, and rules — invite players.</p>
          </li>
          <li className="step hoverable">
            <span className="bubble">2</span>
            <h4>Go live or record</h4>
            <p>Stream with a phone or connect cameras for multi-angle coverage.</p>
          </li>
          <li className="step hoverable">
            <span className="bubble">3</span>
            <h4>Share highlights</h4>
            <p>Auto-generated moments you can post anywhere.</p>
          </li>
        </ol>
      </section>

      {/* ===== CTA ===== */}
 {/* ===== FAQ (animation left, accordion right) ===== */}
<section className="faq-band" aria-labelledby="faq-title">
  <div className="faq-grid">
    {/* Left: you’ll drop your own animation here */}
<aside className="faq-anim with-media" aria-label="FAQ animation">
  <div className="faq-video">
    {/* use ONE of these ↓ */}

    {/* MP4 */}
    <video
      className="fit zoomed focus-center"
      src="/media/FAQ.mp4?v=1"
      playsInline autoPlay muted loop preload="metadata"
    />

    {/* OR an image
    <img src="/media/FAQ.png" alt="FAQ illustration" />
    */}

    {/* OR Lottie
    <lottie-player src="/lottie/faq.json" background="transparent" loop autoplay></lottie-player>
    */}

    <span className="tint"></span>
  </div>
</aside>



    {/* Right: accordion */}
    <div className="faq-wrap">
      <header className="section-head tight">
        <p className="eyebrow">FAQ</p>
        <h2 id="faq-title">Most asked questions</h2>
      </header>

     <div className="accordion" role="list">
  <details className="faq-card" open>
    <summary>What is Sportrium?</summary>
    <div className="faq-body">
      Sportrium connects players, teams, and venues in Pakistan. You can discover matches,
      host fixtures with RSVPs, follow teams, and watch live streams with highlights.
    </div>
  </details>

  <details className="faq-card">
    <summary>Do I need an account to use services?</summary>
    <div className="faq-body">
      Watching most live streams can be done as a guest. To <strong>host matches</strong>,
      <strong>partner your venue</strong>, or <strong>save/follow</strong> teams, you’ll need to
      <a href="/signup">&nbsp;create an account</a>. Guest clicks on “Avail Services” will be asked to log in.
    </div>
  </details>

  <details className="faq-card">
    <summary>How do I host a match or tournament?</summary>
    <div className="faq-body">
      After logging in, go to <a href="/host">Host</a> → create a fixture → add date, venue, rules,
      and invite players. Players get RSVP/reminder notifications, and you can export attendance.
    </div>
  </details>

  <details className="faq-card">
    <summary>Which sports are supported today?</summary>
    <div className="faq-body">
      Football, Cricket, Badminton, Volleyball, and Futsal are first-class. More sports are easy to add;
      tell us what your society needs on the <a href="/contact">Contact</a> page.
    </div>
  </details>

  <details className="faq-card">
    <summary>Can venues and academies partner with Sportrium?</summary>
    <div className="faq-body">
      Yes! We list your turf/court, pricing, and available slots, and mark you as a verified partner.
      Get started via <a href="/contact">Contact</a> or the “Avail Services” button.
    </div>
  </details>

  <details className="faq-card">
    <summary>How does live streaming work?</summary>
    <div className="faq-body">
      Start phone-first (tripod recommended) and upgrade to multi-camera crews for bigger events.
      Streams generate <em>time-stamped highlights</em> you can share on social.
    </div>
  </details>

  <details className="faq-card">
    <summary>Is there a fee?</summary>
    <div className="faq-body">
      During our pilot, hosting tools are <strong>free for societies and partner venues</strong>.
      Venue rental and optional pro streaming crews (if requested) are billed separately.
      We’ll announce pricing before any changes.
    </div>
  </details>

  <details className="faq-card">
    <summary>Can I watch without logging in?</summary>
    <div className="faq-body">
      Most public streams are watchable as a guest. To follow teams, get notifications,
      or leave reviews, please <a href="/signup">sign up</a>.
    </div>
  </details>

  <details className="faq-card">
    <summary>Where are you available?</summary>
    <div className="faq-body">
      We’re focused on Pakistan—starting in Lahore (Johar Town) with campus and community grounds—
      rolling out to other cities based on demand.
    </div>
  </details>

  <details className="faq-card">
    <summary>How do I get support?</summary>
    <div className="faq-body">
      Email us at <a href="mailto:hello@sportrium.app">hello@sportrium.app</a> or use the form on the
      <a href="/contact">Contact</a> page. We usually respond within one business day.
    </div>
  </details>

  <div className="faq-cta">
    <button className="btn red" onClick={requireLogin}>Avail Services</button>

  </div>
</div>
    </div>
  </div>
</section>


      {/* ===== LOGIN GATE MODAL ===== */}
      {gateOpen && (
        <div className="gate" role="dialog" aria-modal="true" aria-label="Login required">
          <div className="gate-card">
            <h3>Sign in to use services</h3>
            <p className="muted">
              You’re currently in guest mode. Please log in or create a free account to
              access hosting tools, venue partnerships, and streaming.
            </p>
            <div className="gate-actions">
              <a className="btn" href="/login">Log in</a>
              <a className="btn blue" href="/signup">Sign up</a>
            </div>
            <button className="gate-close" onClick={()=>setGateOpen(false)} aria-label="Close">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
