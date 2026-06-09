import { useState } from 'react';
import { api } from '../api/client';
import type { ContentBlock } from '../types/content';
import { EndpointLabel } from '../verify-password/EndpointLabel';

interface Props {
  blocks: ContentBlock[];
  onRefresh: () => void;
  onDelete: (msg: string, type: 'ok' | 'err') => void;
  onInspect: (hash: string) => void;
}

export function BlockList({ blocks, onRefresh, onDelete, onInspect }: Props) {
  const [adminSecret, setAdminSecret] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (hash: string) => {
    if (!adminSecret) return onDelete('x-admin-secret required', 'err');
    setDeleting(hash);
    try {
      await api.deleteBlock(hash, adminSecret);
      onDelete(`Deleted ${hash}`, 'ok');
      onRefresh();
    } catch (e) {
      onDelete((e as Error).message, 'err');
    } finally {
      setDeleting(null);
    }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleString();
  const isExpired = (iso: string) => new Date(iso) < new Date();

  return (
    <div>
      <EndpointLabel method="GET" path="/api/blocks" description="Список усіх записів" />

      <div style={{ display: 'flex', gap: 8, marginTop: '1rem', marginBottom: '1.25rem' }}>
        <input
          value={adminSecret}
          onChange={e => setAdminSecret(e.target.value)}
          placeholder="x-admin-secret (для видалення)"
          type="password"
          style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, padding: '7px 10px' }}
        />
        <button onClick={onRefresh} style={btnStyle}>
          GET /api/blocks
        </button>
      </div>

      {blocks.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, padding: '2rem 0', fontFamily: 'var(--font-mono)' }}>
          no blocks found
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {blocks.map(b => (
            <div
              key={b.hash}
              style={{
                border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8,
                padding: '12px 14px', background: 'var(--color-background-secondary)',
                opacity: b.status !== 'active' ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <code style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {b.hash}
                  </code>
                  <Badge type={b.contentType === 'text' ? 'info' : 'warning'}>{b.contentType}</Badge>
                  <Badge type={b.status === 'active' ? 'success' : 'danger'}>{b.status}</Badge>
                  {b.burnAfterRead && <Badge type="warning">burn</Badge>}
                  {b.passwordHash && <Badge type="warning">pw</Badge>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onInspect(b.hash)}
                    style={{ ...smallBtn, color: 'var(--color-text-info)', borderColor: 'var(--color-border-info)' }}
                  >
                    inspect
                  </button>
                  <button
                    onClick={() => handleDelete(b.hash)}
                    disabled={deleting === b.hash}
                    style={{ ...smallBtn, color: 'var(--color-text-danger)', borderColor: 'var(--color-border-danger)' }}
                  >
                    {deleting === b.hash ? '...' : 'delete'}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Meta label="views">{b.viewCount}{b.maxViews ? `/${b.maxViews}` : ''}</Meta>
                <Meta label="expires" warn={isExpired(b.expiresAt)}>{fmtDate(b.expiresAt)}</Meta>
                <Meta label="created">{fmtDate(b.createdAt)}</Meta>
                {b.originalFilename && <Meta label="file">{b.originalFilename}</Meta>}
              </div>
              {b.textPreview && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {b.textPreview.length > 100 ? b.textPreview.slice(0, 100) + '…' : b.textPreview}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ children, type }: { children: React.ReactNode; type: 'info' | 'success' | 'warning' | 'danger' }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontWeight: 500,
      background: `var(--color-background-${type})`, color: `var(--color-text-${type})`,
      border: `0.5px solid var(--color-border-${type})`,
    }}>
      {children}
    </span>
  );
}

function Meta({ label, children, warn }: { label: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
      <span style={{ color: 'var(--color-text-tertiary)' }}>{label}:</span>{' '}
      <span style={{ color: warn ? 'var(--color-text-danger)' : 'var(--color-text-secondary)' }}>{children}</span>
    </span>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 6, border: '0.5px solid var(--color-border-info)',
  background: 'var(--color-background-info)', color: 'var(--color-text-info)',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
};

const smallBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 5, border: '0.5px solid',
  background: 'transparent', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
};