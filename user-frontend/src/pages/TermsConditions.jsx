import { useEffect, useMemo, useState } from "react";
import "./terms-conditions.css";

export default function TermsConditions() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const printPage = () => window.print();

  // Keep this list in sync with the <section id="..."> below
  const sectionIds = useMemo(
    () => [
      "acceptance",
      "eligibility",
      "accounts",
      "use",
      "content",
      "teams",
      "payments",
      "ip",
      "privacy",
      "thirdparty",
      "disclaimer",
      "liability",
      "indemnity",
      "termination",
      "governing",
      "changes",
      "contact",
    ],
    []
  );

  const [activeId, setActiveId] = useState(sectionIds[0]);

  // Scroll spy: highlight active section while scrolling
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { root: null, threshold: [0.15, 0.35, 0.6], rootMargin: "-15% 0px -55% 0px" }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.scrollMarginTop = "90px";
        io.observe(el);
      }
    });

    return () => io.disconnect();
  }, [sectionIds]);

  return (
    <div className="terms-page">
      {/* HERO */}
      <header className="tc-hero">
        <div className="tc-hero-row">
          <span className="doc-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6" />
            </svg>
          </span>
          <div>
            <h1>Terms & Conditions</h1>
            <p className="subtitle">
              Please read these terms carefully. By using Sportrium, you agree to the following Terms & Conditions.
            </p>
            <div className="meta">
              <span className="badge">Last updated: 11 Sep 2025</span>
              <span className="badge">Applies to guests & signed-in users</span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="btn primary" onClick={printPage} aria-label="Print">
              Print
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT GRID */}
      <div className="tc-grid">
        {/* TOC */}
        <aside className="tc-toc" aria-label="Table of contents">
          <nav>
            <div className="toc-title">On this page</div>
            {/* NOTE: no leading numbers in the link text.
                Numbers are injected via CSS counters so there’s no double numbering. */}
            <ol>
              <li><a className={activeId==="acceptance" ? "active": ""} href="#acceptance" aria-current={activeId==="acceptance"?"location":undefined} onClick={()=>setActiveId("acceptance")}>Acceptance of Terms</a></li>
              <li><a className={activeId==="eligibility" ? "active": ""} href="#eligibility" aria-current={activeId==="eligibility"?"location":undefined} onClick={()=>setActiveId("eligibility")}>Eligibility</a></li>
              <li><a className={activeId==="accounts" ? "active": ""} href="#accounts" aria-current={activeId==="accounts"?"location":undefined} onClick={()=>setActiveId("accounts")}>Accounts & Security</a></li>
              <li><a className={activeId==="use" ? "active": ""} href="#use" aria-current={activeId==="use"?"location":undefined} onClick={()=>setActiveId("use")}>Acceptable Use</a></li>
              <li><a className={activeId==="content" ? "active": ""} href="#content" aria-current={activeId==="content"?"location":undefined} onClick={()=>setActiveId("content")}>User Content</a></li>
              <li><a className={activeId==="teams" ? "active": ""} href="#teams" aria-current={activeId==="teams"?"location":undefined} onClick={()=>setActiveId("teams")}>Teams, Events & Listings</a></li>
              <li><a className={activeId==="payments" ? "active": ""} href="#payments" aria-current={activeId==="payments"?"location":undefined} onClick={()=>setActiveId("payments")}>Payments & Refunds</a></li>
              <li><a className={activeId==="ip" ? "active": ""} href="#ip" aria-current={activeId==="ip"?"location":undefined} onClick={()=>setActiveId("ip")}>Intellectual Property</a></li>
              <li><a className={activeId==="privacy" ? "active": ""} href="#privacy" aria-current={activeId==="privacy"?"location":undefined} onClick={()=>setActiveId("privacy")}>Privacy</a></li>
              <li><a className={activeId==="thirdparty" ? "active": ""} href="#thirdparty" aria-current={activeId==="thirdparty"?"location":undefined} onClick={()=>setActiveId("thirdparty")}>Third-Party Links</a></li>
              <li><a className={activeId==="disclaimer" ? "active": ""} href="#disclaimer" aria-current={activeId==="disclaimer"?"location":undefined} onClick={()=>setActiveId("disclaimer")}>Disclaimers</a></li>
              <li><a className={activeId==="liability" ? "active": ""} href="#liability" aria-current={activeId==="liability"?"location":undefined} onClick={()=>setActiveId("liability")}>Limitation of Liability</a></li>
              <li><a className={activeId==="indemnity" ? "active": ""} href="#indemnity" aria-current={activeId==="indemnity"?"location":undefined} onClick={()=>setActiveId("indemnity")}>Indemnification</a></li>
              <li><a className={activeId==="termination" ? "active": ""} href="#termination" aria-current={activeId==="termination"?"location":undefined} onClick={()=>setActiveId("termination")}>Suspension & Termination</a></li>
              <li><a className={activeId==="governing" ? "active": ""} href="#governing" aria-current={activeId==="governing"?"location":undefined} onClick={()=>setActiveId("governing")}>Governing Law & Disputes</a></li>
              <li><a className={activeId==="changes" ? "active": ""} href="#changes" aria-current={activeId==="changes"?"location":undefined} onClick={()=>setActiveId("changes")}>Changes to These Terms</a></li>
              <li><a className={activeId==="contact" ? "active": ""} href="#contact" aria-current={activeId==="contact"?"location":undefined} onClick={()=>setActiveId("contact")}>Contact Us</a></li>
            </ol>
          </nav>
        </aside>

        {/* MAIN */}
        <main className="tc-content">
          <section id="acceptance">
            <h2>1. Acceptance of Terms</h2>
            <p>
              These Terms & Conditions (“Terms”) govern your access to and use of the Sportrium platform (the “Service”). By visiting,
              creating an account, joining teams, hosting events, purchasing tickets, or otherwise using the Service, you agree to be
              bound by these Terms and all applicable laws. If you do not agree, please do not use Sportrium.
            </p>
          </section>

          <section id="eligibility">
            <h2>2. Eligibility</h2>
            <ul>
              <li>You must be at least 13 years old to use the Service.</li>
              <li>If you are under the age of majority in your region, you must have consent from a parent or legal guardian.</li>
              <li>By using Sportrium, you confirm that you have the legal authority to enter into these Terms.</li>
            </ul>
          </section>

          <section id="accounts">
            <h2>3. Accounts & Security</h2>
            <ul>
              <li>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</li>
              <li>Provide accurate, current information and promptly update any changes.</li>
              <li>We may suspend or terminate accounts that violate these Terms or pose a security risk to the platform or other users.</li>
            </ul>
          </section>

          <section id="use">
            <h2>4. Acceptable Use</h2>
            <p>Do not, and do not attempt to:</p>
            <ul>
              <li>Engage in fraud, harassment, hate speech, or any illegal activity.</li>
              <li>Interfere with or disrupt the Service or attempt to bypass security.</li>
              <li>Impersonate others or misrepresent your affiliation.</li>
              <li>Post content that infringes others’ rights.</li>
            </ul>
          </section>

          <section id="content">
            <h2>5. User Content</h2>
            <p>
              You retain ownership of content you submit. By submitting content, you grant Sportrium a worldwide, non-exclusive,
              royalty-free license to use, host, reproduce, modify, and display such content solely to operate and improve the Service.
            </p>
            <p>We may remove content that violates these Terms or applicable law.</p>
          </section>

          <section id="teams">
            <h2>6. Teams, Events & Listings</h2>
            <ul>
              <li>Hosts are responsible for accuracy and legal compliance.</li>
              <li>We are not a party to transactions unless explicitly stated.</li>
              <li>We may feature or de-list teams/events at our discretion.</li>
            </ul>
          </section>

          <section id="payments">
            <h2>7. Payments & Refunds</h2>
            <p>
              Payments are processed by third-party providers. Refunds follow the event/team policy unless required by law. Processing
              fees may be non-refundable.
            </p>
          </section>

          <section id="ip">
            <h2>8. Intellectual Property</h2>
            <p>
              The Sportrium name, logo, designs, and software are our property or licensed to us. You may not copy, distribute, modify,
              reverse-engineer, or create derivative works without permission.
            </p>
          </section>

          <section id="privacy">
            <h2>9. Privacy</h2>
            <p>
              Your use is also governed by our{" "}
              <a className="link" href="/privacy">Privacy Policy</a>.
            </p>
          </section>

          <section id="thirdparty">
            <h2>10. Third-Party Links</h2>
            <p>We are not responsible for third-party sites or services you access via links in the platform.</p>
          </section>

          <section id="disclaimer">
            <h2>11. Disclaimers</h2>
            <p className="note">
              <strong>As-Is.</strong> The Service is provided “as is” and “as available” without warranties of any kind.
            </p>
          </section>

          <section id="liability">
            <h2>12. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Sportrium and its affiliates shall not be liable for indirect or consequential
              damages, or any loss of profits or data.
            </p>
          </section>

          <section id="indemnity">
            <h2>13. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Sportrium from claims arising from your use of the Service or violation
              of these Terms.
            </p>
          </section>

          <section id="termination">
            <h2>14. Suspension & Termination</h2>
            <p>
              We may suspend or terminate your access at any time for conduct that violates these Terms or risks the integrity of the
              Service.
            </p>
          </section>

          <section id="governing">
            <h2>15. Governing Law & Disputes</h2>
            <p>These Terms are governed by the laws of Pakistan. You agree to the exclusive jurisdiction of courts in Lahore, Pakistan.</p>
          </section>

          <section id="changes">
            <h2>16. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. Continued use after changes become effective constitutes acceptance.</p>
          </section>

          <section id="contact">
            <h2>17. Contact Us</h2>
            <p>
              Email us at{" "}
              <a className="link" href="mailto:contact@sportrium.pk">contact@sportrium.pk</a>.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
