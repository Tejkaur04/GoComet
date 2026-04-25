import { useState, useEffect } from 'react';

export default function RoleSwitcher() {
  const [role, setRole] = useState(localStorage.getItem('user_role') || 'BUYER');
  const [userId, setUserId] = useState(localStorage.getItem('user_id') || 'buyer-1');

  useEffect(() => {
    localStorage.setItem('user_role', role);
    localStorage.setItem('user_id', userId);
    // Dispatch custom event to notify components that rely on localstorage
    window.dispatchEvent(new Event('auth-change'));
  }, [role, userId]);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    if (newRole === 'BUYER') {
      setUserId('buyer-1');
    } else {
      setUserId('supplier-a');
    }
  };

  const handleSupplierChange = (e) => {
    setUserId(e.target.value);
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>View as:</span>
      <select 
        value={role} 
        onChange={handleRoleChange}
        style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem' }}
      >
        <option value="BUYER" style={{ color: 'black' }}>Buyer</option>
        <option value="SUPPLIER" style={{ color: 'black' }}>Supplier</option>
      </select>
      
      {role === 'SUPPLIER' && (
        <select 
          value={userId} 
          onChange={handleSupplierChange}
          style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem' }}
        >
          <option value="supplier-a" style={{ color: 'black' }}>Supplier A</option>
          <option value="supplier-b" style={{ color: 'black' }}>Supplier B</option>
          <option value="supplier-c" style={{ color: 'black' }}>Supplier C</option>
        </select>
      )}
    </div>
  );
}
