import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../useAuth';

const fetchRFQs = async () => {
  const { data } = await api.get('/rfqs/');
  return data;
};

// Countdown component with pulsing red effect under 2 minutes
const Countdown = ({ targetDate, status, showLabel = true }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (status !== 'ACTIVE') {
      setTimeLeft('Auction Ended');
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
      
      if (hours === 0 && minutes < 2) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, status]);

  const style = isUrgent ? { color: 'var(--danger-color)', animation: 'pulse 1.5s infinite' } : { color: status === 'ACTIVE' ? 'var(--accent-color)' : 'inherit' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {showLabel && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Closing In</span>}
      <span style={{ fontWeight: 700, ...style }}>{timeLeft}</span>
    </div>
  );
};

const getStatusBadge = (rfq) => {
  if (rfq.status === 'FORCE_CLOSED') {
    return <span className="badge badge-force-closed">🔴 FORCE CLOSED</span>;
  }
  if (rfq.status === 'CLOSED') {
    return <span className="badge badge-closed">⚫ CLOSED</span>;
  }
  
  const isExtended = new Date(rfq.current_close_date).getTime() > new Date(rfq.close_date).getTime();
  if (isExtended) {
    return <span className="badge badge-extended">🟡 EXTENDED</span>;
  }
  
  return <span className="badge badge-active">🟢 ACTIVE</span>;
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

const AuctionCard = ({ rfq, userId }) => {
  const l1 = getL1Price(rfq);
  const extCount = getExtensionCount(rfq);
  const userQuotes = rfq.quotes?.filter(q => q.supplier_id === userId) || [];
  const isWinning = l1 && l1.supplier_id === userId;
  const hasBid = userQuotes.length > 0;

  return (
    <div className="glass-panel auction-card">
      {isWinning && <div className="winning-tag">WINNING</div>}
      
      <div className="card-header">
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{rfq.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {rfq.id.split('-')[0]}...</div>
        </div>
        {getStatusBadge(rfq)}
      </div>

      <div className="l1-badge">
        <div className="l1-label">Current Lowest Bid (L1)</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span className="l1-price">{l1 ? `$${l1.total_amount.toFixed(2)}` : 'No Bids'}</span>
          {l1 && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>by {l1.carrier_name}</span>}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <Countdown targetDate={rfq.current_close_date} status={rfq.status} />
      </div>

      <div className="card-stats">
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bids</div>
            <div style={{ fontWeight: 600 }}>{rfq.quotes?.length || 0}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ext.</div>
            <div style={{ fontWeight: 600, color: extCount > 0 ? '#fcd34d' : 'inherit' }}>+{extCount}</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {hasBid && !isWinning && <span className="outbid-tag">OUTBID</span>}
          <Link to={`/rfqs/${rfq.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {hasBid ? 'Improve Bid' : 'Place Bid'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function RFQList() {
  const { role, userId } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');
  
  const { data: rfqs, isLoading, error } = useQuery({
    queryKey: ['rfqs'],
    queryFn: fetchRFQs,
    refetchInterval: 5000,
  });

  const filteredRFQs = useMemo(() => {
    if (!rfqs) return [];
    return rfqs.filter(rfq => {
      const matchesSearch = rfq.name.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === 'active' ? rfq.status === 'ACTIVE' : rfq.status !== 'ACTIVE';
      return matchesSearch && matchesTab;
    });
  }, [rfqs, activeTab, search]);

  if (isLoading) return <div className="container">Loading auctions...</div>;
  if (error) return <div className="container">Error loading auctions</div>;

  const activeCount = rfqs?.filter(r => r.status === 'ACTIVE').length || 0;
  const pastCount = rfqs?.filter(r => r.status !== 'ACTIVE').length || 0;

  return (
    <div className="container" style={{ paddingTop: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Marketplace</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {role === 'BUYER' ? 'Manage your freight RFQs and monitor competitive activity.' : 'Compete for freight shipments in real-time auctions.'}
          </p>
        </div>
        
        <div className="form-group" style={{ marginBottom: 0, minWidth: '300px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search auctions..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
          Live Auctions ({activeCount})
        </button>
        <button className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}>
          Past Results ({pastCount})
        </button>
      </div>

      {filteredRFQs.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3>No auctions found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search or check back later.</p>
          {role === 'BUYER' && activeTab === 'active' && (
            <Link to="/create" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Create First RFQ</Link>
          )}
        </div>
      ) : (
        <>
          {activeTab === 'active' ? (
            <div className="auction-grid">
              {filteredRFQs.map(rfq => (
                <AuctionCard key={rfq.id} rfq={rfq} userId={userId} />
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '2rem' }}>Reference / Name</th>
                    <th>Status</th>
                    <th>Winner (L1)</th>
                    <th>Extensions</th>
                    <th>Ended On</th>
                    <th style={{ paddingRight: '2rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRFQs.map((rfq) => {
                    const l1 = getL1Price(rfq);
                    const extCount = getExtensionCount(rfq);
                    return (
                      <tr key={rfq.id}>
                        <td style={{ paddingLeft: '2rem' }}>
                          <div style={{ fontWeight: 600 }}>{rfq.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {rfq.id.split('-')[0]}...</div>
                        </td>
                        <td>{getStatusBadge(rfq)}</td>
                        <td>
                          {l1 ? (
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--success-color)' }}>${l1.total_amount.toFixed(2)}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l1.carrier_name}</div>
                            </div>
                          ) : 'No Bids'}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: extCount > 0 ? '#fcd34d' : 'var(--text-secondary)' }}>
                            {extCount > 0 ? `+${extCount} extensions` : 'No extensions'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.9rem' }}>{new Date(rfq.current_close_date).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(rfq.current_close_date).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ paddingRight: '2rem' }}>
                          <Link to={`/rfqs/${rfq.id}`} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                            View Results
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
