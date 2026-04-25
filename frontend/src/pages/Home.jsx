import { Link } from 'react-router-dom';
import { useAuth } from '../useAuth';

const StepCard = ({ number, role, title, description, borderColor }) => (
  <div className="panel" style={{ borderTop: `4px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div style={{ color: borderColor, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>Step {number} • {role}</div>
    <h3 style={{ fontSize: '18px' }}>{title}</h3>
    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</p>
  </div>
);

export default function Home() {
  const { role } = useAuth();

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ 
          display: 'inline-block', 
          padding: '4px 12px', 
          background: 'rgba(35, 134, 54, 0.1)', 
          border: '1px solid rgba(35, 134, 54, 0.2)', 
          borderRadius: '20px',
          color: 'var(--success-color)',
          fontSize: '12px',
          fontWeight: 600
        }}>
          British Auction RFQ System
        </div>
        <h1 style={{ fontSize: '48px', maxWidth: '800px', lineHeight: 1.1 }}>
          The Standard for Competitive Freight Procurement
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.6 }}>
          Run real-time, reverse auctions that eliminate last-second sniping and ensure the best market price through automated time extensions.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Link to="/rfqs" className="btn btn-primary btn-lg">🏛 Browse Auctions</Link>
          {role === 'BUYER' && <Link to="/create" className="btn btn-outline btn-lg">+ Create RFQ</Link>}
        </div>
      </section>

      {/* Mechanics Grid */}
      <section style={{ marginTop: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '28px', marginBottom: '1rem' }}>How it Works</h2>
          <p style={{ color: 'var(--text-secondary)' }}>A multi-step competitive bidding process for professional logistics.</p>
        </div>
        
        <div className="grid-2" style={{ gap: '1.5rem' }}>
          <StepCard 
            number="01" role="Buyer" title="Configure RFQ" 
            description="Define shipment details and extension parameters (Trigger window, extension duration, and forced close time)."
            borderColor="var(--accent-color)"
          />
          <StepCard 
            number="02" role="Suppliers" title="Place Bids" 
            description="Suppliers submit quotes. The system automatically ranks them in real-time, showing L1, L2, and L3 positions."
            borderColor="var(--success-color)"
          />
          <StepCard 
            number="03" role="System" title="Auto-Extension" 
            description="Bids placed in the final minutes extend the timer, giving all participants a fair chance to react and counter-bid."
            borderColor="var(--warning-color)"
          />
          <StepCard 
            number="04" role="Result" title="Final Award" 
            description="When the timer expires or hits the hard deadline, the lowest bidder (L1) is clearly identified as the winner."
            borderColor="var(--indigo-color)"
          />
        </div>
      </section>

      {/* Design Philosophy */}
      <section style={{ marginTop: '6rem', padding: '4rem', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <div className="grid-2" style={{ alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '1.5rem' }}>Precision Engineering</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ color: 'var(--accent-color)', marginBottom: '4px' }}>Real-Time Synchronization</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Full WebSocket integration ensures every participant sees the same timer and the same L1 price at the same millisecond.</p>
              </div>
              <div>
                <h4 style={{ color: 'var(--success-color)', marginBottom: '4px' }}>Atomic Transactions</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>PostgreSQL row-level locks prevent race conditions during heavy bidding activity. Every bid is recorded with 100% integrity.</p>
              </div>
              <div>
                <h4 style={{ color: 'var(--warning-color)', marginBottom: '4px' }}>Durable Closures</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Celery background workers manage auction closures independently of the API server, ensuring persistence through restarts.</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '120px' }}>⚡</div>
        </div>
      </section>

      {/* Role Switcher Note */}
      <section style={{ marginTop: '6rem', textAlign: 'center', paddingBottom: '4rem' }}>
        <div style={{ background: 'var(--surface-color)', display: 'inline-block', padding: '1.5rem 3rem', border: '1px solid var(--border-color)', borderRadius: '40px' }}>
          <p style={{ fontSize: '16px' }}>
            Current View: <strong style={{ color: role === 'BUYER' ? 'var(--accent-color)' : 'var(--success-color)' }}>{role} Mode</strong>
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Use the role switcher in the navigation bar to test different permissions.
          </p>
        </div>
      </section>
    </div>
  );
}
