import { Link } from 'react-router-dom';
import { useAuth } from '../useAuth';

const FeatureCard = ({ icon, title, description }) => (
  <div className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

const StepCard = ({ number, role, title, description, color }) => (
  <div className="step-card" style={{ borderTop: `3px solid ${color}` }}>
    <div className="step-number" style={{ color }}>{number}</div>
    <div className="step-role" style={{ color }}>{role}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

const AuctionMechanic = ({ title, description, icon, highlight }) => (
  <div className="mechanic-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <strong style={{ color: highlight }}>{title}</strong>
    </div>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{description}</p>
  </div>
);

export default function Home() {
  const { role } = useAuth();

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">British Auction Engine · Real-Time Bidding</div>
        <h1 className="hero-title">
          Competitive Freight Auctions,
          <br />
          <span className="hero-gradient">Built for Speed &amp; Fairness</span>
        </h1>
        <p className="hero-subtitle">
          Velocity RFQ runs British-style reverse auctions where suppliers compete
          on price in real-time. Automatic time extensions reward competitive bidding
          and prevent last-second sniping.
        </p>
        <div className="hero-actions">
          <Link to="/rfqs" className="btn btn-primary btn-lg">
            🏛 View Live Auctions
          </Link>
          {role === 'BUYER' && (
            <Link to="/create" className="btn btn-outline btn-lg">
              + Create New RFQ
            </Link>
          )}
        </div>

        {/* Role Indicator */}
        <div className="role-hint">
          {role === 'BUYER' ? (
            <span>You are logged in as a <strong style={{ color: '#60a5fa' }}>Buyer</strong> — you can create and manage auctions.</span>
          ) : (
            <span>You are logged in as a <strong style={{ color: '#34d399' }}>Supplier</strong> — you can browse and submit competitive bids.</span>
          )}
        </div>
      </section>

      {/* How it Works - Visual Flow */}
      <section className="section">
        <div className="section-header">
          <h2>How a British Auction Works</h2>
          <p>A reverse auction where suppliers bid prices down, not up — driven by time pressure and transparent rankings.</p>
        </div>

        <div className="flow-grid">
          <StepCard
            number="01"
            role="Buyer"
            title="Create an RFQ"
            description="Define your shipment, set the bidding window (close time), a hard deadline (forced close), and your extension rules."
            color="#60a5fa"
          />
          <div className="flow-arrow">→</div>
          <StepCard
            number="02"
            role="Suppliers"
            title="Submit Competitive Bids"
            description="Multiple suppliers submit quotes. The system ranks them by total cost. Each supplier can only bid lower than their own previous quote."
            color="#34d399"
          />
          <div className="flow-arrow">→</div>
          <StepCard
            number="03"
            role="System"
            title="Extensions Fire Automatically"
            description="If a bid is placed within the trigger window (e.g. last 10 mins), the auction extends automatically — preventing last-second sniping."
            color="#f59e0b"
          />
          <div className="flow-arrow">→</div>
          <StepCard
            number="04"
            role="Result"
            title="Auction Closes"
            description="The auction either closes naturally when the timer expires, or hits the hard forced-close deadline. L1 (lowest bid) is the winner."
            color="#a78bfa"
          />
        </div>
      </section>

      {/* British Auction Mechanics */}
      <section className="section">
        <div className="section-header">
          <h2>The Extension Mechanics Explained</h2>
          <p>This is what makes a British Auction different from a standard RFQ — time pressure creates genuine competition.</p>
        </div>

        <div className="mechanics-grid">
          <AuctionMechanic
            icon="⏱"
            title="Trigger Window"
            highlight="#f59e0b"
            description="The last N minutes of an auction. Any qualifying bid placed within this window will trigger a time extension. Example: if set to 10 minutes, bids in the final 10 minutes extend the auction."
          />
          <AuctionMechanic
            icon="⏩"
            title="Extension Duration"
            highlight="#60a5fa"
            description="How many minutes are added to the close time when an extension fires. Example: if set to 5 minutes, the close time is pushed forward by 5 minutes from its current position."
          />
          <AuctionMechanic
            icon="🔒"
            title="Forced Close (Hard Deadline)"
            highlight="#ef4444"
            description="Extensions can never push the close time past this absolute deadline. Once the forced close time is reached, the auction ends regardless of any bidding activity."
          />
          <AuctionMechanic
            icon="🎯"
            title="Trigger Conditions"
            highlight="#34d399"
            description="Choose what triggers an extension: (1) ANY BID placed, (2) ANY RANK CHANGE in the leaderboard, or (3) only when the L1 (winning) position changes hands between suppliers."
          />
        </div>
      </section>

      {/* Role Guide */}
      <section className="section">
        <div className="section-header">
          <h2>Your Role on This Platform</h2>
          <p>Use the Role Switcher in the top-right corner to toggle between Buyer and Supplier perspectives.</p>
        </div>

        <div className="grid-2" style={{ gap: '1.5rem' }}>
          <div className="role-card role-buyer">
            <div className="role-card-header">
              <span className="role-emoji">🏢</span>
              <h3>Buyer</h3>
            </div>
            <ul>
              <li>✅ Create new RFQ auctions</li>
              <li>✅ Set auction duration and rules</li>
              <li>✅ Choose extension trigger type</li>
              <li>✅ View all supplier bids and rankings</li>
              <li>✅ Monitor live auction activity</li>
              <li>❌ Cannot submit bids</li>
            </ul>
          </div>

          <div className="role-card role-supplier">
            <div className="role-card-header">
              <span className="role-emoji">🚢</span>
              <h3>Supplier</h3>
            </div>
            <ul>
              <li>✅ Browse all active auctions</li>
              <li>✅ Submit competitive bids</li>
              <li>✅ View live rankings and your position</li>
              <li>✅ Re-bid at a lower price to reclaim L1</li>
              <li>❌ Cannot bid higher than your previous bid</li>
              <li>❌ Cannot create RFQs</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="section">
        <div className="section-header">
          <h2>Platform Highlights</h2>
        </div>
        <div className="grid-3 features-grid">
          <FeatureCard icon="⚡" title="Real-Time WebSockets" description="Bid updates and timer extensions appear instantly across all browser windows without any page refresh." />
          <FeatureCard icon="🔐" title="Race-Condition Safe" description="PostgreSQL row-level locking ensures two simultaneous bids are processed safely without data corruption." />
          <FeatureCard icon="🕐" title="Celery Background Jobs" description="Auction closures are managed by Celery + Redis, ensuring timers survive server restarts and are never lost." />
          <FeatureCard icon="📊" title="Live Bid Rankings" description="All bids are ranked by total cost (freight + origin + destination). L1 always shows the current best price." />
          <FeatureCard icon="📝" title="Full Activity Log" description="Every bid submission and every extension is logged with a timestamp, giving a full audit trail of the auction." />
          <FeatureCard icon="🛡" title="Business Rules Enforced" description="Suppliers cannot bid equal to or above their previous lowest bid, maintaining auction integrity." />
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to see it in action?</h2>
        <p>Three demo auctions are pre-loaded — one active (with live bids), one closed, and one force-closed — so you can explore the full lifecycle immediately.</p>
        <div className="hero-actions">
          <Link to="/rfqs" className="btn btn-primary btn-lg">
            🏛 View Live Auctions
          </Link>
        </div>
      </section>
    </div>
  );
}
