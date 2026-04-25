import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../useAuth';

const fetchRFQs = async () => {
  const { data } = await api.get('/rfqs/');
  return data;
};

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
        setTimeLeft('Expired');
        setIsUrgent(false);
        return;
      }

      const h = Math.floor((distance % (86400000)) / 3600000);
      const m = Math.floor((distance % 3600000) / 60000);
      const s = Math.floor((distance % 60000) / 1000);

      setTimeLeft(`${h}h ${m}m ${s}s`);
      setIsUrgent(h === 0 && m < 2);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, status]);

  return (
    <span style={{ 
      color: isUrgent ? 'var(--danger-color)' : 'var(--text-header)',
      fontWeight: 700 
    }}>
      {timeLeft}
    </span>
  );
};

const StatusBadge = ({ rfq }) => {
  if (rfq.status === 'FORCE_CLOSED') return <span className="badge badge-danger">Force Closed</span>;
  if (rfq.status === 'CLOSED') return <span className="badge badge-closed">Closed</span>;
  
  const isExtended = new Date(rfq.current_close_date).getTime() > new Date(rfq.close_date).getTime();
  if (isExtended) return <span className="badge badge-extended">Extended</span>;
  
  return <span className="badge badge-active">Active</span>;
};

const AuctionCard = ({ rfq, userId }) => {
  const l1 = useMemo(() => {
    if (!rfq.quotes || rfq.quotes.length === 0) return null;
    return [...rfq.quotes].sort((a, b) => a.total_amount - b.total_amount)[0];
  }, [rfq.quotes]);

  const isWinning = l1 && l1.supplier_id === userId;
  const hasBid = rfq.quotes?.some(q => q.supplier_id === userId);

  return (
    <div className="card auction-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{rfq.name}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>#{rfq.id.split('-')[0]}</p>
        </div>
        <StatusBadge rfq={rfq} />
      </div>

      <div style={{ margin: '12px 0', padding: '12px', background: 'rgba(139, 148, 158, 0.05)', borderRadius: '6px' }}>
        <div className="card-label" style={{ marginBottom: '4px' }}>Current L1 Price</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="card-value" style={{ color: isWinning ? 'var(--success-color)' : 'var(--text-header)' }}>
            {l1 ? `$${l1.total_amount.toFixed(2)}` : '--'}
          </span>
          {isWinning && <span className="winning-indicator">WINNING</span>}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {l1 ? `by ${l1.carrier_name}` : 'Awaiting bids'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
        <div>
          <div className="card-label">Time Remaining</div>
          <Countdown targetDate={rfq.current_close_date} status={rfq.status} />
        </div>
        <Link to={`/rfqs/${rfq.id}`} className={`btn ${hasBid ? 'btn-outline' : 'btn-primary'}`}>
          {hasBid ? 'Manage Bid' : 'View Auction'}
        </Link>
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

  const filtered = useMemo(() => {
    if (!rfqs) return [];
    return rfqs.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === 'active' ? r.status === 'ACTIVE' : r.status !== 'ACTIVE';
      return matchSearch && matchTab;
    });
  }, [rfqs, activeTab, search]);

  if (isLoading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Auctions Marketplace</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {role === 'BUYER' ? 'Monitor your active freight RFQs.' : 'Find and compete for freight shipments.'}
          </p>
        </div>
        <input 
          type="text" 
          className="form-control" 
          style={{ width: '280px' }}
          placeholder="Search auctions..." 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
          Active
        </button>
        <button className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}>
          Past
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No auctions found matching your criteria.</p>
        </div>
      ) : (
        <div className="auction-grid">
          {filtered.map(r => <AuctionCard key={r.id} rfq={r} userId={userId} />)}
        </div>
      )}
    </div>
  );
}
