interface Props {
  health: { status: string; db: string } | null;
  onRefresh: () => void;
}

export function HealthStatus({ health, onRefresh }: Props) {
  const isOk = health?.status === 'ok' && health?.db === 'ok';
  const isLoading = health === null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: isLoading ? 'var(--color-text-tertiary)' : isOk ? '#22c55e' : '#ef4444',
          boxShadow: isOk && !isLoading ? '0 0 0 2px rgba(34,197,94,0.2)' : undefined,
        }} />
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {isLoading ? 'checking...' : `api: ${health.status} · db: ${health.db}`}
        </span>
      </div>
      <button
        onClick={onRefresh}
        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '0.5px solid var(--color-border-secondary)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
      >
        refresh
      </button>
    </div>
  );
}