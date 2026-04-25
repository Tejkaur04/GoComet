import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';

export default function QuoteForm({ rfqId, onSuccess }) {
  const [formData, setFormData] = useState({
    carrier_name: '',
    freight_charges: '',
    origin_charges: '',
    destination_charges: '',
    transit_time: '',
    validity_of_quote: ''
  });

  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (newQuote) => api.post('/quotes/', newQuote),
    onSuccess: () => {
      setFormData({
        carrier_name: '',
        freight_charges: '',
        origin_charges: '',
        destination_charges: '',
        transit_time: '',
        validity_of_quote: ''
      });
      setError('');
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to submit quote');
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      rfq_id: rfqId,
      carrier_name: formData.carrier_name,
      freight_charges: parseFloat(formData.freight_charges) || 0,
      origin_charges: parseFloat(formData.origin_charges) || 0,
      destination_charges: parseFloat(formData.destination_charges) || 0,
      transit_time: formData.transit_time,
      validity_of_quote: new Date(formData.validity_of_quote).toISOString()
    });
  };

  const total = (parseFloat(formData.freight_charges) || 0) + 
                (parseFloat(formData.origin_charges) || 0) + 
                (parseFloat(formData.destination_charges) || 0);

  return (
    <div style={{ marginTop: '1rem' }}>
      {error && (
        <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '13px', background: 'rgba(248, 81, 73, 0.1)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(248, 81, 73, 0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="grid-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Carrier Name</label>
            <input type="text" name="carrier_name" className="form-control" value={formData.carrier_name} onChange={handleChange} placeholder="e.g. Ocean Freight Inc" required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Transit Time</label>
            <input type="text" name="transit_time" className="form-control" value={formData.transit_time} onChange={handleChange} placeholder="e.g. 14 Days" required />
          </div>
        </div>

        <div className="grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Freight ($)</label>
            <input type="number" step="0.01" name="freight_charges" className="form-control" value={formData.freight_charges} onChange={handleChange} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Origin ($)</label>
            <input type="number" step="0.01" name="origin_charges" className="form-control" value={formData.origin_charges} onChange={handleChange} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Dest ($)</label>
            <input type="number" step="0.01" name="destination_charges" className="form-control" value={formData.destination_charges} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Quote Validity</label>
          <input type="datetime-local" name="validity_of_quote" className="form-control" value={formData.validity_of_quote} onChange={handleChange} required />
        </div>

        <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Total Bid Amount:</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success-color)' }}>${total.toFixed(2)}</span>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={mutation.isPending}>
          {mutation.isPending ? 'Processing...' : 'Submit Final Quote'}
        </button>
      </form>
    </div>
  );
}
