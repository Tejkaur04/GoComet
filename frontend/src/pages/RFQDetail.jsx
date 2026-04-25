import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api, getWSUrl } from '../api';
import { useEffect, useState, useRef, useMemo } from 'react';
import QuoteForm from '../components/QuoteForm';
import { useAuth } from '../useAuth';

const fetchRFQDetails = async (id) => {
  const { data } = await api.get(`/rfqs/${id}`);
  return data;
};

const Countdown = ({ targetDate, status }) => {
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
      if (hours === 0 && minutes < 2) setIsUrgent(true);
      else setIsUrgent(false);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, status]);

  const style = isUrgent ? { color: 'var(--danger-color)', animation: 'pulse 1.5s infinite' } : { color: status === 'ACTIVE' ? 'var(--accent-color)' : 'inherit' };
  return <span style={{ fontWeight: 800, fontSize: '1.5rem', ...style }}>{timeLeft}</span>;
};

export default function RFQDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { role, userId } = useAuth();
  const [wsConnected, setWsConnected] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const ws = useRef(null);

  const { data: rfq, isLoading, error } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => fetchRFQDetails(id),
  });

  useEffect(() => {
    if (!id) return;
    const connectWS = () => {
      ws.current = new WebSocket(getWSUrl(id));
      ws.current.onopen = () => setWsConnected(true);
      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'NEW_BID') queryClient.invalidateQueries({ queryKey: ['rfq', id] });
      };
      ws.current.onclose = () => setWsConnected(false);
    };
    connectWS();
    return () => { if (ws.current) ws.current.close(); };
  }, [id, queryClient]);

  const l1 = useMemo(() => {
    if (!rfq?.quotes || rfq.quotes.length === 0) return null;
    return rfq.quotes[0]; // Already sorted by backend
  }, [rfq]);

  const extCount = useMemo(() => {
    if (!rfq?.activity_logs) return 0;
    return rfq.activity_logs.filter(log => log.type === 'EXTENDED').length;
  }, [rfq]);

  if (isLoading) return <div className="container">Loading RFQ details...</div>;
  if (error) return <div className="container">Error loading details</div>;

  return (
    <div className="container" style={{ paddingTop: 0 }}>
      {/* Navigation & Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/rfqs" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          &larr; Back to Marketplace
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{rfq.name}</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>RFQ ID: {rfq.id}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             {wsConnected && <span className="live-indicator"></span>}
             <span className={`badge badge-${rfq.status.toLowerCase().replace('_', '-')}`}>
               {rfq.status.replace('_', ' ')}
             </span>
          </div>
        </div>
      </div>

      {/* Live Summary Bar */}
      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2rem', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Current Lowest Bid</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success-color)' }}>
            {l1 ? `$${l1.total_amount.toFixed(2)}` : 'No Bids'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l1 ? `by ${l1.carrier_name}` : 'Awaiting first quote'}</div>
        </div>
        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Time Remaining</div>
          <Countdown targetDate={rfq.current_close_date} status={rfq.status} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Auction Extensions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: extCount > 0 ? '#fcd34d' : 'inherit' }}>
            {extCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trigger: {rfq.extension_trigger_type.replace(/_/g, ' ')}</div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Supplier Bids Table */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem' }}>Competitive Leaderboard</h3>
            {rfq.quotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏎️</div>
                <p style={{ color: 'var(--text-secondary)' }}>The auction is live! Be the first to set the L1 price.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Carrier</th>
                      <th>Breakdown</th>
                      <th>Total ($)</th>
                      <th>Transit</th>
                      <th>Validity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.quotes.map((quote, index) => {
                      const isOwn = userId === quote.supplier_id;
                      const isL1 = index === 0;
                      return (
                        <tr key={quote.id} style={{ backgroundColor: isOwn ? 'rgba(59, 130, 246, 0.08)' : isL1 ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                          <td style={{ fontWeight: 700 }}>
                            {isL1 ? '🏆 L1' : `L${index + 1}`}
                            {isOwn && <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--accent-color)' }}>YOUR BID</span>}
                          </td>
                          <td>{quote.carrier_name}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            F:${quote.freight_charges.toFixed(0)} | O:${quote.origin_charges.toFixed(0)} | D:${quote.destination_charges.toFixed(0)}
                          </td>
                          <td style={{ fontWeight: 800, fontSize: '1rem' }}>${quote.total_amount.toFixed(2)}</td>
                          <td>{quote.transit_time}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(quote.validity_of_quote).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bid Form */}
          {rfq.status === 'ACTIVE' && role === 'SUPPLIER' && (
            <div className="glass-panel" style={{ border: '1px solid var(--accent-color)' }}>
              <h3 style={{ marginBottom: '1rem' }}>Submit Improvement Bid</h3>
              <QuoteForm rfqId={rfq.id} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Detailed Info & Rules */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Auction Parameters</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start Date</div>
                 <div style={{ fontWeight: 600 }}>{new Date(rfq.start_date).toLocaleString()}</div>
               </div>
               <div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Original Close</div>
                 <div style={{ fontWeight: 600 }}>{new Date(rfq.close_date).toLocaleString()}</div>
               </div>
               <div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Forced Close (Hard Deadline)</div>
                 <div style={{ fontWeight: 600, color: 'var(--danger-color)' }}>{new Date(rfq.forced_close_date).toLocaleString()}</div>
               </div>
               <button 
                className="btn btn-outline" 
                style={{ width: '100%', fontSize: '0.8rem' }}
                onClick={() => setShowRules(!showRules)}
               >
                 {showRules ? 'Hide' : 'View'} Extension Rules
               </button>
               {showRules && (
                 <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.5 }}>
                   This auction monitors the last <strong>{rfq.trigger_window_minutes} minutes</strong>. 
                   Any <strong>{rfq.extension_trigger_type.replace(/_/g, ' ')}</strong> triggers a 
                   <strong> {rfq.extension_duration_minutes} minute</strong> extension.
                 </div>
               )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Activity Stream</h3>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {rfq.activity_logs.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No activity yet.</p>
              ) : (
                rfq.activity_logs.map(log => (
                  <div key={log.id} style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    borderLeft: `3px solid ${log.type === 'EXTENDED' ? '#fcd34d' : log.type === 'COMPLETED' ? 'var(--danger-color)' : 'var(--success-color)'}`
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>{log.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
