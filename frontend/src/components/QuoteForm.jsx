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

  return (
    <div className="glass-panel" style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-color)' }}>Submit New Quote</h3>
      
      {error && (
        <div style={{ color: '#fca5a5', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="form-group">
            <label>Carrier Name</label>
            <input type="text" name="carrier_name" className="form-control" value={formData.carrier_name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Transit Time (e.g. 14 days)</label>
            <input type="text" name="transit_time" className="form-control" value={formData.transit_time} onChange={handleChange} required />
          </div>
        </div>

        <div className="grid-3">
          <div className="form-group">
            <label>Freight Charges ($)</label>
            <input type="number" step="0.01" name="freight_charges" className="form-control" value={formData.freight_charges} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Origin Charges ($)</label>
            <input type="number" step="0.01" name="origin_charges" className="form-control" value={formData.origin_charges} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Destination Charges ($)</label>
            <input type="number" step="0.01" name="destination_charges" className="form-control" value={formData.destination_charges} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-group">
          <label>Quote Validity</label>
          <input type="datetime-local" name="validity_of_quote" className="form-control" value={formData.validity_of_quote} onChange={handleChange} required />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={mutation.isPending}>
          {mutation.isPending ? 'Submitting...' : 'Submit Quote'}
        </button>
      </form>
    </div>
  );
}
