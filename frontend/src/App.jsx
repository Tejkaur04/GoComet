import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import RFQList from './pages/RFQList';
import RFQCreate from './pages/RFQCreate';
import RFQDetail from './pages/RFQDetail';
import RoleSwitcher from './components/RoleSwitcher';
import { useAuth } from './useAuth';
import './index.css';

const queryClient = new QueryClient();

function AppContent() {
  const { role } = useAuth();
  
  return (
    <div className="container">
      <header className="header">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1>⚡ Velocity RFQ</h1>
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/rfqs" className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>🏛 Auctions</Link>
          <RoleSwitcher />
          {role === 'BUYER' && (
            <Link to="/create" className="btn btn-primary">+ Create RFQ</Link>
          )}
        </nav>
      </header>
      
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rfqs" element={<RFQList />} />
          <Route path="/create" element={<RFQCreate />} />
          <Route path="/rfqs/:id" element={<RFQDetail />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
