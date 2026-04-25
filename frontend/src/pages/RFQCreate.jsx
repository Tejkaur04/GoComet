import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function RFQCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    close_date: '',
    forced_close_date: '',
    pickup_date: '',
    trigger_window_minutes: 10,
    extension_duration_minutes: 5,
    extension_trigger_type: 'ANY_BID',
  });

  const mutation = useMutation({
    mutationFn: (newRFQ) => api.post('/rfqs/', newRFQ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      navigate('/');
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'An error occurred creating the RFQ');
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['trigger_window_minutes', 'extension_duration_minutes'].includes(name) 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert local datetime to UTC ISO string for backend
    const payload = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      close_date: new Date(formData.close_date).toISOString(),
      forced_close_date: new Date(formData.forced_close_date).toISOString(),
      pickup_date: new Date(formData.pickup_date).toISOString(),
    };

    if (new Date(payload.forced_close_date) <= new Date(payload.close_date)) {
      setError('Forced close date must be after bid close date');
      return;
    }

    mutation.mutate(payload);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Create British Auction RFQ</h2>
      
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>RFQ Name / Reference ID</label>
          <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required placeholder="e.g., Shanghai to LAX Electronics" />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label>Bid Start Date & Time</label>
            <input type="datetime-local" name="start_date" className="form-control" value={formData.start_date} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Pickup Date</label>
            <input type="datetime-local" name="pickup_date" className="form-control" value={formData.pickup_date} onChange={handleChange} required />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label>Initial Bid Close Date & Time</label>
            <input type="datetime-local" name="close_date" className="form-control" value={formData.close_date} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Forced Bid Close Date & Time</label>
            <input type="datetime-local" name="forced_close_date" className="form-control" value={formData.forced_close_date} onChange={handleChange} required />
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--accent-color)' }}>British Auction Settings</h3>
        
        <div className="grid-3">
          <div className="form-group">
            <label>Trigger Window (Minutes)</label>
            <input type="number" name="trigger_window_minutes" className="form-control" value={formData.trigger_window_minutes} onChange={handleChange} min="1" required />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Monitor last X minutes</small>
          </div>
          <div className="form-group">
            <label>Extension Duration (Minutes)</label>
            <input type="number" name="extension_duration_minutes" className="form-control" value={formData.extension_duration_minutes} onChange={handleChange} min="1" required />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Add Y minutes</small>
          </div>
          <div className="form-group">
            <label>Extension Trigger</label>
            <select name="extension_trigger_type" className="form-control" value={formData.extension_trigger_type} onChange={handleChange} required>
              <option value="ANY_BID">Any Bid Received</option>
              <option value="ANY_RANK_CHANGE">Any Rank Change</option>
              <option value="L1_RANK_CHANGE">Lowest Bidder (L1) Change</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create RFQ'}
          </button>
        </div>
      </form>
    </div>
  );
}
