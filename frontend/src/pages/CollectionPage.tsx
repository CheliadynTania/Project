import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface Collection {
  id: number;
  hash: string;
  title: string;
  expires_at: string;
  blocks: any[];
}

export function CollectionPage() {
  const { hash } = useParams<{ hash: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'expired' | 'notfound'>('loading');

  useEffect(() => {
    fetch(`http://localhost:3001/api/collections/${hash}`)
      .then(res => {
        if (res.status === 404) { setStatus('notfound'); return null; }
        if (res.status === 410) { setStatus('expired'); return null; }
        return res.json();
      })
      .then(data => {
        if (data) { setCollection(data); setStatus('ok'); }
      })
      .catch(() => setStatus('notfound'));
  }, [hash]);

  if (status === 'loading') return <div style={pageStyle}><div style={cardStyle}>Завантаження...</div></div>;
  if (status === 'notfound') return <div style={pageStyle}><div style={cardStyle}><p style={titleStyle}>Колекцію не знайдено</p></div></div>;
  if (status === 'expired') return <div style={pageStyle}><div style={cardStyle}><p style={titleStyle}>Колекція більше недоступна</p></div></div>;

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 720 }}>
        <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 8 }}>TEMP-SHARE · Колекція</p>
        <h1 style={titleStyle}>{collection?.title ?? 'Без назви'}</h1>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 24 }}>
          Діє до: {new Date(collection!.expires_at).toLocaleString('uk-UA')}
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          {collection?.blocks.map((block: any) => (
            <div key={block.id} style={{ padding: '14px 16px', border: '1px solid var(--gray-200)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--primary)' }}>{block.hash}</span>
                <span style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 12 }}>
                  {block.content_type === 'text' ? '📝 текст' : '📎 файл'}
                </span>
              </div>
              <a href={`/view/${block.hash}`} style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                Відкрити →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight: '100vh', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' };
const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 4px 6px rgba(0,0,0,0.07)', border: '1px solid var(--gray-200)' };
const titleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 8 };