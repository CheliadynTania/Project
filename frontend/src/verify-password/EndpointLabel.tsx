interface EndpointProps {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  description?: string;
  small?: boolean;
}

export function EndpointLabel({ method, path, description, small }: EndpointProps) {
  const methodColor: Record<string, string> = {
    GET: 'var(--color-text-info)',
    POST: 'var(--color-text-success)',
    DELETE: 'var(--color-text-danger)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{
        fontSize: small ? 10 : 11, fontWeight: 500, fontFamily: 'var(--font-mono)',
        color: methodColor[method],
        background: method === 'GET' ? 'var(--color-background-info)' : method === 'POST' ? 'var(--color-background-success)' : 'var(--color-background-danger)',
        padding: '2px 7px', borderRadius: 4,
        border: `0.5px solid ${method === 'GET' ? 'var(--color-border-info)' : method === 'POST' ? 'var(--color-border-success)' : 'var(--color-border-danger)'}`,
      }}>
        {method}
      </span>
      <code style={{ fontSize: small ? 12 : 14, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', fontWeight: 500 }}>
        {path}
      </code>
      {description && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          — {description}
        </span>
      )}
    </div>
  );
}