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
      setTimeLeft('Ended');
      return;
    }
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('Expired');
        return;
      }
      const h = Math.floor(distance / 3600000);
      const m = Math.floor((distance % 3600000) / 60000);
      const s = Math.floor((distance % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
      setIsUrgent(h === 0 && m < 2);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate, status]);

  return <span style={{ color: isUrgent ? 'var(--danger-color)' : 'var(--text-header)', fontSize: '24px', fontWeight: 800 }}>{timeLeft}</span>;
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

  const l1 = useMemo(() => rfq?.quotes?.[0], [rfq]);
  const extCount = useMemo(() => rfq?.activity_logs?.filter(l => l.type === 'EXTENDED').length || 0, [rfq]);

  if (isLoading) return <div className="container">Loading...</div>;

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to="/rfqs" style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '8px', display: 'block' }}>&larr; Back to marketplace</Link>
          <h1 style={{ fontSize: '32px' }}>{rfq.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Auction ID: {rfq.id}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {wsConnected && <span className="live-dot" title="Real-time connected"></span>}
          <span className={`badge ${rfq.status === 'ACTIVE' ? 'badge-active' : 'badge-closed'}`}>
            {rfq.status}
          </span>
        </div>
      </div>

      <div className="summary-bar">
        <div className="summary-item">
          <div className="card-label">Current Lowest Bid</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success-color)' }}>{l1 ? `$${l1.total_amount.toFixed(2)}` : '--'}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l1 ? `by ${l1.carrier_name}` : 'Awaiting bids'}</div>
        </div>
        <div className="summary-item">
          <div className="card-label">Time Remaining</div>
          <Countdown targetDate={rfq.current_close_date} status={rfq.status} />
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Closing: {new Date(rfq.current_close_date).toLocaleTimeString()}</div>
        </div>
        <div className="summary-item">
          <div className="card-label">Extensions</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: extCount > 0 ? 'var(--warning-color)' : 'inherit' }}>{extCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trigger: {rfq.extension_trigger_type.replace(/_/g, ' ')}</div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="panel" style={{ padding: 0 }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '16px' }}>Bidding History</h3>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Carrier</th>
                  <th>Breakdown</th>
                  <th>Total</th>
                  <th>Transit</th>
                </tr>
              </thead>
              <tbody>
                {rfq.quotes.map((q, i) => (
                  <tr key={q.id} style={{ background: userId === q.supplier_id ? 'rgba(31, 111, 235, 0.05)' : 'transparent' }}>
                    <td style={{ fontWeight: 700, color: i === 0 ? 'var(--success-color)' : 'inherit' }}>
                      L{i + 1} {i === 0 && '🏆'}
                      {userId === q.supplier_id && <div style={{ fontSize: '10px', color: 'var(--accent-color)' }}>YOUR BID</div>}
                    </td>
                    <td>{q.carrier_name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      F:${q.freight_charges.toFixed(0)} O:${q.origin_charges.toFixed(0)} D:${q.destination_charges.toFixed(0)}
                    </td>
                    <td style={{ fontWeight: 700 }}>${q.total_amount.toFixed(2)}</td>
                    <td>{q.transit_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rfq.status === 'ACTIVE' && role === 'SUPPLIER' && (
            <div className="panel" style={{ border: '1px solid var(--border-focus)' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Submit Improvement Quote</h3>
              <QuoteForm rfqId={rfq.id} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="panel">
            <h3 style={{ fontSize: '16px', marginBottom: '1rem' }}>Auction Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>
                <div className="card-label">Scheduled Start</div>
                <div style={{ fontWeight: 500 }}>{new Date(rfq.start_date).toLocaleString()}</div>
              </div>
              <div>
                <div className="card-label">Original Close</div>
                <div style={{ fontWeight: 500 }}>{new Date(rfq.close_date).toLocaleString()}</div>
              </div>
              <div>
                <div className="card-label" style={{ color: 'var(--danger-color)' }}>Forced Close Limit</div>
                <div style={{ fontWeight: 500 }}>{new Date(rfq.forced_close_date).toLocaleString()}</div>
              </div>
            </div>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setShowRules(!showRules)}>
              {showRules ? 'Hide' : 'Show'} Bidding Rules
            </button>
            {showRules && (
              <div style={{ marginTop: '1rem', padding: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '13px' }}>
                Activity in the last <strong>{rfq.trigger_window_minutes}m</strong> triggers a <strong>{rfq.extension_duration_minutes}m</strong> extension.
              </div>
            )}
          </div>

          <div className="panel" style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '16px' }}>Activity Stream</h3>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rfq.activity_logs.map(l => (
                <div key={l.id} style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', lastChild: { borderBottom: 'none' } }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{new Date(l.created_at).toLocaleTimeString()}</div>
                  <div style={{ fontSize: '13px' }}>{l.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
