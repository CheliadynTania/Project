import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Props {
  onSuccess: (msg: string, type: 'ok' | 'err') => void;
}

export function CreateTextForm({ onSuccess }: Props) {
  const [text, setText] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState(60);
  const [maxViews, setMaxViews] = useState('');
  const [password, setPassword] = useState('');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { accessToken } = useAuth();

  const submit = async () => {
    if (!text.trim()) return onSuccess('text is required', 'err');
    setLoading(true);
    try {
      const block = await api.createTextBlock(
        {
          text,
          ttlMinutes,
          maxViews: maxViews ? Number(maxViews) : undefined,
          password: password || undefined,
          burnAfterRead,
        },
        accessToken ?? undefined
      );
      const url = `${window.location.origin}/view/${block.hash}`;
      setShareUrl(url);
      onSuccess(`Запис створено: ${block.hash}`, 'ok');
    } catch (e) {
      onSuccess((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p style={titleStyle}>Створити текстовий запис</p>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={labelStyle}>Текст *</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Вміст для збереження..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>TTL (хвилини)</label>
            <input type="number" value={ttlMinutes} min={1} onChange={e => setTtlMinutes(Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Макс. переглядів</label>
            <input type="number" value={maxViews} min={1} placeholder="необмежено" onChange={e => setMaxViews(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Пароль (опціонально)</label>
          <input type="password" value={password} placeholder="••••••" onChange={e => setPassword(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="bar" checked={burnAfterRead} onChange={e => setBurnAfterRead(e.target.checked)} style={{ cursor: 'pointer' }} />
          <label htmlFor="bar" style={{ fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Видалити після першого перегляду</label>
        </div>
        <button onClick={submit} disabled={loading} style={btnStyle}>
          {loading ? 'Збереження...' : 'Створити запис'}
        </button>
      </div>
      {shareUrl && (
        <div style={resultBox}>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>Посилання для доступу:</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={shareUrl} readOnly style={{ ...inputStyle, flex: 1, background: 'var(--color-background-secondary)' }} />
            <button onClick={copy} style={copyBtnStyle}>{copied ? '✓' : 'Копіювати'}</button>
          </div>
          <a href={shareUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--color-text-accent)', marginTop: 8, display: 'inline-block' }}>Відкрити →</a>
        </div>
      )}
    </div>
  );
}

const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' };
const btnStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--color-background-accent)', color: 'var(--color-text-on-accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const copyBtnStyle: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' as const };
const resultBox: React.CSSProperties = { marginTop: 20, padding: 16, borderRadius: 10, border: '0.5px solid var(--color-border-success)', background: 'var(--color-background-success)' };