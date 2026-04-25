import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useEffect, useState } from 'react';

const fetchRFQs = async () => {
  const { data } = await api.get('/rfqs/');
  return data;
};

// Countdown component with pulsing red effect under 2 minutes
const Countdown = ({ targetDate, status }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (status !== 'ACTIVE') {
      setTimeLeft('Ended');
      setIsUrgent(false);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('Time up!');
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      
      // Urgent if less than 2 minutes
      if (hours === 0 && minutes < 2) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, status]);

  const style = isUrgent ? { color: 'var(--danger-color)', animation: 'pulse 1.5s infinite' } : { color: status === 'ACTIVE' ? 'var(--accent-color)' : 'inherit' };

  return <span style={{ fontWeight: 600, ...style }}>{timeLeft}</span>;
};

const getStatusBadge = (rfq) => {
  if (rfq.status === 'FORCE_CLOSED') {
    return <span className="badge badge-force-closed" title="Hit hard deadline">🔴 FORCE CLOSED</span>;
  }
  if (rfq.status === 'CLOSED') {
    return <span className="badge badge-closed" title="Ended naturally">⚫ CLOSED</span>;
  }
  
  // If ACTIVE and extended
  const isExtended = new Date(rfq.current_close_date).getTime() > new Date(rfq.close_date).getTime();
  if (isExtended) {
    return <span className="badge badge-extended" title="Timer was extended">🟡 EXTENDED</span>;
  }
  
  return <span className="badge badge-active" title="Bidding open">🟢 ACTIVE</span>;
};

const getExtensionCount = (rfq) => {
  if (!rfq.activity_logs) return 0;
  return rfq.activity_logs.filter(log => log.type === 'EXTENDED').length;
};

const getL1Price = (rfq) => {
  if (!rfq.quotes || rfq.quotes.length === 0) return null;
  const sorted = [...rfq.quotes].sort((a, b) => a.total_amount - b.total_amount);
  return sorted[0];
};

export default function RFQList() {
  const { data: rfqs, isLoading, error } = useQuery({
    queryKey: ['rfqs'],
    queryFn: fetchRFQs,
    refetchInterval: 5000,
  });

  if (isLoading) return <div>Loading auctions...</div>;
  if (error) return <div>Error loading auctions</div>;

  return (
    <div className="glass-panel">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Auctions Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Monitor live British auctions and view historical results. 
          Extended auctions indicate high competitive activity.
        </p>
      </div>
      
      {rfqs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Create your first RFQ</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>No auctions have been created yet. Be the first to start a British Auction.</p>
          <Link to="/create" className="btn btn-primary">Create New RFQ</Link>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Reference / Name</th>
                <th>Status</th>
                <th>Current Lowest Bid (L1)</th>
                <th>Extensions</th>
                <th>Current Close Time</th>
                <th>Forced Close</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((rfq) => {
                const extCount = getExtensionCount(rfq);
                const l1 = getL1Price(rfq);
                return (
                  <tr key={rfq.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rfq.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {rfq.id.split('-')[0]}...</div>
                    </td>
                    <td>
                      {getStatusBadge(rfq)}
                    </td>
                    <td>
                      {l1 ? (
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--success-color)', fontSize: '1rem' }}>${l1.total_amount.toFixed(2)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l1.carrier_name}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No bids yet</span>
                      )}
                    </td>
                    <td>
                      {extCount > 0 ? (
                        <span style={{ fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                          +{extCount} extensions
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No extensions</span>
                      )}
                    </td>
                    <td>
                      <Countdown targetDate={rfq.current_close_date} status={rfq.status} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {new Date(rfq.current_close_date).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {new Date(rfq.forced_close_date).toLocaleString()}
                    </td>
                    <td>
                      <Link to={`/rfqs/${rfq.id}`} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
