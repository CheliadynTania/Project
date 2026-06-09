import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { BlockMeta } from '../types/content';
import { EndpointLabel } from '../verify-password/EndpointLabel';
import { ResultPanel } from '../verify-password/ResultPanel';

interface Props {
  initialHash: string;
  onSuccess: (msg: string, type: 'ok' | 'err') => void;
}

export function BlockInspector({ initialHash, onSuccess }: Props) {
  const [hash, setHash] = useState(initialHash);
  const [password, setPassword] = useState('');
  const [meta, setMeta] = useState<BlockMeta | null>(null);
  const [content, setContent] = useState<object | null>(null);
  const [verifyPw, setVerifyPw] = useState('');
  const [verifyResult, setVerifyResult] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeOp, setActiveOp] = useState<'meta' | 'content' | 'verify' | null>(null);

  useEffect(() => {
    if (initialHash) setHash(initialHash);
  }, [initialHash]);

  const getMeta = async () => {
    if (!hash) return onSuccess('hash is required', 'err');
    setLoading(true); setActiveOp('meta'); setMeta(null); setContent(null);
    try {
      const m = await api.getBlockMeta(hash);
      setMeta(m);
    } catch (e) {
      onSuccess((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  };

  const getContent = async () => {
    if (!hash) return onSuccess('hash is required', 'err');
    setLoading(true); setActiveOp('content'); setMeta(null); setContent(null);
    try {
      const c = await api.getBlockContent(hash, password || undefined);
      setContent(c);
    } catch (e) {
      onSuccess((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = async () => {
    if (!hash) return onSuccess('hash is required', 'err');
    if (!verifyPw) return onSuccess('password is required', 'err');
    setLoading(true); setActiveOp('verify'); setVerifyResult(null);
    try {
      const r = await api.verifyPassword(hash, verifyPw);
      setVerifyResult(r);
    } catch (e) {
      onSuccess((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <EndpointLabel method="GET" path="/api/blocks/:hash" description="Перегляд метаданих та вмісту" />

      <div style={{ display: 'grid', gap: 14, marginTop: '1.25rem' }}>
        {/* hash input */}
        <div>
          <label style={labelStyle}>:hash *</label>
          <input
            value={hash}
            onChange={e => setHash(e.target.value)}
            placeholder="e.g. 0000a1b2"
            style={inputStyle}
          />
        </div>

        {/* Section: GET meta */}
        <section style={sectionStyle}>
          <EndpointLabel method="GET" path="/api/blocks/:hash/meta" description="Тільки метадані" small />
          <button onClick={getMeta} disabled={loading} style={infoBtn}>
            {loading && activeOp === 'meta' ? 'loading...' : 'GET /blocks/:hash/meta'}
          </button>
          {meta && activeOp === 'meta' && <ResultPanel data={meta} />}
        </section>

        {/* Section: GET content */}
        <section style={sectionStyle}>
          <EndpointLabel method="GET" path="/api/blocks/:hash" description="Отримати вміст" small />
          <div>
            <label style={labelStyle}>x-password header</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="optional"
              type="password"
              style={inputStyle}
            />
          </div>
          <button onClick={getContent} disabled={loading} style={infoBtn}>
            {loading && activeOp === 'content' ? 'loading...' : 'GET /blocks/:hash'}
          </button>
          {content && activeOp === 'content' && <ResultPanel data={content} />}
        </section>

        {/* Section: verify password */}
        <section style={sectionStyle}>
          <EndpointLabel method="POST" path="/api/blocks/:hash/verify-password" description="Перевірити пароль" small />
          <div>
            <label style={labelStyle}>password *</label>
            <input
              value={verifyPw}
              onChange={e => setVerifyPw(e.target.value)}
              placeholder="password to verify"
              type="password"
              style={inputStyle}
            />
          </div>
          <button onClick={verifyPassword} disabled={loading} style={successBtn}>
            {loading && activeOp === 'verify' ? 'loading...' : 'POST /blocks/:hash/verify-password'}
          </button>
          {verifyResult && activeOp === 'verify' && <ResultPanel data={verifyResult} />}
        </section>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)',
  marginBottom: 5, fontFamily: 'var(--font-mono)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
  fontSize: 13, padding: '8px 10px',
};

const sectionStyle: React.CSSProperties = {
  padding: '14px', borderRadius: 8,
  border: '0.5px solid var(--color-border-tertiary)',
  background: 'var(--color-background-secondary)',
  display: 'grid', gap: 10,
};

const infoBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 6, border: '0.5px solid var(--color-border-info)',
  background: 'var(--color-background-info)', color: 'var(--color-text-info)',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
};

const successBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 6, border: '0.5px solid var(--color-border-success)',
  background: 'var(--color-background-success)', color: 'var(--color-text-success)',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
};