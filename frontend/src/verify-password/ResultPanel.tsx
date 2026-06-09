import { useState } from 'react';

interface Props {
  data: object;
}

export function ResultPanel({ data }: Props) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>response</span>
        <button
          onClick={copy}
          style={{
            fontSize: 10, background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            color: copied ? 'var(--color-text-success)' : 'var(--color-text-secondary)',
          }}
        >
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: '12px 14px', borderRadius: 8,
        background: 'var(--color-background-tertiary)',
        border: '0.5px solid var(--color-border-tertiary)',
        fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'var(--color-text-primary)',
        overflowX: 'auto', whiteSpace: 'pre-wrap',
        wordBreak: 'break-all', lineHeight: 1.6,
      }}>
        {json}
      </pre>
    </div>
  );
}