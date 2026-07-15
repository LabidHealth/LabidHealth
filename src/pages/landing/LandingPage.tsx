import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, MessageCircle, Sparkles, UserPlus } from 'lucide-react'
import { LabidLogo } from '@/components/LabidLogo'

// Placeholder lead capture — wire to a real form / WhatsApp / Calendly later.
const DEMO = 'mailto:hello@labidhealth.com?subject=Book%20a%20Labid%20Health%20demo'

export function LandingPage() {
  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-nav__brand">
          <LabidLogo size={28} />
          <span>Labid Health</span>
        </div>
        <div className="lp-nav__links">
          <a href="#features">Solutions</a>
          <a href="#features">Diagnostics</a>
          <a href="#pricing">Pricing</a>
          <a href="#pricing">Company</a>
        </div>
        <div className="lp-nav__cta">
          <Link to="/login" className="lp-btn lp-btn--ghost">Sign in</Link>
          <a href={DEMO} className="lp-btn lp-btn--primary">Book a demo</a>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-hero__copy">
          <span className="lp-eyebrow">Clinical precision, offline-first</span>
          <h1>
            Digitize your lab bench. <span className="lp-accent">Kill revenue leakage.</span>
          </h1>
          <p className="lp-hero__lead">
            The operating system for Nigerian diagnostic labs. Patient registration, results delivered over WhatsApp, and
            day-end reconciliation — working with zero internet, on the devices you already have.
          </p>
          <div className="lp-hero__cta">
            <a href={DEMO} className="lp-btn lp-btn--primary lp-btn--lg">
              Book a demo <ArrowRight size={18} />
            </a>
            <a href="#pricing" className="lp-btn lp-btn--outline lp-btn--lg">See pricing</a>
          </div>
          <p className="lp-hero__trust">Built for independent labs across Nigeria · Pay only when you earn</p>
        </div>

        <div className="lp-hero__visual" aria-hidden="true">
          <div className="lp-mock">
            <div className="lp-mock__bar">
              <span className="lp-mock__dot" /><span className="lp-mock__dot" /><span className="lp-mock__dot" />
            </div>
            <div className="lp-mock__body">
              <div className="lp-mock__recon">
                <span className="lp-mock__label">Daily reconciliation</span>
                <span className="lp-mock__value">₦4,192,000 <em>collected</em></span>
                <div className="lp-mock__rows">
                  <div><span>Cash</span><b>₦1,240,000</b></div>
                  <div><span>POS</span><b>₦1,910,000</b></div>
                  <div><span>Transfer</span><b>₦1,042,000</b></div>
                </div>
              </div>
              <div className="lp-mock__wa">
                <MessageCircle size={16} />
                <div>
                  <b>Result ready</b>
                  <span>Sent to patient on WhatsApp · now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="features" className="lp-features">
        <h2>Everything you need to run the lab</h2>
        <p className="lp-section-sub">From registration to final payment — one offline-first system. No spreadsheets, no paper ledgers.</p>
        <div className="lp-feature-grid">
          <article className="lp-feature">
            <span className="lp-feature__icon lp-feature__icon--blue"><UserPlus size={20} /></span>
            <h3>Seamless registration &amp; LABID</h3>
            <p>Register a patient in under two minutes with duplicate detection and a permanent LABID that follows them across every visit.</p>
          </article>
          <article className="lp-feature lp-feature--green">
            <span className="lp-feature__icon lp-feature__icon--onwhite"><MessageCircle size={20} /></span>
            <h3>WhatsApp result delivery</h3>
            <p>Patients get their result the moment it&rsquo;s approved — a secure PDF on the app they already use every day.</p>
          </article>
          <article className="lp-feature">
            <span className="lp-feature__icon lp-feature__icon--blue"><Sparkles size={20} /></span>
            <h3>AI-powered explanations</h3>
            <p>Optional plain-language explanations — in English, Pidgin, or Igbo — so patients understand what their result means.</p>
          </article>
          <article className="lp-feature lp-feature--dark">
            <span className="lp-feature__icon lp-feature__icon--onwhite"><BarChart3 size={20} /></span>
            <h3>Daily reconciliation</h3>
            <p>Every naira collected — by cash, POS, and transfer — reconciled at day-end. Catch leakage before it disappears.</p>
          </article>
        </div>
      </section>

      <section className="lp-stats">
        <div><b>Offline-first</b><span>works through power &amp; network drops</span></div>
        <div><b>₦150–250</b><span>per test — pay only when you earn</span></div>
        <div><b>&lt; 2 min</b><span>patient check-in</span></div>
        <div><b>NDPA</b><span>compliant · data hosted in Africa</span></div>
      </section>

      <section id="pricing" className="lp-cta-band">
        <h2>Ready to modernize your lab?</h2>
        <p>See Labid Health running on your own test menu. Book a free consultation — we set it up with you on-site.</p>
        <div className="lp-cta-band__btns">
          <a href={DEMO} className="lp-btn lp-btn--white">Book a demo</a>
          <a href={DEMO} className="lp-btn lp-btn--ghost-white">Talk to us</a>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer__brand">
          <div className="lp-nav__brand"><LabidLogo size={26} /><span>Labid Health</span></div>
          <p>Lab infrastructure for Africa — offline-first, WhatsApp-native, Naira-billed.</p>
        </div>
        <div className="lp-footer__cols">
          <div>
            <span className="lp-footer__h">Product</span>
            <a href="#features">Diagnostics OS</a>
            <a href="#features">WhatsApp delivery</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <span className="lp-footer__h">Company</span>
            <a href={DEMO}>Book a demo</a>
            <a href={DEMO}>Contact</a>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <span className="lp-badge">● NDPA compliant</span>
          <span className="lp-badge">● Data hosted in Africa</span>
          <span className="lp-footer__copy">© 2026 Labid Health</span>
        </div>
      </footer>
    </div>
  )
}
