import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { api } from './api/client';
import type { ContentBlock } from './types/content';
import { HealthStatus } from './components/HealthStatus';
import { CreateTextForm } from './components/CreateTextForm';
import { CreateFileForm } from './components/CreateFileForm';
import { BlockList } from './components/BlockList';
import { BlockInspector } from './components/BlockInspector';
import { ViewPage } from './pages/ViewPage';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminPage } from './pages/AdminPage';
import { CollectionPage } from './pages/CollectionPage';

type Tab = 'create-text' | 'create-file';

function MainApp() {
  const [tab, setTab] = useState<Tab>('create-text');
  const [health, setHealth] = useState<{ status: string; db: string } | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [inspectHash, setInspectHash] = useState('');
  const [notification, setNotification] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const navigate = useNavigate();

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const checkHealth = useCallback(async () => {
    try {
      const h = await api.health();
      setHealth(h);
    } catch {
      setHealth({ status: 'error', db: 'unreachable' });
    }
  }, []);

  const loadBlocks = useCallback(async () => {
    try {
      const data = await api.listBlocks();
      setBlocks(data);
    } catch (e) {
      notify((e as Error).message, 'err');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const iv = setInterval(checkHealth, 15_000);
    return () => clearInterval(iv);
  }, [checkHealth]);

  const tabs: { id: Tab; label: string }[] = [
  { id: 'create-text', label: '📝 Текст' },
  { id: 'create-file', label: '📎 Файл' },
];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)' }}>
    <header className="app-header">
      <span className="app-logo">TEMP-SHARE</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <HealthStatus health={health} onRefresh={checkHealth} />
        <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => navigate('/dashboard')}>
          Дашборд
        </button>
      </div>
    </header>

    {notification && (
      <div className={`notification notification-${notification.type}`}>
        {notification.msg}
      </div>
    )}

    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
      <nav className="nav-tabs" style={{ marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="card">
        {tab === 'create-text' && <CreateTextForm onSuccess={notify} />}
        {tab === 'create-file' && <CreateFileForm onSuccess={notify} />}
      </div>
    </div>
  </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/view/:hash" element={<ViewPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/*" element={<MainApp />} />
          <Route path="/admin" element={
          <ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/collection/:hash" element={<CollectionPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}