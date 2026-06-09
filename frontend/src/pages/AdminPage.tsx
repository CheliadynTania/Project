import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Stats {
  users: number;
  blocks: number;
  activeBlocks: number;
}

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface Block {
  id: number;
  hash: string;
  content_type: string;
  status: string;
  view_count: number;
  expires_at: string;
  user_email?: string;
}

export function AdminPage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [tab, setTab] = useState<'stats' | 'users' | 'blocks'>('stats');
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, u, b] = await Promise.all([
        fetch('http://localhost:3001/api/admin/stats', { headers }).then(r => r.json()),
        fetch('http://localhost:3001/api/admin/users', { headers }).then(r => r.json()),
        fetch('http://localhost:3001/api/admin/blocks', { headers }).then(r => r.json()),
      ]);
      setStats(s);
      setUsers(u);
      setBlocks(b);
    } catch { /* ігноруємо */ }
    finally { setLoading(false); }
  };

  const deleteBlock = async (id: number) => {
    await fetch(`http://localhost:3001/api/admin/blocks/${id}`, { method: 'DELETE', headers });
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const changeRole = async (userId: string, role: string) => {
    await fetch(`http://localhost:3001/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)' }}>
      <header className="app-header">
        <span className="app-logo">TEMP-SHARE · Admin</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => navigate('/')}>Головна</button>
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => { await logout(); navigate('/login'); }}>Вийти</button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Tabs */}
        <nav className="nav-tabs" style={{ marginBottom: 24 }}>
          {(['stats', 'users', 'blocks'] as const).map(t => (
            <button key={t} className={`nav-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'stats' ? '📊 Статистика' : t === 'users' ? '👥 Користувачі' : '📁 Всі записи'}
            </button>
          ))}
        </nav>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Завантаження...</div>
        ) : (
          <>
            {/* Stats */}
            {tab === 'stats' && stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { label: 'Користувачів', value: stats.users, color: 'var(--primary)' },
                  { label: 'Всього записів', value: stats.blocks, color: 'var(--gray-700)' },
                  { label: 'Активних записів', value: stats.activeBlocks, color: 'var(--success)' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ textAlign: 'center', padding: 24 }}>
                    <p style={{ fontSize: 36, fontWeight: 700, color: s.color, margin: '0 0 8px' }}>{s.value}</p>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Users */}
            {tab === 'users' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Користувачі ({users.length})</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Роль</th>
                      <th>Дата реєстрації</th>
                      <th>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: 500 }}>{user.email}</td>
                        <td>
                          <span className={`badge ${user.role === 'admin' ? 'badge-file' : 'badge-text'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                          {new Date(user.created_at).toLocaleString('uk-UA')}
                        </td>
                        <td>
                          <button
                            className={user.role === 'admin' ? 'btn-secondary' : 'btn-primary'}
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            onClick={() => changeRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          >
                            {user.role === 'admin' ? 'Зробити user' : 'Зробити admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Blocks */}
            {tab === 'blocks' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Всі записи ({blocks.length})</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Хеш</th>
                      <th>Тип</th>
                      <th>Власник</th>
                      <th>Статус</th>
                      <th>Перегляди</th>
                      <th>Діє до</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map(block => (
                      <tr key={block.id}>
                        <td>
                          <a href={`/view/${block.hash}`} style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none', fontFamily: 'monospace' }}>
                            {block.hash}
                          </a>
                        </td>
                        <td>
                          <span className={`badge ${block.content_type === 'text' ? 'badge-text' : 'badge-file'}`}>
                            {block.content_type === 'text' ? '📝 текст' : '📎 файл'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                          {block.user_email ?? 'анонім'}
                        </td>
                        <td>
                          <span className={`badge badge-${block.status}`}>{block.status}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{block.view_count}</td>
                        <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                          {new Date(block.expires_at).toLocaleString('uk-UA')}
                        </td>
                        <td>
                          <button className="btn-danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => deleteBlock(block.id)}>
                            Видалити
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}