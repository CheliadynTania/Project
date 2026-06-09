import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Block {
  id: number;
  hash: string;
  contentType: string;
  viewCount: number;
  maxViews?: number;
  expiresAt: string;
  status: string;
  createdAt: string;
}

interface Collection {
  id: number;
  hash: string;
  title: string;
  expires_at: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  role?: string;
}

export function DashboardPage() {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  //const [tab, setTab] = useState<'blocks' | 'collections'>('blocks');
  const [tab, setTab] = useState<'blocks'>('blocks');
  const [extendHash, setExtendHash] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState(60);

  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => { fetchAll(); }, []);

 const fetchAll = async () => {
  setLoading(true);
  
  // отримай свіжий токен з localStorage
  const token = localStorage.getItem('accessToken') ?? accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };
  
  try {
    const [blocksRes, collectionsRes] = await Promise.all([
      fetch('http://localhost:3001/api/blocks/my', { headers: authHeaders }),
      fetch('http://localhost:3001/api/collections/my', { headers: authHeaders }),
    ]);
    if (blocksRes.ok) setBlocks(await blocksRes.json());
    if (collectionsRes.ok) setCollections(await collectionsRes.json());
  } catch { /* ігноруємо */ }
  finally { setLoading(false); }
};

  const handleDelete = async (hash: string) => {
    await fetch(`http://localhost:3001/api/blocks/${hash}`, {
      method: 'DELETE',
      headers: { ...headers, 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET ?? '' },
    });
    setBlocks(prev => prev.filter(b => b.hash !== hash));
  };

  const handleExtendTtl = async (hash: string) => {
    await fetch(`http://localhost:3001/api/blocks/${hash}/ttl`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraMinutes: extendMinutes }),
    });
    setExtendHash(null);
    fetchAll();
  };

  const handleDeleteCollection = async (hash: string) => {
    await fetch(`http://localhost:3001/api/collections/${hash}`, {
      method: 'DELETE',
      headers,
    });
    setCollections(prev => prev.filter(c => c.hash !== hash));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const active = blocks.filter(b => b.status === 'active').length;
  const expired = blocks.filter(b => b.status !== 'active').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)' }}>
      <header className="app-header">
        <span className="app-logo">TEMP-SHARE</span>
        <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{user?.email}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {user?.role === 'admin' && (
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => navigate('/admin')}>
              Адмін
            </button>
          )}
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => navigate('/')}>Головна</button>
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={handleLogout}>Вийти</button>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

              {/* Tabs */}
        <nav className="nav-tabs" style={{ marginBottom: 20 }}>
          <button className={`nav-tab ${tab === 'blocks' ? 'active' : ''}`} onClick={() => setTab('blocks')}>
            📝 Мої записи ({blocks.length})
          </button>
        </nav>

        {/* Blocks */}
        {tab === 'blocks' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Мої записи</h2>
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => navigate('/')}>
                + Новий запис
              </button>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Завантаження...</div>
            ) : blocks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>Записів ще немає</p>
                <p style={{ fontSize: 13, marginTop: 8 }}>
                  <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/')}>Створити перший запис →</span>
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Хеш</th>
                    <th>Тип</th>
                    <th>Перегляди</th>
                    <th>Статус</th>
                    <th>Діє до</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map(block => (
                    <>
                      <tr key={block.hash}>
                        <td>
                          <a href={`/view/${block.hash}`} style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none', fontFamily: 'monospace' }}>
                            {block.hash}
                          </a>
                        </td>
                        <td>
                          <span className={`badge ${block.contentType === 'text' ? 'badge-text' : 'badge-file'}`}>
                            {block.contentType === 'text' ? '📝 текст' : '📎 файл'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {block.viewCount}{block.maxViews ? `/${block.maxViews}` : ''}
                        </td>
                        <td>
                          <span className={`badge badge-${block.status}`}>{block.status}</span>
                        </td>
                        <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                          {new Date(block.expiresAt).toLocaleString('uk-UA')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setExtendHash(extendHash === block.hash ? null : block.hash)}
                            >
                              ⏱ TTL
                            </button>
                            <button
                              className="btn-danger"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => handleDelete(block.hash)}
                            >
                              Видалити
                            </button>
                          </div>
                        </td>
                      </tr>
                      {extendHash === block.hash && (
                        <tr key={`extend-${block.hash}`}>
                          <td colSpan={6} style={{ background: 'var(--gray-50)', padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 13, color: 'var(--gray-700)' }}>Додати хвилин:</span>
                              <input
                                type="number"
                                value={extendMinutes}
                                min={1}
                                onChange={e => setExtendMinutes(Number(e.target.value))}
                                style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--gray-300)', fontSize: 13 }}
                              />
                              <button
                                className="btn-primary"
                                style={{ padding: '4px 14px', fontSize: 13 }}
                                onClick={() => handleExtendTtl(block.hash)}
                              >
                                Продовжити
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 10px', fontSize: 13 }}
                                onClick={() => setExtendHash(null)}
                              >
                                Скасувати
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Collections */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Мої колекції</h2>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Завантаження...</div>
            ) : collections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <p>Колекцій ще немає</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Хеш</th>
                    <th>Назва</th>
                    <th>Діє до</th>
                    <th>Створено</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map(col => (
                    <tr key={col.hash}>
                      <td>
                        <a href={`/collection/${col.hash}`} style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none', fontFamily: 'monospace' }}>
                          {col.hash}
                        </a>
                      </td>
                      <td>{col.title ?? '—'}</td>
                      <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                        {new Date(col.expires_at).toLocaleString('uk-UA')}
                      </td>
                      <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                        {new Date(col.created_at).toLocaleString('uk-UA')}
                      </td>
                      <td>
                        <button className="btn-danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleDeleteCollection(col.hash)}>
                          Видалити
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
      </div>
    </div>
  );
}