import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

type Status = 'loading' | 'text' | 'file' | 'password' | 'expired' | 'notfound' | 'error';

interface Meta {
  hash: string;
  contentType: 'text' | 'file';
  originalFilename?: string;
  mimeType?: string;
  viewCount: number;
  maxViews?: number;
  burnAfterRead: boolean;
  hasPassword: boolean;
  expiresAt: string;
}

export function ViewPage() {
  const { hash } = useParams<{ hash: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [meta, setMeta] = useState<Meta | null>(null);
  const [textContent, setTextContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchContent = async (pwd?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (pwd) headers['x-password'] = pwd;

      const res = await fetch(`http://localhost:3001/api/blocks/${hash}`, { headers });

      if (res.status === 404) { setStatus('notfound'); return; }
      if (res.status === 410) { setStatus('expired'); return; }
      if (res.status === 401) { setStatus('password'); return; }
      if (!res.ok) { setStatus('error'); return; }

      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        setTextContent(data.content);
        setStatus('text');
      } else {
        const blob = await res.blob();
        setFileUrl(URL.createObjectURL(blob));
        setStatus('file');
      }
    } catch {
      setStatus('error');
    }
  };

  const fetchMeta = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/blocks/${hash}/meta`);
      if (res.ok) setMeta(await res.json());
    } catch { /* ігноруємо */ }
  };

  useEffect(() => {
    fetchMeta();
    fetchContent();
  }, [hash]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: 'var(--color-background-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono), monospace', padding: '2rem' },
    card: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '2rem', maxWidth: 640, width: '100%' },
    label: { fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 },
    title: { fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16 },
    textarea: { width: '100%', minHeight: 200, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono), monospace', resize: 'vertical', boxSizing: 'border-box' },
    btn: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
    btnPrimary: { background: 'var(--color-background-accent)', color: 'var(--color-text-on-accent)' },
    btnSecondary: { background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', border: '0.5px solid var(--color-border-tertiary)' },
    input: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, boxSizing: 'border-box' },
    meta: { fontSize: 11, color: 'var(--color-text-tertiary)', display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  };

  if (status === 'loading') return (
    <div style={s.page}><div style={s.card}><p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Завантаження...</p></div></div>
  );

  if (status === 'notfound') return (
    <div style={s.page}><div style={s.card}>
      <p style={{ ...s.label }}>404</p>
      <p style={s.title}>Запис не знайдено</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Можливо посилання неправильне або запис було видалено.</p>
    </div></div>
  );

  if (status === 'expired') return (
    <div style={s.page}><div style={s.card}>
      <p style={{ ...s.label }}>410</p>
      <p style={s.title}>Запис більше недоступний</p>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Термін дії або ліміт переглядів вичерпано.</p>
    </div></div>
  );

  if (status === 'password') return (
    <div style={s.page}><div style={s.card}>
      <p style={s.title}>Захищено паролем</p>
      <input
        style={{ ...s.input, marginBottom: 12 }}
        type="password"
        placeholder="Введи пароль..."
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && fetchContent(password)}
      />
      <button style={{ ...s.btn, ...s.btnPrimary }} onClick={() => fetchContent(password)}>
        Відкрити
      </button>
    </div></div>
  );

  if (status === 'text') return (
    <div style={s.page}><div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ ...s.label, margin: 0 }}>TEMP-SHARE · {hash}</p>
        <button style={{ ...s.btn, ...s.btnSecondary }} onClick={copyLink}>
          {copied ? '✓ Скопійовано' : 'Копіювати посилання'}
        </button>
      </div>
      <textarea style={s.textarea} value={textContent} readOnly />
      {meta && (
        <div style={s.meta}>
          <span>Переглядів: {meta.viewCount}{meta.maxViews ? `/${meta.maxViews}` : ''}</span>
          <span>Діє до: {new Date(meta.expiresAt).toLocaleString('uk-UA')}</span>
          {meta.burnAfterRead && <span>🔥 Burn after read</span>}
        </div>
      )}
    </div></div>
  );

  if (status === 'file') return (
    <div style={s.page}><div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ ...s.label, margin: 0 }}>TEMP-SHARE · {hash}</p>
        <button style={{ ...s.btn, ...s.btnSecondary }} onClick={copyLink}>
          {copied ? '✓ Скопійовано' : 'Копіювати посилання'}
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Файл: <strong>{meta?.originalFilename ?? 'download'}</strong>
      </p>
      <a href={fileUrl} download={meta?.originalFilename ?? 'download'} style={{ ...s.btn, ...s.btnPrimary, textDecoration: 'none', display: 'inline-block' }}>
        Завантажити файл
      </a>
      {meta && (
        <div style={s.meta}>
          <span>Переглядів: {meta.viewCount}{meta.maxViews ? `/${meta.maxViews}` : ''}</span>
          <span>Діє до: {new Date(meta.expiresAt).toLocaleString('uk-UA')}</span>
        </div>
      )}
    </div></div>
  );

  return <div style={s.page}><div style={s.card}><p style={{ color: 'var(--color-text-secondary)' }}>Щось пішло не так.</p></div></div>;
}