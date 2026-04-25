import { useState, useEffect } from 'react';

export default function RoleSwitcher() {
  const [role, setRole] = useState(localStorage.getItem('user_role') || 'BUYER');
  const [userId, setUserId] = useState(localStorage.getItem('user_id') || 'buyer-1');

  useEffect(() => {
    localStorage.setItem('user_role', role);
    localStorage.setItem('user_id', userId);
    window.dispatchEvent(new Event('auth-change'));
  }, [role, userId]);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    if (newRole === 'BUYER') setUserId('buyer-1');
    else setUserId('supplier-a');
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Role</span>
        <select 
          value={role} 
          onChange={handleRoleChange}
          className="form-control"
          style={{ width: 'auto', padding: '2px 8px', height: '28px' }}
        >
          <option value="BUYER">Buyer</option>
          <option value="SUPPLIER">Supplier</option>
        </select>
      </div>
      
      {role === 'SUPPLIER' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Identity</span>
          <select 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            className="form-control"
            style={{ width: 'auto', padding: '2px 8px', height: '28px' }}
          >
            <option value="supplier-a">Supplier A</option>
            <option value="supplier-b">Supplier B</option>
            <option value="supplier-c">Supplier C</option>
          </select>
        </div>
      )}
    </div>
  );
}
