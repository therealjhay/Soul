export function StatusDot({ status }: { status: 'active' | 'pending' | 'revoked' }) {
  const colors = {
    active: 'var(--success)',
    pending: 'var(--warning)',
    revoked: 'var(--destructive)',
  }
  
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: colors[status],
      boxShadow: status === 'active' ? `0 0 0 3px var(--success-bg)` : 
                 status === 'pending' ? `0 0 0 3px var(--warning-bg)` : 
                 `0 0 0 3px var(--destructive-bg)`,
    }} />
  )
}
