import { useState, useEffect } from 'react';

export function useAuth() {
  const [role, setRole] = useState(localStorage.getItem('user_role') || 'BUYER');
  const [userId, setUserId] = useState(localStorage.getItem('user_id') || 'buyer-1');

  useEffect(() => {
    const handleAuthChange = () => {
      setRole(localStorage.getItem('user_role') || 'BUYER');
      setUserId(localStorage.getItem('user_id') || 'buyer-1');
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  return { role, userId };
}
