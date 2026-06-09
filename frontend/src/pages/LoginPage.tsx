import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-logo">TEMP-SHARE</p>
        <p className="auth-subtitle">Сервіс тимчасового доступу до контенту</p>
        <p className="auth-title">Вхід</p>
        <div className="auth-field">
          <label className="field-label">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="test@example.com" />
        </div>
        <div className="auth-field">
          <label className="field-label">Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••" />
        </div>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Завантаження...' : 'Увійти'}
        </button>
        <div className="auth-link">
          Немає акаунту? <Link to="/register">Реєстрація</Link>
        </div>
      </div>
    </div>
  );
}