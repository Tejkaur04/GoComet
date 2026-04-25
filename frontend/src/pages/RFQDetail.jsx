import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api, getWSUrl } from '../api';
import { useEffect, useState, useRef } from 'react';
import QuoteForm from '../components/QuoteForm';
import { useAuth } from '../useAuth';

const fetchRFQDetails = async (id) => {
  const { data } = await api.get(`/rfqs/${id}`);
  return data;
};

export default function RFQDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { role, userId } = useAuth();
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);

  const { data: rfq, isLoading, error } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => fetchRFQDetails(id),
  });

  useEffect(() => {
    if (!id) return;

    const connectWS = () => {
      ws.current = new WebSocket(getWSUrl(id));
      
      ws.current.onopen = () => {
        setWsConnected(true);
        console.log("WebSocket connected");
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'NEW_BID') {
          // Trigger a full refetch to get updated quotes, logs, and current_close_date
          queryClient.invalidateQueries({ queryKey: ['rfq', id] });
        }
      };

      ws.current.onclose = () => {
        setWsConnected(false);
        // Optional: Implement reconnect logic here
      };
    };

    connectWS();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [id, queryClient]);

  if (isLoading) return <div>Loading RFQ details...</div>;
  if (error) return <div>Error loading details</div>;

  return (
    <div>
      <div className="header" style={{ marginBottom: '1rem' }}>
        <div>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>
            &larr; Back to Auctions
          </Link>
          <h2 style={{ marginTop: '0.5rem' }}>{rfq.name}</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>ID: {rfq.id}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {wsConnected && <span title="Live Updates Active"><span className="live-indicator"></span>Live</span>}
          <span className={`badge badge-${rfq.status.toLowerCase().replace('_', '-')}`}>
            {rfq.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Auction Info</h3>
            <div className="grid-2">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Current Close Time</div>
                <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{new Date(rfq.current_close_date).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Forced Close Time</div>
                <div style={{ fontWeight: 600 }}>{new Date(rfq.forced_close_date).toLocaleString()}</div>
              </div>
            </div>
            
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>British Auction Rules:</div>
              <ul style={{ fontSize: '0.85rem', paddingLeft: '1.2rem', color: 'var(--text-primary)' }}>
                <li>Monitors last <strong>{rfq.trigger_window_minutes} mins</strong></li>
                <li>Extends by <strong>{rfq.extension_duration_minutes} mins</strong></li>
                <li>Trigger on: <strong>{rfq.extension_trigger_type.replace(/_/g, ' ')}</strong></li>
              </ul>
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Supplier Bids</h3>
            {rfq.quotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No bids placed yet. Be the first supplier to bid.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Carrier</th>
                      <th>Freight ($)</th>
                      <th>Origin ($)</th>
                      <th>Destination ($)</th>
                      <th>Total ($)</th>
                      <th>Transit</th>
                      <th>Valid Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfq.quotes.map((quote, index) => {
                      const isOwn = userId === quote.supplier_id;
                      const isL1 = index === 0;
                      return (
                        <tr key={quote.id} style={{
                          backgroundColor: isOwn
                            ? 'rgba(59, 130, 246, 0.08)'
                            : isL1 ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                          outline: isOwn ? '1px solid rgba(59,130,246,0.3)' : 'none'
                        }}>
                          <td style={{ fontWeight: isL1 ? 'bold' : 'normal', color: isL1 ? 'var(--success-color)' : 'inherit' }}>
                            L{index + 1} {isL1 && '🏆'} {isOwn && <span style={{ fontSize: '0.7rem', color: '#60a5fa', marginLeft: '4px' }}>YOU</span>}
                          </td>
                          <td>{quote.carrier_name}</td>
                          <td>${quote.freight_charges.toFixed(2)}</td>
                          <td>${quote.origin_charges.toFixed(2)}</td>
                          <td>${quote.destination_charges.toFixed(2)}</td>
                          <td style={{ fontWeight: 700, color: isL1 ? 'var(--success-color)' : 'inherit' }}>
                            ${quote.total_amount.toFixed(2)}
                          </td>
                          <td>{quote.transit_time}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {new Date(quote.validity_of_quote).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {rfq.status === 'ACTIVE' && role === 'SUPPLIER' && (
            <QuoteForm rfqId={rfq.id} />
          )}
        </div>

        <div>
          <div className="glass-panel" style={{ height: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>Activity Log</h3>
            {rfq.activity_logs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No activity recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {rfq.activity_logs.map(log => (
                  <div key={log.id} style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    borderLeft: `3px solid ${log.type === 'EXTENDED' ? 'var(--accent-color)' : log.type === 'COMPLETED' ? 'var(--danger-color)' : 'var(--text-secondary)'}`
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{log.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
