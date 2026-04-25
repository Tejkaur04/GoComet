import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const role = localStorage.getItem('user_role') || 'BUYER';
  const userId = localStorage.getItem('user_id') || 'buyer-1';
  
  config.headers['X-User-Role'] = role;
  config.headers['X-User-Id'] = userId;
  return config;
});

export const getWSUrl = (rfqId) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use VITE_API_URL if defined, else local
  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') : `${wsProtocol}//localhost:8000`;
  return `${baseUrl}/ws/rfqs/${rfqId}`;
};
